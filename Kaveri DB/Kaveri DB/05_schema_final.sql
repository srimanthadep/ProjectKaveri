DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rate_plans CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_method_type CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE booking_status AS ENUM (
    'confirmed', 
    'checked_in', 
    'checked_out', 
    'cancelled', 
    'no_show'
);

CREATE TYPE payment_method_type AS ENUM (
    'card', 
    'upi', 
    'bank_transfer', 
    'cash'
);

CREATE TABLE properties (
    property_id     SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    city            VARCHAR(100) NOT NULL,
    star_rating     SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5)
);

CREATE TABLE room_types (
    room_type_id    SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    max_occupancy   SMALLINT NOT NULL CHECK (max_occupancy > 0)
);

CREATE TABLE rooms (
    room_id         SERIAL PRIMARY KEY,
    property_id     INT NOT NULL REFERENCES properties(property_id) ON DELETE RESTRICT,
    room_number     VARCHAR(10) NOT NULL,
    room_type_id    INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    CONSTRAINT uq_property_room_number UNIQUE (property_id, room_number)
);

CREATE TABLE guests (
    guest_id        SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(30),
    city            VARCHAR(100)
);

CREATE UNIQUE INDEX uq_guests_email_lower ON guests (LOWER(TRIM(email)));

CREATE TABLE rate_plans (
    rate_plan_id    SERIAL PRIMARY KEY,
    property_id     INT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    room_type_id    INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE CASCADE,
    season_name     VARCHAR(50),
    valid           DATERANGE NOT NULL,
    nightly_rate    NUMERIC(10, 2) NOT NULL CHECK (nightly_rate > 0),
    CONSTRAINT no_overlapping_rates EXCLUDE USING gist (
        property_id WITH =,
        room_type_id WITH =,
        valid WITH &&
    )
);

CREATE TABLE bookings (
    booking_id      SERIAL PRIMARY KEY,
    guest_id        INT NOT NULL REFERENCES guests(guest_id) ON DELETE RESTRICT,
    room_id         INT NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    stay            DATERANGE NOT NULL,
    guests_count    SMALLINT NOT NULL CHECK (guests_count > 0),
    nightly_rate    NUMERIC(10, 2) NOT NULL CHECK (nightly_rate > 0),
    status          booking_status NOT NULL DEFAULT 'confirmed',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_stay_range CHECK (NOT isempty(stay) AND lower(stay) < upper(stay)),
    CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        room_id WITH =,
        stay WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

CREATE TABLE payments (
    payment_id      SERIAL PRIMARY KEY,
    booking_id      INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method          payment_method_type NOT NULL,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
    review_id       SERIAL PRIMARY KEY,
    booking_id      INT NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments        TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);