# Jeevani build journal

Notion project record: [Jeevani — Project Documentation & Build Journey](https://app.notion.com/p/4047b6a481728169b05ad1879acdbc5b?pvs=204)

## Project intent

An offline-first maternal danger-sign decision-support prototype for trained frontline health workers. It structures capture, explains transparent rule outputs, queues encrypted local cases, and syncs cases to a supervisor dashboard. It is not a diagnostic system; thresholds are placeholders pending clinical review and all seeded cases are synthetic.

## Original build

- Vanilla JavaScript PWA with worker capture and supervisor queue.
- English/Hindi interface labels and browser speech input.
- PIN-derived AES-GCM encryption for locally persisted worker cases.
- JSON file storage for quick start, with optional PostgreSQL support.
- Deterministic rules in `public/engine.js`; sync cases are rescored on the server.
- Initial project intent and design decisions came from the shared Claude conversation supplied by the project owner.

## Frontend and backend refresh — 25 October 2026

- Reworked the visual system around a deep forest/ivory/saffron palette, serif display typography, atmospheric gradients, responsive dashboard cards, and subtle entrance motion.
- Reshaped supervisor overview with case counts, urgency filters, and a clearer case queue.
- Added a supervisor education-image library backed by Cloudinary. Server signs direct uploads; only title and secure Cloudinary URL are stored in the app's JSON/PostgreSQL store.
- Restricted the library flow to staff education assets. Do not upload patient identifiers, photos, clinical documents, or case screenshots.
- Added Cloudinary setup steps in `README.md`; actual credentials are supplied via an untracked `.env` file.
- Added `render.yaml` for a Render Node.js service plus PostgreSQL, health check, generated JWT secret, and dashboard-provided supervisor/worker/Cloudinary secrets.
- Production mode now requires unique configured credentials and a persistent signing secret; the sign-in screen no longer pre-fills local demo credentials.
- Added Render Blueprint deployment instructions, including free-plan limits. Initialized and committed the local Git repository.
- Created the private GitHub repository `nvthenarcss/jeevani` and pushed the source to `main`. Connected Render and limited its GitHub App access to this repository only. Render's Blueprint form is open; production credentials and Cloudinary keys remain to be entered by the owner before deployment.

## Build decisions and open work

- Keep clinical risk classification deterministic and reviewable. Do not introduce an unvalidated model into the risk decision.
- Have a qualified clinician review the placeholder rules before any field or clinical use.
- Add deployment-grade identity, rate limiting, HTTPS, environment-specific secrets, and data-governance controls before production.
- Confirm Cloudinary account restrictions and retention rules before production use.
- The Notion project page should track dated decisions and milestones; the source code and README remain canonical for implementation details.

## Update log

| Date | Change |
| --- | --- |
| 2026-10-25 | Frontend refresh and Cloudinary-backed supervisor education library added; documentation and build journal started. |
| 2026-10-25 | Expanded the private Notion project record to cover all 15 sections of the supplied hackathon documentation guide, with missing team/deployment details and unverified tests clearly marked. Corrected JSON-mode Cloudinary setup instructions. |
| 2026-10-25 | Prepared a Render Blueprint with PostgreSQL, production credential checks, secret prompts, and deployment documentation. Created a private GitHub repository and pushed `main`; Render GitHub access is restricted to this repository. Blueprint deployment awaits owner-entered secrets. |
