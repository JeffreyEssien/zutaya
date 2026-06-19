-- ════════════════════════════════════════════════════════════════════
--  Migration 023 — Paystack payments, subscriptions, customers, refunds
--
--  - Adds detailed payments ledger (every attempt, full audit trail)
--  - Adds customers table for Paystack customer codes
--  - Extends subscriptions with Paystack plan/sub/auth codes
--  - Adds Paystack reference to orders (denorm for quick lookup)
--  - Keeps legacy payment_method/payment_status for historical orders
--  - Adds subscription_plans table (admin-managed Paystack Plans)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. customers (one row per unique paying email) ──
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  paystack_customer_code TEXT UNIQUE,
  paystack_customer_id BIGINT,
  total_spent_kobo BIGINT DEFAULT 0,
  successful_payments INT DEFAULT 0,
  failed_payments INT DEFAULT 0,
  first_paid_at TIMESTAMPTZ,
  last_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_paystack_code ON customers(paystack_customer_code);

-- ── 2. payments (full ledger — every attempt) ──
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,                       -- ZY-YYYYMMDD-XXXX-aN
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL,                          -- base amount in kobo
  processing_fee_kobo BIGINT DEFAULT 0,                 -- customer's half of Paystack fee
  total_charged_kobo BIGINT NOT NULL,                   -- what we charged (amount + processing_fee)
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending'                -- pending | paid | failed | abandoned | refunded | partially_refunded
    CHECK (status IN ('pending','paid','failed','abandoned','refunded','partially_refunded')),
  channel TEXT,                                         -- card | bank | ussd | qr | bank_transfer
  paystack_fees_kobo BIGINT,                            -- actual fee Paystack charged
  authorization_code TEXT,                              -- saved-card token for recurring
  paystack_transaction_id BIGINT,
  paystack_access_code TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  abandoned_at TIMESTAMPTZ,
  refund_status TEXT                                    -- null | pending | processed | failed
    CHECK (refund_status IS NULL OR refund_status IN ('pending','processed','failed')),
  refunded_amount_kobo BIGINT DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  refund_reference TEXT,
  refund_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  initialize_payload JSONB,                             -- what we sent to Paystack
  verify_response JSONB,                                -- last verify() response
  webhook_payload JSONB,                                -- last webhook event we received
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(customer_email);

-- ── 3. payment_events (every webhook + state transition for forensic audit) ──
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  reference TEXT,
  event_type TEXT NOT NULL,                             -- charge.success | charge.failed | refund.processed | initialize | verify | etc.
  source TEXT NOT NULL,                                 -- webhook | verify | initialize | refund | admin
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_reference ON payment_events(reference);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at DESC);

-- ── 4. orders — add paystack_reference (denorm for quick lookup) ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_fee NUMERIC(10,2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference ON orders(paystack_reference);

-- Note: payment_method + payment_status columns are KEPT for historical orders.
-- New orders default payment_method='paystack'. payment_status drives by Paystack lifecycle:
--   'awaiting_payment' on init -> 'payment_confirmed' on charge.success -> 'failed' on charge.failed -> 'refunded' on refund.processed

-- ── 5. subscription_plans (admin-managed Paystack Plans) ──
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount_kobo BIGINT NOT NULL,
  interval TEXT NOT NULL                                -- weekly | monthly | biweekly_custom
    CHECK (interval IN ('weekly','monthly','quarterly','annually','biweekly_custom')),
  paystack_plan_code TEXT UNIQUE,                       -- null for biweekly_custom (we manage cadence)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- ── 6. subscriptions — Paystack fields ──
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_plan_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_email_token TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_kobo BIGINT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_charge_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_charge_status TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS failure_count INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_sub ON subscriptions(paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ── 7. helper trigger to keep customers totals in sync (best-effort) ──
CREATE OR REPLACE FUNCTION sync_customer_payment_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    UPDATE customers
       SET total_spent_kobo = COALESCE(total_spent_kobo, 0) + NEW.total_charged_kobo,
           successful_payments = COALESCE(successful_payments, 0) + 1,
           first_paid_at = COALESCE(first_paid_at, NEW.paid_at, now()),
           last_paid_at = COALESCE(NEW.paid_at, now()),
           updated_at = now()
     WHERE id = NEW.customer_id;
  ELSIF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status <> 'failed') THEN
    UPDATE customers
       SET failed_payments = COALESCE(failed_payments, 0) + 1,
           updated_at = now()
     WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_customer_stats ON payments;
CREATE TRIGGER trg_payments_customer_stats
AFTER INSERT OR UPDATE OF status ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_customer_payment_stats();

-- ── 8. updated_at auto-touch ──
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
