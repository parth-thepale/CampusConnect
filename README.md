# CampusConnect

**Tagline:** From campus complaints to accountable action.

DevArambh Hackathon • Google Developer Groups collaboration • 24-hour build

---

## Workspace Layout

- `CampusConnect_24_Hour_Workflow_Playbook.docx` — 24-Hour Workflow and Playbook specification
- `CampusConnect_Agentic_Skills_PRD.docx` — Agentic Skills PRD specification
- `CampusConnect_Explanatory_Project_Documentation.docx` — Explanatory Project Architecture & Contract
- `CampusConnect_Project_Prospectus_20_Page.docx` / `.pdf` — 20-Page Multi-Role Technical Blueprint
- `Problem statement.pdf` — Original DevArambh problem statement
- `app/` — **CampusConnect Backend Application (Phase 1)**
  - See [app/README.md](app/README.md) for full implementation details, API specifications, and local setup instructions.

---

## Quick Start (Backend)

```bash
# Install dependencies
cd app
npm install

# Run type check
npm run typecheck

# Run test suite (32 tests across 6 suites)
npm test

# Build production bundle
npm run build

# Start server
npm start
```

Or from the repository root:
```bash
npm run typecheck
npm test
npm run build
npm start
```
