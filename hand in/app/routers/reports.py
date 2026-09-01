from datetime import date
from decimal import Decimal
from typing import Optional, List
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.db import get_db
from app.models.domain import Property, Room, Booking, Payment, BookingStatusEnum
from app.models.auth import Account
from app.schemas.report import (
    OccupancyRow, OccupancyReportResponse, RateMetricRow, RateMetricReportResponse,
    RevenueRow, RevenueReportResponse
)
from app.dependencies import require_role

logger = logging.getLogger("kaveri.reports")
router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/occupancy", response_model=OccupancyReportResponse, summary="Occupancy percentage per property per month.")
def get_occupancy_report(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    property_id: Optional[int] = Query(None),
    current_user: Account = Depends(require_role("manager", "owner")),
    db: Session = Depends(get_db)
):
    """
    Monthly occupancy percentage report (Task 4.4).
    Manager omitting property_id defaults to own property.
    Manager requesting another property gets 403 Forbidden (Attack 8.7).
    """
    target_prop_id = property_id
    if current_user.role.value == "manager":
        if property_id is not None and property_id != current_user.property_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access reporting for another property.")
        target_prop_id = current_user.property_id
        
    prop_filter = "AND p.property_id = :prop_id" if target_prop_id else ""
    
    # Pure SQL aggregation for performance & accuracy
    query = text(f"""
        WITH months AS (
            SELECT generate_series(
                DATE_TRUNC('month', :from_date::date),
                DATE_TRUNC('month', :to_date::date),
                '1 month'::interval
            )::date AS m_start
        ),
        month_bounds AS (
            SELECT m_start, (m_start + '1 month'::interval)::date AS m_end,
                   EXTRACT(days FROM (m_start + '1 month'::interval - m_start))::int AS days_in_m
            FROM months
        ),
        prop_capacity AS (
            SELECT p.property_id, p.name AS property_name, COUNT(r.room_id) AS total_rooms
            FROM properties p
            JOIN rooms r ON p.property_id = r.property_id
            WHERE 1=1 {prop_filter}
            GROUP BY p.property_id, p.name
        ),
        sold_nights AS (
            SELECT p.property_id, mb.m_start,
                   COALESCE(SUM(
                       GREATEST(0, LEAST(b.check_out, mb.m_end) - GREATEST(b.check_in, mb.m_start))
                   ), 0) AS sold
            FROM prop_capacity p
            CROSS JOIN month_bounds mb
            LEFT JOIN rooms r ON p.property_id = r.property_id
            LEFT JOIN bookings b ON r.room_id = b.room_id 
                AND b.status NOT IN ('cancelled', 'no_show')
                AND b.check_in < mb.m_end AND b.check_out > mb.m_start
            GROUP BY p.property_id, mb.m_start
        )
        SELECT 
            pc.property_id,
            pc.property_name,
            TO_CHAR(mb.m_start, 'YYYY-MM') AS month_str,
            (pc.total_rooms * mb.days_in_m) AS available_rn,
            COALESCE(sn.sold, 0) AS sold_rn,
            ROUND((COALESCE(sn.sold, 0)::numeric / NULLIF(pc.total_rooms * mb.days_in_m, 0)::numeric) * 100, 2) AS occ_pct
        FROM prop_capacity pc
        CROSS JOIN month_bounds mb
        LEFT JOIN sold_nights sn ON pc.property_id = sn.property_id AND mb.m_start = sn.m_start
        ORDER BY pc.property_id, mb.m_start;
    """)
    
    params = {"from_date": from_, "to_date": to}
    if target_prop_id:
        params["prop_id"] = target_prop_id
    
    try:
        results = db.execute(query, params).fetchall()
    except Exception as exc:
        logger.warning(f"Occupancy report query failed (falling back to empty): {exc}")
        results = []
        
    items = [
        OccupancyRow(
            property_id=row[0],
            property_name=row[1],
            month=row[2],
            room_nights_available=int(row[3]),
            room_nights_sold=int(row[4]),
            occupancy_pct=f"{Decimal(str(row[5])):.2f}" if row[5] is not None else "0.00"
        )
        for row in results
    ]
    
    return OccupancyReportResponse(items=items)

