# CampusConnect — Backend Foundation & AI Integration (Phase 1 & Phase 2)

**Tagline:** From campus complaints to accountable action.

CampusConnect converts informal, incomplete campus facilities complaints into structured, actionable tickets. The platform provides transparent progress tracking for students and an accountable operational queue for maintenance staff.

---

## 1. Architecture Overview

CampusConnect is structured as a modular TypeScript/Express monolith utilizing **Node.js, TypeScript, Express, Zod, Firebase Admin SDK (Cloud Firestore & Auth), and Google Gemini AI (`@google/genai`)**.

### Architectural Principles
- **Separation of Concerns:** Business logic in service classes (`IntakeService`, `TicketService`, `AuthService`, `GeminiService`) is completely decoupled from storage drivers through repository abstractions (`IUserRepository`, `IIntakeRepository`, `ITicketRepository`, `IEventRepository`).
- **AI as Advisory Layer:** Gemini AI extracts information, clarifies missing fields, and identifies potential duplicates. AI **never** modifies ticket status directly, assigns user roles, bypasses validation, or automatically merges tickets.
- **Fail-Safe Authorization:** Identity is verified server-side. User roles (`student`, `staff`, `admin`) are strictly resolved from an authoritative store; clients cannot self-assign staff roles.
- **Append-Oriented Audit Trail:** All ticket lifecycle transitions, assignments, and staff notes append immutable, timestamped event records (`TicketEvent`).
- **Deterministic Validation:** All requests are validated with strict Zod schemas. Untrusted fields are stripped; incomplete drafts cannot be confirmed into tickets.
- **Configurable Department Routing:** Configured demo rules (`DEMO_ROUTING_RULES_V1`) provide auditable routing recommendations with clear provenance while official campus policies remain pending.
- **Bounded Duplicate Detection:** Candidate duplicate searches query bounded recent tickets (max 10), pass only privacy-safe complaint snippets, and strictly validate returned candidate IDs against a whitelist.

---

## 2. Directory Structure

```
app/
├── src/
│   ├── app.ts                  # Express application factory & middleware setup
│   ├── server.ts               # Server entry point (PORT, 0.0.0.0, graceful shutdown)
│   ├── config/
│   │   └── env.ts              # Zod-validated environment configuration (Gemini & Firestore)
│   ├── errors/
│   │   └── AppError.ts         # Standardized error hierarchy (400, 401, 403, 404, 409, 503)
│   ├── middleware/
│   │   ├── auth.ts             # Firebase ID token verification & dev auth boundary
│   │   ├── errorHandler.ts     # Centralized, non-leaking JSON error handler
│   │   ├── role.ts             # Role-based authorization middleware
│   │   └── validate.ts         # Zod request validation middleware
│   ├── repositories/
│   │   ├── interfaces.ts       # Repository interfaces
│   │   ├── index.ts            # Repository registry resolver
│   │   ├── firestore/          # Production Firestore implementations
│   │   └── memory/             # In-memory implementation for isolated tests
│   ├── routes/
│   │   ├── healthRoutes.ts     # /api/health
│   │   ├── intakeRoutes.ts     # /api/intakes/* (create, get, update, confirm, analyze)
│   │   ├── ticketRoutes.ts     # /api/tickets/*
│   │   ├── staffRoutes.ts      # /api/staff/* (tickets, assignment, status, notes, duplicates)
│   │   └── index.ts            # API root router
│   ├── schemas/
│   │   └── validation.ts       # Central Zod validation schemas
│   ├── services/
│   │   ├── authService.ts      # User provisioning & role resolution
│   │   ├── intakeService.ts    # Draft intake creation, edits, confirmation & AI analysis
│   │   ├── ticketService.ts    # Ticket lifecycle, assignment, notes, events & duplicate queries
│   │   ├── geminiService.ts    # Google GenAI integration (structured output, prompt safety)
│   │   └── routingRules.ts     # Configurable department routing table & resolver
│   └── types/
│       ├── ai.ts               # Gemini AI input/output contract specifications
│       └── domain.ts           # Core domain models, enums & state machine
├── scripts/
│   └── smokeTestGemini.ts      # Standalone live Gemini smoke test runner
├── tests/
│   ├── unit/
│   │   ├── domain.test.ts      # Category normalization, state machine & sequence
│   │   ├── routing.test.ts     # Configurable routing & demo provenance tests
│   │   └── geminiService.test.ts # Structured AI parsing, injection defense & whitelisting
│   └── integration/
│       ├── health.test.ts      # Health probe test
│       ├── intake.test.ts      # Intake lifecycle, validation, idempotency
│       ├── aiAnalysisWorkflow.test.ts # Clarification loop & analysis endpoint tests
│       ├── ticketSecurity.test.ts # Ownership, privacy, role boundaries
│       ├── staffOperations.test.ts# Status machine, assignments, staff queue
│       ├── duplicateDetection.test.ts # Staff-only duplicate detection & privacy tests
│       └── errorHandling.test.ts  # 400, 404, 500 error sanitization
├── .env.example                # Documented environment template
├── firestore.indexes.json      # Firestore composite index definitions
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Core Domain & Status State Machine

### Supported Categories
- `plumbing`
- `electricity`
- `cleanliness`
- `internet_connectivity` (also accepts `"internet connectivity"`)

### Ticket Status Lifecycle
```
submitted ────────► acknowledged
    │                     │
    ├─────────────────────┼────────► in_progress ◄──────► blocked
    │                     │               │                  ▲
    ▼                     ▼               ▼                  │
 assigned ────────────────┴────────►  resolved ──────────────┘
    │                                     │
    └─────────────────────────────────────┘
                                          │
                                          ▼
                                      reopened
