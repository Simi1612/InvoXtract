# Setup Guide — AI Invoice Extractor

Complete local development setup for Windows and Mac.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Git | any | https://git-scm.com |
| Poppler | any | Windows: see below |

### Poppler (required for PDF processing on Windows)

`pdf2image` needs Poppler binaries on Windows.

1. Download from: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract to `C:\poppler`
3. Add `C:\poppler\Library\bin` to your system PATH
4. Verify: open new terminal, run `pdftoppm -v`

On Mac: `brew install poppler`

---

## Step 1 — Clone the Repo

```bash
git clone https://github.com/your-username/AI_Invoice_Extractor.git
cd AI_Invoice_Extractor
```

---

## Step 2 — Supabase Project Setup

1. Go to https://supabase.com → New Project
2. Choose a region close to you, set a strong DB password
3. Once created, go to **Settings → API** and copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT Secret` (Settings → API → JWT Settings) → this is your `SUPABASE_JWT_SECRET`

4. Go to **SQL Editor** in Supabase and run the SQL from [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

5. Go to **Authentication → Providers**:
   - Email: enabled by default
   - Google: enable, add your Google OAuth credentials (see [DEPLOYMENT.md](DEPLOYMENT.md) for OAuth setup)

6. Go to **Storage → New Bucket**:
   - Name: `invoices`
   - Public: No (private)

---

## Step 3 — Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key — this is your `GEMINI_API_KEY`

Free tier: 15 requests/min, 1M tokens/day. No credit card needed.

---

## Step 4 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Edit `backend/.env` and fill in your keys:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=AIza...your-gemini-key
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

Start backend:

```bash
uvicorn main:app --reload
```

Verify: open http://localhost:8000/health — should return `{"status": "ok"}`

API docs at: http://localhost:8000/docs

---

## Step 5 — Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create .env from example
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Edit `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_API_URL=http://localhost:8000
```

> Note: Use the `anon` key for frontend (not service_role). Found in Supabase → Settings → API.

Start frontend:

```bash
npm run dev
```

Open: http://localhost:5173

---

## Step 6 — Verify Everything Works

1. Open http://localhost:5173 — landing page loads
2. Click Sign Up — create an account
3. Go to Upload — drag a PDF invoice
4. Extracted data appears in UI
5. Check http://localhost:8000/docs for full API explorer

---

## Common Issues

| Issue | Fix |
|-------|-----|
| `pdftoppm not found` | Poppler not in PATH. Re-add `C:\poppler\Library\bin` and restart terminal |
| `SUPABASE_JWT_SECRET invalid` | Copy from Supabase → Settings → API → JWT Settings (not the anon key) |
| `CORS error` | Ensure `FRONTEND_URL` in backend `.env` matches exactly (no trailing slash) |
| `Module not found` | Run `pip install -r requirements.txt` inside activated venv |
| Port 8000 in use | `uvicorn main:app --reload --port 8001` then update `VITE_API_URL` |

---

## Project runs at

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
