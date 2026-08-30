from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

class StrictBaseModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        from_attributes=True
    )

class ErrorBody(StrictBaseModel):
    code: str
    message: str
    detail: Optional[Any] = None
    request_id: Optional[str] = None

class ErrorResponse(StrictBaseModel):
    error: ErrorBody

class PageMeta(StrictBaseModel):
    limit: int
    offset: int
    total: int
