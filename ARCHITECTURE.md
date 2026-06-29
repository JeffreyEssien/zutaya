# ZúTa Ya — Full System Architecture

This document explains, in depth, every moving part of the ZúTa Ya platform: how a
request flows through the stack, how data is shaped and stored, how money moves, how
stock is protected, and how every background process keeps the system consistent. It
is written to be read top to bottom — each section builds on the last.

---

## 1. What the system is

ZúTa Ya is a premium meat-delivery and butchery-services platform serving Lagos,
Nigeria. It is simultaneously four products glued into one storefront and one admin:
an e-commerce shop (cuts of meat sold per-kg or per-unit), a curated "Packages"
business (fixed-price boxes that draw down real inventory), a services arm (Kitchen
grill-house menu, outdoor butchery, Owambe event planning, bookings), and a
subscription business (recurring meat boxes). Every one of these funnels into the same
order pipeline, the same payment ledger, and the same inventory system, which is what
keeps the architecture coherent despite the breadth of features.

The application is a single Next.js 16 App Router codebase deployed on Vercel, talking
to a Supabase Postgres database. There is no separate backend service — the "backend"
is the collection of Next.js Route Handlers under `app/api/`, server components, and a
library layer in `lib/`. State that must survive a page reload lives either in Postgres
(authoritative data) or in the browser's localStorage via Zustand (cart, order history,
notifications). The deployment topology is therefore: browser → Vercel edge/serverless
functions → Supabase Postgres, plus outbound calls to Paystack (payments), an SMTP
provider (email), and Cloudinary (image hosting).

---

## 2. The layered shape of the code

The codebase is organized in deliberate layers, and almost every rule in the system
exists to keep those layers from leaking into each other.

At the top are **pages and route handlers** in `app/`. Pages are mostly React Server
Components that fetch data at request time and stream HTML; a handful are client
components (the cart-driven pages, the bundles/packages storefront UI, the checkout
form) marked `"use client"`. Route handlers under `app/api/` are the HTTP surface for
anything that mutates data or must run with secrets the browser can't see (the Paystack
secret key, the Supabase service-role key, SMTP credentials).

Beneath that is the **library layer** in `lib/`, which is the real heart of the
application. `lib/queries.ts` (roughly 2,000 lines) is the single data-access layer:
every read and write to the core tables goes through a function here. `lib/paystack.ts`
is the only place that talks to the Paystack HTTP API. `lib/payments.ts` owns the
payment ledger. `lib/paymentFulfillment.ts` owns the side-effects that must happen after
a payment settles. `lib/email.ts` owns all transactional email. `lib/cartStore.ts`,
`lib/orderStore.ts`, and `lib/notificationStore.ts` are Zustand stores. Smaller modules
handle delivery pricing, analytics, the admin dashboard rollups, rate limiting, SEO,
and constants. The discipline is that components never call Supabase directly — they
call a `lib/queries.ts` function, which means there is exactly one place where the
database schema is known.

At the bottom is **Postgres**, accessed through two Supabase clients defined in
`lib/supabase.ts`: an anon-key client used for public reads (governed by Row Level
Security), and a service-role client used by server code that needs to bypass RLS for
trusted writes. The 35-plus SQL migration files in `supabase/migrations/` are the
authoritative description of the schema, including the stored procedures (RPCs) that do
the genuinely transactional work — atomic order creation, atomic stock restoration,
delivery-capacity increments, and rate-limit counters.

The single most important architectural convention is the **snake_case ↔ camelCase
boundary**. Postgres columns are snake_case; the TypeScript application is camelCase.
`lib/queries.ts` contains mapper functions (`toProduct`, `toOrder`, and friends) that
translate at the boundary, so nothing above the query layer ever sees a raw database
row. Closely related is **JSONB safety**: columns like `variants` and `prepOptions` are
JSONB that can arrive either as parsed objects or as raw strings depending on the path,
so mappers defensively do `typeof value === "string" ? JSON.parse(value) : value || []`
and components additionally guard with `Array.isArray()` before mapping. This is why the
app doesn't crash when a malformed JSONB value sneaks in.

