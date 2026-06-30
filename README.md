
# CivicPulse (Community Hero)

**Hyperlocal civic infrastructure reporting and AI-powered municipal dispatch platform for Indian municipalities.**

🔗 **Live App:** [https://community-hero-383900506261.asia-southeast1.run.app](https://community-hero-383900506261.asia-southeast1.run.app)

---

## Overview

CivicPulse lets citizens report local civic issues — potholes, broken streetlights, garbage dumps, water leaks, and similar hazards — with a photo or video and their location. Google Gemini automatically verifies that the evidence is genuine, classifies the issue type and severity, and recommends the responsible municipal department and dispatch action. Verified reports appear on a live map where nearby citizens can upvote and peer-verify them, while municipal staff track and resolve issues through an admin command center.

## Features

- 📸 **AI-Verified Reporting** — Submit a photo/video + description; Gemini checks authenticity and classifies severity, issue type, and target department.
- 🗺️ **Citizen Issue Map** — Interactive Leaflet map of all verified reports near you.
- ✅ **Peer Verification** — Nearby citizens can confirm a report (proximity-checked, 3 verifications required).
- 🛠️ **Municipal Command Center** — Admin dashboard to triage, dispatch, and track issues from Open → Verifying → Resolved.
- 📊 **City Health Index** — Aggregate dashboard of city-wide infrastructure metrics.
- 💬 **AI Civic Advisor** — Gemini-powered chat for citizen questions about local services.
- 🔔 **Push Notifications** — Get notified via Firebase Cloud Messaging when your reported issue is resolved.
- 🏆 **Civic Score** — Earn points and build a personal report history.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts |
| Backend | Node.js, Express, tsx |
| AI | Google Gemini (`@google/genai`) |
| Auth & Messaging | Firebase Authentication (Google Sign-In), Firebase Cloud Messaging |
| Data | Custom Report model (JSON-backed), Firestore blueprint for production |

## Try It Live

Visit **[community-hero-383900506261.asia-southeast1.run.app](https://community-hero-383900506261.asia-southeast1.run.app)** to:

1. Sign in with Google as a citizen.
2. Tap **Report Issue**, snap a photo of a civic problem, and submit.
3. Watch the AI triage classify it and drop it on the map.
4. Switch to the **Command Center** tab to see the municipal admin view.

## Run Locally

**Prerequisites:** Node.js, a Google Gemini API key, a Firebase project.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see .env.example)
#    GEMINI_API_KEY=your_gemini_api_key

# 3. Run the dev server
npm run dev
```

The app and API are both served from `http://localhost:3000`.

### Production Build

```bash
npm run build   # Builds frontend (Vite) and bundles backend (esbuild)
npm start        # Serves the production build
```

## Project Structure

```
community-hero/
├─ src/                      React frontend
│  ├─ App.tsx                 Root component, navigation, auth state
│  ├─ components/             IssueMap, AdminDashboard, CitizenProfile,
│  │                          ReportIssueModal, AIAdvisorChat, CityHealthIndex
│  └─ firebaseClient.ts       Firebase auth / messaging / firestore init
├─ backend/
│  ├─ routes/issues.ts        REST API + AI triage + advisor chat
│  ├─ models/Report.ts        Report data model
│  └─ seed.ts                 Demo municipal data seeder
├─ server.ts                  Express app + Vite middleware bootstrap
└─ firestore.rules            Firestore security rules
```

## Status

This is a prototype build (originally scaffolded in Google AI Studio). Core reporting, AI triage, mapping, and admin workflows are functional; production hardening — Firestore security rules, role-based admin auth, and persistent notification tokens — is still in progress.

## License

Prototype / educational project. No license specified yet.
