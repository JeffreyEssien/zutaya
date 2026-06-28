# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZúTa Ya is a premium meat delivery + butchery services platform serving Lagos. Beyond e-commerce, it now includes Kitchen (grill house menu), Outdoor Butchery / Events (bookings), and Owambe event planning. Built with Next.js 16 (App Router), Supabase (Postgres), deployed on Vercel. Rebranded from XELLÉ.

**Agent Instructions Doc:** Full implementation spec lives in `/ZutaYa_Agent_Instructions.docx` (16 sections). Extract with `textutil -convert txt -stdout ZutaYa_Agent_Instructions.docx`.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (also serves as the lint/type check gate)
- `npx @biomejs/biome check .` — Lint and format check
- `npx @biomejs/biome check --write .` — Auto-fix lint/format issues
- `npx tsx scripts/seed.ts` — Seed database with sample data

There are no test scripts configured.

## Architecture

### Tech Stack (exact versions, package.json)
- **Framework:** Next.js 16.2.1 (App Router, React Compiler babel plugin)
- **React:** 19.2.3
- **Database:** Supabase 2.95.3 (`@supabase/supabase-js`) — singleton in `lib/supabase.ts`
- **State:** Zustand 5.0.11 with `persist` (`lib/cartStore.ts`, `lib/orderStore.ts`, `lib/notificationStore.ts`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) — brand-red, warm-cream, deep-espresso, charcoal, forest-green, gold-accent in `tailwind.config.ts`
- **Rich text:** TipTap 3.19.0 (extension-link, pm, react, starter-kit)
- **Charts:** Recharts 3.7.0
- **Email:** Nodemailer 8.0.1 (`lib/email.ts`)
- **Animations:** Framer Motion 12.34.0
- **Auth:** bcryptjs 3.0.3 for admin password hashing
- **PDF:** jspdf 4.2.1 + jspdf-autotable 5.0.7 (reports/receipts)
- **Toasts:** sonner 2.0.7
- **Linter/Formatter:** Biome 2.4.0 (spaces, double quotes, 100-char line width)

### Code Layout
- `app/` — Next.js App Router pages and API routes
  - `app/admin/` (25 routes): analytics, audit, bookings, bundles, categories, coupons, cron, customers, delivery, events, featured, gallery, inventory, login, newsletter, orders, pages, processing, products, services-config, settings, subscriptions
  - `app/api/` (17 routes): admin, abandoned-cart, bookings, bundles, categories, cron, delivery, media, newsletter, orders, products, search, settings, subscriptions, upload
  - `app/[slug]/` — Dynamic CMS pages
  - `app/shop/`, `app/checkout/`, `app/track/`, `app/subscribe/`, `app/bundles/` — Customer-facing
  - `app/newsletter/unsubscribe/` — Token-based unsubscribe page
- `components/modules/` — 62 feature components (CheckoutForm, AdminOrdersContent, OrderDetailPanel, OwambeWizard, EatModeSelector, ServicesPillar, MeetTheButchers, ProcessingConfigurator, BookingsAdmin, EventsAdmin, AuditLogView, MediaPicker, NotificationBell, DeliveryScheduler, etc.)
- `components/ui/` — 8 primitives (Badge, Button, ScrollProgress, Skeletons, StockIndicator, StorageBadge, ToastProvider, WhatsAppFloat)
- `lib/` (18 files) — `queries.ts`, `email.ts`, `cartStore.ts`, `orderStore.ts`, `notificationStore.ts`, `orderQueue.ts`, `textDefaults.ts`, `adminAuth.ts`, `deliveryPricing.ts`, `constants.ts`, `formatCurrency.ts`, `supabase.ts`
- `types/index.ts` — All shared TS interfaces
- `supabase/migrations/` — 32 files (001-022 plus extras)
- `scripts/seed.ts` — DB seeder
- `proxy.ts` — Admin auth middleware (session token + `ADMIN_SESSION_SECRET`)