---

## 3. Data model and the type system

`types/index.ts` holds every shared TypeScript interface — `Product`, `Order`,
`CartItem`, `Category`, `Coupon`, `InventoryItem`, `ZutayaPackage`, `Subscription`, and
so on. These are the contract between the layers. The database has corresponding tables,
and the mappers in `lib/queries.ts` keep the two in sync.

A `Product` carries meat-specific fields beyond a normal e-commerce product:
`storageType` (frozen/chilled/ambient, surfaced as a `StorageBadge`), `priceUnit`
(per-kg vs per-unit), `cutType`, `prepOptions` (preparation choices like "cut into
chunks" that can carry a fee), and `variants` (named sub-SKUs each with their own price
and stock). Stock can live in two places: directly on the product, or on a linked
`inventory_item` (via `inventoryId`). This duality matters enormously for the Packages
feature and for stock deduction, described later.

An `Order` is the central aggregate. It snapshots its line items as JSONB at the moment
of sale — including, crucially, a per-unit `costPrice` copied from the linked inventory
item at checkout time, so that profit/COGS analytics stay accurate even if costs change
later. It carries the customer's name/email/phone, a shipping address, money fields
(subtotal, shipping, delivery fee, packaging fee, prep fee, processing fee, discount
total, total), a coupon code, delivery metadata (zone, type, requested date/slot), a
Paystack reference, a payment status, and a fulfillment status. Order IDs follow the
format `ZY-YYYYMMDD-XXXX`, generated client-side in the checkout form.

The payment ledger is a separate concern from orders. The `payments` table records
**every payment attempt** for an order (not just the successful one), `payment_events`
is a forensic append-only log of every webhook and verification event, and `customers`
is a denormalized rollup (total spent, order count) kept current by a database trigger.
This separation — orders describe what was bought, payments describe every attempt to
pay for it — is what makes payment recovery and reconciliation possible.

---

## 4. The cart: client-side state with server-authoritative correctness

The cart lives entirely in the browser as a Zustand store (`lib/cartStore.ts`) persisted
to localStorage under the key `cart-storage`, so it survives reloads and navigations
without a server round-trip. It holds the line items, the open/closed drawer state, and
an applied coupon (percentage + code).

Adding a normal product (`addItem`) tries to merge with an existing identical line —
same product, same variant, no bundle, no package, no custom processing — incrementing
quantity, but it refuses to exceed available stock (variant stock if a variant is
chosen, otherwise product stock). This is an optimistic client-side guard for UX; it is
**not** the real correctness boundary. The real guarantee comes later at checkout in the
database transaction, because localStorage stock numbers can be stale.

Packages get special treatment (`addPackageToCart`). A Zútaya Package is a curated box
sold at a single flat price, but internally it must deduct real inventory from each
product it contains. So when a package is added, the store expands it into one cart line
per content item, each line carrying a minimal synthetic `Product` shape that holds the
real `productId`, the optional `variantName`, and the linked `inventoryItemId` — exactly
the fields the order/stock path reads — while the line's own `product.price` is zero. All
lines in one package share a generated `packageId` plus `packageName`, `packagePrice`,
and `packageBoxes`. The `subtotal()` calculation is therefore careful: it walks the
items, and for package lines it adds the flat package price **once per package group**
(price-per-box × boxes), ignoring the per-line prices, while normal lines contribute
price × quantity as usual. `total()` then subtracts the coupon percentage. The net
effect: the customer is charged the flat box price, but checkout still deducts the real
underlying products from stock, so packages can never oversell their contents. Display
surfaces (cart drawer, checkout summary, receipt, admin order panel, email) all collapse
a package group back into a single flat-price row for readability.

---

## 5. Checkout and the two order-creation paths

Checkout is where the client cart becomes a server-authoritative order. There are two
code paths, and understanding why there are two is important.

