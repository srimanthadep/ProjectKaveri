import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import SECRET_KEY, CORS_ORIGINS, CORS_ORIGIN_REGEX
from app.errors import (
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_integrity_error_handler,
    generic_exception_handler
)
from app.routers import (
    auth_router, me_router, properties_router, bookings_router,
    payments_router, reviews_router, reports_router, guests_router,
    ai_router
)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Kaveri Stays API",
    version="1.0.0",
    description="Production REST API for Kaveri Stays Hospitality Management.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — explicit origins and dynamic regex for Vercel preview & production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, sqlalchemy_integrity_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# API Routers
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(properties_router)
app.include_router(bookings_router)
app.include_router(payments_router)
app.include_router(reviews_router)
app.include_router(reports_router)
app.include_router(guests_router)
app.include_router(ai_router)

@app.get("/health", tags=["system"], summary="Health check")
def health():
    return {"status": "ok", "service": "kaveri-stays-api"}

# Mount React Single Page Application (frontend/dist or frontend)
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="static_assets")
    
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react_app(full_path: str):
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
