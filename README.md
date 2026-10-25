# Jeevani (जीवनी): offline-first maternal danger-sign decision support

Prototype for trained health workers (ASHA/ANM). It supports decisions and does NOT diagnose.
All data is synthetic. Risk thresholds in `public/engine.js` are placeholders pending clinical review.

## Run with PostgreSQL (full stack)
Requirements: Node.js 20.6+, Docker.

    cd jeevani
    Copy-Item .env.example .env # PowerShell; edit .env and set a private JWT_SECRET
    docker compose up -d        # starts PostgreSQL on port 5433
    npm install                 # installs the pg driver
    npm run start:pg            # reads .env, including optional Cloudinary settings

Open http://localhost:3000 (Chrome or Edge). Tables are created and 12 synthetic cases seeded on first start.

## Deploy on Render

The repository includes `render.yaml`, a Render Blueprint for the Node.js web service and PostgreSQL database. Push this project to GitHub, then in Render choose **New → Blueprint** and select the repository. During setup, provide these secret values when prompted:

- `SUPERVISOR_EMAIL`: the supervisor account email.
- `SUPERVISOR_PASSWORD`: a unique password with at least 12 characters.
- `WORKER_CREDENTIALS`: a JSON object mapping worker IDs to unique passwords of at least 12 characters, for example `{"ASHA-01":"replace-with-a-unique-password"}`. Use real, individually assigned credentials; never use the local demo passwords.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`: from your Cloudinary account. These are needed for the education image library.

Render generates `JWT_SECRET` and connects the service to PostgreSQL automatically. Production mode refuses to start if the signing secret or production login credentials are missing. The sign-in UI does not prefill demo credentials. Keep all secret values in Render, never in GitHub or `render.yaml`.

The Blueprint currently selects Render's free web and database plans for a short demo. Free web services can sleep when idle, and Render's free PostgreSQL database expires after 30 days; upgrade the database before relying on it long-term. This prototype is not approved for real patient data or clinical decisions.

## Quick run without Docker
    npm start                   # no install needed; stores data in data/db.json

To use Cloudinary with the JSON store, first copy `.env.example` to `.env`, blank out `DATABASE_URL` so the app selects JSON storage, configure the Cloudinary values, then run `npm run start:env`.

## Logins (demo)
- Supervisor tab: `supervisor@demo.in` / `demo123`
- Worker sync (asked on the first Sync now): ID `W1`, `W2` or `W3` / `worker123`
- Worker app PIN: you choose it on first use; it encrypts cases on the device.

## Demo script (3 min)
1. Worker tab: set PIN, tick **Offline**, New case, enter values (or mic in Chrome), confirm, check risk, Save.
2. Untick Offline, **Sync now**, sign in as W1: the case goes from queued to synced.
3. Supervisor tab: log in, see the case sorted by risk, set status to Acknowledged.
4. Worker tab: **Sync now** again; the new status appears on the case.
5. Press हिन्दी: the title becomes जीवनी.
True airplane-mode demo: open once online, install the app (Chrome menu > Install app), then turn the network off.

## Phone testing
Encrypted storage, service worker and install need HTTPS or localhost: use Chrome `chrome://inspect` port forwarding to localhost:3000, or an HTTPS tunnel (`npx cloudflared tunnel --url http://localhost:3000`). Plain `http://<laptop-ip>:3000` will not work.

## Layout
    server.js            REST API + static server, JSON or PostgreSQL store, signed tokens, audit log
    public/index.html    Worker app + supervisor dashboard (vanilla JS; CSS variables at the top)
    public/engine.js     Rules engine shared by browser and server (server re-scores every synced case)
    public/sw.js, manifest.webmanifest, icon-*.png   PWA files
    docker-compose.yml   PostgreSQL

## API
POST /api/login, POST /api/worker/login, POST /api/sync (worker), GET /api/cases, PATCH /api/cases/:id, GET /api/audit (supervisor). Supervisors can also use GET/POST /api/resources and POST /api/cloudinary/sign for the education library.
Passwords are scrypt-hashed, tokens are HMAC-signed and expire after 12h. Set JWT_SECRET in real use.

## Cloudinary education library
The supervisor dashboard includes a small library for **non-patient education images only** (for example, approved ANC posters or referral maps). Images upload directly to Cloudinary using a short-lived server-generated signature and are indexed in the selected app store. The server secret never reaches the browser. Patient photos, names, reports, case screenshots, or any identifiable health information must not be uploaded.

1. Create a Cloudinary account and copy the cloud name, API key, and API secret from its dashboard.
2. Copy `.env.example` to `.env` and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`.
3. Start locally with `npm run start:env` (or configure the same values in your deployment environment). For PostgreSQL, use `npm run start:pg` after starting Docker.
4. Open the Supervisor tab, sign in, choose **Education library**, and add a title and PNG/JPG/WebP image (up to 5 MB).

The `.env` file is ignored by Git. Never commit Cloudinary credentials. Configure a Cloudinary upload policy/account limit for production as well as the browser-side 5 MB check.

## Project record
The implementation notes and build journey are in [BUILD_JOURNAL.md](BUILD_JOURNAL.md) and the [Jeevani Notion project page](https://app.notion.com/p/4047b6a481728169b05ad1879acdbc5b?pvs=204). Keep the dated milestone log current in both places as the project changes.

## Customising
Palette: CSS variables at the top of `public/index.html`. Rules: `assess()` in `public/engine.js` (after clinician review). Languages: the `T` object in `index.html`.

## Limitations (say these in the demo)
- Decision support only; not clinically validated; not field tested; synthetic data.
- Voice needs Chrome speech recognition; the worker confirms every field. Risk reasons are English only.
- Demo accounts are hardcoded; the worker token is stored unencrypted on the device; no HTTPS, rate limiting or password reset. A real deployment needs proper identity, HTTPS and data governance.
- Render production mode accepts only the supervisor and worker credentials supplied as environment variables. The hardcoded demo accounts are available only in local development mode.
- Frontend is vanilla JavaScript (not React).
