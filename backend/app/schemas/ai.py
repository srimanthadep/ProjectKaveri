from typing import List, Literal, Optional
from pydantic import Field
from app.schemas.common import StrictBaseModel


class ChatTurn(StrictBaseModel):
    """One prior turn of conversation, as sent back by the client on every
    request (this API is stateless — no server-side chat session)."""
    role: Literal["user", "model"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(StrictBaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatTurn] = Field(default_factory=list, max_length=20)
    # Which screen the user is currently on in the SPA (e.g. "guest-dashboard",
    # "manager-dashboard"). Purely advisory — lets the system prompt tailor
    # tone/suggestions without granting any additional data access.
    current_view: Optional[str] = Field(default=None, max_length=64)


class ChatResponse(StrictBaseModel):
    data: str
