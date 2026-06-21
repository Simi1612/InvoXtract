from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from routers import extract, invoices, templates, export, analytics

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AI Invoice Extractor", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow both localhost dev and production frontend URL
origins = [settings.frontend_url, "http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router, prefix="/extract", tags=["extraction"])
app.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {str(exc)}"})
