from app.routers.auth import router as auth_router, me_router
from app.routers.properties import router as properties_router
from app.routers.bookings import router as bookings_router
from app.routers.payments import router as payments_router
from app.routers.reviews import router as reviews_router
from app.routers.reports import router as reports_router
from app.routers.guests import router as guests_router
from app.routers.ai import router as ai_router

__all__ = [
    "auth_router", "me_router", "properties_router", "bookings_router",
    "payments_router", "reviews_router", "reports_router", "guests_router",
    "ai_router"
]
