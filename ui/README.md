# CampusConnect

CampusConnect is a local-first Material 3 web app for turning campus facilities reports into accountable, trackable maintenance work. It supports the required four categories: plumbing, electricity, cleanliness, and internet connectivity.

## What is included

- Local email/password login with role-enforced student, staff, and administrator experiences.
- A guided student reporting flow with optional photo input, AI-assisted structured intake, one targeted clarification, and confirmation before submission.
- Bounded possible-duplicate comparison that never auto-merges or deletes reports.
- Rule-based, demo-labelled routing with transparent evidence.
- Staff queue, assignment, valid lifecycle transitions, resolution notes, and append-only ticket timelines.
- An admin-facing local routing-rule view and operational metrics.
- An AI intelligence workspace with a ticket-specific operational brief, observational checklist, cautious risk flags, and a transparent reporter-update draft.
- An AI operations pulse built from live local records, plus a 10-minute administrator presentation mode mapped to auth, AI, UI, and scalability proof points.
- SQLite persistence in `data/campusconnect.db` and a server-side Gemini Interactions API integration point.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3001`.

For a production-style local run:

```bash
npm run build
npm run start
```

Open `http://localhost:3001`.

## Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@campusconnect.local` | `campus123` |
| Staff | `staff@campusconnect.local` | `campus123` |
| Administrator | `admin@campusconnect.local` | `campus123` |

## Gemini features

Copy `.env.example` to `.env`. Without `GEMINI_API_KEY`, the app remains fully usable with a deterministic local intake fallback. With the key set, the server calls Gemini's Interactions API for:

- Structured issue summary, constrained category, confidence, missing-field detection, and one clarification question.
- Optional image observation from an attached JPEG, PNG, or WebP.
- Comparison of the new report against a bounded candidate set.
- Ticket-specific staff triage briefs and record-based operations pulse summaries.

The server validates all structured output, only permits the four configured categories, never treats an AI response as routing policy, and never allows automatic duplicate merging.

## Google AI Studio and Cloud Run

This repository is ready to import into Google AI Studio Build mode or deploy as a standard Node service: it has a `build` command, a `start` command, a same-origin Express API, serves `dist/`, and listens on `process.env.PORT`.

1. Push the repository to GitHub and import it from Google AI Studio Build mode.
2. In AI Studio **Secrets**, add `GEMINI_API_KEY` if you want live Gemini assistance.
3. Build and publish to Cloud Run.

The current database is intentionally local SQLite because this build prioritises speed and local development. It persists on your computer, but Cloud Run container disks are not durable. Use a managed datastore before relying on a deployed service for real campus reports.

## Project structure

- `src/` — React Material 3 interface and API client.
- `server/` — Express API, local authentication, SQLite store, Gemini integration.
- `data/` — generated local SQLite database (ignored by Git).
