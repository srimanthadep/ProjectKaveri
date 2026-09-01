-- KAVERI STAYS: 25 ANALYTICAL BUSINESS QUERIES (STAGE 4)
-- SECTION A: AVAILABILITY AND OPERATIONS
-- 4.1 Free rooms at Kaveri Backwater for 15-20 December 2025
SELECT r.room_id, r.room_number, rt.name AS room_type
FROM rooms r
JOIN properties p ON r.property_id = p.property_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
WHERE p.name = 'Kaveri Backwater'
  AND r.room_id NOT IN (
      SELECT b.room_id
      FROM bookings b
      WHERE b.stay && daterange('2025-12-15', '2025-12-20', '[)')
        AND b.status NOT IN ('cancelled', 'no_show')
  )
ORDER BY r.room_number;


-- 4.2 Rooms occupied tonight and guest details
SELECT p.name AS property_name, r.room_number, g.full_name AS guest_name, g.phone
FROM bookings b
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
JOIN guests g ON b.guest_id = g.guest_id
WHERE b.stay @> CURRENT_DATE
  AND b.status IN ('confirmed', 'checked_in');


-- 4.3 Guests checking in tomorrow, room number, and nights booked
SELECT g.full_name, g.phone, p.name AS property_name, r.room_number, 
       (UPPER(b.stay) - LOWER(b.stay)) AS nights_booked
FROM bookings b
JOIN guests g ON b.guest_id = g.guest_id
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
WHERE LOWER(b.stay) = CURRENT_DATE + 1
  AND b.status = 'confirmed';


-- 4.4 Rooms empty for more than 14 consecutive days in 2025
WITH booked_intervals AS (
    SELECT room_id, LOWER(stay) AS checkin, UPPER(stay) AS checkout
    FROM bookings
    WHERE stay && daterange('2025-01-01', '2026-01-01', '[)')
      AND status NOT IN ('cancelled', 'no_show')
),
all_stays AS (
    SELECT room_id, checkin, checkout,
           LAG(checkout) OVER (PARTITION BY room_id ORDER BY checkin) AS prev_checkout
    FROM booked_intervals
)
SELECT p.name AS property_name, r.room_number, (s.checkin - s.prev_checkout) AS gap_days
FROM all_stays s
JOIN rooms r ON s.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
WHERE (s.checkin - s.prev_checkout) > 14
ORDER BY p.name, r.room_number;


-- 4.5 Rooms that have never been booked at all
SELECT p.name AS property_name, r.room_number, rt.name AS room_type
FROM rooms r
JOIN properties p ON r.property_id = p.property_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
LEFT JOIN bookings b ON r.room_id = b.room_id
WHERE b.booking_id IS NULL
ORDER BY p.name, r.room_number;


-- 4.6 Available room count broken down by room type for a given date range
SELECT p.name AS property_name, rt.name AS room_type, COUNT(r.room_id) AS available_rooms
FROM rooms r
JOIN properties p ON r.property_id = p.property_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
WHERE r.room_id NOT IN (
    SELECT b.room_id
    FROM bookings b
    WHERE b.stay && daterange('2025-10-01', '2025-10-05', '[)')
      AND b.status NOT IN ('cancelled', 'no_show')
)
GROUP BY p.name, rt.name
ORDER BY p.name, rt.name;


-- SECTION B: REVENUE AND PERFORMANCE

-- 4.7 Total revenue per property per month for 2025
SELECT p.name AS property_name,
       TO_CHAR(pay.paid_at, 'YYYY-MM') AS revenue_month,
       SUM(pay.amount) AS total_revenue
FROM payments pay
JOIN bookings b ON pay.booking_id = b.booking_id
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
WHERE pay.paid_at >= '2025-01-01' AND pay.paid_at < '2026-01-01'
GROUP BY p.name, TO_CHAR(pay.paid_at, 'YYYY-MM')
ORDER BY p.name, revenue_month;


