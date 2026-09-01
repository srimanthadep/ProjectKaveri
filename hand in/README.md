# Kaveri Stays — Production FastAPI Backend Modernization

An enterprise-grade REST API backend built with **FastAPI**, **Pydantic v2**, **SQLAlchemy**, and **PostgreSQL** for the Kaveri Stays hospitality management platform.

---

## 1. Project Structure & Deliverables Matrix

```
c:\Users\srima\Desktop\Kaveri\Kaveri API\
├── 01_constraints.md             # Stage 1: Constraint inventory & SQLSTATE-to-HTTP mappings
├── 02_auth_design.md             # Stage 2: Identity, roles, JWT claims & revocation architecture
├── 02_auth_schema.sql            # Stage 2: Accounts, roles & refresh token DDL
├── 03_openapi_original.yaml      # Stage 3: Hand-crafted OpenAPI 3.1.0 specification
├── 03_authorization_matrix.md   # Stage 3: Endpoint RBAC permission matrix (4 roles)
├── 04_reconciliation.md          # Interlude: Spec reconciliation against openapi_reveal.yaml
├── 05_openapi_final.yaml         # Canonical OpenAPI 3.1.0 contract
├── 06_spec_drift.md              # Stage 6: Spec drift audit and authority defense
├── 06_postman_collection.json    # Stage 6: Postman collection (Workflow & Attack suites)
├── 06_postman_environments/      # Stage 6: 4 role environments (guest, staff, manager, owner)
├── 07_authorization_matrix.md   # Stage 7: Verified multi-tenant authorization matrix
├── 08_break_it.md                # Stage 8: 14 adversarial attack test reports & concurrency results
├── 09_performance.md             # Stage 9: N+1 query benchmarks, rate limiting & EXPLAIN plans
├── README.md                     # Master setup & execution guide
├── requirements.txt              # Pinned Python package dependencies
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git secrets & artifact exclusions
├── app/                          # Core application codebase
│   ├── main.py                   # FastAPI app, middleware & error handlers
│   ├── config.py                 # Fail-fast secret validation & settings
│   ├── db.py                     # Database engine & session generator (get_db)
│   ├── dependencies.py           # JWT auth, role enforcement & property scoping
│   ├── errors.py                 # Central SQLSTATE & HTTPException error handler
│   ├── security.py               # Bcrypt password hashing & JWT encoding/decoding
│   ├── models/                   # SQLAlchemy ORM models (Auth & Domain)
│   ├── schemas/                  # Pydantic v2 request/response models
│   └── routers/                  # Modular route handlers
└── tests/                        # Pytest automated test suite (32 tests)
```

---

## 2. Quickstart & Sequential Execution Guide

### Step 1: Initialize Database & Run Schemas
In **pgAdmin 4** or via `psql`:
```sql
CREATE DATABASE kaveri;
-- Run DDL & Data Scripts in exact sequence:
-- 1. 05_schema_final.sql (from Kaveri DB)
-- 2. 06_migration.sql    (from Kaveri DB)
-- 3. 07_seed.sql         (from Kaveri DB)
-- 4. 02_auth_schema.sql  (from Kaveri API)
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```
Ensure `SECRET_KEY` is set to a secure random string (at least 32 characters). If `SECRET_KEY` is missing at startup, the application refuses to boot (Task 2.10).

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Start the API Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation is available at: **`http://localhost:8000/docs`**

### Step 5: Run Automated Test Suite
```bash
pytest -v --cov=app tests/
```

---

## 3. Core Architectural Decisions

1. **Synchronous `def` Route Execution:**
   - Database operations use standard synchronous `def` endpoints executed within FastAPI's thread pool, avoiding event loop stalling on blocking relational queries.
2. **Kernel-Level Concurrency & Temporal Exclusion:**
   - Double-bookings and overlapping seasonal rates are prevented at the database engine level via PostgreSQL `btree_gist` exclusion constraints (`[)` half-open date intervals). Cancelled and no-show bookings immediately release rooms back to market.
3. **Dedicated `accounts` Identity Architecture:**
   - Authentication credentials and RBAC roles live in a dedicated `accounts` table rather than corrupting customer `guests` records. Staff and managers are constrained to exactly one property; owners belong to none.
4. **Structural Dependency Authorization:**
   - Multi-tenant property scoping and role validation live in FastAPI dependencies (`verify_property_access`, `require_role`), eliminating leaky `if` checks in route logic.
5. **Standardized Error Envelope:**
   - All failures across the entire API return a uniform JSON error envelope (`{"error": {"code", "message", "request_id"}}`), sanitizing internal database internals and protecting guest privacy.
6. **Strict Schema Boundaries:**
   - All Pydantic request models enforce `extra="forbid"`, structurally blocking privilege escalation (Attack 8.2) and client-supplied pricing attacks (Attack 8.8).
