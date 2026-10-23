# CampusConnect — Backend Foundation (Phase 1)

**Tagline:** From campus complaints to accountable action.

CampusConnect converts informal, incomplete campus facilities complaints into structured, actionable tickets. The platform provides transparent progress tracking for students and an accountable operational queue for maintenance staff.

---

## 1. Phase 1 Architecture Overview

Phase 1 establishes the production backend foundation using **Node.js, TypeScript, Express, Zod, and Firebase Admin SDK (Cloud Firestore & Firebase Auth)**.

### Architectural Principles
- **Separation of Concerns:** Business logic in service classes (`IntakeService`, `TicketService`, `AuthService`) is completely isolated from database drivers via repository interfaces (`IUserRepository`, `IIntakeRepository`, `ITicketRepository`, `IEventRepository`).
- **Fail-Safe Authorization:** Identity is verified server-side. User roles (`student`, `staff`, `admin`) are strictly resolved from an authoritative store; clients cannot self-assign staff roles.
- **Append-Oriented Audit Trail:** All ticket lifecycle transitions, assignments, and staff notes append immutable, timestamped event records (`TicketEvent`).
- **Deterministic Validation:** All requests are validated with strict Zod schemas. Untrusted fields are stripped; incomplete drafts cannot be confirmed into tickets.
- **Idempotent Confirmations:** Submitting repeat confirmation requests on an intake returns the existing ticket instead of generating duplicate tickets.
- **Concurrency-Safe Sequence Allocation:** Ticket numbers (`CC-1001`, `CC-1002`, etc.) are allocated monotonically using transaction-safe counters.

---

## 2. Directory Structure

```
app/
├── src/
│   ├── app.ts                  # Express application factory & middleware setup
│   ├── server.ts               # Server entry point (PORT, 0.0.0.0, graceful shutdown)
│   ├── config/
│   │   └── env.ts              # Zod-validated environment configuration
│   ├── errors/
│   │   └── AppError.ts         # Standardized error hierarchy
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
│   │   ├── intakeRoutes.ts     # /api/intakes/*
│   │   ├── ticketRoutes.ts     # /api/tickets/*
│   │   ├── staffRoutes.ts      # /api/staff/*
│   │   └── index.ts            # API root router
│   ├── schemas/
│   │   └── validation.ts       # Central Zod validation schemas
│   ├── services/
│   │   ├── authService.ts      # User provisioning & role resolution
│   │   ├── intakeService.ts    # Draft intake creation, edits & confirmation
│   │   └── ticketService.ts    # Ticket lifecycle, assignment, notes & events
│   └── types/
│       ├── ai.ts               # Phase 2 Gemini output contract specifications
│       └── domain.ts           # Core domain models, enums & state machine
├── tests/
│   ├── unit/
│   │   └── domain.test.ts      # Category normalization, state machine & sequence
│   └── integration/
│       ├── health.test.ts      # Health probe test
│       ├── intake.test.ts      # Intake lifecycle, validation, idempotency
│       ├── ticketSecurity.test.ts # Ownership, privacy, role boundaries
│       ├── staffOperations.test.ts# Status machine, assignments, staff queue
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
- `GET /api/health` — Returns process health, service name, and timestamp.
- `GET /health` — Container runtime probe.

### 4.2 Complaint Intake (Student)
- `POST /api/intakes` — Create draft intake (`description` required: 10–2000 chars; `location`, `category`, `additionalDetails` optional).
- `GET /api/intakes/:intakeId` — Retrieve draft (owner or staff only).
- `PATCH /api/intakes/:intakeId` — Update draft details (rejects changes if already confirmed).
- `POST /api/intakes/:intakeId/confirm` — Validate required fields (`description`, `location`, `category`) and create persistent ticket. Idempotent: returns existing ticket if called repeatedly.

### 4.3 Ticket Tracking (Student)
- `GET /api/tickets` — List authenticated student's tickets with pagination (`limit`, `offset`).
- `GET /api/tickets/:ticketId` — Get ticket detail (owner or staff only; 403 for unauthorized students).
- `GET /api/tickets/:ticketId/events` — Get chronological ticket events (internal staff notes redacted for students).

### 4.4 Staff Operations (Staff & Admin)
- `GET /api/staff/tickets` — Operational queue with filtering (`status`, `category`, `assignedToUid`) and pagination.
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

### Running Tests
The test suite runs against in-memory repository doubles requiring zero cloud credentials:
```bash
npm test
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

---

## 6. Cloud Run Deployment

Cloud Run source-based deployment builds and deploys directly without local Docker:
```bash
cd app
gcloud run deploy campusconnect-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080
```