-- 4.8 Occupancy rate per property per month as a percentage
WITH months AS (
    SELECT generate_series('2025-01-01'::DATE, '2025-12-01'::DATE, '1 month')::DATE AS month_start
),
property_months AS (
    SELECT p.property_id, p.name AS property_name, m.month_start,
           (m.month_start + INTERVAL '1 month')::DATE AS month_end,
           (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.property_id) AS total_rooms,
           ((m.month_start + INTERVAL '1 month')::DATE - m.month_start) AS days_in_month
    FROM properties p
    CROSS JOIN months m
),
occupied_nights AS (
    SELECT pm.property_id, pm.month_start,
           SUM(
               UPPER(b.stay * daterange(pm.month_start, pm.month_end, '[)')) - 
               LOWER(b.stay * daterange(pm.month_start, pm.month_end, '[)'))
           ) AS nights_sold
    FROM property_months pm
    JOIN rooms r ON r.property_id = pm.property_id
    JOIN bookings b ON b.room_id = r.room_id AND b.stay && daterange(pm.month_start, pm.month_end, '[)')
    WHERE b.status NOT IN ('cancelled', 'no_show')
    GROUP BY pm.property_id, pm.month_start
)
SELECT pm.property_name,
       TO_CHAR(pm.month_start, 'YYYY-MM') AS month,
       COALESCE(oc.nights_sold, 0) AS room_nights_sold,
       (pm.total_rooms * pm.days_in_month) AS total_available_nights,
       ROUND((COALESCE(oc.nights_sold, 0)::NUMERIC / (pm.total_rooms * pm.days_in_month) * 100), 2) AS occupancy_rate_pct
FROM property_months pm
LEFT JOIN occupied_nights oc ON pm.property_id = oc.property_id AND pm.month_start = oc.month_start
ORDER BY pm.property_name, month;


-- 4.9 Average Daily Rate (ADR) per property
SELECT p.name AS property_name,
       ROUND(SUM(pay.amount) / SUM(UPPER(b.stay) - LOWER(b.stay)), 2) AS adr
FROM bookings b
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
JOIN payments pay ON b.booking_id = pay.booking_id
WHERE b.status NOT IN ('cancelled', 'no_show')
GROUP BY p.name;


-- 4.10 RevPAR (Revenue Per Available Room) per property per month
WITH months AS (
    SELECT generate_series('2025-01-01'::DATE, '2025-12-01'::DATE, '1 month')::DATE AS month_start
),
monthly_metrics AS (
    SELECT p.property_id, p.name AS property_name, m.month_start,
           (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.property_id) AS total_rooms,
           ((m.month_start + INTERVAL '1 month')::DATE - m.month_start) AS days_in_month,
           COALESCE(SUM(pay.amount), 0) AS total_revenue
    FROM properties p
    CROSS JOIN months m
    LEFT JOIN rooms r ON r.property_id = p.property_id
    LEFT JOIN bookings b ON b.room_id = r.room_id 
                         AND b.stay && daterange(m.month_start, (m.month_start + INTERVAL '1 month')::DATE, '[)') 
                         AND b.status NOT IN ('cancelled', 'no_show')
    LEFT JOIN payments pay ON b.booking_id = pay.booking_id
    GROUP BY p.property_id, p.name, m.month_start
)
SELECT property_name,
       TO_CHAR(month_start, 'YYYY-MM') AS month,
       ROUND(total_revenue / (total_rooms * days_in_month), 2) AS revpar
FROM monthly_metrics
ORDER BY property_name, month;


-- 4.11 Room type that earns the most per available room
SELECT rt.name AS room_type,
       ROUND(COALESCE(SUM(pay.amount), 0) / COUNT(DISTINCT r.room_id), 2) AS revenue_per_available_room
FROM room_types rt
JOIN rooms r ON rt.room_type_id = r.room_type_id
LEFT JOIN bookings b ON r.room_id = b.room_id AND b.status NOT IN ('cancelled', 'no_show')
LEFT JOIN payments pay ON b.booking_id = pay.booking_id
GROUP BY rt.name
ORDER BY revenue_per_available_room DESC;


-- 4.12 Rank properties by revenue within each quarter
WITH quarterly_rev AS (
    SELECT p.name AS property_name,
           EXTRACT(YEAR FROM pay.paid_at) AS rev_year,
           EXTRACT(QUARTER FROM pay.paid_at) AS rev_quarter,
           SUM(pay.amount) AS total_revenue
    FROM payments pay
    JOIN bookings b ON pay.booking_id = b.booking_id
    JOIN rooms r ON b.room_id = r.room_id
    JOIN properties p ON r.property_id = p.property_id
    WHERE pay.paid_at >= '2025-01-01' AND pay.paid_at < '2026-01-01'
    GROUP BY p.name, EXTRACT(YEAR FROM pay.paid_at), EXTRACT(QUARTER FROM pay.paid_at)
)
SELECT rev_year, rev_quarter, property_name, total_revenue,
       DENSE_RANK() OVER (PARTITION BY rev_year, rev_quarter ORDER BY total_revenue DESC) AS quarter_rank
