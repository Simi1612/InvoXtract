# Deployment Guide — AI Invoice Extractor

Frontend → Vercel | Backend → Render | DB/Auth/Storage → Supabase

---

## Prerequisites

- GitHub repo with your project pushed
- Supabase project running (see SETUP_GUIDE.md)
- Gemini API key ready

---

## Step 1 — Push to GitHub

```bash
# From project root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/AI_Invoice_Extractor.git
git push -u origin main
```

---

## Step 2 — Deploy Backend to Render

1. Go to https://render.com → Sign in with GitHub
2. Click **New → Web Service**
3. Connect your `AI_Invoice_Extractor` repo
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `ai-invoice-backend` |
| Root Directory | `backend` |
| Environment | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Plan | Free |

5. Add Environment Variables (Render → Environment tab):

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=https://your-app.vercel.app
ENVIRONMENT=production
```

6. Click **Create Web Service** → wait for deploy (~3 min)
7. Copy your Render URL: `https://ai-invoice-backend.onrender.com`

> Note: Render free tier spins down after 15 min inactivity. First request after sleep takes ~30s. Acceptable for portfolio.

---

## Step 3 — Deploy Frontend to Vercel

1. Go to https://vercel.com → Sign in with GitHub
2. Click **Add New → Project**
3. Import your `AI_Invoice_Extractor` repo
4. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

5. Add Environment Variables (Vercel → Settings → Environment Variables):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://ai-invoice-backend.onrender.com
```

6. Click **Deploy** → wait ~1 min
7. Your app is live at: `https://your-app.vercel.app`

---

## Step 4 — Update CORS in Backend

After Vercel deploy, update `FRONTEND_URL` in Render env vars to your real Vercel URL:

```
FRONTEND_URL=https://your-app.vercel.app
```

Trigger redeploy in Render dashboard.

---

## Step 5 — Google OAuth Setup (Production)

1. Go to https://console.cloud.google.com
2. Create project → Enable Google+ API
3. OAuth 2.0 Credentials → Create → Web Application
4. Add Authorized redirect URIs:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
5. Copy Client ID and Client Secret
6. In Supabase → Authentication → Providers → Google:
   - Paste Client ID and Client Secret
   - Enable
7. Add your Vercel domain to Supabase → Authentication → URL Configuration:
   ```
   Site URL: https://your-app.vercel.app
   Redirect URLs: https://your-app.vercel.app/**
   ```

---

## Step 6 — Verify Production

- [ ] Open `https://your-app.vercel.app` — landing page loads
- [ ] Sign up with email — works
- [ ] Sign in with Google — works
- [ ] Upload invoice — extraction completes
- [ ] Export to Excel — file downloads
- [ ] Analytics page — charts render
- [ ] Check `https://ai-invoice-backend.onrender.com/health` → `{"status": "ok"}`

---

## Custom Domain (Optional)

**Vercel:**
1. Vercel → Project → Settings → Domains
2. Add your domain → follow DNS instructions

**Render:**
1. Render → Service → Settings → Custom Domain
2. Add domain → follow DNS instructions
3. Update `FRONTEND_URL` in Render env to new domain

---

## Auto-Deploy on Push

Both Vercel and Render auto-deploy when you push to `main` branch. No manual steps needed after initial setup.

---

## Poppler on Render

Render's Linux environment has Poppler available via apt. Add a `render.yaml` to your repo root for automatic setup:

```yaml
services:
  - type: web
    name: ai-invoice-backend
    env: python
    rootDir: backend
    buildCommand: apt-get install -y poppler-utils && pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_JWT_SECRET
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: ENVIRONMENT
        value: production
```
