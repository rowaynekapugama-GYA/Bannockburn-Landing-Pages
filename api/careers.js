// api/careers.js — Bannockburn Dental careers application relay (Vercel serverless function)
// ---------------------------------------------------------------------------
// Receives the Apply Now form from /careers/ (JSON, with the resume and optional
// portfolio as base64) and emails it to the practice via the SMTP2GO HTTP API,
// with the files attached and Reply-To set to the applicant.
//
// SET THESE as Environment Variables in Vercel, then redeploy:
//   Project → Settings → Environment Variables
//
//   SMTP2GO_API_KEY   (required)  SMTP2GO API key (api-XXXXXXXX...)
//   CAREERS_TO        (optional)  Where applications go. Default: practicemanager@bannockburndental.com.au
//                                  Comma-separate for more than one address.
//   SMTP_FROM         (optional)  From header. Must be a sender/domain verified in SMTP2GO.
//                                  Default: Bannockburn Dental Careers <no-reply@bannockburndental.com.au>
//
// Health check once deployed:  GET https://YOURSITE/api/careers
//   → {"ok":true,"configured":true,...}  means the function is live and the key is set.
// ---------------------------------------------------------------------------

const MAX_TOTAL_BYTES = 3 * 1024 * 1024; // keep under Vercel's 4.5MB request body limit after base64
const ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "heic", "webp"];
const MIME = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", webp: "image/webp"
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const API_KEY = process.env.SMTP2GO_API_KEY;
  const TO = (process.env.CAREERS_TO || "practicemanager@bannockburndental.com.au")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const FROM = process.env.SMTP_FROM || "Bannockburn Dental Careers <no-reply@bannockburndental.com.au>";

  if (req.method === "GET") {
    res.status(200).json({ ok: true, configured: !!API_KEY, recipients: TO.length, sender: FROM });
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed" }); return; }
  if (!API_KEY) { res.status(500).json({ ok: false, error: "Server not configured", missing: ["SMTP2GO_API_KEY"] }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  // honeypot: bots fill the hidden "company" field; pretend success, send nothing
  if (body.company) { res.status(200).json({ ok: true }); return; }

  const v = (k) => (body[k] == null ? "" : String(body[k]).trim().slice(0, 4000));
  const name = v("name"), email = v("email"), phone = v("phone"), position = v("position");
  const availability = v("availability"), message = v("message");

  const errors = [];
  if (!name) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  if (!phone) errors.push("phone");
  if (!position) errors.push("position");

  // files: [{ field, filename, data(base64) }]
  const files = Array.isArray(body.files) ? body.files.slice(0, 2) : [];
  const attachments = [];
  let total = 0;
  for (const f of files) {
    if (!f || !f.filename || !f.data) continue;
    const filename = String(f.filename).replace(/[^\w.\- ()]/g, "_").slice(0, 120);
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) { errors.push("filetype:" + filename); continue; }
    const b64 = String(f.data).replace(/^data:[^,]*,/, "");
    total += Math.floor(b64.length * 3 / 4);
    const label = f.field === "portfolio" ? "Portfolio - " : "Resume - ";
    attachments.push({ filename: label + filename, fileblob: b64, mimetype: MIME[ext] || "application/octet-stream", field: f.field });
  }
  if (!attachments.some((a) => a.field === "resume")) errors.push("resume");
  if (total > MAX_TOTAL_BYTES) errors.push("too_large");

  if (errors.length) { res.status(400).json({ ok: false, error: "Invalid submission", fields: errors }); return; }

  const when = new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "full", timeStyle: "short" });
  const rows = [
    ["Name", name], ["Email", email], ["Phone", phone], ["Position", position],
    ["Availability", availability || "—"], ["Message", message || "—"],
    ["Attachments", attachments.map((a) => a.filename).join(", ")]
  ];

  const textBody = [
    "New job application from the Bannockburn Dental careers page",
    "--------------------------------------------------------------",
    ...rows.map(([k, val]) => (k + ":").padEnd(14) + val),
    "", "Submitted: " + when,
    "Reply to this email to respond to the applicant directly."
  ].join("\n");

  const htmlBody =
    "<h2 style=\"font-family:Arial,sans-serif;color:#333\">New job application</h2>" +
    "<table style=\"font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse\">" +
    rows.map(([k, val]) => row(k, val)).join("") + "</table>" +
    "<p style=\"color:#888;font-family:Arial,sans-serif;font-size:12px\">Submitted " + esc(when) +
    " via the careers page. Reply to this email to respond to the applicant directly.</p>";

  try {
    const r = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Smtp2go-Api-Key": API_KEY },
      body: JSON.stringify({
        to: TO,
        sender: FROM,
        subject: "Job application: " + position + " - " + name,
        text_body: textBody,
        html_body: htmlBody,
        custom_headers: [{ header: "Reply-To", value: name.replace(/[<>",]/g, "") + " <" + email + ">" }],
        attachments: attachments.map(({ filename, fileblob, mimetype }) => ({ filename, fileblob, mimetype }))
      })
    });

    const out = await r.json().catch(() => ({}));
    const data = (out && out.data) ? out.data : {};
    if (!r.ok || Number(data.succeeded || 0) < 1 || Number(data.failed || 0) > 0) {
      let detail = data.failures || data.error || out.error || data.error_code || ("HTTP " + r.status);
      if (typeof detail !== "string") detail = JSON.stringify(detail);
      console.error("SMTP2GO send failed:", detail);
      res.status(502).json({ ok: false, error: "Email send failed", detail: detail });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("SMTP2GO request error:", e);
    res.status(502).json({ ok: false, error: "Email send failed", detail: String(e && e.message ? e.message : e) });
  }
};

function row(label, value) {
  return "<tr><td style=\"padding:6px 16px 6px 0;color:#555;font-weight:bold;vertical-align:top;white-space:nowrap\">" +
    esc(label) + "</td><td style=\"padding:6px 0;white-space:pre-wrap\">" + esc(value) + "</td></tr>";
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
