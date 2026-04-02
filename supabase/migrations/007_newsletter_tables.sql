-- 007: Create newsletter_subscribers and newsletter_campaigns tables

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  source TEXT DEFAULT 'footer',
  token TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sending','sent')),
  sent_at TIMESTAMPTZ,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all newsletter_subscribers" ON newsletter_subscribers FOR ALL USING (true);
CREATE POLICY "Admin all newsletter_campaigns" ON newsletter_campaigns FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(email) WHERE unsubscribed_at IS NULL;