The **payments path** (`/api/paystack/initialize`) is the live, customer-facing one.
Paystack replaced the old WhatsApp-and-bank-transfer flow entirely. When the checkout
form submits, the client posts the full order payload to this route. The route is
defensive in a strict order: first it calls `validatePaymentEnv()` to fail loudly with a
503 if Paystack keys or `NEXT_PUBLIC_SITE_URL` are missing or malformed (this prevents
the catastrophe of charging a real card against a dead callback URL); then it applies
rate limiting (per-IP per-minute and per-email per-hour, backed by a Postgres counter);
then it computes the customer's share of the Paystack processing fee and adjusts the
order total; then it creates the order **atomically** (the same transactional RPC used
by the other path); then it upserts the customer and ensures a Paystack customer code;
then it initializes the Paystack transaction server-side with the secret key; and only
then does it insert a `payments` ledger row with status `pending` and return an
`access_code` so the browser can open the Paystack Inline popup. Critically, if the
Paystack initialization fails, the route restores stock and cancels the just-created
order before returning an error — so a Paystack outage can never leak inventory.

The **legacy/direct path** (`/api/orders`) still exists and wraps order creation in the
advisory-lock queue. It inserts a row into `order_queue` so the admin can watch queue
state, then runs the order creation inside `processOrderInQueue`, which serializes
concurrent checkouts using a Postgres advisory lock, then books the delivery slot
(best-effort), then fires emails (non-blocking), then records the queue outcome. This
path predates the fully atomic RPC and the Paystack flow; the atomic transaction is now
the primary correctness mechanism, with the queue as an additional serialization layer.

Both paths converge on `createOrder()` in `lib/queries.ts`, which is the only function
that writes an order. It builds two payloads: a list of items (product id, name,
quantity, variant name, inventory item id) for the stock-deduction half, and the full
order row for the insert half. Before inserting, it snapshots per-unit cost from the
linked inventory items into each line so margins stay accurate. Then it calls a single
RPC, `create_order_atomic(p_order, p_items)` (migration 025), which does the entire
thing — deduct stock for every line and insert the order row — inside one Postgres
transaction. If any line lacks stock, the whole transaction rolls back: no partial
deductions, no orphan order. Per-product `FOR UPDATE` row locks inside the function also
act as a natural queue: two orders for different products proceed in parallel, while two
orders racing for the last unit of the same product wait microseconds for each other and
the loser is rejected cleanly. This is the oversell-proof backstop that makes the
optimistic client-side cart checks safe.

---

## 6. Stock: a two-source model and its inverse

Stock deduction has to handle the same two-source model the product type exposes. For a
given line, the deduction targets, in order of specificity: a named variant's stock if a
variant was chosen, else a linked inventory item's stock if `inventoryId` is set, else
the product's own stock column. The `create_order_atomic` RPC encodes this precedence,
and the Packages availability check in `lib/queries.ts` mirrors it exactly when deciding
whether a box can still be sold (per line: variant stock → inventory item stock →
product stock; the line is available if that source ≥ the quantity it needs; the package
is available only if every line is).

Every deduction has an inverse, because payments fail and orders get abandoned. The
function `restoreStockForOrderAtomic()` calls a mirror RPC,
`restore_stock_for_order_atomic`, which adds the quantities back in one transaction —
again respecting the same variant/inventory/product precedence. Restorations are logged
to `inventory_logs` with a `*_payment_failed` reason, and the `payments` row carries a
`stock_restored_at` timestamp so the same order can never be restored twice. This idempotency
guard is essential because, as the next section explains, several independent processes
can each conclude that the same payment failed.

---

## 7. The payment lifecycle: one ledger, many observers

This is the most carefully engineered part of the system, because money and inventory
are both at stake and the network is unreliable. The design principle is: **the
`payments` table is the single source of truth, every state transition is an atomic
conditional UPDATE, and only the one caller that wins the transition runs the
side-effects.**

