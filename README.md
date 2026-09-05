# ProcureIQ — AI Vendor Proposal Intelligence Agent

**Turn a stack of vendor PDFs into a ranked, risk-audited, negotiation-ready procurement decision — in minutes.**

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Claude](https://img.shields.io/badge/Claude%20Sonnet-4.6-8B5CF6?style=flat-square&logo=anthropic&logoColor=white)
![Groq](https://img.shields.io/badge/Groq%20Llama-3.3%2070B-F97316?style=flat-square&logo=meta&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite%20%2F%20PostgreSQL-003B57?style=flat-square&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)
![AI Powered](https://img.shields.io/badge/AI-Powered-4F46E5?style=flat-square&logo=openai&logoColor=white)

---

## Project Overview

ProcureIQ is a full-stack AI procurement intelligence platform that ingests multi-vendor proposal documents (PDF/DOCX), extracts structured commercial data, scores and ranks vendors using a deterministic weighted formula, flags contract risks with AI-generated redline suggestions, and produces ready-to-use negotiation emails and executive summaries — all from a single dashboard.

Built for enterprise procurement teams, sourcing managers, and procurement operations analysts who handle competitive RFPs and need to move from raw proposals to a sign-off decision faster and with less manual labour.

---

## Problem Statement

Evaluating 3–10 vendor proposals for an enterprise RFP is a week-long process: analysts manually read every document, extract pricing and SLA terms into spreadsheets, cross-check must-have compliance, flag missing clauses, and draft negotiation emails from scratch. Each step is error-prone, inconsistent across reviewers, and creates no audit trail. When stakeholders ask "why did we rank Vendor A above Vendor B?", there is rarely a reproducible, documented answer.

---

## The Solution

ProcureIQ automates the entire upstream evaluation workflow in a single pipeline:

1. **Upload** — drag-and-drop PDF or DOCX proposal files for each vendor
2. **Extract** — Claude Sonnet structurally parses pricing, SLA, features, and contract terms from raw document text
3. **Score** — a deterministic Python formula computes a 0–100 compliance score per vendor, weighted by user-configurable priorities
4. **Risk-Flag** — hybrid rule engine + Claude identifies missing clauses, vague terms, one-sided liability caps, and generates specific contract redline language
5. **Benchmark** — Groq/Llama evaluates whether each quoted price is low, typical, or high relative to market
6. **Recommend** — Claude drafts a 150–250 word executive summary and per-vendor negotiation emails
7. **Decide** — the interactive What-If simulator lets stakeholders re-weight priorities in real time; Approve & Sign stamps the decision with an audit log entry

---

## Key Features

- **Compliance Scoring** — deterministic weighted formula across Price, SLA, Features, and Support (0–100 scale)
- **Vendor Ranking** — automatic rank ordering based on computed compliance scores
- **Risk & Redline Detection** — hybrid rule-based + LLM audit flagging missing info, vague clauses, one-sided terms, cost risks, and non-compliance; each risk includes a suggested replacement contract clause
- **Price Benchmarking** — Groq/Llama classifies each vendor's total cost as `low` / `typical` / `high` against market rates
- **Executive Summary** — Claude-generated 150–250 word procurement narrative with recommended vendor and top risks
- **Negotiation Email Drafting** — Claude produces per-vendor, ready-to-send negotiation emails surfaced in a copy-to-clipboard modal
- **Live What-If Simulator** — four weight sliders (Price / SLA / Features / Support) re-rank all vendors in real time in the browser without a server round-trip
- **"Ask Your Proposals" Chat** — RAG-powered chat assistant using cosine-similarity retrieval over chunked proposal text, answered by Groq/Llama with vendor citations
- **Approve & Sign** — procurement sign-off captures approver name, timestamp, and status; recorded in the activity log
- **Multi-Format Export** — Markdown executive summary, styled Excel workbook (`.xlsx`), and Ariba/Coupa-compatible JSON
- **Per-Vendor Notes** — freetext notes field per vendor, persisted to the database
- **Activity Audit Log** — chronological log of project creation, uploads, analysis, chat interactions, and sign-off events
- **Side-by-Side Comparison Matrix** — attribute table with green-highlighted best-value cells across all vendors
- **Cost Breakdown Bar Chart** — Recharts bar chart visualising quoted total costs across vendors

---

## AI Capabilities

ProcureIQ uses a **hybrid dual-provider AI architecture**, routing each task to the model best suited for it:

### Claude Sonnet 4.6 (Anthropic) — reasoning-heavy tasks

| Task | Why Claude |
|------|-----------|
| Document extraction | Structured JSON output from unstructured prose requires deep reading comprehension |
| Risk detection & redlines | Legal clause identification and specific contract language drafting require reasoning depth |
| Executive summary | Synthesis of ranked data into professional narrative prose |
| Negotiation email drafting | Contextual persuasive writing with vendor-specific pricing and clause references |

### Groq + Llama 3.3 70B — speed-critical tasks

| Task | Why Groq |
|------|---------|
| Price benchmarking | Simple classification (low/typical/high) against general market knowledge; speed matters |
| Proposal chat (RAG) | Interactive Q&A on pre-retrieved chunks; sub-second latency for good UX |

**Fallback Mode:** If API keys are absent or calls fail, the system automatically falls back to a heuristic local engine — regex-based cost/uptime extraction for document parsing and hand-crafted JSON for other tasks — so the application runs and demonstrates end-to-end flow without any API keys.

---

## Architecture Overview

```
+---------------------------------------------------------------------+
|                        BROWSER (React SPA)                          |
|  Login -> Home (project list) -> NewProject -> Report Dashboard     |
|  What-If Simulator (pure JS scoring - no server round-trip)         |
|  Chat Widget (floating, fixed bottom-right)                         |
+-----------------------------+-----------------------------------------+
                              |  HTTP/REST (fetch API)
                              v
+---------------------------------------------------------------------+
|                   FastAPI Backend  (port 8000)                      |
|  /api/auth/login            /api/projects/{id}/analyze             |
|  /api/projects              /api/projects/{id}/chat                |
|  /api/projects/{id}         /api/projects/{id}/approve             |
|  /api/projects/{id}/vendors /api/vendors/{id}/notes                |
|                             /api/projects/{id}/export              |
|                                                                     |
|  [ AI Router call_ai() ]   [ Deterministic Scoring Engine          ]|
|                             [ score_vendor_proposal() - Python     ]|
|                                                                     |
|  Extract / Risk / Summary / Negotiation -----> Anthropic Claude    |
|  Benchmark / Chat (RAG) ----------------------> Groq Llama 3.3 70B |
+-----------------------------+-----------------------------------------+
                              |  SQLAlchemy ORM
                              v
                   +--------------------+
                   | SQLite / PostgreSQL |
                   | projects table      |
                   | vendors table       |
                   | risks table         |
                   +--------------------+
```

---

## AI Workflow

Step-by-step description of what `POST /api/projects/{id}/analyze` does:

1. **Document parsing** — For each uploaded vendor file, `parse_document_file()` extracts raw text using `pdfplumber` (PDF) or `python-docx` (DOCX). Plain-text files fall back to UTF-8 decode.

2. **Structured extraction (Claude)** — Each vendor's raw text is sent to Claude Sonnet with a strict JSON schema prompt. The response is cleaned of markdown fences, parsed, and validated through the `VendorExtraction` Pydantic model. On schema validation failure, a single retry prompt is issued with the error message included. The validated `extraction` dict is stored on the `VendorDB` row.

3. **RAG chunk indexing** — Each vendor's raw text is split into 500-word chunks. A 64-dimensional character-frequency embedding vector is generated for each chunk via NumPy and stored in `embedding_chunks` (JSON column) for later cosine-similarity retrieval.

4. **Deterministic compliance scoring (Python)** — `score_vendor_proposal()` computes four sub-scores (Price, SLA, Feature Coverage, Support Hours) using inverse normalisation and lookup tables, then applies user-configured percentage weights. Ranking is sorted descending by score and written as integer rank positions. No LLM is involved in scoring or ranking.

5. **Risk detection (hybrid)** — Rule-based checks run first: missing total price, missing SLA guarantee, and non-fulfilment of any must-have feature each generate a `RiskDB` row immediately in Python. Then Claude receives all vendors' structured extractions in a single batch prompt and returns an array of additional LLM-detected risks with suggested contract redline replacements. Both sets are committed together.

6. **Price benchmarking (Groq)** — All vendor extractions are sent to Groq/Llama 3.3 70B, which returns a `low / typical / high` classification with reasoning per vendor. Results are written to `price_benchmark` on each `VendorDB` row.

7. **Executive summary (Claude)** — The ranked vendor list and high-severity risks are passed to Claude, which returns a 150–250 word professional procurement narrative. This is stored in `project.summary.text`.

8. **Negotiation emails (Claude)** — All vendor extractions are sent to Claude in a single prompt requesting per-vendor negotiation bullet points and a ready-to-send draft email. Results are stored in `project.negotiation_tips` (JSON array).

9. **Activity log** — An `Analysis Executed` entry is appended to `project.activity_log` with a timestamp and vendor count.

10. **Response** — The endpoint returns the full project record (identical to `GET /api/projects/{id}`), and the frontend navigates directly to the Report dashboard.

**Chat flow** (`POST /api/projects/{id}/chat`): The question is embedded using the same character-frequency function. Cosine similarity is computed against all stored chunk vectors. The top 5 chunks (across all vendors) are injected into a Groq/Llama prompt alongside the question. The answer and cited vendor names are returned.

---

## Scoring Engine Overview

The scoring formula is entirely deterministic — computed in Python (`score_vendor_proposal()` in `backend/main.py`) and mirrored exactly in JavaScript (`src/lib/scoring.js`) for the live What-If simulator. The LLM is never involved in computing or ranking scores.

| Dimension | Default Weight | Scoring Logic |
|-----------|---------------|---------------|
| **Price** | 40% | Inverse min-max normalisation: cheapest = 100, most expensive = 50 (floor), scaled linearly |
| **SLA Uptime** | 25% | Parsed from uptime string: >=99.99% -> 100, >=99.95% -> 96, >=99.9% -> 92, >=99.0% -> 80 |
| **Feature Coverage** | 20% | % of must-have requirements matched against extracted feature list (fuzzy word match with partial credit) |
| **Support Hours** | 15% | 24/7 -> 100, business hours -> 60, any support mentioned -> 50, none -> 0 |

**Final score** = `(price * wPrice + sla * wSLA + feature * wFeature + support * wSupport) / totalWeight`

Users set the four weights at project creation. The What-If simulator on the Report page lets them drag sliders post-analysis and see rankings recalculate instantly in the browser — no server call, no re-analysis.

---

## Screens / Modules

| Screen | Route | Description |
|--------|-------|-------------|
| **Login** | `/login` | Passcode authentication form; stores token in `localStorage`; includes one-click demo passcode fill |
| **Home / Dashboard** | `/` | Lists all procurement projects with vendor count, creation date, summary snippet, and approval status |
| **New Project** | `/project/new` | Multi-step form: project name, must-have requirements, budget ceiling, four weight sliders, vendor file uploads (min 2); animated analysis progress overlay |
| **Report / Intelligence Dashboard** | `/project/:id/report` | Executive summary, vendor ranking cards, What-If simulator, comparison matrix, cost bar chart, risk & redline panel, negotiation email panel, per-vendor notes, activity log, floating chat widget, export dropdown, approve & sign controls |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Passcode authentication; returns session token |
| `GET` | `/api/projects` | List all projects with vendor count and summary |
| `POST` | `/api/projects` | Create new project with requirements brief |
| `GET` | `/api/projects/{id}` | Full project detail: vendors, risks, summary, negotiation tips, activity log |
| `POST` | `/api/projects/{id}/vendors` | Upload a vendor proposal file (multipart); stores parsed raw text |
| `POST` | `/api/projects/{id}/analyze` | Run full AI analysis pipeline; returns updated project record |
| `POST` | `/api/projects/{id}/chat` | RAG chat: cosine similarity retrieval + Groq answer; logs to activity log |
| `POST` | `/api/projects/{id}/approve` | Stamp procurement approval with approver name and timestamp |
| `POST` | `/api/vendors/{vendor_id}/notes` | Save freetext internal notes for a specific vendor |
| `GET` | `/api/projects/{id}/export?format=` | Export report as `markdown`, `xlsx`, or `ariba` JSON |

---

## Project Structure

```
vendor/
├── README.md
├── PROJECT_DETAILS.md
├── procureiq.db                    # SQLite database (auto-created on startup)
│
├── backend/
│   ├── main.py                     # Entire backend: models, AI router, scoring, all endpoints (1,258 lines)
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # Environment variables (not committed; see table below)
│
└── frontend/
    ├── index.html                  # HTML shell; loads Inter font; sets viewport meta
    ├── package.json                # npm dependencies and dev/build scripts
    ├── tailwind.config.js          # Tailwind with custom `brand` indigo colour palette
    ├── postcss.config.js           # PostCSS config for Tailwind
    ├── vite.config.js              # Vite + React plugin config
    └── src/
        ├── main.jsx                # React entry point
        ├── index.css               # Tailwind directives + custom scrollbar styles
        ├── App.jsx                 # Router with auth-guarded routes
        ├── api/
        │   └── client.js           # All fetch() calls to the FastAPI backend (9 functions)
        ├── lib/
        │   └── scoring.js          # Client-side deterministic scoring (mirrors backend formula)
        └── pages/
            ├── Login.jsx           # Passcode login page
            ├── Home.jsx            # Project list dashboard
            ├── NewProject.jsx      # Project creation + file upload form
            └── Report.jsx          # Full intelligence report dashboard (971 lines)
```

---

## Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone the repository

```bash
git clone https://github.com/your-org/procureiq.git
cd procureiq
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Configure environment variables (see table below):

```bash
# Edit backend/.env — add your API keys
# The app runs in fallback mode without keys
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --port 8000
```

On startup the server auto-creates the SQLite database and seeds a realistic 3-vendor sample project so you can explore the full dashboard immediately.

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Login

Use the demo passcode: **`procure123`**  
One-click pre-fill is available in the login UI.

### Switch to PostgreSQL (optional)

Set `DATABASE_URL=postgresql://user:password@host:5432/procureiq` in `backend/.env`. The `psycopg2-binary` driver is already in `requirements.txt`.

---

## Environment Variables

All variables are read from `backend/.env` via `python-dotenv`.

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./procureiq.db` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | `sk-ant-...` |
| `GROQ_API_KEY` | Groq API key for Llama | `gsk_...` |
| `PASSCODE` | Single-password authentication token | `procure123` |
| `CLAUDE_MODEL` | Claude model identifier | `claude-3-7-sonnet-20240229` |
| `GROQ_MODEL` | Groq model identifier | `llama-3.3-70b-versatile` |

The frontend reads one optional variable at build/dev time:

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Backend base URL for all fetch calls | `http://127.0.0.1:8000` |

> The application runs fully without API keys using its built-in heuristic fallback engine — useful for local demos and CI environments.

---

## Deployment

**Backend:** Deploy as a standard Python ASGI application using Uvicorn or Gunicorn behind a reverse proxy (Nginx). Containerise with Docker using a `python:3.11-slim` base image. For production, point `DATABASE_URL` to a managed PostgreSQL instance (Cloud SQL, RDS, Supabase). Inject `ANTHROPIC_API_KEY` and `GROQ_API_KEY` as environment secrets.

**Frontend:** Run `npm run build` to generate the static `dist/` folder. Deploy to any static host (Vercel, Netlify, S3 + CloudFront). Set `VITE_API_URL` to the backend's public URL at build time.

**CORS:** The backend currently allows all origins (`allow_origins=["*"]`). Restrict to your frontend domain in production.

---

## Future Roadmap

- **OCR for scanned PDFs** — Tesseract or AWS Textract for image-only proposal scans
- **Multi-user roles** — buyer, approver, and observer roles with per-role access controls
- **Real procurement system integrations** — native Ariba, Coupa, and SAP SRM API push (currently export-only JSON)
- **Fine-tuned extraction model** — domain-adapted model trained on procurement document corpora
- **Automated email dispatch** — send negotiation emails directly from the platform via SMTP/SendGrid
- **Version history and proposal re-upload** — diff vendor proposals across RFP rounds
- **Custom scoring dimensions** — let buyers add bespoke criteria beyond the four built-in dimensions
- **Audit trail PDF export** — signed, court-admissible procurement decision record

---

## Why This Project Stands Out

**Hybrid AI routing with a deliberate split:** ProcureIQ assigns tasks based on reasoning depth vs. speed requirements. Claude handles extraction, risk reasoning, and drafting — tasks that require multi-step comprehension. Groq/Llama handles benchmarking and interactive chat — tasks where sub-second latency directly impacts UX. This is an engineering decision with measurable tradeoffs, not a default.

**Deterministic scoring, not LLM ranking:** Vendor ranking is computed entirely in Python using an explicit, reproducible formula. The LLM extracts raw data (pricing, SLA strings, feature lists); a separate deterministic engine scores it. This makes scoring auditable and explainable — "Vendor A ranked above B because its uptime SLA scores 100 vs 80 and it is 15% cheaper" — and eliminates hallucination risk in the procurement decision itself.

**Live What-If simulator without a server round-trip:** The scoring formula is implemented twice — once in Python for the backend, once as an exact mirror in `src/lib/scoring.js`. The Report dashboard recomputes all vendor scores and re-ranks them in real time as the user drags weight sliders, with no API call. A deliberate performance and UX optimisation.

**Grounded RAG chat, not a general chatbot:** The chat assistant only cites content from uploaded proposal documents, using cosine-similarity retrieval over chunked vendor text. If the answer is not in the document, it says so — procurement-safe behaviour.

**Production-ready fallback mode:** The application ships with a heuristic fallback engine that handles all AI tasks locally using regex extraction and pre-crafted JSON, enabling offline demos, CI runs, and cost-constrained environments with no API dependency.

---

*Built with FastAPI + React + Claude Sonnet 4.6 + Groq Llama 3.3 70B*
