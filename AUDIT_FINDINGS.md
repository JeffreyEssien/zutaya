# ZúTa Ya — Audit Findings

_Date: 2026-06-18_
_Source: 2 of 5 parallel audit agents (Security, Performance/Ops). Architecture, UX, and Business agents were not run._

---

## Part 1 — Security & Auth Audit

### CRITICAL (must-fix before production)

1. **13 of 15 admin API routes have ZERO authentication.**
   - Affected: `/api/admin/notifications`, `/api/admin/orders`, `/api/admin/delivery`, `/api/admin/marinades`, `/api/admin/services-config`, `/api/admin/event-occasions`, `/api/admin/event-animals`, `/api/admin/processing-options`, `/api/admin/event-tiers`, `/api/admin/cron-logs`.
   - Impact: Any unauthenticated user can POST/DELETE business config, create fraudulent orders, export sensitive customer/inventory data.
   - Fix: Add `const admin = await getCurrentAdmin(); if (!admin) return NextResponse.json({error:"Unauthorized"},{status:401});` to every admin route.

2. **`/api/admin/orders/route.ts:6-16` bypasses bcrypt entirely.**
   - Compares `session === process.env.ADMIN_SESSION_SECRET`. One leaked env var = full admin access, no password needed.
   - Fix: Use `validateSession(token)` from `lib/adminAuth.ts` or delete this endpoint.

3. **Newsletter unsubscribe tokens — weak + no rate limit.**
   - `lib/queries.ts:1660-1673`, `app/api/newsletter/unsubscribe/route.ts:4-18`. Enumerable.
   - Fix: 64-byte secure tokens, hash in DB (SHA-256), rate-limit endpoint (5/IP/hour).

4. **RLS policies are security theater.**
   - `supabase/migrations/014_rls_policies.sql:31-59` uses `USING (true)` on orders, inventory_items, inventory_logs, stockpiles.
   - Impact: Service role compromise = full DB access. Public can insert fake inventory logs.
   - Fix: Scope policies to authenticated users / admin roles. Column-level security where applicable.

5. **`/api/admin/notifications` leaks PII unauthenticated.**
   - Lines 6-55 return customer names, emails, totals, payment statuses, inventory stock levels with no auth check.
   - Fix: Add `getCurrentAdmin()` guard.

6. **Missing startup environment guards.**
   - `lib/supabase.ts:12-14, 27-30` returns `null` on missing env vars with only a console warning.
   - Required by spec Section 1.2 for `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`.
   - Fix: `process.exit(1)` on missing required vars in production.

### HIGH-RISK GAPS

7. **Rate limit on login is in-memory `Map`.**
   - `app/api/admin/login/route.ts:4-19`. Resets on every cold start — useless on Vercel.
   - Fix: Redis or Supabase-backed rate limiting.

8. **No CSRF protection on any POST/DELETE.**
   - `proxy.ts` validates session cookie but no CSRF tokens.
   - Fix: CSRF token middleware.

9. **Admin audit logs contain PII.**
   - `lib/adminAuth.ts:122-145` — `details` field stores unfiltered customer order info.
   - Fix: Redact PII; log metadata only (action, entityType).

10. **Email HTML not escaped — XSS in inbox + email injection.**
    - `lib/email.ts:26, 72, 135, 141-195, 434-435, 538` interpolate product names, prep instructions, customer names raw into HTML.
    - Fix: Use `html-escaper` or Handlebars; escape all user inputs.

11. **Unsubscribe tokens sent in plain-text email URLs.**
    - `lib/email.ts:575, 672, 700, 1088`. Exposed in email logs, forwarding, browser history.
    - Fix: POST with CSRF token or hashed-token verification.

12. **File upload missing size limits + spoofable MIME check.**
    - `app/api/upload/route.ts:59-85`. `file.type.startsWith("video/")` is client-controlled.
    - Fix: Validate `file.size <= 10MB` server-side; verify MIME via magic bytes.

13. **Newsletter campaign content rendered as raw HTML.**
    - `lib/email.ts:664-713`. Admin can inject XSS payloads into subscriber inboxes.
    - Fix: DOMPurify / sanitize-html on campaign content.

### QUICK WINS (1-line fixes)

- `proxy.ts` & `app/api/admin/login/route.ts`: Force `secure: true` cookies always (not gated on NODE_ENV).
- `lib/adminAuth.ts:105`: Change `sameSite: "lax"` → `sameSite: "strict"`.

### Smoking guns (security review will fail)

- Most admin endpoints have **zero auth**.
- **Hardcoded session-secret bypass** in `/api/admin/orders`.
- RLS policies are **`USING (true)`** — pure theater.
- Newsletter tokens **guessable + unthrottled**.
- Customer PII in **logs, emails, audit trails** — GDPR/privacy violation.
- **No CSRF**, **no startup guards**, **no input escaping** in emails.

---

## Part 2 — Performance, Scalability & Ops Audit

### TOP 5 SCALABILITY CLIFFS

