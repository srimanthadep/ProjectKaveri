from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.auth import Account, RefreshToken, RoleEnum
from app.models.domain import Guest
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenPair, Me
from app.security import (
    hash_password, verify_password, create_access_token,
    generate_refresh_token, hash_refresh_token
)
from app.dependencies import get_current_user
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post(
    "/register",
    response_model=Me,
    status_code=status.HTTP_201_CREATED,
    summary="Register a guest account."
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    
    existing = db.query(Account).filter(Account.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "account_already_exists", "message": "An account with this email address already exists."}
        )
        
    guest = db.query(Guest).filter(Guest.email == clean_email).first()
    if not guest:
        guest = Guest(
            full_name=req.full_name.strip(),
            email=clean_email,
            phone=req.phone.strip() if req.phone else None
        )
        db.add(guest)
        db.flush()
        
    pwd_hash = hash_password(req.password)
    account = Account(
        email=clean_email,
        password_hash=pwd_hash,
        role=RoleEnum.guest,
        guest_id=guest.guest_id,
        is_active=True
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return Me(
        id=account.account_id,
        email=account.email,
        full_name=guest.full_name,
        role=account.role.value,
        property_id=None
    )

@router.post(
    "/login",
    response_model=TokenPair,
    summary="Exchange credentials for a token pair."
)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    account = db.query(Account).filter(Account.email == clean_email).first()
    
    # Constant-time comparison for non-existent accounts (timing attack mitigation).
    # This is a real bcrypt hash of a throwaway string, generated at dev time.
    dummy_hash = "$2b$12$axTZIRdzcz521arY3odbm.Sut/nPgFO0DMilIYEEptDndlprpNFXi"
    target_hash = account.password_hash if account else dummy_hash
    valid = verify_password(req.password, target_hash)
    
    if not account or not valid or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    access_token = create_access_token(data={
        "sub": str(account.account_id),
        "role": account.role.value,
        "prop": account.property_id,
        "gid": account.guest_id
    })
    
    raw_refresh, refresh_hash = generate_refresh_token()
    now_utc = datetime.now(timezone.utc)
    exp = now_utc + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_refresh = RefreshToken(
        token_hash=refresh_hash,
        account_id=account.account_id,
        expires_at=exp
    )
    db.add(db_refresh)
    db.commit()
    
    return TokenPair(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Rotate a refresh token."
)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(req.refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token."
        )
        
    now_utc = datetime.now(timezone.utc)
    # Ensure timezone awareness for datetime comparisons
    stored_exp = stored.expires_at
    if stored_exp.tzinfo is None:
        stored_exp = stored_exp.replace(tzinfo=timezone.utc)
        
    if stored.revoked_at is not None:
        db.query(RefreshToken).filter(
            RefreshToken.account_id == stored.account_id,
            RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": now_utc})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or already rotated."
        )
        
    if stored_exp < now_utc:
        stored.revoked_at = now_utc
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired."
        )
        
    account = db.query(Account).filter(Account.account_id == stored.account_id).first()
    if not account or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive."
        )
        
    new_raw_refresh, new_refresh_hash = generate_refresh_token()
    stored.revoked_at = now_utc
    stored.replaced_by = new_refresh_hash
    
    new_db_refresh = RefreshToken(
        token_hash=new_refresh_hash,
        account_id=account.account_id,
        expires_at=now_utc + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_db_refresh)
    
    new_access_token = create_access_token(data={
        "sub": str(account.account_id),
        "role": account.role.value,
        "prop": account.property_id,
        "gid": account.guest_id
    })
    
    db.commit()
    
    return TokenPair(
        access_token=new_access_token,
        refresh_token=new_raw_refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the caller's refresh token."
)
def logout(current_user: Account = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(
        RefreshToken.account_id == current_user.account_id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()
    return None

me_router = APIRouter(tags=["auth"])

@me_router.get(
    "/me",
    response_model=Me,
    summary="The caller's own record."
)
def get_me(current_user: Account = Depends(get_current_user), db: Session = Depends(get_db)):
    full_name = current_user.email
    if current_user.guest:
        full_name = current_user.guest.full_name
        
    return Me(
        id=current_user.account_id,
        email=current_user.email,
        full_name=full_name,
        role=current_user.role.value,
        property_id=current_user.property_id
    )