A payment attempt begins as a `pending` row with a reference of the form
`ZY-YYYYMMDD-XXXX-aN`, where `N` is an attempt counter. The attempt suffix exists
because Paystack rejects duplicate references, so every retry of the same order gets a
fresh `-aN`. The customer completes (or abandons) the Paystack popup, and from that
moment several independent observers may report the outcome: the browser redirect to
`/checkout/verify` (which calls `/api/paystack/verify`), the Paystack `charge.success` /
`charge.failed` webhook, and — if both of those are lost — the reconciliation cron. Any
of them may arrive first, last, or simultaneously.

The race is resolved by atomic SQL. `markPaymentPaid` runs
`UPDATE payments SET status='paid' WHERE reference=$1 AND status<>'paid'` and returns the
row only if it actually changed it; `markPaymentFailed` does the analogous pending→failed
transition. Whichever observer wins the UPDATE is the single one that proceeds to
side-effects; the others see no row changed and bow out. The side-effects themselves live
in one shared module, `lib/paymentFulfillment.ts`, so that verify, webhook, resume,
admin re-verify, and the reconcile cron all produce **identical** results. On a winning
paid transition, `runPostPaidFulfillment` marks the order confirmed, sends the receipt
email, and — for a subscription's first charge — captures the `authorization_code` that
future automatic renewals will charge against. On a winning failed transition,
`runPostFailedCleanup` restores stock atomically (guarded by `stock_restored_at`) and
moves the order to a cancelled/failed state, but only if it is still `pending` so it can
never clobber an order an admin has already advanced.

Two money-correctness edge cases are handled explicitly. **Overpayment**: if Paystack
reports the customer paid more than charged (beyond a tiny rounding tolerance), the
excess is auto-refunded and logged, and a refund failure is logged loudly rather than
silently swallowed. **Underpayment** (`handleUnderpayment`) is subtler because the refund
must fire exactly once even though verify, webhook, and cron can all detect the shortfall
at the same instant. The solution is to first *claim* the payment with the atomic
pending→failed transition; only the single caller that wins the claim proceeds to restore
stock, refund what the customer paid, and email them a resume link. If the refund call
itself fails after the claim, the row is left failed and flagged with
`action_required: manual_refund` rather than re-opened — re-opening would risk a second
refund from another observer. Every one of these events is appended to `payment_events`
for forensic traceability.

The processing-fee math deserves a note because it is split 50/50 between customer and
business and must reconcile to the kobo. Nigerian local-card fees are 1.5% + ₦100, capped
at ₦2,000, waived under ₦2,500. The customer pays half as a visible "Processing Fee" line.
Because the fee depends on the total and the total includes the fee, `customerProcessingFeeKobo`
solves the fixed point with three iterations (the function is piecewise-linear and converges
fast). All Paystack-boundary amounts are in kobo; conversion to naira happens only at the
display edges. The checkout form mirrors this exact kobo math so the "you'll be charged"
figure never drifts from what the server actually charges.

---

## 8. Payment recovery: surviving the unhappy paths

Because customers close browsers mid-payment, networks drop between Paystack and the
server, and webhooks occasionally never arrive, the system has a dedicated recovery
layer rather than hoping the happy path always completes.