1. **Email is synchronous Nodemailer + Gmail SMTP — 500/day cap, no queue, no retry.**
   - `lib/email.ts:219-247`, `app/api/orders/route.ts:49-50`.
   - Breaks at ~250 orders/day. Cold-start latency makes 30s function timeout likely.
   - Fix: Wrap `sendOrderEmails()` in non-blocking `.catch()`; add exponential-backoff retry; migrate to Mailgun/SES.

2. **NotificationBell polls every 30s × 5 parallel queries.**
   - `components/modules/NotificationBell.tsx:11, 68-144`.
   - 10 admins = 100+ Supabase queries/min for this feature alone.
   - Fix: Server-Sent Events, or `revalidate: 15` cache on the endpoint.

3. **Order queue uses ONE global Postgres advisory lock.**
   - `lib/orderQueue.ts`, `supabase/migrations/013_order_queue_lock.sql`. `ORDER_LOCK_KEY = 999999` serializes ALL checkouts.
   - Ceiling: ~2 orders/min worst case. The "queue" is a bottleneck, not a scaler.
   - Fix: Per-product locks, or distributed queue (Bull/SQS).

4. **Missing database indexes on hot paths.**
   - Needed on: `orders.status`, `orders.created_at`, `coupons.code`, `products.category_id`, `newsletter_subscribers.unsubscribed_at`.
   - JSONB fields (`products.variants`, `orders.items`) unindexed.
   - Analytics pages will timeout at 1k+ orders.
   - Fix:
     ```sql
     CREATE INDEX idx_orders_status ON orders(status);
     CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
     CREATE INDEX idx_coupons_code ON coupons(UPPER(code));
     CREATE INDEX idx_products_category_id ON products(category_id);
     CREATE INDEX idx_newsletter_active ON newsletter_subscribers(email) WHERE unsubscribed_at IS NULL;
     ```

5. **No Supabase connection pooling.**
   - `lib/supabase.ts` — singleton per process. Vercel cold starts exhaust the pool at peak.
   - Fix: Enable PgBouncer mode in Supabase project settings.

### Other concrete issues

6. **Bundle bloat — Framer Motion + Recharts on pages that don't need them.**
   - Recharts in `AnalyticsDashboard.tsx` (client component, ~45KB gz).
   - Framer Motion in `track`, `checkout`, Receipt (~12KB gz each).
   - ~150KB+ JS on shop page hurts Lagos mobile users.
   - Fix: `dynamic(() => import(...), { ssr: false })` for non-critical pages.

7. **No Cloudinary image transformations.**
   - Product galleries loading full-res 2-5MB images.
   - Fix: Append `?w=400&h=400&c=fill&q=70` to URLs.

8. **Cron jobs are not idempotent.**
   - `app/api/cron/subscriptions/route.ts:35-76` creates orders in a loop with no dedup check.
   - Vercel cron can fire twice → **double-charged subscription renewals**.
   - Fix: Idempotency key (`SHA256(sub_id || date)`) + `ON CONFLICT DO NOTHING`.

9. **Zero observability.**
   - 16 `console.log/error` calls across `/app/api/`. No Sentry, no structured logging, no metrics.
   - Email failures only `console.error()` (`lib/email.ts:244-245`).
   - Order queue lock failures silently `console.warn()`.
   - Fix: Add Sentry (free for startups).

10. **All admin pages are `force-dynamic` — kills ISR.**
    - 13 instances across `/app/admin/*`. Analytics recomputes on every load.
    - Fix: `revalidate = 30` for most pages.

### Production-ready checklist

- [ ] Email queue (Mailgun/SES + Bull or Cloud Tasks)
- [ ] DB indexes (orders.status, orders.created_at, coupons.code, ...)
- [ ] Notification polling → SSE or webhooks
- [ ] Order queue → per-product locks or distributed queue
- [ ] Supabase PgBouncer pooling
- [ ] Sentry error tracking
- [ ] Admin pages → ISR (`revalidate`), not `force-dynamic`
- [ ] Dynamic imports for Framer Motion, Recharts, jsPDF
- [ ] Cron idempotency keys
- [ ] Rate limiting on API routes

**Estimated effort:** 40–60 hours. **Estimated cost:** $500–$1000/mo (Sentry Pro, email service, Redis).

---

## Recommended fix order

1. **Security criticals 1, 2, 4, 5** — unauthenticated admin routes, hardcoded-secret bypass, RLS, notifications PII leak. (Hours, not days.)
2. **Email queue** — biggest operational risk; payment confirmations failing silently.
3. **DB indexes** — 5 lines of SQL, massive analytics win.
4. **Notification polling** — switch to SSE or cache.
5. **Order queue redesign** — per-product locks.
6. **Cron idempotency** — prevent double-charging customers.
7. **Observability (Sentry)** — so the rest is debuggable.

---

## Agents NOT run (rejected/interrupted)

- Architecture & code quality
- UX / customer journey
- Business / product-market fit