FROM quarterly_rev
ORDER BY rev_year, rev_quarter, quarter_rank;


-- 4.13 Running total of revenue across 2025
SELECT pay.paid_at::DATE AS payment_date,
       SUM(pay.amount) AS daily_revenue,
       SUM(SUM(pay.amount)) OVER (ORDER BY pay.paid_at::DATE) AS running_total_revenue
FROM payments pay
WHERE pay.paid_at >= '2025-01-01' AND pay.paid_at < '2026-01-01'
GROUP BY pay.paid_at::DATE
ORDER BY payment_date;


-- 4.14 Compare monthly revenue to previous month and same month last year
WITH monthly_rev AS (
    SELECT DATE_TRUNC('month', paid_at)::DATE AS month_date,
           SUM(amount) AS revenue
    FROM payments
    GROUP BY DATE_TRUNC('month', paid_at)::DATE
)
SELECT TO_CHAR(month_date, 'YYYY-MM') AS current_month,
       revenue AS current_revenue,
       LAG(revenue, 1) OVER (ORDER BY month_date) AS prev_month_revenue,
       LAG(revenue, 12) OVER (ORDER BY month_date) AS same_month_last_year_revenue
FROM monthly_rev
ORDER BY month_date;


-- 4.15 Bookings not fully paid and their shortfall
SELECT b.booking_id, g.full_name,
       ((UPPER(b.stay) - LOWER(b.stay)) * b.nightly_rate) AS total_expected,
       COALESCE(SUM(pay.amount), 0) AS total_paid,
       (((UPPER(b.stay) - LOWER(b.stay)) * b.nightly_rate) - COALESCE(SUM(pay.amount), 0)) AS shortfall
FROM bookings b
JOIN guests g ON b.guest_id = g.guest_id
LEFT JOIN payments pay ON b.booking_id = pay.booking_id
WHERE b.status NOT IN ('cancelled', 'no_show')
GROUP BY b.booking_id, g.full_name, b.stay, b.nightly_rate
HAVING COALESCE(SUM(pay.amount), 0) < ((UPPER(b.stay) - LOWER(b.stay)) * b.nightly_rate);


-- SECTION C: GUESTS AND BEHAVIOUR

-- 4.16 Guests who stayed at more than one property
SELECT g.guest_id, g.full_name, g.email, COUNT(DISTINCT r.property_id) AS properties_visited
FROM guests g
JOIN bookings b ON g.guest_id = b.guest_id
JOIN rooms r ON b.room_id = r.room_id
WHERE b.status NOT IN ('cancelled', 'no_show')
GROUP BY g.guest_id, g.full_name, g.email
HAVING COUNT(DISTINCT r.property_id) > 1;


-- 4.17 Repeat guests: every stay and gap in days since previous stay
WITH guest_stays AS (
    SELECT g.guest_id, g.full_name, b.booking_id, LOWER(b.stay) AS checkin, UPPER(b.stay) AS checkout,
           LAG(UPPER(b.stay)) OVER (PARTITION BY g.guest_id ORDER BY LOWER(b.stay)) AS prev_checkout
    FROM bookings b
    JOIN guests g ON b.guest_id = g.guest_id
    WHERE b.status NOT IN ('cancelled', 'no_show')
)
SELECT full_name, booking_id, checkin, checkout,
       (checkin - prev_checkout) AS gap_days_since_last_stay
FROM guest_stays
WHERE guest_id IN (
    SELECT guest_id FROM bookings WHERE status NOT IN ('cancelled', 'no_show') GROUP BY guest_id HAVING COUNT(*) > 1
)
ORDER BY full_name, checkin;


-- 4.18 Spending quartiles using NTILE (Platinum, Gold, Silver, Bronze)
WITH guest_spending AS (
    SELECT g.guest_id, g.full_name, COALESCE(SUM(pay.amount), 0) AS total_spent
    FROM guests g
    JOIN bookings b ON g.guest_id = b.guest_id
    LEFT JOIN payments pay ON b.booking_id = pay.booking_id
    GROUP BY g.guest_id, g.full_name
)
SELECT full_name, total_spent,
       CASE NTILE(4) OVER (ORDER BY total_spent DESC)
           WHEN 1 THEN 'Platinum'
           WHEN 2 THEN 'Gold'
           WHEN 3 THEN 'Silver'
           WHEN 4 THEN 'Bronze'
       END AS spending_tier
