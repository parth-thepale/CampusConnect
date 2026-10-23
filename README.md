# CampusConnect 🎓

### From campus complaints to accountable action.

CampusConnect is an AI-assisted campus issue reporting and resolution platform that helps students report infrastructure and facility problems, enables campus staff to manage and resolve tickets, and provides transparent progress tracking from submission to resolution.

Built for a 24-hour hackathon, CampusConnect aims to make campus maintenance more transparent, organized, and accountable by connecting students, staff, and AI-assisted complaint processing in one platform.

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [User Roles](#-user-roles)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Google Cloud Deployment](#-google-cloud-deployment)
- [Security and Responsible AI](#-security-and-responsible-ai)
- [24-Hour Development Plan](#-24-hour-development-plan)
- [Team Responsibilities](#-team-responsibilities)
- [Current Limitations](#-current-limitations)
- [Future Scope](#-future-scope)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚨 Problem Statement

Campus facilities issues such as plumbing failures, electrical faults, cleanliness problems, and internet connectivity disruptions can negatively affect students' daily lives.

Traditional complaint processes may rely on informal messages, verbal communication, or disconnected reporting channels. These approaches can make it difficult to track requests, identify repeated problems, assign responsibility, and communicate progress to students.

CampusConnect addresses this challenge by creating a structured digital workflow for reporting, assigning, tracking, and resolving campus facility complaints.

### The problems we aim to solve

- **Unstructured complaints:** Reports may lack a clear description, location, or sufficient information.
- **Unclear responsibility:** Complaints may not reach the appropriate department.
- **Duplicate reports:** Multiple students may report the same underlying problem.
- **Limited transparency:** Students may not know whether their complaints are being reviewed or resolved.
- **Disconnected workflows:** Staff need a centralized way to manage requests and communicate status changes.

---

## 💡 Our Solution

CampusConnect combines structured complaint management with AI-assisted information extraction and clarification.

Students submit a complaint through a simple interface. The system analyzes the description, identifies missing information, suggests an issue category, and recommends a department based on the available routing guide.

Once the complaint has sufficient information and is confirmed by the student, CampusConnect creates a trackable ticket. Staff can review incoming reports, inspect possible duplicates, assign responsibility, update progress, and record resolution details.

Students can then follow the ticket's progress through a persistent status history.

**Our core principle:** AI assists the reporting and triage process; authorized humans remain responsible for operational decisions.

---

## ✨ Key Features

### 1. Structured Complaint Submission

Students can submit campus facility complaints with:

- A description of the problem.
- The affected campus location.
- Optional supporting photographs, when enabled.
- Additional details requested by the system.

The interface guides students toward actionable reports instead of accepting only vague descriptions.

### 2. AI-Assisted Complaint Understanding

The AI service can help:

- Summarize lengthy or unclear complaint descriptions.
- Extract the reported issue and relevant location details.
- Suggest a category such as plumbing, electricity, cleanliness, or internet connectivity.
- Identify missing information.
- Generate focused clarification questions.
- Recommend a department using configured routing rules.

AI-generated information is validated before it is used by the application.

### 3. Clarification Before Ticket Creation

If a complaint is incomplete, the system asks the student for the missing details.

For example:

> **Student:** The water tap is not working.

> **CampusConnect:** Where is the affected tap located, and is there a leak or no water supply?

The student can provide the missing information and confirm the complaint before submission.

### 4. Trackable Complaint Tickets

Each successfully created complaint receives a unique ticket reference.

Students can view:

- Their complaint description.
- Its current status.
- Relevant assignment or department information.
- A chronological history of status changes.
- Resolution information when available.

Ticket records are stored persistently rather than existing only in browser state.

### 5. Staff Dashboard

Authorized staff can access a centralized ticket-management interface to:

- View incoming complaints.
- Filter or search tickets.
- Inspect complaint details.
- Assign tickets to the appropriate team or department.
- Update ticket status.
- Add progress notes and resolution information.
- Review the ticket's history.

### 6. Duplicate Complaint Detection

CampusConnect can identify potentially related reports using relevant complaint details, locations, categories, and descriptions.

Potential duplicates are presented to staff for review.

**Important:** The system does not automatically merge or discard reports merely because the AI believes they are duplicates. Authorized staff retain control over the decision.

### 7. Transparent Status Tracking

The application maintains a history of important ticket events, allowing students and staff to understand how a complaint progressed.

Possible statuses include:

- `Submitted`
- `Under Review`
- `Assigned`
- `In Progress`
- `Resolved`
- `Reopened`, if supported by the implemented workflow

The allowed transitions must be enforced by the backend.

---

## 🔄 How It Works

The expected end-to-end workflow is:

1. A student opens CampusConnect and describes a campus problem.
2. The system collects the location and any other required details.
3. The AI service analyzes the complaint and identifies missing information.
4. If necessary, the student answers clarification questions.
5. The student reviews and confirms the complaint details.
6. The backend validates the submission and creates a persistent ticket.
7. The system assigns a unique ticket reference and records the initial event.
8. AI-assisted category and department suggestions support staff triage.
9. The system identifies possible duplicate tickets for human review.
10. Authorized staff review, assign, and update the complaint.
11. Every permitted status change is recorded in the ticket history.
12. The student checks the latest status and resolution details.

The main demonstration should show an incomplete complaint, a clarification interaction, a possible duplicate requiring staff review, and a ticket progressing toward resolution.

---

## 👥 User Roles

### Student

Students can:

- Submit complaints.
- Answer clarification questions.
- Confirm complaint details.
- View their own tickets.
- Track ticket progress.
- Read available resolution updates.

Students must not be able to access or modify another student's private ticket without explicit authorization.

### Campus Staff

Authorized staff can:

- View the tickets permitted by their role.
- Review and triage complaints.
- Assign tickets.
- Update ticket status.
- Add operational notes.
- Review potential duplicates.
- Record resolution information.

### Application Administrator

If an administrator role is implemented, it may manage authorized staff access, routing configuration, and application-level settings. Administrative privileges must be explicitly controlled and must not be granted to ordinary users by default.

---

## 🛠️ Technology Stack

The following is the intended implementation stack. Update this section if the final repository uses different libraries or services.

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | Interactive user interface |
| Language | TypeScript | Type safety and maintainability |
| Frontend tooling | Vite | Development server and production build |
| Backend | Node.js + Express | API endpoints and business logic |
| Authentication | Firebase Authentication | User identity and sign-in |
| Database | Cloud Firestore | Persistent tickets and event history |
| AI | Google Gemini API | Complaint understanding and clarification |
| Cloud platform | Google Cloud | Hosting and managed infrastructure |
| Application hosting | Cloud Run | Run the application as a managed service |
| Deployment CLI | Google Cloud CLI (`gcloud`) | Configure and deploy the application |
| Optional file storage | Cloud Storage | Supporting complaint photographs |

### Why this stack?

React and TypeScript support modular frontend development. Express provides a straightforward API layer for ticket workflows and access control. Firebase Authentication and Firestore reduce the amount of infrastructure that must be managed during a short hackathon.

Gemini provides AI-assisted complaint analysis, while Google Cloud Run offers a managed deployment target.

The team will use **source-based deployment with `gcloud`**, subject to the selected build configuration and required Google Cloud permissions. A manually maintained Dockerfile and a manual `docker build` / `docker push` workflow are not part of the planned process.

---

## 🏗️ System Architecture

CampusConnect follows a frontend–backend architecture with managed cloud services.

```text
                 STUDENT / CAMPUS STAFF
                           |
                           v
                 React + TypeScript UI
                           |
                           v
                   Express REST API
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
      Authentication   Firestore     Gemini API
        validation     ticket data   AI assistance
             |             |
             +-------------+
                           |
                           v
                  Validated API response
                           |
                           v
                 Updated application UI
```

### Frontend layer

The frontend presents complaint forms, clarification interfaces, student ticket views, and staff management screens.

It sends requests to the backend and displays validated responses. It must not contain privileged service credentials or write directly to protected ticket collections in ways that bypass authorization.

### Backend layer

The backend coordinates the application workflow. It validates input, verifies identity and permissions, invokes the AI service when appropriate, applies business rules, writes persistent data, and returns consistent responses.

The backend is the authority for ticket ownership, status transitions, assignment permissions, and event creation.

### Data layer

Cloud Firestore stores the application records, including:

- User profiles or role metadata.
- Ticket details.
- Assignment and status information.
- Ticket event history.
- Routing configuration, where configured.

Optional photographs can be stored in a private Cloud Storage bucket, with access restricted to authorized users.

### AI layer

The AI integration processes complaint text and returns structured suggestions. The backend validates those suggestions before accepting any of them into the application workflow.

The model must not directly write to Firestore, bypass permissions, assign itself administrative authority, or automatically resolve complaints.

---

## 📁 Project Structure

A suggested repository layout is shown below. Adjust it to match the actual files created by the team.

```text
campusconnect/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── ai/
│   ├── db/
│   └── index.ts
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Folder responsibilities

- `src/components/`: Reusable interface components.
- `src/pages/`: Student and staff screens.
- `src/services/`: Frontend API clients.
- `src/types/`: Shared TypeScript data contracts.
- `server/routes/`: API route definitions.
- `server/controllers/`: Request handling and response formatting.
- `server/services/`: Ticket and business logic.
- `server/middleware/`: Authentication, authorization, and validation.
- `server/ai/`: Gemini integration and prompt handling.
- `server/db/`: Firestore initialization and database access.
- `tests/`: Unit, integration, and end-to-end tests.

For a 24-hour project, keep the structure simple enough that team members can navigate it quickly.

---

## 🚀 Getting Started

### Prerequisites

Install and configure:

- Node.js, preferably an active LTS release compatible with the project dependencies.
- npm.
- Git.
- A Google account with access to the required Firebase and Google Cloud projects.
- Google Cloud CLI (`gcloud`).
- A Gemini API credential for the chosen integration.
- Access to the project's Firebase Authentication and Firestore configuration.

Check your local installations:

```bash
node --version
npm --version
git --version
gcloud --version
```

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd campusconnect
```

Replace the placeholder with the actual GitHub repository URL.

### 2. Install dependencies

If the project uses a single root `package.json`:

```bash
npm install
```

If the frontend and backend have separate package manifests, install dependencies in each corresponding directory instead. Follow the scripts defined in the committed package files.

### 3. Configure environment variables

Create a local `.env` file using `.env.example` as a reference.

```bash
cp .env.example .env
```

On Windows PowerShell, you can instead copy the example file using:

```powershell
Copy-Item .env.example .env
```

Fill in the required local configuration. Never commit the populated `.env` file.

### 4. Start development

The exact commands depend on the repository's scripts. A common arrangement is:

```bash
npm run dev
```

If frontend and backend run as separate development processes, start both using the scripts documented in their respective package files.

### 5. Verify the application

Before integrating the work of all four team members, verify that:

- The frontend loads successfully.
- The backend starts without errors.
- Authentication works.
- A valid complaint can be created.
- The ticket is stored in Firestore.
- The ticket can be retrieved after refreshing the page.
- Unauthorized users cannot access protected records.
- AI errors do not break ordinary ticket operations.

---

## 🔐 Environment Variables

Use `.env.example` to document the configuration required by the project without including actual credentials.

An illustrative template is:

```dotenv
# Server
PORT=8080
NODE_ENV=development

# Firebase / Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
FIREBASE_PROJECT_ID=your-project-id

# AI integration
GEMINI_API_KEY=

# Frontend configuration, if needed by the selected setup
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

This is a template, not a guarantee that every variable is required by the final code. Use the exact variable names expected by the implemented services.

**Secret-handling rules:**

- Never commit real API keys, passwords, private keys, or service-account JSON files.
- Never expose the Gemini API key through a `VITE_` variable; frontend variables are bundled into browser-accessible code.
- Use server-side configuration for privileged credentials.
- Use Google Cloud Secret Manager or another approved secret-injection mechanism for production secrets.
- Use the Cloud Run service identity and Application Default Credentials where supported, with least-privilege IAM permissions.

---

## ☁️ Google Cloud Deployment

CampusConnect is intended to run on Google Cloud Run using the Google Cloud CLI.

The deployment process will use **source-based deployment**, so the team does not need to maintain a Dockerfile or manually build and push a container image. Google Cloud's build infrastructure handles the source build according to the selected build configuration.

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
```

Set the project:

```bash
gcloud config set project YOUR_PROJECT_ID
```

Verify the active project:

```bash
gcloud config get-value project
```

### 2. Enable required services

The precise service list depends on the selected deployment and Firebase configuration. For a source-based Cloud Run deployment, a typical starting point is:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

Ensure the deploying account has the necessary IAM permissions and that any required build service identities are configured.

### 3. Prepare the application for Cloud Run

The application must:

- Listen on the port supplied by the `PORT` environment variable.
- Bind the server to `0.0.0.0`, not only `localhost`.
- Serve the production frontend assets if deploying frontend and backend as one service.
- Handle API routes and frontend routes correctly.
- Read configuration from environment variables or supported secret integrations.
- Avoid depending on files that exist only on a developer's machine.

For an Express server, the general pattern is:

```javascript
const port = process.env.PORT || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
```

Use the equivalent implementation if the backend is written in TypeScript.

### 4. Deploy from source

From the directory containing the intended application source and deployment configuration, run:

```bash
gcloud run deploy campusconnect \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated
```

Replace `YOUR_REGION` with a supported Google Cloud region appropriate for the project.

**Important:** `--allow-unauthenticated` makes the Cloud Run service publicly reachable. It does not mean application data should be public. Use it only when the intended application is publicly accessible and application-level authentication, authorization, and data protection are enforced correctly. Restrict service-level access if that better fits the deployment.

Source deployment may require additional project configuration, billing, IAM permissions, and build setup. Follow the errors returned by `gcloud` and resolve the actual missing prerequisite rather than assuming deployment has succeeded.

### 5. Configure production settings

Configure the necessary runtime environment variables and secrets for the deployed service. Prefer Secret Manager for sensitive values and grant access only to the Cloud Run service identity that requires them.

Do not paste secret values into source files, GitHub commits, screenshots, or public logs.

### 6. Verify the deployed service

After deployment, inspect the service:

```bash
gcloud run services describe campusconnect \
  --region YOUR_REGION
```

Inspect recent logs:

```bash
gcloud run services logs read campusconnect \
  --region YOUR_REGION \
  --limit 100
```

Open the service URL reported by the deployment and test the entire student-to-staff workflow.

A successful deployment command is not sufficient evidence that the application is fully operational. Confirm authentication, database access, AI integration, permissions, and persistent ticket history in the deployed environment.

---

## 🛡️ Security and Responsible AI

CampusConnect processes reports that may contain personal details or photographs. Security must be considered from the beginning rather than added after the demo.

### Authentication and authorization

- Require authentication for protected student and staff operations.
- Enforce ticket ownership in the backend.
- Verify staff permissions before allowing assignment or status changes.
- Validate all request parameters and payloads.
- Restrict access to private photographs and supporting files.
- Apply least-privilege permissions to Firebase and Google Cloud resources.

### Data integrity

- Generate ticket references using a reliable backend mechanism.
- Validate status transitions on the server.
- Record important changes in a persistent event history.
- Prevent client-supplied fields from overriding trusted fields such as ownership or privileged role assignments.
- Make writes consistent with the application's workflow and authorization rules.

### Responsible AI

- Treat model output as a suggestion, not a trusted command.
- Validate structured responses against an explicit schema.
- Handle timeouts, malformed responses, and unavailable model services.
- Do not let AI responses directly modify the database.
- Keep duplicate detection advisory and human-reviewed.
- Avoid presenting a predicted department or urgency as official policy unless it is supported by the approved routing rules.
- Do not send unnecessary personal information to the model.

### Privacy

Collect only the information needed to resolve a complaint. Limit access to records and attachments, avoid logging sensitive complaint text unnecessarily, and define an appropriate retention policy before production use.

---

## ⏱️ 24-Hour Development Plan

The project is designed for a four-person team working in parallel.

| Time | Priority |
|---|---|
| Hours 0–2 | Agree on architecture, API contracts, data model, repository structure, and acceptance criteria. |
| Hours 2–6 | Build the initial UI, backend, AI service, and Google Cloud setup in parallel. Create and retrieve the first real ticket. |
| Hours 6–10 | Complete complaint submission, persistence, clarification, and student ticket tracking. |
| Hours 10–14 | Implement the staff dashboard, assignment, status transitions, and ticket history. |
| Hours 14–18 | Integrate duplicate suggestions, permissions, error handling, and the complete workflow. |
| Hours 18–21 | Freeze new features, resolve critical defects, deploy, and verify the hosted application. |
| Hours 21–24 | Execute regression tests, rehearse the demo, prepare fallback examples, and fix only high-priority issues. |

### Definition of success

By the deadline, the team should be able to demonstrate:

1. An incomplete complaint that triggers a clarification question.
2. A student confirming and submitting the complaint.
3. A persistent ticket with a reference number.
4. A staff member reviewing and updating the ticket.
5. A potential duplicate shown for human review.
6. The student seeing the updated status and history.
7. The same workflow functioning on the deployed Cloud Run URL.

---

## 👨‍💻 Team Responsibilities

### 1. Frontend & UX Engineer

Owns the React interface, student screens, staff dashboard, responsive layout, API integration, and UI states.

### 2. Backend, Database & Authentication Engineer

Owns Express APIs, Firestore persistence, authentication, authorization, validation, ticket status transitions, and event history.

### 3. AI & Complaint Intelligence Engineer

Owns Gemini integration, structured complaint extraction, clarification prompts, category suggestions, routing recommendations, and duplicate candidate generation.

### 4. Integration, QA & Google Cloud Engineer

Owns repository conventions, shared contracts, end-to-end integration, regression tests, deployment configuration, Cloud Run verification, and demo readiness.

All team members should integrate frequently. The team should agree on API request and response formats before independent implementation begins.

---

## ⚠️ Current Limitations

The following items must be verified against the actual implementation before claiming that they are complete:

- The official campus department-routing guide has not yet been supplied.
- Routing examples used during development must therefore be marked as illustrative until approved rules are available.
- Duplicate detection depends on available ticket data and may produce false positives or miss related reports.
- AI-generated summaries and category suggestions can be incorrect and require validation.
- Photograph upload, Hindi input, and recurring-issue analytics are optional unless explicitly completed.
- Production readiness requires appropriate authentication, database rules, IAM configuration, monitoring, and privacy controls.
- Cloud Run deployment and external service integration must be tested in the actual Google Cloud project.

CampusConnect is a project implementation, not a claim that every campus has adopted or approved the workflow.

---

## 🔮 Future Scope

After the core workflow is stable, CampusConnect could be extended with:

- Hindi and other regional-language complaint support.
- Better duplicate ranking using historical resolution data.
- Campus facility analytics and recurring-issue dashboards.
- Notifications when ticket status changes.
- Service-level targets and escalation workflows.
- Optional image-assisted issue classification.
- Department-specific queues and permission scopes.
- Feedback collection after resolution.
- Aggregated reporting to help campus administrators identify recurring infrastructure problems.

These features should be introduced only after the fundamental reporting, tracking, authorization, and resolution workflow is reliable.

---

## 🤝 Contributing

Contributions from the team should follow a consistent workflow.

1. Pull the latest changes before starting work.
2. Use a dedicated branch for significant changes.
3. Follow the agreed folder ownership and API contracts.
4. Avoid committing secrets or local environment files.
5. Run relevant tests before submitting changes.
6. Use clear, descriptive commit messages.
7. Integrate changes frequently to avoid a last-minute merge.
8. Verify the complete workflow after changes to shared interfaces.

Example:

```bash
git checkout -b feat/complaint-submission
git add .
git commit -m "feat: implement complaint submission"
git push -u origin feat/complaint-submission
```

Coordinate before changing shared types, API contracts, authentication logic, or deployment configuration.

---

## 📄 License

A license has not yet been selected. Add an appropriate `LICENSE` file before distributing the project under an open-source license.

---

## 🙌 Acknowledgements

Built as a hackathon project focused on improving campus facility reporting, operational transparency, and student experience through AI-assisted workflows.

**CampusConnect — Report it. Track it. Resolve it.**
