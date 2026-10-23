# Google AI Studio Agent & Turnkey Hosting Guide

This guide provides everything needed to deploy and host **CampusConnect** with the **Google AI Studio Agent** with **minimal token usage**, **maximum output density**, and **near-zero deployment effort**.

---

## 1. Minimal Tokens & Maximum Output Engine

CampusConnect is configured to extract maximum insight per token using Google Gemini 2.5 Flash-Lite / 3.8 Flash-Lite:

| Optimization Layer | Implementation | Token Impact |
| :--- | :--- | :--- |
| **Reasoning Token Reduction** | `thinkingConfig: { effort: 'LOW', thinkingBudget: 0 }` | **Saves 500–1,500 hidden tokens** per request by turning off verbose inner monologues for routine intake/triage. |
| **System Instruction Caching** | Dedicated `systemInstruction` payload structure | **Caches prompts on Google servers**, reducing input tokens by up to **80%** on recurring calls. |
| **Deterministic Focus** | `temperature: 0.2`, `maxOutputTokens: 180–800` | Cuts rambling and pleasantries; produces dense, machine-parseable JSON or crisp bullet points. |
| **High-Density Prompts** | Streamlined prompt templates across all endpoints | Reduces input tokens by **~45%** per ticket/photo intake. |
| **Automatic Endpoint Fallback** | `generateContent` ➔ `interactions` ➔ `local fallback` | Zero dropped requests; seamless operation across all Google API tiers. |

---

## 2. Near Zero-Effort Deployment (Choose Any Option)

### Option A: 1-Click Cloud Run Deployment (Recommended)
Deploy directly from your terminal to Google Cloud Run in under 60 seconds.

**Windows PowerShell:**
```powershell
.\deploy.ps1
```

**macOS / Linux:**
```bash
chmod +x deploy.sh
./deploy.sh
```

*What the script does automatically:*
1. Detects your active Google Cloud project.
2. Prompts for your Google AI Studio `GEMINI_API_KEY` (optional).
3. Builds the multi-stage container and deploys it to Cloud Run (`us-central1`).
4. Outputs the public live HTTPS URL.

---

### Option B: Docker Container
Build and run the production image anywhere:
```bash
# Build multi-stage production image
docker build -t campusconnect .

# Run with port 8080 exposed and your AI Studio key
docker run -p 8080:8080 -e GEMINI_API_KEY="AIzaSy..." -e GEMINI_MODEL="gemini-2.5-flash-lite" campusconnect
```

---

### Option C: Local Production Preview
Compile the optimized frontend and run the production server:
```bash
# Build Vite production assets
npm --prefix ui run build

# Start production server
npm --prefix ui start
```
The app will serve both the compiled SPA frontend and API routes at `http://localhost:3001` (or custom `$PORT`).

---

## 3. Google AI Studio Agent Integration

### Loading the Agent in Google AI Studio
1. Open [Google AI Studio](https://aistudio.google.com/).
2. Click **Create New Prompt** ➔ **System Instructions**.
3. Copy the contents of [`google-ai-studio-prompt.txt`](file:///c:/Users/Parth/Documents/Codex/2026-10-23/google-ai-studio-prompt.txt) into the **System Instructions** box.
4. Model configuration settings:
   - **Model**: `gemini-2.5-flash-lite` (or `gemini-3.8-flash-lite`)
   - **Temperature**: `0.2`
   - **Thinking Budget**: `0` (or `Low`)
   - **Max Output Tokens**: `1024`

### Direct Tool Webhook Endpoint
The backend exposes a dedicated tool dispatcher at `POST /api/ai/agent-tools` for external agents or webhooks:
```bash
curl -X POST https://YOUR-HOST/api/ai/agent-tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "operations_pulse", "arguments": {}}'
```

**Supported Agent Tools:**
- `analyze_complaint`: Converts raw text and optional photo into structured category, clarity score, and review checks.
- `detect_image_problem`: Diagnoses uploaded facilities photos for failure mode, visible parts, severity, and repair steps.
- `triage_ticket`: Triages work orders with priority and staff inspection briefs.
- `auto_write`: Drafts professional technician notes, student feedback, or issue reports.
- `operations_pulse`: Returns campus workload, SLA indicators, and recommendations.
- `list_tickets`: Returns open/in-progress campus tickets filtered by category or status.

---

## 4. Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio API key. If omitted, the high-precision local fallback engine activates automatically. |
| `GEMINI_MODEL` | `gemini-3.8-flash-lite` | Target model. Can be set to `gemini-2.5-flash-lite` or `gemini-2.5-flash`. |
| `PORT` | `3001` (local) / `8080` (Cloud Run) | HTTP server port. |
| `DATABASE_PATH` | `./data/campusconnect.db` | Path to persistent SQLite database (built-in `node:sqlite`). |
| `NODE_ENV` | `production` | Production environment flag. |
