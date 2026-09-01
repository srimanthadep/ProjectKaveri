-- Stage 2: Identity, Credentials, Roles and Token Management DDL
-- Kaveri Stays API Authentication Schema

CREATE TYPE account_role AS ENUM (
    'guest',
    'staff',
    'manager',
    'owner'
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id      SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            account_role NOT NULL DEFAULT 'guest',
    property_id     INT REFERENCES properties(property_id) ON DELETE RESTRICT,
    guest_id        INT REFERENCES guests(guest_id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enforce that staff & managers must belong to EXACTLY ONE property
    -- Enforce that guests & owners belong to NO property
    CONSTRAINT chk_role_property_scope CHECK (
        (role IN ('staff', 'manager') AND property_id IS NOT NULL) OR
        (role IN ('guest', 'owner') AND property_id IS NULL)
    ),
    
    -- Enforce that a guest account must link to a guest profile if present
    CONSTRAINT chk_guest_role_guest_id CHECK (
        (role = 'guest') OR (guest_id IS NULL)
    )
);

-- Case-insensitive uniqueness for account emails
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_email_lower 
ON accounts (LOWER(TRIM(email)));

-- Refresh tokens stored server-side for rotation, lifetime tracking, and immediate revocation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id        SERIAL PRIMARY KEY,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    account_id      INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    replaced_by     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account 
ON refresh_tokens (account_id) 
WHERE revoked_at IS NULL;

-- Token blacklist table for immediate access token revocation upon employee termination
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti             VARCHAR(100) PRIMARY KEY,
    account_id      INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    revoked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);