FROM guest_spending
ORDER BY total_spent DESC;


-- 4.19 Cancellation and no-show rate per property
SELECT p.name AS property_name,
       COUNT(*) AS total_bookings,
       COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancellations,
       COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_shows,
       ROUND((COUNT(*) FILTER (WHERE b.status IN ('cancelled', 'no_show'))::NUMERIC / COUNT(*)) * 100, 2) AS churn_rate_pct
FROM properties p
JOIN rooms r ON p.property_id = r.property_id
JOIN bookings b ON r.room_id = b.room_id
GROUP BY p.name
ORDER BY churn_rate_pct DESC;


-- 4.20 Average review rating per property and room type (minimum 3 reviews)
SELECT p.name AS property_name, rt.name AS room_type,
       COUNT(rev.review_id) AS total_reviews,
       ROUND(AVG(rev.rating), 2) AS avg_rating
FROM reviews rev
JOIN bookings b ON rev.booking_id = b.booking_id
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
GROUP BY p.name, rt.name
HAVING COUNT(rev.review_id) >= 3
ORDER BY p.name, avg_rating DESC;


-- 4.21 Guests who stayed but never reviewed (Marketing Mailing List)
SELECT DISTINCT g.guest_id, g.full_name, g.email
FROM guests g
JOIN bookings b ON g.guest_id = b.guest_id
LEFT JOIN reviews rev ON b.booking_id = rev.booking_id
WHERE b.status = 'checked_out'
  AND rev.review_id IS NULL
ORDER BY g.full_name;


-- 4.22 Cohort analysis: month of first stay and return visits
WITH guest_first_stay AS (
    SELECT guest_id, DATE_TRUNC('month', MIN(LOWER(stay)))::DATE AS cohort_month
    FROM bookings
    WHERE status NOT IN ('cancelled', 'no_show')
    GROUP BY guest_id
),
subsequent_stays AS (
    SELECT gfs.cohort_month,
           DATE_TRUNC('month', LOWER(b.stay))::DATE AS activity_month,
           COUNT(DISTINCT b.guest_id) AS returning_guests
    FROM bookings b
    JOIN guest_first_stay gfs ON b.guest_id = gfs.guest_id
    WHERE b.status NOT IN ('cancelled', 'no_show')
    GROUP BY gfs.cohort_month, DATE_TRUNC('month', LOWER(b.stay))::DATE
)
SELECT TO_CHAR(cohort_month, 'YYYY-MM') AS cohort,
       TO_CHAR(activity_month, 'YYYY-MM') AS active_month,
       returning_guests
FROM subsequent_stays
ORDER BY cohort_month, activity_month;


-- 4.23 Most recent stay only for each guest using ROW_NUMBER
WITH ranked_stays AS (
    SELECT g.full_name, b.booking_id, p.name AS property_name, r.room_number,
           LOWER(b.stay) AS checkin, UPPER(b.stay) AS checkout,
           ROW_NUMBER() OVER (PARTITION BY g.guest_id ORDER BY LOWER(b.stay) DESC) AS rn
    FROM guests g
    JOIN bookings b ON g.guest_id = b.guest_id
    JOIN rooms r ON b.room_id = r.room_id
    JOIN properties p ON r.property_id = p.property_id
)
SELECT full_name, booking_id, property_name, room_number, checkin, checkout
FROM ranked_stays
WHERE rn = 1
ORDER BY full_name;


-- 4.24 Single guest who generated the most revenue of all time
SELECT g.guest_id, g.full_name, g.email, SUM(pay.amount) AS total_revenue
FROM guests g
JOIN bookings b ON g.guest_id = b.guest_id
JOIN payments pay ON b.booking_id = pay.booking_id
GROUP BY g.guest_id, g.full_name, g.email
ORDER BY total_revenue DESC
LIMIT 1;


-- 4.25 Revenue report per property with grand total using ROLLUP
SELECT COALESCE(p.name, 'GRAND TOTAL') AS property_name,
       SUM(pay.amount) AS total_revenue
FROM payments pay
JOIN bookings b ON pay.booking_id = b.booking_id
JOIN rooms r ON b.room_id = r.room_id
JOIN properties p ON r.property_id = p.property_id
GROUP BY ROLLUP(p.name);