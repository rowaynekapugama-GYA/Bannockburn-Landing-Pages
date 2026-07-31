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

## Photo placeholders to replace
The `img/ph-*.webp` files are labelled placeholders. Replace with these files from the
Bannockburn WordPress media library (same slots, same filenames after swap):
- implants: `dental-implant-img1.jpg` (hero), `dental-Implant-Model-2.jpg` (model), `jaison-profile.png` (Dr Jason)
- orthodontics: `clear-aligner-img-1.jpg`, `clear-aligners-img.jpg`, `Clear-aligner-img2.jpg`, `clear-aligner-img-4.jpg`, plus the six team headshots (same files as new-patients)
- new-patients: `h2-banner-img-1.jpg`, `experienced-team-new.jpg`, `confort-focused.jpg`, `family-owned-with-care.jpg`, `gentle-and-caring.jpg`, plus team headshots `jaison-profile.png`, `sapna-profile.png`, `alaide-profile.png`, `frazer-profile.png`, `output_final.png` (Dr Meenakshi), `tomlu_framed.png` (Dr Tom)

All pages are `noindex` while in review — remove the robots meta before indexing.
