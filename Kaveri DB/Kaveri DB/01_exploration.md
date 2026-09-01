# Stage 1: Legacy Data Exploration and Audit

## 1.1 Total Rows vs. Distinct Human Guests
- Total legacy rows: 30
- Distinct human guests (by normalized email): 19
- Explanation: Repeat visitors (e.g., Aarav Sharma, Anita Desai, Kavya Nair) made multiple bookings across different properties and dates, creating duplicate rows without a central identity.

## 1.2 Identity Variations for Repeat Guests
- Variations found across guest_name (inconsistent letter casing, extra internal whitespace like 'Anita  Desai').
- Inconsistent phone number formatting (e.g., missing '+91' country code, leading zeroes '091...', spaces, hyphens).
- City field casing differences (e.g., 'bengaluru' vs. 'Bengaluru', 'chennai' vs. 'Chennai').

## 1.3 Legacy Date Formats
- Three distinct date string patterns identified:
  1. ISO 8601: YYYY-MM-DD (e.g., '2025-01-12')
  2. Slash format: DD/MM/YYYY (e.g., '14/02/2025')
  3. Long text format: Month DD, YYYY (e.g., 'March 9, 2025')

## 1.4 First Normal Form (1NF) Violations
- Comma-separated room lists found in single records (e.g., Row 2: '102,103', Row 6: '301,302', Row 19: '103,104').
- This violates 1NF atomicity and requires unnesting into separate booking records during migration.

## 1.5 Categorical String Variations
- Booking status strings: 'confirmed', 'CONFIRMED', 'conf', 'cancelled', 'no show'.
- Payment method strings: 'card', 'Card', 'CARD', 'upi', 'UPI', 'Bank Transfer', 'bank transfer'.

## 1.6 Missing Value Representations
- Missing or null notes represented in 4 distinct ways: NULL, empty string (''), 'N/A', and '-'.

## 1.7 Currency and Number Formatting Inconsistencies
- Values in nightly_rate and total_paid contain commas (e.g., '4,500.00', '24,600'), preventing direct numeric casting.

## 1.8 Redundant Property Data
- hotel_name, hotel_city, and hotel_star repeat redundantly across every single row, violating 3NF.

## 1.9 Total Paid Calculations and Multi-Room Bookings
- Total paid equals nights * nightly_rate for single-room bookings, but represents the aggregate bill across all rooms for multi-room bookings.

## 1.10 Conflicting Room Type Classification
- Room 103 at Kaveri Riverside is classified as 'Deluxe' in Row 2 and 'Standard' in Row 19.
- Defense: Room 102 is Deluxe, Room 104 is Standard. In Row 2, Room 103 was booked alongside Room 102 under a blanket Deluxe label. Its base physical classification is Standard.