1. Project Structure & Deliverables Matrix

Lists every artifact submitted across all stages so an evaluator can navigate the repository:

01_exploration.md: Stage 1 audit documenting anomalies in legacy data.

02_erd.png: Entity-Relationship Diagram with cardinalities and the junction bridge table.

03_schema_original.sql: Stage 2 baseline DDL definition.

04_reconciliation.md: Reconciliation report comparing baseline design with the standard schema.

05_schema_final.sql: Final normalized DDL incorporating all constraint requirements.

06_migration.sql: Zero-loss ETL pipeline migrating and unnesting legacy rows.

07_seed.sql: Expansion of physical room stock and realistic synthetic booking activity.

08_queries.sql: 25 analytical SQL queries covering operations, revenue, and guest behavior.

09_break_it.md: Adversarial testing verifying database constraints and validator output.

10_performance.md: Indexing strategy, EXPLAIN ANALYZE benchmarks, and performance defenses.

README.md: System execution roadmap and design justification.

2. Sequential Execution Guide
Provides the precise order to run scripts in PostgreSQL/pgAdmin:

Database Initialization: Create a clean database instance (CREATE DATABASE kaveri;).

Schema Creation: Execute 05_schema_final.sql to build tables, custom enums, and GiST exclusion constraints.

Data Migration: Execute 06_migration.sql to clean and load legacy records without data loss.

Data Seeding: Execute 07_seed.sql to generate room stock, rate plan tiers, and booking transactions.

Analytics & Verification: Run 08_queries.sql to produce business metrics and test database output.

3. Core Architectural Decisions

Native Range Types (DATERANGE): Implemented using half-open intervals [) (inclusive check-in, exclusive check-out) to allow same-day checkout/check-in turnover without date collisions.

Kernel-Level Concurrency Control (btree_gist): Double-bookings and overlapping seasonal rate intervals are prevented via exclusion constraints rather than application-layer checks.

Partial Indexing for State Transitions: The exclusion constraint uses WHERE (status NOT IN ('cancelled', 'no_show')) so cancelled reservations immediately release inventory back to the market.

Case-Insensitive Identity Resolution: Functional indexes (LOWER(TRIM(email))) enforce human guest uniqueness across casing and whitespace variations.

4. Deliberate Normalization Break (Controlled Denormalization)

Where: bookings.nightly_rate NUMERIC(10,2)

3NF Deviation: In strict third normal form, the nightly rate can be derived dynamically by joining bookings to rate_plans on date intervals and room types.

Engineering Justification: Seasonal pricing rules change over time. If rates were derived dynamically from rate_plans, updating future seasonal prices would retroactively alter past reservation invoices and financial totals. Storing a static snapshot of nightly_rate on the booking record guarantees immutable accounting history.