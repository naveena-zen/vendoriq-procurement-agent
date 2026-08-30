# ProcureIQ — Vendor Proposal Intelligence Agent
## Master System Specification & Documentation

ProcureIQ is an enterprise-grade, AI-powered agent designed for procurement teams to parse, score, benchmark, audit, and negotiate vendor RFP proposals (PDF/DOCX).

---

## 🛠️ Architecture & Tech Stack

### Monorepo Structure
```
procureiq/
├── frontend/                  # React + Vite + TailwindCSS + Recharts
│   ├── src/
│   │   ├── api/client.js      # Backend API communication module
│   │   ├── lib/scoring.js     # Client-side deterministic vendor scoring
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Passcode / magic link single login gate
│   │   │   ├── Home.jsx       # Project dashboard & RFP evaluation list
│   │   │   ├── NewProject.jsx # RFP creation, weight sliders & multi-vendor upload
│   │   │   └── Report.jsx     # Main proposal intelligence dashboard
│   │   ├── App.jsx            # Router and auth state provider
│   │   └── main.jsx           # Vite entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/                   # Python FastAPI Application
│   ├── main.py                # Consolidated FastAPI application (DB, AI Router, Parser, RAG, Endpoints)
│   ├── requirements.txt       # Dependencies
│   └── .env                   # Configuration & API Key templates
├── PROJECT_DETAILS.md         # Comprehensive system documentation
└── README.md                  # Quickstart guide
```

---

## 🤖 AI Router (`ai_router.py` logic)
ProcureIQ routes AI tasks through a single hybrid dispatcher `call_ai(task: str, prompt: str) -> str`:

| Task | Target LLM Provider | Model ID | Purpose |
|---|---|---|---|
| `extract` | Anthropic Claude | `claude-sonnet-4-6` / `claude-3-7-sonnet` | Structured extraction of commercial pricing, SLAs, terms & features |
| `risk` | Anthropic Claude | `claude-sonnet-4-6` / `claude-3-7-sonnet` | Contract risk auditing with inline replacement redline suggestions |
| `summary` | Anthropic Claude | `claude-sonnet-4-6` / `claude-3-7-sonnet` | Procurement executive summary writing & vendor recommendation |
| `negotiation` | Anthropic Claude | `claude-sonnet-4-6` / `claude-3-7-sonnet` | Vendor negotiation strategy points & ready-to-send email drafts |
| `benchmark` | Groq | `llama-3.3-70b-versatile` | Market price competitiveness benchmarking (Low / Typical / High) |
| `chat` | Groq | `llama-3.3-70b-versatile` | Grounded proposal chunk retrieval Q&A assistant |

---

## ⚖️ Deterministic Vendor Scoring Formula

Compliance scoring is executed deterministically in code (both Python backend and JavaScript frontend for real-time What-If slider re-weighting):

$$\text{Price Score} = \max\left(0, 100 - \frac{\text{Cost} - \text{MinCost}}{\text{MaxCost} - \text{MinCost}} \times 50\right)$$
$$\text{SLA Score} = \begin{cases} 100 & \text{if SLA} \ge 99.99\% \\ 96 & \text{if SLA} \ge 99.95\% \\ 92 & \text{if SLA} \ge 99.90\% \\ 80 & \text{if SLA} \ge 99.00\% \end{cases}$$
$$\text{Feature Score} = \frac{\text{Matched Must-Haves}}{\text{Total Must-Haves}} \times 100$$
$$\text{Support Score} = \begin{cases} 100 & \text{if 24/7 Support} \\ 60 & \text{if Business Hours} \\ 0 & \text{if Unspecified} \end{cases}$$

$$\text{Compliance Score} = \frac{(\text{PriceScore} \times W_{\text{price}}) + (\text{SLAScore} \times W_{\text{sla}}) + (\text{FeatureScore} \times W_{\text{features}}) + (\text{SupportScore} \times W_{\text{support}})}{W_{\text{price}} + W_{\text{sla}} + W_{\text{features}} + W_{\text{support}}}$$

---

## 💾 Database Schema (PostgreSQL / SQLite via SQLAlchemy)

- **`projects`**: Stores RFP requirements, priority weight sliders, budget ceiling, executive summary, negotiation emails, sign-off approval, and activity audit log.
- **`vendors`**: Stores parsed raw text, extracted JSON (`VendorExtraction`), embedding chunks for RAG, compliance score, rank, price benchmark, and notes.
- **`risks`**: Stores rule-based and LLM-detected contract risks with severity ratings and redline suggestions.

---

## 📡 API Endpoints Summary

- `POST /api/auth/login` — Single login passcode / magic-link authentication.
- `GET /api/projects` — List all procurement projects.
- `POST /api/projects` — Create project brief & priority weights.
- `GET /api/projects/{id}` — Fetch full intelligence report payload.
- `POST /api/projects/{id}/vendors` — Multipart upload of PDF/DOCX proposal files.
- `POST /api/projects/{id}/analyze` — Run intelligence pipeline (extraction, scoring, risks, benchmark, summary, negotiation, embeddings).
- `POST /api/projects/{id}/chat` — Grounded Q&A over proposal embeddings (Groq Llama 3.3 70B).
- `POST /api/projects/{id}/approve` — Record procurement sign-off stamp.
- `POST /api/vendors/{id}/notes` — Save free-text collaborative vendor notes.
- `GET /api/projects/{id}/export?format=markdown|xlsx|ariba` — Download report as Markdown, formatted Excel workbook, or Ariba/Coupa JSON.
