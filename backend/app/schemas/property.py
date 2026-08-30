from typing import List, Literal, Optional
from datetime import date
from pydantic import Field
from app.schemas.common import StrictBaseModel, PageMeta

RoomTypeName = Literal["Standard", "Deluxe", "Suite"]

class Property(StrictBaseModel):
    id: int
    name: str
    city: str
    stars: int = Field(ge=1, le=5)

class PropertyListResponse(StrictBaseModel):
    items: List[Property]

class RoomType(StrictBaseModel):
    name: RoomTypeName
    max_occupancy: int = Field(ge=1)

class Room(StrictBaseModel):
    id: int
    property_id: int
    room_number: str
    room_type: RoomType

class RoomPage(StrictBaseModel):
    items: List[Room]
    meta: PageMeta

class AvailableRoom(StrictBaseModel):
    room_id: int
    room_number: str
    room_type: RoomType
    nights: int
    total_rate: str

class AvailabilityResponse(StrictBaseModel):
    property_id: int
    from_: date = Field(alias="from")
    to: date
    items: List[AvailableRoom]
