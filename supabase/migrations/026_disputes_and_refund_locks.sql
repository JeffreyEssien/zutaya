-- ════════════════════════════════════════════════════════════════════
--  Migration 026 — Chargeback disputes + atomic refund locking
--
--  Solves:
--   1. Chargebacks / disputes not tracked anywhere
--   2. Double-refund race (two admin clicks both passing the status check)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. payment_disputes table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_disputes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id            UUID REFERENCES payments(id) ON DELETE CASCADE,
    reference             TEXT NOT NULL,
    paystack_dispute_id   BIGINT UNIQUE,
    amount_kobo           BIGINT,
    currency              TEXT DEFAULT 'NGN',
    category              TEXT,
    reason                TEXT,
    status                TEXT NOT NULL DEFAULT 'awaiting_evidence',
    resolution            TEXT,
    bin                   TEXT,
    last4                 TEXT,
    transaction_amount    BIGINT,
    refund_amount         BIGINT,
    organization_decision TEXT,
    due_at                TIMESTAMPTZ,
    resolved_at           TIMESTAMPTZ,
    evidence_count        INT DEFAULT 0,
    raw_create_payload    JSONB,
    raw_last_payload      JSONB,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment_id ON payment_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_due_at ON payment_disputes(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_disputes_reference ON payment_disputes(reference);

DROP TRIGGER IF EXISTS trg_payment_disputes_updated_at ON payment_disputes;
CREATE TRIGGER trg_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 2. denormalize dispute summary onto payments for fast filtering ──
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dispute_status TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dispute_due_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_payments_dispute_status
    ON payments(dispute_status) WHERE dispute_status IS NOT NULL;

-- ── 3. atomic refund lock ──────────────────────────────────────────
-- Conditional UPDATE: only locks if the payment is eligible AND no other
-- refund is currently in flight. Two concurrent calls can NEVER both win
-- because the WHERE clause uses the row's own column atomically.
--
-- Returns { locked: bool, total_charged_kobo, refunded_amount_kobo, status }
-- so the caller has all info it needs without a separate SELECT.

CREATE OR REPLACE FUNCTION try_lock_refund(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_row payments%ROWTYPE;
BEGIN
    UPDATE payments
       SET refund_status = 'pending',
           updated_at    = now()
     WHERE id = p_payment_id
       AND status IN ('paid', 'partially_refunded')
       AND (refund_status IS NULL
            OR refund_status IN ('processed', 'failed'))
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('locked', false);
    END IF;

    RETURN jsonb_build_object(
        'locked',                 true,
        'total_charged_kobo',     v_row.total_charged_kobo,
        'refunded_amount_kobo',   COALESCE(v_row.refunded_amount_kobo, 0),
        'status',                 v_row.status
    );
END;
$$ LANGUAGE plpgsql;

-- Release the lock if Paystack rejected our refund call. Safe to call
-- even if no lock is held (no-op).
CREATE OR REPLACE FUNCTION release_refund_lock(p_payment_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE payments
       SET refund_status = NULL,
           updated_at    = now()
     WHERE id = p_payment_id
       AND refund_status = 'pending';
END;
$$ LANGUAGE plpgsql;
