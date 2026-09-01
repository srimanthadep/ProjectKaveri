from typing import List, Optional
from app.schemas.common import StrictBaseModel

class OccupancyRow(StrictBaseModel):
    property_id: int
    property_name: str
    month: str
    room_nights_available: int
    room_nights_sold: int
    occupancy_pct: str

class OccupancyReportResponse(StrictBaseModel):
    items: List[OccupancyRow]

class RateMetricRow(StrictBaseModel):
    property_id: int
    property_name: str
    month: str
    value: str

class RateMetricReportResponse(StrictBaseModel):
    items: List[RateMetricRow]

class RevenueRow(StrictBaseModel):
    property_id: int
    property_name: str
    month: str
    revenue: str

class RevenueReportResponse(StrictBaseModel):
    items: List[RevenueRow]
    grand_total: str
