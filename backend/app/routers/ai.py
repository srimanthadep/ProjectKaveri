from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_optional_user
from app.models.auth import Account
from app.schemas.ai import ChatRequest, ChatResponse
from app.services.ai_context import build_context
from app.services.gemini_client import build_system_prompt, call_gemini, GeminiError

router = APIRouter(prefix="/ai", tags=["ai"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Floating Gemini assistant chat turn.",
)
@limiter.limit("15/minute")
async def chat(
    request: Request,
    req: ChatRequest,
    current_user: Account | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Stateless chat proxy to Gemini. The caller sends their own conversation
    history each turn (nothing is persisted server-side). Context is scoped
    to the caller's role and, for guests/staff/managers, their own
    guest/property data only — see app/services/ai_context.py.

    Works for anonymous visitors (public landing-page questions) as well as
    authenticated guests/staff/managers/owners, with progressively richer
    grounded context for each.
    """
    context = build_context(db, current_user)
    if req.current_view:
        context["currentScreen"] = req.current_view

    system_prompt = build_system_prompt(context)
    history = [turn.model_dump() for turn in req.history]

    try:
        answer = await call_gemini(system_prompt=system_prompt, history=history, message=req.message)
    except GeminiError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI assistant is temporarily unavailable: {exc}",
        )

    return ChatResponse(data=answer)