The **reconciliation cron** (`/api/cron/paystack-reconcile`) periodically sweeps every
payment stuck in `pending` past a staleness threshold. For each, it calls Paystack's
verify endpoint and acts on the truth: success → mark paid + run fulfillment; failed or
reversed → mark failed + restore stock; abandoned, or pending beyond 24 hours → mark
abandoned + restore stock + send the customer a resume email (sent at most once, gated by
`resume_email_sent_at`). In-flight statuses like `ongoing`/`processing`/`queued` (e.g. a
pay-with-bank-transfer the customer hasn't completed) are left alone to settle. The cron
fails closed with a 401 if `CRON_SECRET` is unset in production, so it can't be triggered
anonymously.

The **resume flow** lets a stranded customer finish paying. Each payment can mint a
unique `resume_token`; the email links to `/checkout/resume?token=...`, which posts to
`/api/paystack/resume`. That endpoint first re-verifies the original reference — if it
turns out the original actually succeeded, it simply marks paid and fulfills with no
popup at all; otherwise it creates a fresh attempt (N+1) with a new reference and returns
an access code for a new popup. The **admin re-verify** button on the order panel's
Payment Ledger card does the same verification on demand, for the classic "I was charged
but the order still says pending" support case. Because all of these — verify, webhook,
resume, reverify, reconcile — route through the same atomic transitions and the same
shared fulfillment module, none of them can double-fulfill, double-restore stock, or
double-refund.

A practical wrinkle from the hosting tier: Vercel's Hobby plan forbids crons more
frequent than daily, so all four Vercel crons run on a daily floor, and the frequent
(~15-minute) reconciliation is driven instead by a free GitHub Actions workflow that
curls the `CRON_SECRET`-gated endpoint. The recovery cadence therefore lives outside
Vercel even though the logic lives inside it.

---

## 9. Subscriptions and recurring charges

Subscriptions are a multi-step signup at `/subscribe` (weekly, biweekly, or monthly meat
boxes) administered at `/admin/subscriptions`. The first charge goes through the normal
Paystack popup, and the webhook captures the resulting `authorization_code` onto the
subscription row. From then on, the subscriptions cron charges the saved authorization
directly via `charge_authorization`, which means renewals need no customer interaction.
Native Paystack intervals are used where they map cleanly; the custom biweekly cadence is
driven by the cron's own date logic. Cancellation disables the Paystack subscription. The
analytics layer normalizes every frequency to a monthly figure to compute MRR/ARR and
churn.

---

## 10. The admin application and its auth

Everything under `/admin` is gated by `proxy.ts`, a Next.js middleware. It lets the login
page and the login/logout API routes through, but for every other admin path it reads the
`admin_session` cookie, looks the token up in the `admin_sessions` table, and confirms it
exists and hasn't expired; on failure it clears the cookie and redirects to login with a
`from` parameter so the user returns to where they were. Sessions last seven days.
Passwords are bcrypt-hashed (`lib/adminAuth.ts`) and checked against the `admin_users`
table, which carries roles (admin / super_admin). Every meaningful admin action and every
cron run is written to `admin_audit_logs` and surfaced in the `/admin/audit` view, so the
system has a complete trail of who changed what.

The admin is a 25-route dashboard organized into seven navigation groups (Overview,
Orders & Payments, Catalog, Operations, Events & Services, Marketing & Content, System).
The landing page (`/admin`) is deliberately *not* the full analytics suite — that was
found to be overwhelming. Instead `lib/dashboard.ts` computes a today-scoped, action-
oriented view: tier-1 alert tiles (orders awaiting payment, failed payments today,
disputes due within 48 hours, stock expiring within three days with the value at risk,
new orders to confirm, deliveries due today, items to reorder, unquoted bookings) that
deep-link to the relevant screen and hide themselves when zero; tier-2 pulse metrics
(revenue today versus the same weekday last week, pace-to-now versus a typical day by this
hour, orders versus the 7-day average, new customers); and tier-3 today's delivery run and
latest orders. The full analytical depth lives at `/admin/analytics`.

The order detail panel is the operational workhorse: a gradient-headed view with
icon-based cards, package grouping, per-item prep options, copy-to-clipboard, WhatsApp
status messaging, a full payment ledger with per-attempt re-verify and refund (full and
partial) buttons, and contextual status actions. Order status itself moves strictly
through `pending → processing → packed → out_for_delivery → delivered`, and the API
enforces the transitions sequentially so a status can't skip stages.

---

## 11. Analytics and reporting

`/admin/analytics` renders `AnalyticsDashboard`, fed by `lib/analytics.ts`'s
`calculateAnalytics(orders, ..., subscriptions, payments)`. It computes far more than
revenue: a meat-specific tab (total kg sold, kg-by-category bars, gross-margin line,
delivery-zone pie and table, expiring-stock KPIs); a retention/RFM model that segments
customers into Champions / Loyal / New / At-risk / Lost and reports repeat-revenue share
and median reorder cadence; a basket-affinity analysis that finds product co-occurrence
pairs to suggest bundle candidates; payment-health metrics drawn from the ledger
(success, abandonment and refund rates, Paystack fee percentage, average time-to-pay);
and subscription economics (MRR/ARR, churn, breakdown by frequency). The payment-health
and subscription blocks return null when there's no data rather than rendering misleading
zeros. The one honest caveat the team tracks: margin metrics depend on `costPrice`, which
is now snapshotted onto line items at checkout but is zero for products without a linked
inventory item — so margins are only as good as inventory-cost coverage. Reports can be
exported to PDF via jsPDF.

---

## 12. Notifications and the operational pulse

The admin's `NotificationBell` polls `/api/admin/notifications` every 30 seconds for new
orders, pending payments, expiring stock, and low stock, and plays a sound alert on new
events. This polling design (rather than websockets) keeps the serverless deployment
simple and is adequate for a single-tenant admin team. It is the real-time-feeling layer
that, combined with the today-scoped dashboard, lets staff run the day without digging.

---

## 13. Services, events, and Owambe

A whole second product family lives alongside the shop, introduced in migration 020. The
tables `marinades`, `processing_options`, `kitchen_menu_items`, `service_bookings`,
`events`, and `occasions` back the Kitchen grill-house menu, the outdoor-butchery and
events booking flow, and the Owambe (Nigerian celebration) event planner. Customers
interact through components like `OwambeWizard`, `EatModeSelector`, and `ServicesPillar`;
admins configure them under `/admin/services-config`, `/admin/processing`,
`/admin/bookings`, and `/admin/events`. Bookings flow into the same dashboard alert system
(unquoted bookings appear as a tier-1 tile), so services don't become a neglected silo.

---

## 14. Content, media, and the editable storefront

The storefront is heavily editable without code changes. `site_settings.custom_texts` is
a JSONB bag of overrides; `lib/textDefaults.ts` defines nine groups of default copy, and
`getText(customTexts, key)` returns the override or the default. Homepage components —
Hero, PromiseBar, NewArrivals, ShopByCategory, HomeCta, AboutSnippet, Footer — all read
their copy through `getText`, and the admin settings screen renders a grouped editor for
them. The header's announcement bar, the featured-slide carousel in the Hero (curated at
`/admin/featured` with drag-reorder, overlay editor, and live preview), and the CMS pages
at `/admin/pages` (rendered through the dynamic `app/[slug]` route) are all admin-driven.
Rich text is edited with TipTap. Images are uploaded through `/api/upload` to Cloudinary
and managed in a media gallery (`/admin/gallery` with a `MediaPicker`), backed by the
`media_gallery` table.

