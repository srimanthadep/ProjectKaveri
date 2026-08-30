import uuid
import logging
from typing import Any, Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger("kaveri.errors")

def create_error_response(
    status_code: int,
    code: str,
    message: str,
    detail: Optional[Any] = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """Build uniform error response adhering strictly to Error schema."""
    req_id = request_id or str(uuid.uuid4())
    payload = {
        "error": {
            "code": code,
            "message": message,
            "request_id": req_id
        }
    }
    if detail is not None:
        payload["error"]["detail"] = detail
    return JSONResponse(status_code=status_code, content=payload)

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle standard FastAPI HTTPExceptions."""
    code = "error"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "unauthenticated"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "forbidden"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "not_found"
    elif exc.status_code == status.HTTP_409_CONFLICT:
        code = "conflict"
    elif exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
        code = "validation_failed"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "too_many_requests"
        
    detail = exc.detail
    message = str(detail) if isinstance(detail, str) else "An error occurred."
    structured_detail = detail if isinstance(detail, (dict, list)) else None
    
    headers = getattr(exc, "headers", None)
    response = create_error_response(exc.status_code, code, message, structured_detail)
    if headers:
        for k, v in headers.items():
            response.headers[k] = v
    return response

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic request parsing and validation errors."""
    details = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", []) if l != "body"])
        details.append({
            "field": loc or "body",
            "reason": err.get("msg", "Invalid value")
        })
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="validation_failed",
        message="Request validation failed.",
        detail=details
    )

async def sqlalchemy_integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    Central SQLSTATE mapping handler (Tasks 1.1, 1.2, 5.2, 5.3).
    Converts PostgreSQL error codes directly to appropriate HTTP status codes.
    Never leaks raw postgres error details to the client (Task 1.4).
    """
    orig = getattr(exc, "orig", None)
    pgcode = getattr(orig, "pgcode", None)
    err_str = str(exc.orig) if orig else str(exc)
    
    # 1. Exclusion Constraint Violation (23P01)
    if pgcode == "23P01" or "exclusion_violation" in err_str.lower() or "no_overlapping" in err_str.lower():
        return create_error_response(
            status_code=status.HTTP_409_CONFLICT,
            code="room_unavailable",
            message="That room is not available for the requested dates."
        )
        
    # 2. Unique Constraint Violation (23505)
    if pgcode == "23505" or "unique_violation" in err_str.lower() or "duplicate key" in err_str.lower():
        if "uq_guests_email_lower" in err_str or "accounts_email" in err_str:
            return create_error_response(
                status_code=status.HTTP_409_CONFLICT,
                code="account_already_exists",
                message="An account with this email address already exists."
            )
        if "reviews_booking_id_key" in err_str:
            return create_error_response(
                status_code=status.HTTP_409_CONFLICT,
                code="duplicate_review",
                message="This booking has already been reviewed."
            )
        return create_error_response(
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
            message="A conflicting record already exists."
        )
        
    # 3. Check Constraint Violation (23514)
    if pgcode == "23514" or "check_violation" in err_str.lower():
        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="validation_failed",
            message="The submitted data violated business constraints."
        )
        
    # 4. Foreign Key Constraint Violation (23503)
    if pgcode == "23503" or "foreign_key_violation" in err_str.lower():
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
            message="Referenced resource was not found."
        )
        
    # Default database error fallback
    logger.error(f"Unhandled Database IntegrityError: {exc}")
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="database_error",
        message="A database integrity conflict occurred."
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unexpected internal server error handler."""
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="internal_server_error",
        message="An unexpected internal server error occurred."
    )
