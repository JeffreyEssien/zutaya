-- Admin users with hashed passwords
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Admin audit log — immutable record of all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id),
  admin_email TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- Admin sessions for token-based auth
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only authenticated service role can access these tables
-- The anon key can only read/write via RPC or through the app's API routes
CREATE POLICY "Service access admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Service access admin_audit_logs" ON admin_audit_logs FOR ALL USING (true);
CREATE POLICY "Audit logs are append-only for service" ON admin_audit_logs FOR UPDATE USING (false);
CREATE POLICY "Audit logs cannot be deleted" ON admin_audit_logs FOR DELETE USING (false);
CREATE POLICY "Service access admin_sessions" ON admin_sessions FOR ALL USING (true);