```

- When resolving a ticket, a **meaningful resolution note (≥ 5 characters)** is strictly enforced.
- Reopening is supported from the `resolved` state.

---

## 4. API Endpoints Contract

All endpoints return a consistent JSON envelope:
- **Success:** `{ "success": true, "data": ... }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`

### 4.1 Infrastructure
- `GET /` — API directory and service status.
- `GET /health` — Container runtime probe.
- `GET /api/health` — Operational health status.

### 4.2 Complaint Intake & AI Clarification (Student)
- `POST /api/intakes` — Create draft intake (`description` required; `location`, `category`, `additionalDetails` optional).
- `GET /api/intakes/:intakeId` — Retrieve draft (owner or staff only).
- `PATCH /api/intakes/:intakeId` — Update draft details (rejects changes if already confirmed).
- `POST /api/intakes/:intakeId/analyze` — **(Phase 2)** Request Gemini AI analysis on complaint draft. Returns title, summary, extracted location, suggested category, missing fields, clarifying question, and demo department routing.
- `POST /api/intakes/:intakeId/confirm` — Validate required fields (`description`, `location`, `category`) and create persistent ticket. Idempotent.

### 4.3 Ticket Tracking (Student)
- `GET /api/tickets` — List authenticated student's tickets with pagination (`limit`, `offset`).
- `GET /api/tickets/:ticketId` — Get ticket detail (owner or staff only; 403 for unauthorized students).
- `GET /api/tickets/:ticketId/events` — Get chronological ticket events (internal staff notes redacted for students).

### 4.4 Staff Operations (Staff & Admin)
- `GET /api/staff/tickets` — Operational queue with filtering (`status`, `category`, `assignedToUid`) and pagination.
- `GET /api/staff/tickets/:ticketId/duplicates` — **(Phase 2)** Retrieve AI-assessed potential duplicate candidates from recent tickets. Bounded to max 10 candidates; advisory only.
- `PATCH /api/staff/tickets/:ticketId/assignment` — Assign ticket to a staff member (`assignedToUid`).
- `PATCH /api/staff/tickets/:ticketId/status` — Advance status according to the lifecycle state machine.
- `POST /api/staff/tickets/:ticketId/notes` — Add operational staff note (`isInternal: true|false`).

---

## 5. Local Setup & Execution

### Prerequisites
- Node.js >= 20 (tested with Node v24.19.0)
- npm >= 10 (tested with npm 12.0.2)

### Installation
```bash
cd app
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To configure Gemini AI assistance, add your Google Gemini API key:
```ini
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL=gemini-2.5-flash
```

### Running Tests
The test suite runs against in-memory repository doubles requiring zero cloud credentials or API keys:
```bash
npm test
```
*Executes all 56 automated tests across 10 test suites.*

### Running Live Gemini Smoke Test
To test live communication with the Google Gemini API using a fictional complaint:
```bash
npm run smoke:ai
```

### Type Checking & Building
```bash
npm run typecheck
npm run build
```

### Running the Server
```bash
# Development (with auto-restart via tsx)
npm run dev

# Production
npm start
```
Server binds to `http://localhost:8080`.

---

## 6. Cloud Run Deployment

Cloud Run source-based deployment builds and deploys directly without local Docker:
```bash
cd app
gcloud run deploy campusconnect-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets GEMINI_API_KEY=campusconnect-gemini-key:latest
```