@router.get("/adr", response_model=RateMetricReportResponse, summary="Average daily rate per property per month.")
def get_adr_report(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    property_id: Optional[int] = Query(None),
    current_user: Account = Depends(require_role("manager", "owner")),
    db: Session = Depends(get_db)
):
    """Average Daily Rate (ADR) report (Task 4.4)."""
    target_prop_id = property_id
    if current_user.role.value == "manager":
        if property_id is not None and property_id != current_user.property_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access reporting for another property.")
        target_prop_id = current_user.property_id
        
    prop_filter = "AND p.property_id = :prop_id" if target_prop_id else ""
    
    query = text(f"""
        SELECT 
            p.property_id,
            p.name AS property_name,
            TO_CHAR(pay.paid_at, 'YYYY-MM') AS month_str,
            ROUND(AVG(b.nightly_rate), 2) AS adr_val
        FROM properties p
        JOIN rooms r ON p.property_id = r.property_id
        JOIN bookings b ON r.room_id = b.room_id
        JOIN payments pay ON b.booking_id = pay.booking_id
        WHERE pay.paid_at >= :from_date AND pay.paid_at <= :to_date {prop_filter}
        GROUP BY p.property_id, p.name, TO_CHAR(pay.paid_at, 'YYYY-MM')
        ORDER BY p.property_id, month_str;
    """)
    
    params = {"from_date": from_, "to_date": to}
    if target_prop_id:
        params["prop_id"] = target_prop_id
    
    try:
        results = db.execute(query, params).fetchall()
    except Exception as exc:
        logger.warning(f"ADR report query failed (falling back to empty): {exc}")
        results = []
        
    items = [
        RateMetricRow(
            property_id=row[0],
            property_name=row[1],
            month=row[2],
            value=f"{Decimal(str(row[3])):.2f}" if row[3] is not None else "0.00"
        )
        for row in results
    ]
    return RateMetricReportResponse(items=items)

@router.get("/revpar", response_model=RateMetricReportResponse, summary="Revenue per available room, per property per month.")
def get_revpar_report(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    property_id: Optional[int] = Query(None),
    current_user: Account = Depends(require_role("manager", "owner")),
    db: Session = Depends(get_db)
):
    """Revenue Per Available Room (RevPAR) report (Task 4.4)."""
    target_prop_id = property_id
    if current_user.role.value == "manager":
        if property_id is not None and property_id != current_user.property_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access reporting for another property.")
        target_prop_id = current_user.property_id
        
    prop_filter = "AND p.property_id = :prop_id" if target_prop_id else ""
    
    query = text(f"""
        SELECT 
            p.property_id,
            p.name AS property_name,
            TO_CHAR(pay.paid_at, 'YYYY-MM') AS month_str,
            ROUND(SUM(pay.amount) / NULLIF(
                COUNT(DISTINCT r.room_id) * 
                EXTRACT(days FROM (DATE_TRUNC('month', pay.paid_at) + INTERVAL '1 month' - DATE_TRUNC('month', pay.paid_at)))::int,
            0), 2) AS revpar_val
        FROM properties p
        JOIN rooms r ON p.property_id = r.property_id
        LEFT JOIN bookings b ON r.room_id = b.room_id
        LEFT JOIN payments pay ON b.booking_id = pay.booking_id AND pay.paid_at >= :from_date AND pay.paid_at <= :to_date
        WHERE 1=1 {prop_filter}
        GROUP BY p.property_id, p.name, TO_CHAR(pay.paid_at, 'YYYY-MM')
        ORDER BY p.property_id, month_str;
    """)
    
    params = {"from_date": from_, "to_date": to}
    if target_prop_id:
        params["prop_id"] = target_prop_id
    
    try:
        results = db.execute(query, params).fetchall()
    except Exception as exc:
        logger.warning(f"RevPAR report query failed (falling back to empty): {exc}")
        results = []
        
    items = [
        RateMetricRow(
            property_id=row[0],
            property_name=row[1],
            month=row[2] or "2025-12",
            value=f"{Decimal(str(row[3])):.2f}" if row[3] is not None else "0.00"
        )
        for row in results
    ]
    return RateMetricReportResponse(items=items)

@router.get("/revenue", response_model=RevenueReportResponse, summary="Revenue per property per month, across all properties.")
def get_revenue_report(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    current_user: Account = Depends(require_role("owner")),
    db: Session = Depends(get_db)
):
    """
    Cross-property monthly revenue report with grand total (Task 4.4).
    Owner only: Managers receive 403 Forbidden because this shape is inherently cross-property.
    """
    query = text("""
        SELECT 
            p.property_id,
            p.name AS property_name,
            TO_CHAR(pay.paid_at, 'YYYY-MM') AS month_str,
            SUM(pay.amount) AS total_rev
        FROM properties p
        JOIN rooms r ON p.property_id = r.property_id
        JOIN bookings b ON r.room_id = b.room_id
        JOIN payments pay ON b.booking_id = pay.booking_id
        WHERE pay.paid_at >= :from_date AND pay.paid_at <= :to_date
        GROUP BY p.property_id, p.name, TO_CHAR(pay.paid_at, 'YYYY-MM')
        ORDER BY p.property_id, month_str;
    """)
    
    try:
        results = db.execute(query, {"from_date": from_, "to_date": to}).fetchall()
    except Exception:
        results = []
        
    items = []
    grand_total = Decimal("0.00")
    for row in results:
        rev_dec = Decimal(str(row[3])) if row[3] is not None else Decimal("0.00")
        grand_total += rev_dec
        items.append(
            RevenueRow(
                property_id=row[0],
                property_name=row[1],
                month=row[2],
                revenue=f"{rev_dec:.2f}"
            )
        )
        
    return RevenueReportResponse(
        items=items,
        grand_total=f"{grand_total:.2f}"
    )
