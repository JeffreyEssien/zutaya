-- Cron job execution log for admin visibility
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  details TEXT,
  items_processed INT DEFAULT 0,
  ran_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_ran_at ON cron_logs(ran_at DESC);

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access cron_logs" ON cron_logs FOR ALL USING (true);
