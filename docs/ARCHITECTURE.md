# Architecture — AI Invoice Extractor

---

## System Overview

```
┌──────────────────────────────────────────────┐
│           React Frontend (Vercel)             │
│  Landing │ Auth │ Upload │ History │ Analytics │
└────────────────────┬─────────────────────────┘
                     │ HTTPS (Axios)
┌────────────────────▼─────────────────────────┐
│           FastAPI Backend (Render)            │
│                                               │
│  POST /extract/single                         │
│  POST /extract/batch                          │
│  GET  /invoices         GET /invoices/{id}    │
│  POST /invoices/consolidate                   │
│  GET  /templates        POST /templates       │
│  GET  /export/{id}      POST /export/consolidated│
│  GET  /analytics/summary                      │
│  GET  /analytics/by-vendor                    │
│  GET  /analytics/monthly                      │
└──────┬──────────────────────┬─────────────────┘
       │                      │
┌──────▼──────┐   ┌───────────▼──────────────┐
│   Gemini    │   │        Supabase           │
│  2.0 Flash  │   │                           │
│   Vision    │   │  Auth    (JWT tokens)     │
│  (Google)   │   │  DB      (PostgreSQL)     │
│             │   │  Storage (PDF/image files)│
└─────────────┘   └───────────────────────────┘
```

---

## Request Flow — Single Invoice Extraction

```
1. User drops PDF on Upload.jsx
2. React sends POST /extract/single (multipart/form-data)
   Authorization: Bearer <supabase_jwt>
3. FastAPI middleware validates JWT → extracts user_id
4. File validated (type: pdf/png/jpg, size: ≤10MB)
5. File saved to Supabase Storage → returns file_url
6. PDF → converted to image via pdf2image (first page)
7. Image bytes + prompt sent to Gemini Vision API
8. Gemini returns structured JSON
9. JSON + metadata saved to invoices table
10. Response returned to frontend
11. React renders extracted fields in card UI
```

---

## Batch Processing Flow

```
1. User uploads N files → POST /extract/batch
2. Backend creates job_id, starts async processing
3. Frontend opens SSE connection: GET /extract/batch/progress/{job_id}
4. Each file processed → SSE event fired:
   { file_name, status, result, progress_percent }
5. Frontend renders result card per event
6. All done → SSE stream closes
```

---

## Auth Flow

```
1. User signs up/logs in via Supabase Auth (frontend)
2. Supabase returns JWT access token
3. Token stored in Supabase session (auto-managed)
4. Every API call includes: Authorization: Bearer <token>
5. FastAPI middleware decodes JWT using SUPABASE_JWT_SECRET
6. user_id extracted from token sub claim
7. All DB queries filter by this user_id
8. Supabase RLS provides second layer: DB-level isolation
```

---

## Folder Structure

```
AI_Invoice_Extractor/
├── backend/
│   ├── main.py               # FastAPI app, CORS, middleware, router registration
│   ├── config.py             # Settings loaded from .env via pydantic BaseSettings
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── extract.py        # /extract/single, /extract/batch, SSE progress
│   │   ├── invoices.py       # CRUD for invoices, /consolidate
│   │   ├── templates.py      # CRUD for extraction templates
│   │   ├── export.py         # /export/{id}, /export/consolidated
│   │   └── analytics.py      # /analytics/summary, /by-vendor, /monthly
│   └── services/
│       ├── gemini_service.py  # Gemini API client, prompt builder, response parser
│       ├── supabase_service.py# Supabase client, storage upload helper
│       └── export_service.py  # CSV/Excel/JSON/PDF generation
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx           # React root, router setup
│       ├── App.jsx            # Route definitions
│       ├── lib/
│       │   ├── supabaseClient.js  # Supabase JS client init
│       │   ├── AuthContext.jsx    # Global auth state provider
│       │   └── api.js             # Axios instance with auth header
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   ├── Navbar.jsx
│       │   ├── ExportDropdown.jsx
│       │   └── InvoiceCard.jsx
│       └── pages/
│           ├── Landing.jsx
│           ├── Login.jsx
│           ├── Signup.jsx
│           ├── Dashboard.jsx
│           ├── Upload.jsx
│           ├── History.jsx
│           ├── InvoiceDetail.jsx
│           ├── Templates.jsx
│           └── Analytics.jsx
│
└── docs/
    ├── SETUP_GUIDE.md
    ├── ARCHITECTURE.md        # this file
    ├── DATABASE_SCHEMA.md
    ├── API_REFERENCE.md
    └── DEPLOYMENT.md
```

---

## Tech Decisions

### Why FastAPI over Flask?
- Native async support — needed for SSE batch streaming
- Auto-generated Swagger docs at `/docs`
- Pydantic models for request/response validation built-in

### Why Supabase over plain PostgreSQL?
- Auth (JWT) + DB + Storage in one platform
- RLS policies = data isolation without app-level code
- Free tier covers the entire project

### Why Gemini 2.0 Flash over GPT-4o or Textract?
- Free tier: 15 req/min, 1M tokens/day — no cost for portfolio
- Handles PDF images, scanned invoices, handwriting
- Returns structured JSON reliably with correct prompting

### Why pdf2image instead of sending PDF directly?
- Gemini Vision works best with images
- pdf2image extracts first page as high-res PNG → better extraction accuracy
- Requires Poppler (see SETUP_GUIDE.md)

### Why Vercel + Render?
- Both have free tiers that never expire for hobby/portfolio projects
- Vercel auto-deploys on git push (frontend)
- Render supports Python WSGI/ASGI apps (backend)
