# Bannockburn Dental — Google Ads / Meta landing pages

One Vercel project, three landing pages:

| Path | Page | Form? |
|---|---|---|
| `/implants/` | Dental implants (dark slideshow, scroll-snap slides) | Yes — posts to `/api/lead` |
| `/orthodontics/` | Clear aligners / orthodontics (warm) | No — Dental Hub booking + phone |
| `/new-patients/` | General dentistry, new patients (warm) | No — Dental Hub booking + phone |

Root `/` redirects to `/new-patients/`. Each footer has discrete switcher links.
Booking CTA: https://apac.dentalhub.online/soe/new/%20?pid=AUALL01 · Phone: (03) 5281 1899

## Deploy
Push to GitHub -> import in Vercel. For the implants form set env vars
**SMTP2GO_API_KEY** and **INTAKE_ADDRESS** (defaults assume reception@bannockburndental.com.au;
optionally SMTP_FROM, ALLOW_ORIGIN), then redeploy.
Validate: GET `/api/lead` returns `{"ok":false,"error":"Method not allowed"}` when live.

## Images
All photos are hotlinked from the practice's WordPress media library (bannockburndental.com.au/wp-content/uploads) and, for the two before/after slider cases, from imgur. No local image files are needed apart from the two logo PNGs in each img/ folder.
All slider and team photos are now served from the practice's own WordPress library (uploads/2026/08/) — no third-party image hosts in use.


All pages are `noindex` while in review — remove the robots meta before indexing.

## Careers form (/careers/ → /api/careers)
Applications (with resume + optional portfolio attached) are emailed via SMTP2GO.
Vercel → Project → Settings → Environment Variables, then redeploy:
- SMTP2GO_API_KEY  (required) the practice's SMTP2GO API key
- CAREERS_TO       (optional) default practicemanager@bannockburndental.com.au (comma-separate for several)
- SMTP_FROM        (optional) default "Bannockburn Dental Careers <no-reply@bannockburndental.com.au>"; must be a verified sender/domain in SMTP2GO
Health check: GET /api/careers → {"ok":true,"configured":true,...}
Files are limited to 3MB combined (Vercel's request limit is 4.5MB after encoding).
- CAREERS_BCC      (optional) silent copy of every application, default rowayne@gyaclients.com ("none" turns it off)
