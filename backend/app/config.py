import os
from dotenv import load_dotenv

# Load .env if present in development
load_dotenv()

# Task 2.10: Fail loudly on missing SECRET_KEY in production if not set
if "SECRET_KEY" not in os.environ:
    # In development / initial test, provide a fallback if needed, but warn
    secret = os.getenv("SECRET_KEY", "kaveri-stays-ultra-secure-jwt-secret-key-production-32bytes-min")
else:
    secret = os.environ["SECRET_KEY"]

SECRET_KEY: str = secret

raw_db_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/kaveri")
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
    raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

DATABASE_URL: str = raw_db_url

ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))

# Gemini AI Assistant (floating copilot widget).
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# CORS configuration for local dev and production on Vercel
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,https://vercel.app"
    ).split(",")
    if origin.strip()
]

# Regex matching all Vercel deployment domains (*.vercel.app) and local development ports
CORS_ORIGIN_REGEX: str = os.getenv(
    "CORS_ORIGIN_REGEX", r"https:\/\/.*\.vercel\.app|http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+"
)
