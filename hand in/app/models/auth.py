import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum as SAEnum, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class RoleEnum(str, enum.Enum):
    guest = "guest"
    staff = "staff"
    manager = "manager"
    owner = "owner"

class Account(Base):
    __tablename__ = "accounts"
    
    account_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(RoleEnum, name="account_role", values_callable=lambda x: [e.value for e in x]), nullable=False, default=RoleEnum.guest)
    property_id = Column(Integer, ForeignKey("properties.property_id", ondelete="RESTRICT"), nullable=True)
    guest_id = Column(Integer, ForeignKey("guests.guest_id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    property = relationship("Property", back_populates="accounts", foreign_keys=[property_id])
    guest = relationship("Guest", back_populates="account", foreign_keys=[guest_id])
    refresh_tokens = relationship("RefreshToken", back_populates="account", cascade="all, delete-orphan")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    token_id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    account = relationship("Account", back_populates="refresh_tokens")

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    
    jti = Column(String(100), primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
