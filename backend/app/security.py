import uuid
import hashlib
import datetime
from typing import Any, Dict, Optional
import bcrypt
import jwt
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, BCRYPT_ROUNDS

def hash_password(password: str) -> str:
    """Hash a password using bcrypt with specified cost factor."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4())
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Strictly enforces algorithm to prevent 'none' algorithm attacks (Attack 8.3).
    """
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "require": ["sub", "role", "exp", "iat", "jti"]
        }
    )

def generate_refresh_token() -> tuple[str, str]:
    """
    Generate a cryptographically random refresh token.
    Returns (raw_token, token_hash_for_storage).
    """
    raw_token = f"kvr_{uuid.uuid4().hex}_{uuid.uuid4().hex}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash

def hash_refresh_token(raw_token: str) -> str:
    """Compute SHA-256 hash of a raw refresh token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
