-- Advisory lock functions for order queue serialization.
-- pg_advisory_lock blocks until the lock is free (FIFO queue behavior).
-- pg_advisory_unlock releases it for the next in line.

CREATE OR REPLACE FUNCTION acquire_order_lock(lock_key BIGINT)
RETURNS VOID AS $$
BEGIN
  PERFORM pg_advisory_lock(lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_order_lock(lock_key BIGINT)
RETURNS VOID AS $$
BEGIN
  PERFORM pg_advisory_unlock(lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add an order_queue status tracking table for visibility
CREATE TABLE IF NOT EXISTS order_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT,
  queued_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_queue_status ON order_queue(status);

ALTER TABLE order_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access order_queue" ON order_queue FOR ALL USING (true);
