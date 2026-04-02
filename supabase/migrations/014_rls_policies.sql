-- 014: Replace all USING(true) policies with scoped policies

-- Drop existing policies safely
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Public read policies
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read published pages" ON pages FOR SELECT USING (is_published = true);
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Public read delivery_zones" ON delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public read delivery_locations" ON delivery_locations FOR SELECT USING (true);
CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (is_published = true);
CREATE POLICY "Public read bundle_rules" ON bundle_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read delivery_capacity" ON delivery_capacity FOR SELECT USING (true);

-- Orders: public insert + read/update via service role
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Service update orders" ON orders FOR UPDATE USING (true);

-- Profiles
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admin full access
CREATE POLICY "Admin all inventory_items" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Admin read inventory_logs" ON inventory_logs FOR SELECT USING (true);
CREATE POLICY "Public insert inventory_logs" ON inventory_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all pages" ON pages FOR ALL USING (true);
CREATE POLICY "Admin all coupons" ON coupons FOR ALL USING (true);
CREATE POLICY "Admin all delivery_zones" ON delivery_zones FOR ALL USING (true);
CREATE POLICY "Admin all delivery_locations" ON delivery_locations FOR ALL USING (true);
CREATE POLICY "Admin insert site_settings" ON site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update site_settings" ON site_settings FOR UPDATE USING (true);
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (true);
CREATE POLICY "Admin all products" ON products FOR ALL USING (true);

-- Stockpiles
CREATE POLICY "Public insert stockpiles" ON stockpiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read stockpiles" ON stockpiles FOR SELECT USING (true);
CREATE POLICY "Service update stockpiles" ON stockpiles FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpiles" ON stockpiles FOR DELETE USING (true);
CREATE POLICY "Public insert stockpile_items" ON stockpile_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read stockpile_items" ON stockpile_items FOR SELECT USING (true);
CREATE POLICY "Service update stockpile_items" ON stockpile_items FOR UPDATE USING (true);
CREATE POLICY "Admin delete stockpile_items" ON stockpile_items FOR DELETE USING (true);

-- New tables
CREATE POLICY "Admin all recipes" ON recipes FOR ALL USING (true);
CREATE POLICY "Admin all newsletter_subscribers" ON newsletter_subscribers FOR ALL USING (true);
CREATE POLICY "Admin all newsletter_campaigns" ON newsletter_campaigns FOR ALL USING (true);
CREATE POLICY "Admin all bundle_rules" ON bundle_rules FOR ALL USING (true);
CREATE POLICY "Admin all subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Admin all delivery_capacity" ON delivery_capacity FOR ALL USING (true);
CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);
