from app.schemas.common import StrictBaseModel, ErrorBody, ErrorResponse, PageMeta
from app.schemas.auth import RoleType, RegisterRequest, LoginRequest, RefreshRequest, TokenPair, Me
from app.schemas.property import (
    RoomTypeName, Property, PropertyListResponse, RoomType, Room, RoomPage,
    AvailableRoom, AvailabilityResponse
)
from app.schemas.booking import BookingStatus, BookingCreate, Booking, BookingPage
from app.schemas.payment import PaymentMethod, PaymentCreate, Payment, PaymentListResponse
from app.schemas.review import ReviewCreate, Review, ReviewPage
from app.schemas.report import (
    OccupancyRow, OccupancyReportResponse, RateMetricRow, RateMetricReportResponse,
    RevenueRow, RevenueReportResponse
)
from app.schemas.guest import Guest, GuestPage

__all__ = [
    "StrictBaseModel", "ErrorBody", "ErrorResponse", "PageMeta",
    "RoleType", "RegisterRequest", "LoginRequest", "RefreshRequest", "TokenPair", "Me",
    "RoomTypeName", "Property", "PropertyListResponse", "RoomType", "Room", "RoomPage",
    "AvailableRoom", "AvailabilityResponse",
    "BookingStatus", "BookingCreate", "Booking", "BookingPage",
    "PaymentMethod", "PaymentCreate", "Payment", "PaymentListResponse",
    "ReviewCreate", "Review", "ReviewPage",
    "OccupancyRow", "OccupancyReportResponse", "RateMetricRow", "RateMetricReportResponse",
    "RevenueRow", "RevenueReportResponse",
    "Guest", "GuestPage"
]
