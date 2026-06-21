# AI Invoice Extractor

![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)
![Gemini](https://img.shields.io/badge/Google-Gemini%202.0%20Flash-4285F4?style=flat&logo=google)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

Universal AI-powered invoice data extraction platform. Upload any invoice (PDF/PNG/JPG) — get structured JSON in seconds. Built for small businesses, accounting firms, and enterprises.

---

## Features

- **AI Extraction** — Gemini 2.0 Flash Vision extracts all invoice fields with high accuracy
- **Custom Templates** — define exactly which fields to extract per client/use case
- **Batch Processing** — upload up to 50 invoices at once with live progress tracking
- **Invoice Consolidation** — merge multiple invoices into one unified report
- **Multi-format Export** — CSV, Excel (formatted), JSON, PDF report
- **Analytics Dashboard** — spend by vendor, monthly trends, top vendors
- **Invoice History** — searchable, filterable log of all past extractions
- **Manual Correction** — edit any AI-extracted field inline
- **Guest Demo** — try extraction without signing up
- **Per-user Isolation** — Supabase RLS ensures users never see each other's data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + shadcn/ui |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| AI Engine | Google Gemini 2.0 Flash Vision |
| File Storage | Supabase Storage |
| Export | openpyxl (Excel) + reportlab (PDF) |
| Charts | Recharts |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Quick Start

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full local setup instructions.

```bash
# Clone
git clone https://github.com/your-username/AI_Invoice_Extractor.git
cd AI_Invoice_Extractor

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

---

## Project Structure

```
AI_Invoice_Extractor/
├── backend/                  # FastAPI application
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/              # API route handlers
│   └── services/             # Business logic (Gemini, export, Supabase)
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── pages/            # Route-level components
│   │   ├── components/       # Reusable UI components
│   │   └── lib/              # Supabase client, auth context, utils
│   └── .env.example
└── docs/                     # Full project documentation
    ├── SETUP_GUIDE.md
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

---

## Docs

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Local development setup (Windows + Mac) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and tech decisions |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Tables, columns, RLS policies |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | All endpoints with request/response examples |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Vercel + Render |

---

## License

MIT
