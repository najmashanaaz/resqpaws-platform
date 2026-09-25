# ResQPaws — AI-Powered Animal Rescue & Care Platform

A full-stack demo build: React + Tailwind frontend, Node/Express + MongoDB backend,
a browser-side AI audio classifier (Google's YAMNet, via TensorFlow.js), a Gemini-powered
chatbot, and a Leaflet map with sample support centers across India.

## What's real vs. what needs your own keys

**Fully working out of the box (no external accounts needed):**
- User registration/login (JWT, bcrypt password hashing)
- Animal Sound Detection — records or uploads audio, runs a real AI model (YAMNet) in the
  browser, matches its output against dog/cat/cow/goat/horse/bird/chicken/other, and stores
  results in MongoDB
- Distress Sound Detection — a rule-based risk engine (normal/distress/pain/aggressive/
  emergency) built on top of the same AI model's output, with a High/Medium/Low risk score,
  a red alert card, and admin case tracking
- Regional Support — a Leaflet map (OpenStreetMap tiles, no API key needed) with ~70 seeded
  sample veterinary hospitals, shelters, rescue centres and NGOs across 14 Indian cities,
  with GPS "use my location", filters, and full admin CRUD
- My Dog tracker, Adoption browsing, Helpline first-aid tips, Awareness/education page
- Admin dashboard: alerts, activity log, support-center management
- 5 languages for the Support page and nav: English, Tamil, Hindi, Telugu, Kannada

**Needs a key you provide:**
- **AI Chatbot** — needs a free Gemini API key from https://aistudio.google.com/apikey.
  Without it, the chatbot page shows "Offline" and explains why, instead of crashing.
- **Emergency alert webhook** (optional) — point `ALERT_WEBHOOK_URL` at a Slack/Discord
  incoming webhook to get pinged when a High-risk distress report comes in.
- **Forgot password email** — the UI and route exist, but no email is actually sent, because
  that needs a mail provider (SendGrid, SES, etc.) which I can't sign up for on your behalf.
  See `server/src/routes/auth.js` for where to plug one in.
- **Production hosting / your own MongoDB** — see Deployment below.

## Project layout
```
server/   Node.js + Express + MongoDB API
client/   React + Vite + Tailwind frontend
```

## Quick start (local)

**1. Install MongoDB**, or create a free MongoDB Atlas cluster and copy its connection string.

**2. Server**
```
cd server
cp .env.example .env      # edit MONGODB_URI, JWT_SECRET, etc.
npm install
npm run seed               # creates demo accounts + ~70 sample support centers
npm run dev                 # http://localhost:5000
```
Demo accounts created by the seed script (also printed in your terminal):
- Admin: `admin@resqpaws.demo` / `Admin@12345`
- User: `user@resqpaws.demo` / `User@12345`

**3. Client**
```
cd client
cp .env.example .env
npm install
npm run setup:model    # downloads the YAMNet AI model (~15 MB) so it works offline later
npm run dev              # http://localhost:5173
```
Open http://localhost:5173 — the splash screen plays, then the app loads.

If `npm run setup:model` fails (no internet from this machine, or the download host is
blocked), the app will still try to load the model live from TensorFlow Hub in the
browser the first time someone uses Sound/Distress Detection — that just needs the
browser to have internet access.

**4. Turn on the chatbot (optional)**
Get a free key at https://aistudio.google.com/apikey, put it in `server/.env` as
`GEMINI_API_KEY=...`, restart the server. The chatbot page will flip from "Offline" to
"Online" automatically.

## Running tests
```
cd server
npm test
```
12 unit tests cover the audio-classification matching, the distress risk engine, WAV
parsing/corruption handling, and the sample data generator.

## Deployment
- `server/Dockerfile` and `client/Dockerfile` + `nginx.conf` are included.
- `docker-compose.yml` at the repo root runs MongoDB + server + client together with one
  command: `docker compose up --build`.
- For a single Node process serving both, run `npm run build` in `client/`, then start the
  server — `server/src/app.js` automatically serves `client/dist` if it finds it.
- Set `NODE_ENV=production` and a real `JWT_SECRET` before deploying; the server refuses
  to start in production with the default secret.

## Honesty notes
- The Support page's ~70 organizations are clearly-labeled **sample data** (`isSample: true`
  in the database) — swap them for real ones via the Admin > Support Centers screen.
- The animal-sound and distress detectors use a real, general-purpose sound classifier
  (YAMNet, trained by Google on 521 everyday sound classes) rather than a model trained
  specifically on rescue-animal distress calls — none exists publicly. The distress logic
  is a transparent, testable rule engine built on top of it (see
  `server/src/services/distress.js`), not a black box, so you can see and adjust exactly
  why a sound was scored the way it was.
- I have not been able to click through the running UI myself in this environment (no
  browser/network here) — the code is unit-tested where it doesn't need a browser, and
  every file's JavaScript/JSX syntax has been checked, but please run it locally and tell
  me about anything that looks wrong so I can fix it.
