from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.db import get_db
from app.models.auth import Account, RevokedToken
from app.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Account:
    """
    Authenticate caller via JWT access token.
    Enforces expiration, signature, blacklisting, and active account status.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    token = auth.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    account_id = payload.get("sub")
    jti = payload.get("jti")
    
    if not account_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    # Check if token jti is explicitly revoked (e.g. employee fired at 10:00 - Task 2.8)
    revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    account = db.query(Account).filter(Account.account_id == int(account_id)).first()
    if not account or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or does not exist.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    return account

def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[Account]:
    """Optional user authentication for public endpoints with personalized views."""
    if not auth or not auth.credentials:
        return None
    try:
        return get_current_user(auth, db)
    except HTTPException:
        return None

def require_role(*allowed_roles: str) -> Callable[[Account], Account]:
    """
    Structural RBAC dependency (Stage 7.1, 7.2).
    Enforces role permissions at the dependency level rather than inside route logic.
    """
    def role_checker(current_user: Account = Depends(get_current_user)) -> Account:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )
        return current_user
    return role_checker

def verify_property_access(property_id: int, current_user: Account) -> None:
    """
    Verify property scoping for staff and managers (Task 7.2, 7.3).
    Staff & Managers are strictly bound to their assigned property.
    Owner has unrestricted access.
    """
    if current_user.role.value in ("staff", "manager"):
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to manage or view this property."
            )