---

## 15. Email

`lib/email.ts` owns every transactional message through a single Nodemailer SMTP
transport. The transport defaults to Zoho Mail (`smtppro.zoho.com`, implicit SSL on port
465) and reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, and `SMTP_PASSWORD` from the
environment, so the provider is swappable without code changes. There are a dozen-plus
templates: order receipt, payment approved, shipped, delivered, review request, abandoned
cart, newsletter welcome, campaign send, subscription confirmed, renewal, delivery
reminder, low-stock alert, and the payment-recovery (underpayment / resume) emails. Item
rows in the templates render variants, prep options, and collapsed package groups
identically to the on-site display. Email sends are deliberately non-blocking on the order
path — a failed send is logged but never fails the order.

---

## 16. Delivery

Delivery is Lagos-only and priced by area zone in `lib/deliveryPricing.ts`, with a
hardcoded fallback table overridable by database rows; there is no interstate shipping.
The `DeliveryScheduler` in the checkout form is now a date-picker only (time slots were
removed). It enforces a noon cutoff: order before 12pm and the earliest delivery date is
today; after 12pm and it's tomorrow. The chosen date is sent as `requestedDeliveryDate`;
because slots are gone, the `increment_delivery_capacity` RPC no longer fires for new
orders, though the nullable slot column and all conditional slot UI remain so historical
orders still display correctly. The actual courier fee (e.g. an Uber dispatch cost) is
intended to be entered by an admin after dispatch.

---

## 17. Background jobs

