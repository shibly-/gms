-- GMS (Garage / work-order management) — PostgreSQL schema
-- Aligns with frontend entities in frontend/src/App.jsx (tickets, items, staff, timeline).
--
-- Apply (empty database):
--   psql -U postgres -d your_db -f database/postgres/schema.sql
--
-- Reset (destructive): drop tables then types (see bottom of file).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

CREATE TYPE work_order_stage AS ENUM (
  'Intake',
  'Owner Approval',
  'Diagnosis',
  'Closed',
  'Cancelled'
);

CREATE TYPE staff_role AS ENUM (
  'Supervisor',
  'Senior Tech',
  'Manager',
  'Gate Keeper'
);

CREATE TYPE work_order_cancelled_by AS ENUM (
  'Owner',
  'Supervisor'
);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

CREATE TABLE staff (
  id                TEXT PRIMARY KEY,
  name              TEXT        NOT NULL,
  role              staff_role  NOT NULL,
  phone             TEXT,
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_active ON staff (active) WHERE active = TRUE;
CREATE INDEX idx_staff_role ON staff (role);

COMMENT ON TABLE staff IS 'Workshop personnel (supervisors, techs, gate keepers, managers).';

-- ---------------------------------------------------------------------------
-- Work orders (tickets / invoices)
-- ---------------------------------------------------------------------------

CREATE TABLE work_orders (
  id                        TEXT PRIMARY KEY,
  plate_no                  TEXT,
  model                     TEXT        NOT NULL,
  is_test_vehicle           BOOLEAN     NOT NULL DEFAULT FALSE,
  stage                     work_order_stage NOT NULL DEFAULT 'Intake',

  created_at                DATE        NOT NULL DEFAULT CURRENT_DATE,
  check_in_at               TIMESTAMPTZ,
  check_out_at              TIMESTAMPTZ,

  owner_order_confirmed     BOOLEAN     NOT NULL DEFAULT FALSE,
  supervisor_order_approved BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Display names as used in the UI (optional future FKs to staff.id)
  supervisor                TEXT,
  tech                      TEXT,
  gate_keeper               TEXT,

  gate_pass_verified        BOOLEAN     NOT NULL DEFAULT FALSE,

  service_charge            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (service_charge >= 0),
  discount                  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  paid                      BOOLEAN     NOT NULL DEFAULT FALSE,

  diagnosis_submitted       BOOLEAN     NOT NULL DEFAULT FALSE,
  qc_done                   BOOLEAN     NOT NULL DEFAULT FALSE,

  cancelled_by              work_order_cancelled_by,
  cancelled_at              TIMESTAMPTZ,

  inserted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_orders_stage ON work_orders (stage);
CREATE INDEX idx_work_orders_created_at ON work_orders (created_at DESC);
CREATE INDEX idx_work_orders_plate_no ON work_orders (plate_no) WHERE plate_no IS NOT NULL;
CREATE INDEX idx_work_orders_paid ON work_orders (paid) WHERE paid = TRUE;

COMMENT ON TABLE work_orders IS 'Primary work-order / vehicle job record.';
COMMENT ON COLUMN work_orders.created_at IS 'Business date (YYYY-MM-DD) used for reporting buckets; matches frontend.';

-- ---------------------------------------------------------------------------
-- Line items (parts & services on an invoice)
-- ---------------------------------------------------------------------------

CREATE TABLE work_order_items (
  work_order_id TEXT        NOT NULL REFERENCES work_orders (id) ON DELETE CASCADE,
  id            TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  cost          NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
  approved      BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order    INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (work_order_id, id)
);

CREATE INDEX idx_work_order_items_work_order ON work_order_items (work_order_id, sort_order);

-- ---------------------------------------------------------------------------
-- Timeline / activity log (normalized from ticket.timeline string[])
-- ---------------------------------------------------------------------------

CREATE TABLE work_order_timeline_events (
  id             BIGSERIAL PRIMARY KEY,
  work_order_id  TEXT        NOT NULL REFERENCES work_orders (id) ON DELETE CASCADE,
  sort_order     INT         NOT NULL DEFAULT 0,
  message        TEXT        NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_work_order ON work_order_timeline_events (work_order_id, sort_order);

COMMENT ON TABLE work_order_timeline_events IS 'Ordered narrative events for the work-order details / flow UI.';

-- ---------------------------------------------------------------------------
-- Optional: keep updated_at in sync (requires plpgsql)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Reset script (run manually when rebuilding from scratch)
-- ---------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON work_orders;
-- DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP TABLE IF EXISTS work_order_timeline_events;
-- DROP TABLE IF EXISTS work_order_items;
-- DROP TABLE IF EXISTS work_orders;
-- DROP TABLE IF EXISTS staff;
-- DROP TYPE IF EXISTS work_order_cancelled_by;
-- DROP TYPE IF EXISTS staff_role;
-- DROP TYPE IF EXISTS work_order_stage;
