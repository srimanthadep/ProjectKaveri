# Kaveri Stays Database Modernization

A complete PostgreSQL modernization project converting a flat, unnormalized legacy hotel spreadsheet into a robust 3NF relational schema with strict temporal constraints, zero-loss data migration, and a comprehensive analytical business intelligence reporting suite.

---

## Project Structure & Deliverables

| File | Description |
| :--- | :--- |
| `01_exploration.md` | Stage 1 legacy data audit and anomaly findings |
| `02_erd.png` | Entity-Relationship diagram with labeled cardinalities and bridge table |
| `03_schema_original.sql` | Initial Stage 2 DDL definitions |
| `04_reconciliation.md` | Stage 2 reconciliation report comparing schema to standard validator |
| `05_schema_final.sql` | Final normalized DDL incorporating validator requirements |
| `06_migration.sql` | Stage 3 ETL pipeline migrating legacy records with zero data loss |
| `07_seed.sql` | Inventory expansion, rate plans, and synthetic booking activity generation |
| `08_queries.sql` | Stage 4 analytical query suite (all 25 business questions answered) |
| `09_break_it.md` | Stage 5 adversarial constraint testing and validator output |
| `10_performance.md` | Stage 6 indexing strategy, query plans (`EXPLAIN ANALYZE`), and tuning defense |
| `README.md` | Project execution guide, design decisions, and normalization defense |

---

## How to Run Everything in Order

Open **pgAdmin 4** or connect to your PostgreSQL server via `psql`:

1. **Initialize the Database:**
   ```sql
   DROP DATABASE IF EXISTS kaveri;
   CREATE DATABASE kaveri;

##Execute Deliverables Sequentially:

Run 05_schema_final.sql to initialize tables, types, and constraints.

Run 06_migration.sql to transform and populate all 33 legacy reservations.

Run 07_seed.sql to expand physical room stock and generate 130+ operational bookings.

Execute 08_queries.sql to generate analytical reports across operations, revenue, and guest behavior.

##Core Design Decisions

Temporal Modeling with Native DATERANGE:

Stays and seasonal pricing validity are modeled as PostgreSQL DATERANGE columns using half-open [) boundaries. This guarantees mathematical correctness for same-day turnover (a guest can check in on the same date another guest departs).

Exclusion Constraints via btree_gist:
Double-bookings and seasonal rate overlaps are prevented at the database kernel level using EXCLUDE USING gist. A partial index predicate WHERE (status NOT IN ('cancelled', 'no_show')) ensures that cancelled rooms are immediately freed for new reservations.

Case-Insensitive Guest Deduplication:
A functional unique index on LOWER(TRIM(email)) guarantees guest profile uniqueness regardless of user entry casing.

##Deliberate Normalization Breaks & Justifications

Historical Nightly Rate Preserved on bookings (Controlled 3NF Denormalization):

Where: bookings.nightly_rate NUMERIC(10,2)

Why: In a purely normalized model, nightly price could be derived dynamically by joining bookings to rate_plans on property_id, room_type_id, and stay && valid.

Justification: In hospitality management, rate plans change dynamically across seasons and years. If a hotel adjusts its seasonal base price later, deriving historical booking totals from live rate plan tables would retroactively corrupt past accounting records and invoice totals. Storing the rate at the moment of reservation preserves immutable financial history.