Four Vercel crons run daily (the Hobby-plan floor): subscription renewals, delivery
reminders, an expiry sweep that flags meat nearing its use-by date, and the Paystack
reconciliation already described. A GitHub Actions workflow supplements the last one at a
~15-minute cadence for fast stock release and payment recovery. Cron executions are logged
to `cron_logs` and surfaced with manual-trigger and history views at `/admin/cron`, and
also written to the audit log. The abandoned-cart endpoint and the newsletter batch-send
round out the scheduled/triggered work.

---

## 18. SEO

SEO was built from nothing into a complete technical foundation centered on `lib/seo.ts`,
which exposes the canonical site URL, helpers (`absoluteUrl`, `stripHtml`, `truncate`,
transactional meta-description builders), and JSON-LD schema builders (Organization,
WebSite with SearchAction, LocalBusiness as GroceryStore, Product/Offer, BreadcrumbList,
and per-package Product/Offer with live availability). `components/JsonLd.tsx` renders
these as `application/ld+json`. `app/sitemap.ts` builds a dynamic, fail-soft sitemap from
products and CMS pages; `app/robots.ts` disallows the private areas and points at the
sitemap. The root layout sets `metadataBase`, a title template, an `en_NG` OpenGraph
locale, and the site-wide schema. Product pages emit per-product metadata and
Product/Offer/Breadcrumb structured data with price, `priceValidUntil`, and stock state;
the Packages storefront was converted to a server component specifically so its per-box
structured data (including InStock/OutOfStock availability computed from live inventory)
renders in the initial HTML. Aggregate ratings are deliberately omitted because there is
no review system and faking them invites a Google penalty.

---

## 19. Security posture

Several layers defend the system. RLS policies (migration 014) constrain what the public
anon key can read and write, while trusted server writes use the service-role client.
Admin routes are middleware-gated with hashed passwords and expiring DB-backed sessions.
The Paystack webhook verifies an HMAC-SHA512 signature over the raw request body with a
timing-safe comparison before trusting any event. Checkout initialization is rate-limited
per IP and per email through a Postgres-backed counter. Crons that touch money fail closed
without their secret. Secrets (Paystack, Supabase service role, SMTP, session signing) are
server-only environment variables and never reach the client bundle. The audit log makes
admin activity reviewable after the fact.

---

## 20. How a single order ties it all together

To see the whole architecture in one motion, follow one order end to end. A customer
browses the shop (server components reading through `lib/queries.ts` under RLS), adds cuts
and perhaps a Package to the Zustand cart (which expands the package into stock-bearing
lines and prices it flat), and opens checkout. The checkout form computes the customer's
half of the processing fee with the same kobo math the server uses, generates a
`ZY-YYYYMMDD-XXXX` id, and posts to `/api/paystack/initialize`. That route validates the
payment environment, rate-limits the attempt, and calls `create_order_atomic`, which in a
single Postgres transaction locks each product row, deducts stock with variant→inventory→
product precedence, and inserts the order with cost snapshots — rolling back entirely if
anything is short. It registers the customer with Paystack, initializes the transaction,
and (rolling back stock if Paystack fails) writes a `pending` row to the `payments` ledger
with reference `...-a1`, returning an access code. The browser opens the Paystack popup;
the customer pays. Now the verify redirect, the `charge.success` webhook, and the
reconcile cron all race to report success, but only the one that wins the atomic
`status<>'paid'` UPDATE runs `runPostPaidFulfillment`, which confirms the order, fires the
receipt email through Zoho SMTP, and (if a subscription) banks the authorization code for
renewals. The admin's notification bell surfaces the new order within 30 seconds; the
dashboard counts it toward today's revenue and pace; the analytics layer later folds its
cost-snapshotted line items into margin and its payment row into payment-health metrics.
If the customer had instead closed the browser mid-payment, the reconcile cron would later
verify the reference, find it abandoned, restore the exact stock it deducted (once,
guarded by `stock_restored_at`), and email a one-time resume link — and the whole thing
would still reconcile to the kobo. That single path exercises every layer the system has,
which is the point: breadth of features, but one spine.