### Key Patterns
- **Data access:** `lib/queries.ts` is the single data layer. DB `snake_case` → app `camelCase` via mappers (`toProduct`, `toOrder`).
- **JSONB safety:** `variants` and `prepOptions` may arrive as strings. Mappers use `typeof === "string" ? JSON.parse() : value || []`. Components also guard with `Array.isArray()`.
- **Admin auth:** Bcryptjs password hashing via `lib/adminAuth.ts`. `admin_users` table (roles: admin/super_admin), `admin_sessions` with 7-day token expiry. `proxy.ts` middleware validates session token cookies. `logAdminAction()` + `logCronEvent()` write to `admin_audit_logs`.
- **Currency:** Nigerian Naira (NGN) via `lib/formatCurrency.ts`.
- **Order statuses:** `pending → processing → packed → out_for_delivery → delivered`. API enforces sequential transitions.
- **Order ID format:** `ZY-YYYYMMDD-XXXX` (generated in CheckoutForm).
- **Order queue:** Postgres advisory locks serialize concurrent checkouts. `order_queue` table tracks status. Migration 013.
- **Payment:** WhatsApp + bank transfer only. No online gateway. (Providus DVA planned, not yet implemented.)
- **Delivery pricing:** Lagos-only zones (area-based flat fees) in `lib/deliveryPricing.ts`. Hardcoded fallback with DB overrides. No interstate.
- **Delivery scheduler:** `DeliveryScheduler.tsx` wired in CheckoutForm — **date picker only** (time slots removed 2026-06-24). Shows a 12pm cutoff notice: order before 12pm = same-day (earliest date = today), after 12pm = next day (earliest = tomorrow). `onSelect(date)` sets `requestedDeliveryDate`; no slot sent → `increment_delivery_capacity` RPC (date+slot-gated in `app/api/orders/route.ts`) no longer fires for new orders. `requested_delivery_slot` column kept nullable; old orders' slots still display (all slot UI in OrderDetailPanel/Receipt/email/dashboard is conditional). `GET /api/delivery/availability` now unused.
- **Notifications:** NotificationBell polls every 30s for new orders, pending payments, expiring stock, low stock. Sound alerts. API at `/api/admin/notifications`.
- **Editable texts:** `site_settings.custom_texts` JSONB. `lib/textDefaults.ts` defines 9 TEXT_GROUPS. `getText(customTexts, key)` returns override or default. SiteSettingsForm renders grouped editor. Hero, PromiseBar, NewArrivals, ShopByCategory, HomeCta, AboutSnippet, Footer all consume via getText().
- **Announcement bar:** Header renders top banner. Admin controls enabled/text/color from settings.
- **Newsletter:** Footer signup → welcome email. Admin campaign CRUD + batch send. Token unsubscribe.
- **Subscriptions:** Multi-step at `/subscribe`. Admin at `/admin/subscriptions`. Weekly/biweekly/monthly.
- **Bundles:** Full builder at `/bundles` (search, filters, qty, sticky summary, progress). Per-product prep flows cart → checkout → order → receipt → admin → email. Admin rules at `/admin/bundles`.
- **Cart:** Per-bundle discount (`bundleId`/`bundleDiscount`/`bundleName` on CartItem). `bundleDiscountTotal()` per group. Coupons stack on top.
- **Coupons:** `createOrder` increments `usage_count` post-insert (best-effort).
- **Email templates** (`lib/email.ts`): order receipt, payment approved, shipped, delivered, review request, abandoned cart, newsletter welcome, campaign send, subscription confirmed, renewal, delivery reminder, low stock alert. Items include variant + prep options.
- **OrderDetailPanel:** Gradient header, icon-based cards, bundle grouping, prep options per item, copy-to-clipboard, WhatsApp status messaging, contextual actions. Delivery fee currently read-only.
- **Admin Settings:** Tabbed (General, Storefront, Business, Checkout, Texts). Packaging fee/label admin-editable.
- **Cron jobs:** Three Vercel Cron endpoints — `/api/cron/subscriptions` (renewals), `/api/cron/delivery-reminders`, `/api/cron/expiry-sweep`. Admin dashboard at `/admin/cron` with manual trigger + execution history. `cron_logs` table.
- **Featured Slides:** Admin at `/admin/featured` — product/media/promo slides, drag-reorder, overlay editor, live preview, toggle active, duplicate. Hero renders with animated overlays when `useFeaturedSlides` is on. Server-resolved in `page.tsx`.
- **Services Infrastructure** (migration 020): Kitchen grill house menu, processing options, marinades, outdoor butchery/events bookings, Owambe event planning. Tables: `marinades`, `processing_options`, `kitchen_menu_items`, `service_bookings`, `events`, `occasions`. Admin under `/admin/{services-config,processing,bookings,events}`. Components: `OwambeWizard`, `EatModeSelector`, `ServicesPillar`, `ServicesDashboardCards`, `MeetTheButchers`.
- **Gallery/Media:** `/admin/gallery` with `MediaPicker`. `/api/media` + `/api/upload`. `media_gallery` table (migration 018).
- **Audit:** `/admin/audit` (`AuditLogView`) tracks admin actions + cron events via `admin_audit_logs`.
- **Analytics:** Meat & Delivery tab with Total Kg Sold, Expiring Stock KPIs. Charts: Kg Sold by Category (bar), Gross Margin (line), Delivery Zone Breakdown (pie + table).
- **Meat Passport removed:** Migration 022 dropped `origin_farm`, `origin_breed`, `origin_hanging_hours`, `origin_halal_certified`, `passport_data`.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` — Service role for admin operations
- `ADMIN_SESSION_SECRET` — Session token signing
- `ADMIN_PASSWORD_HASH` — Bcrypt hash for default admin (also stored in `admin_users` table)
- `NEXT_PUBLIC_SITE_URL` — Public site URL
- `SMTP_EMAIL` / `SMTP_PASSWORD` — Gmail SMTP

## Implementation Status (vs Agent Instructions Doc)

### Done
- **Section 3:** Bcryptjs admin auth + session tokens (7-day expiry), `admin_users` table with roles, audit log via `admin_audit_logs`.
- **Section 4 (Rebrand):** Brand tokens applied; XELLÉ removed.
- **Section 5 (Meat fields):** storageType, priceUnit, cutType, prepOptions, variants — JSONB-safe. StorageBadge.
- **Section 6 (Order pipeline):** 5-stage statuses, sequential transitions, email triggers, advisory-lock queue, ZY-YYYYMMDD-XXXX IDs, coupon usage increment.
- **Section 6.4:** prep_instructions, delivery date/slot, packaging_fee all in CheckoutForm + persisted in queries.ts.
- **Section 7 (Delivery):** Lagos-only zones. DeliveryScheduler wired. `/api/delivery/availability`. `increment_delivery_capacity` called at order placement.
- **Section 8 (Email):** 12+ templates rebranded.
- **Section 9 (Features):** Newsletter (signup, campaigns, unsubscribe), Bundles (builder + admin), Subscriptions (multi-step + admin).
- **Section 10 (Admin):** 25-route dashboard. Tabbed settings, audit, gallery, services configurators. OrderDetailPanel redesigned.
- **Section 10.5/10.6:** Meat KPIs + analytics charts in Meat & Delivery tab.
- **Section 11 (Notifications):** NotificationBell with polling, sound, new order + pending payment + expiringStock + lowStock data.
- **Section 12 (Cron):** Three Vercel Cron endpoints + admin dashboard + `cron_logs`.
- **Section 13 (Storefront):** Homepage (Announcement Bar, Hero w/ featured slides, PromiseBar, NewArrivals, ShopByCategory, HomeCta, AboutSnippet, MeetTheButchers, ServicesPillar, Footer). Shop, product detail, checkout with queue waiting room.
- **Section 14:** Stockpile + interstate removed. RLS policies migration 014_rls_policies.sql in place.
- **Featured Slides:** Full admin curation at `/admin/featured`.
- **Custom Texts Wiring:** TEXT_GROUPS + getText() consumed across homepage components. Grouped editor in SiteSettingsForm.
- **Services Infrastructure:** Kitchen, Processing, Bookings, Events, Owambe wizard (migration 020).
- **Gallery/Media management** (migration 018).
- **Audit trail system.**
- **About page** admin-editable.
- **DB seeded** via `scripts/seed.ts`.

### Remaining
- **Section 1.2 — Startup Guard:** `lib/supabase.ts` lacks explicit guards for `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`. (proxy.ts checks service role only.)
- **Section 3 — Rate limiting:** Admin login bcrypt is in place but no rate limiter on `/api/admin/login`.
- **Section 7.1 — Editable Delivery Fee:** OrderDetailPanel needs admin-editable `delivery_fee` field to enter actual Uber fee post-dispatch.
- **Section 9.4 — Recipes CMS:** Not started. No `/admin/recipes`, no `/api/recipes`, no recipe pages. Migration 006 exists but unused.
- **Section 13.1 — Recipe Spotlight on homepage:** Not started (depends on Recipes CMS).
- **Section 15 — Pre-launch testing:** No automated tests; checklist unverified.
- **Providus DVA payment integration:** Awaiting credentials/docs; no code yet.
- **Paystack payment integration (IMPLEMENTED — 2026-06-18):**
  - Inline Popup V2 (`js.paystack.co/v2/inline.js`), NGN, channels: card/bank/ussd/qr/bank_transfer
  - **Replaces** WhatsApp + bank transfer entirely on customer checkout (`CheckoutForm.tsx`) and subscribe (`/subscribe`)
  - Admin refunds (full + partial) from OrderDetailPanel via `POST /api/paystack/refund` → Paystack `/refund`
  - Subscription cancellation via `POST /api/paystack/subscription/disable`
  - First-cycle subscription charge via `POST /api/paystack/subscription/start` → popup → webhook stores authorization_code → cron auto-renews via `charge_authorization` (handles native intervals + custom biweekly)
  - Transaction fees split 50/50: customer pays half as "Processing Fee" line (visible in cart/receipt/admin/email). Fee math in `lib/paystack.ts`: `paystackFeeKobo()` + `customerProcessingFeeKobo()` with fixed-point iteration.
  - Migration 023: `customers`, `payments` (full ledger every attempt), `payment_events` (forensic event log), `subscription_plans`. Subscriptions extended with `paystack_*` codes. Orders carry `paystack_reference` + `processing_fee`. Trigger keeps `customers.total_spent_kobo` etc. in sync.
  - Idempotent paid transition: `UPDATE payments SET status='paid' WHERE reference=$1 AND status<>'paid'` — verify + webhook race safely.
  - Reference format: `ZY-YYYYMMDD-XXXX-aN` (N = attempt counter via `nextAttemptForOrder`) — prevents Paystack "Duplicate Transaction Reference."
  - Webhook (HMAC SHA512 verify of raw body) handles: `charge.success`, `charge.failed`, `subscription.create`, `subscription.disable`, `subscription.not_renew`, `refund.processed`, `refund.failed`. Every event logged to `payment_events`.
  - Env vars required: `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`.
  - Webhook URL to set in Paystack dashboard: `${NEXT_PUBLIC_SITE_URL}/api/paystack/webhook`.
  - Legacy `payment_method` / `payment_status` columns kept for historical orders; new orders default to `paystack`.
  - Files: `lib/paystack.ts`, `lib/payments.ts`, `lib/paymentFulfillment.ts`, `app/api/paystack/{initialize,verify,webhook,refund,resume,subscription/start,subscription/disable}/route.ts`, `app/api/admin/payments/{route.ts,reverify/route.ts}`, `app/api/cron/paystack-reconcile/route.ts`, `app/checkout/{verify,resume}/page.tsx`, migrations `023_paystack_payments.sql` + `024_payment_recovery.sql`.
  - Pending: end-to-end sandbox test (test card `5060 6666 6666 6666 666`, OTP `123456`), admin Plans CRUD UI.

- **Payment recovery (IMPLEMENTED — 2026-06-19):**
  - **Reconciliation cron** `/api/cron/paystack-reconcile` runs every 15 min (Vercel). Sweeps payments stuck in `pending` for >15 min. Calls Paystack `/transaction/verify` for each. Outcomes: success → mark paid + run fulfillment; failed → mark failed + restore stock; abandoned (or pending >24 h) → mark abandoned + restore stock + send resume email.
  - **Stock restoration**: `restoreStockForOrder()` in `lib/queries.ts` + SQL RPCs `restore_variant_stock` / `restore_stock` (migration 024) — inverse of the deduct RPCs. Logged to `inventory_logs` with `*_payment_failed` reason. `payments.stock_restored_at` prevents double-restoration.
  - **Admin re-verify**: `POST /api/admin/payments/reverify` (admin-gated) + per-row "refresh" button in `OrderDetailPanel` Payment Ledger card. For "I was charged but order says pending" support cases.
  - **Resume payment flow**: `payments.resume_token` (32-byte random, unique), `sendResumePaymentEmail()`, `/checkout/resume?token=...`, `POST /api/paystack/resume`. The resume endpoint **first** re-verifies the original reference — if it actually succeeded, mark paid + fulfill (no popup). Otherwise create a fresh attempt (N+1) with a new reference and return access_code for the popup. Email is sent at-most-once per payment by the reconcile cron (gated by `resume_email_sent_at`).
  - **Shared fulfillment module**: `lib/paymentFulfillment.ts` (`runPostPaidFulfillment`, `runPostFailedCleanup`) — single source of truth used by verify, webhook, resume, reverify, and reconcile cron. Guarantees identical side-effects on every code path.
  - Edge cases handled: webhook delayed + verify race; user closes browser mid-payment; network drops between Paystack and our server; double-fulfillment; double-stock-restore; customer was charged but no DB record (reverify); abandoned cart with leaked stock; subscription first-charge captures `authorization_code` for cron renewals.

- **Payment hardening pass (2026-06-19):** 8 audit fixes.
  1. **Double-refund race on underpayment** — `handleUnderpayment` now CLAIMS the payment atomically via `markPaymentFailed` (pending→failed) BEFORE refunding, so only one of verify/webhook/cron issues the refund. Refund-fail leaves row `failed` + loud `action_required: manual_refund` log (no re-open → no double refund).
  2/3. **Reconcile status coverage** — added `PaystackTxnStatus` open union in `lib/paystack.ts`; reconcile treats `reversed` as terminal-failed; in-flight (`pending/ongoing/processing/queued`) left to settle.
  2. **Faster stock release** — reconcile cron `*/5` (was `*/15`), `STALE_AFTER_MIN=10` (was 15). Abandoned-card stock frees in ~10–15 min.
  4. **Config guard** — `validatePaymentEnv()` in `lib/paystack.ts`, called at top of `/initialize` (503 before any order/stock if PAYSTACK keys or `NEXT_PUBLIC_SITE_URL` missing/malformed; blocks live key + localhost callback).
  5. **CRON_SECRET enforced** — `paystack-reconcile` fails closed (401) if secret unset in production.
  6. **Fee parity** — CheckoutForm fee math now mirrors server KOBO math exactly (was naira → ≤₦ drift in "You'll be charged").
  7. **`orderDraftRef`** → `useRef` (was render-local `let`).
  8. **Double-submit guard** — `if (loading) return` in `handleSubmit`.
  - Verified: `tsc --noEmit` clean, `npm run build` passes. (Biome shows repo-wide pre-existing 2-space/4-space + import-sort noise — not from this pass.)

- **Admin nav grouping (2026-06-19):** Flat 24-link `ADMIN_NAV_LINKS` replaced by `ADMIN_NAV_GROUPS` (7 sections: Overview, Orders & Payments, Catalog, Operations, Events & Services, Marketing & Content, System) in `lib/constants.ts`. `ADMIN_NAV_LINKS` kept as a flat derived export. `AdminSidebar.tsx` renders collapsible sections (state persisted per-group in localStorage, active group auto-expands, parent-route highlighting via `isActiveLink`). Fixed missing `creditcard`/`alerttriangle` icons. UI-only — no routes/URLs changed.

- **Dashboard / Analytics split + deep metrics (2026-06-19):**
  - **Problem fixed:** `/admin` rendered the *entire* `AnalyticsDashboard` (same as `/admin/analytics`) → overwhelming. Now separated.
  - **Dashboard** (`/admin`): new `lib/dashboard.ts` `calculateDashboard()` + `components/modules/DashboardHome.tsx`. Today-scoped & action-oriented: Tier-1 alert tiles (awaiting payment, failed payments today, disputes due ≤48h, expiring ≤3d w/ value at risk, new orders to confirm + oldest-waiting, deliveries due today, reorder now, unquoted bookings — each deep-links, hidden when 0, "All clear" fallback); Tier-2 pulse (revenue today vs same weekday last week, **pace-to-now** vs typical-by-this-hour, orders today vs 7d avg, new customers); Tier-3 today's delivery run + latest orders. `ServicesDashboardCards` kept below.
  - **Analytics** (`/admin/analytics`): keeps full `AnalyticsDashboard`, now with a 7th tab **Payments & Subs** + RFM in Customers + basket affinity in Marketing.
  - **⭐ New calcs in `lib/analytics.ts`** (extended `calculateAnalytics(... , subscriptions=[], payments=[])`): `retention` (RFM segments Champions/Loyal/New/At-risk/Lost, repeat-revenue share, median reorder cadence), `basket` (product co-occurrence pairs → bundle candidates), `paymentHealth` (success/abandonment/refund rates, Paystack fees %, avg time-to-pay — from `payments` ledger), `subscriptions` (MRR/ARR, churn, by-frequency — normalised to monthly). `paymentHealth`/`subscriptions` are null when no data.
  - New query `getPaymentsForAnalytics(sinceDays, limit)` in `lib/payments.ts`. Both pages fetch payments(+subs) and pass through.
  - **Caveat still open:** profit/COGS metrics read `item.costPrice` which is often 0 — snapshot costPrice into order line items at checkout before trusting margin numbers.

- **Cron scheduling on Vercel Hobby (2026-06-20):** Hobby rejects any cron more frequent than once/day (count limit is 100, not the blocker). `paystack-reconcile` was `*/5` → failed deploy. Now `0 3 * * *` (daily floor); all 4 Vercel crons are daily. Frequent recovery moved to free **GitHub Actions** (`.github/workflows/paystack-reconcile.yml`, every ~15 min, `workflow_dispatch` enabled) which curls the `CRON_SECRET`-gated endpoint. Requires repo secrets `PRODUCTION_URL` + `CRON_SECRET`, and `CRON_SECRET` set in Vercel env (reconcile route fails closed in prod without it; the other 3 crons don't).

- **SEO foundation (2026-06-24):** Technical SEO built out (site had none). `lib/seo.ts` (central: `SITE_URL`, `absoluteUrl`, `stripHtml`/`truncate`, `productMetaDescription`, and schema builders: `organizationSchema`, `websiteSchema`, `localBusinessSchema`, `productSchema`, `breadcrumbSchema`). `components/JsonLd.tsx` renders `application/ld+json`. `app/sitemap.ts` (dynamic from getProducts+getPages, hourly revalidate, fail-soft) + `app/robots.ts` (disallow /admin,/api,/checkout,/track; points to sitemap). `app/layout.tsx`: added `metadataBase`, title template (`%s | <brand>`), keywords, canonical, `en_NG` OG locale, and site-wide JSON-LD (Organization+WebSite w/ SearchAction+LocalBusiness as GroceryStore). Per-page metadata: `/shop` (static), `/product/[slug]` (`generateMetadata` + Product/Offer/BreadcrumbList JSON-LD), `/bundles` + `/subscribe` got `layout.tsx` (they're client components, can't export metadata). Verified live: robots, sitemap (49 urls), product title/desc/canonical, Offer price+InStock, breadcrumbs; `npm run build` passes. Aligned to `seo.md` e-commerce playbook (added later): transactional PDP meta desc w/ price+incentive+CTA, Offer `priceValidUntil`, AVIF/WebP via next.config `images.formats`, canonical collapses /shop filter params. **TODO:** `localBusinessSchema()` `streetAddress` (only Lagos locality/phone/hours known); `aggregateRating` deliberately omitted (no review system — faking = Google penalty); PLP intro copy (50–100 kw words on /shop) not added; 410/301 for discontinued products + stock-alert email not done; Core Web Vitals tuning separate. Off-site SEO (Search Console, Google Business Profile, backlinks, reviews) out of code scope.

- **Bundles → Zútaya Packages (2026-06-26):** Replaced the build-your-own discount engine (`bundle_rules`) with fixed curated boxes sold at a flat price. **Migration 028** (`zutaya_packages` + `zutaya_package_items`, RLS, `DROP TABLE bundle_rules CASCADE`) — **must be applied to the DB**. Each package has name/slug/tagline/description/flat price/image + content lines; **each line is product-linked** (`product_id` + `variant_name`/`inventory_item_id` + integer `quantity` + display `label`) so buying a box auto-deducts real stock via `create_order_atomic`, while the order is charged the package's flat price. URLs unchanged (`/bundles`, `/admin/bundles`, `/api/bundles` repurposed). Cart: `addPackageToCart(pkg, boxes)` pushes one line per content item sharing `packageId/packageName/packagePrice/packageBoxes` (real product id/inventory drives deduction; `product.price` on package lines is 0). `subtotal()` adds each package group's flat price once (×boxes), not the sum of lines; bundle-discount math removed (coupons still apply on subtotal); `removePackage(packageId)`. Display surfaces group package lines into one flat-price row: CartDrawer, CheckoutSummary, Receipt, OrderDetailPanel (ItemRow gained `hidePrice`), email (`lib/email.ts`). Types: `ZutayaPackage`/`ZutayaPackageItem`, `BundleRule` removed; CartItem gained package fields (legacy `bundleId/bundleName` kept for historical orders' display only). queries.ts: `getZutayaPackages`(enriches items w/ product image/slug/name)/`getZutayaPackageBySlug`/`create|update|deleteZutayaPackage` (items replace-all). Admin `/admin/bundles` rebuilt: full CRUD, MediaPicker image, content-line editor (product→variant→qty→label), active toggle, sort. Storefront `/bundles` rebuilt: package cards → detail modal (contents + box qty + add-to-cart). Copy/nav "Bundles"→"Packages" (NAV_LINKS, admin sidebar, Hero, HomeCta via `cta.*`, `bundles.*` textDefaults). Seed two starter boxes: ₦45,000 (1kg goat, cowleg, 1kg beef/tozo, kidney, shaki) and ₦80,000 (3kg goat, 2kg boneless beef, 3kg chicken, pack of shaki, kidney). `npm run build` passes. Atomic checkout remains the correctness backstop (oversell-proof).
  - **Availability + SEO (2026-06-26, follow-up):** `/bundles` converted from a client-fetch page to a **server component** (`force-dynamic`) → `app/bundles/page.tsx` fetches packages + settings, emits server-side JSON-LD, renders new client UI `components/modules/PackagesClient.tsx` (props-driven, no fetch). `enrichPackageItems` now also computes **live availability**: per line, stock source = named variant stock → linked inventory item stock → product stock (mirrors `create_order_atomic` deduction), `item.available = stock >= quantity`; `pkg.available` = all lines available. Types gained `ZutayaPackage.available` + `ZutayaPackageItem.available/availableStock`. Storefront: sold-out packages grey out (grayscale image, "Currently unavailable" badge, non-clickable), modal flags per-item out-of-stock + disables add. SEO: `lib/seo.ts` `packageSchema()` + `packageMetaDescription()` emit Product+Offer per package with `availability` InStock/OutOfStock (Offer url `/bundles#<slug>`, cards carry `id={slug}`), plus BreadcrumbList — all in server-rendered HTML. `aggregateRating` still omitted (no reviews).

## RULES
- When done with a task, very short and brief summary
- Each feature should be done thoroughly, well featured and all features must be working, no skeletons
- Use as little tokens as possible
- Always save context to this file to help you know where you are at all times
