# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZúTa Ya is a premium meat delivery e-commerce platform serving Lagos and interstate Nigeria. Built with Next.js 16 (App Router), Supabase (Postgres), and deployed on Vercel. Rebranded from XELLÉ.

**Agent Instructions Doc:** Full implementation spec lives in `/ZutaYa_Agent_Instructions.docx` (16 sections). Extract with `textutil -convert txt -stdout ZutaYa_Agent_Instructions.docx`.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (also serves as the lint/type check gate)
- `npx @biomejs/biome check .` — Lint and format check
- `npx @biomejs/biome check --write .` — Auto-fix lint/format issues
- `npx tsx scripts/seed.ts` — Seed database with sample data (10 tables)

There are no test scripts configured.

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router, React 19, React Compiler (babel plugin)
- **Database:** Supabase (Postgres) via `@supabase/supabase-js` — singleton client in `lib/supabase.ts`
- **State:** Zustand stores with `persist` middleware (`lib/cartStore.ts`, `lib/orderStore.ts`, `lib/notificationStore.ts`)
- **Styling:** Tailwind CSS v4 with custom brand colors in `tailwind.config.ts` (brand-red, warm-cream, deep-espresso, charcoal, forest-green, gold-accent)
- **Rich text:** TipTap editor for CMS pages and recipes
- **Charts:** Recharts for admin analytics
- **Email:** Nodemailer (`lib/email.ts`)
- **Animations:** Framer Motion
- **Linter/Formatter:** Biome (spaces, double quotes, 100-char line width)

### Code Layout
- `app/` — Next.js App Router pages and API routes
  - `app/admin/` — Admin dashboard (products, orders, customers, analytics, CMS, inventory, coupons, delivery zones, newsletter, subscriptions, bundles, settings)
  - `app/api/` — API routes (orders, search, subscriptions, newsletter, bundles, categories, admin endpoints)
  - `app/[slug]/` — Dynamic CMS pages
  - `app/shop/`, `app/checkout/`, `app/track/`, `app/subscribe/`, `app/bundles/` — Customer-facing pages
  - `app/newsletter/unsubscribe/` — Newsletter unsubscribe confirmation page
- `components/modules/` — Feature-specific components (CheckoutForm, AdminOrdersContent, FilterSidebar, etc.)
- `components/ui/` — Reusable primitives (Button, Badge, StorageBadge, Skeletons, etc.)
- `lib/` — Shared logic
  - `queries.ts` — All Supabase queries with `Db*` → app type mappers (`toProduct`, `toOrder`, etc.)
  - `deliveryPricing.ts` — Lagos zone and interstate delivery fee engine with fuzzy area matching
  - `constants.ts` — Site config, nav links, bank transfer details, order statuses
  - `cartStore.ts` — Zustand cart with coupon support
  - `orderQueue.ts` — Postgres advisory lock-based order serialization
  - `textDefaults.ts` — Editable text system: `TEXT_GROUPS` with defaults + `getText()` helper
- `types/index.ts` — All shared TypeScript interfaces (Product, Order, CartItem, Subscription, NewsletterSubscriber, etc.)
- `supabase/` — Database schema (`schema.sql`) and migrations (001-013)
- `scripts/seed.ts` — Database seeder for 10 tables
- `proxy.ts` — Admin auth middleware (cookie-based session with `ADMIN_SESSION_SECRET`)

### Key Patterns
- **Data access:** `lib/queries.ts` is the single data access layer. DB rows use `snake_case`; app types use `camelCase`. Mapper functions (`toProduct`, `toOrder`) handle conversion.
- **JSONB safety:** `variants` and `prepOptions` fields may arrive as strings from DB. Mappers use `typeof === "string" ? JSON.parse() : value || []` pattern. Components also guard with `Array.isArray()`.
- **Admin auth:** Password-based login sets a session cookie checked by `proxy.ts` middleware. Protected by `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` env vars.
- **Currency:** Nigerian Naira (NGN). Formatting via `lib/formatCurrency.ts`.
- **Order statuses:** `pending → processing → packed → out_for_delivery → delivered` (defined in `lib/constants.ts`).
- **Order queue:** Postgres advisory locks serialize concurrent checkouts. `lib/orderQueue.ts` wraps order processing; `order_queue` table tracks status. Migration 013.
- **Payment methods:** WhatsApp and bank transfer (no online payment gateway).
- **Delivery pricing:** Lagos-only zones (area-based flat fees). Hardcoded fallback data with DB-backed overrides. No interstate delivery.
- **Admin Notifications:** Real-time polling (30s) for new orders and pending payments. NotificationBell component with sound alerts. API at `/api/admin/notifications`.
- **Editable texts:** `site_settings.custom_texts` JSONB column stores overrides. `lib/textDefaults.ts` defines groups/defaults. `getText(customTexts, key)` returns override or default.
- **Newsletter:** Footer signup → welcome email. Admin campaign CRUD + batch send. Token-based unsubscribe.
- **Subscriptions:** Multi-step signup at `/subscribe`. Admin at `/admin/subscriptions`. Frequencies: weekly/biweekly/monthly.
- **Bundles:** Full bundle builder at `/bundles` with search, filters, quantity controls, sticky summary, progress bar. Admin rules at `/admin/bundles`.
- **Email templates** (`lib/email.ts`): order receipt, payment approved, shipped, delivered, review request, abandoned cart, newsletter welcome, campaign send, subscription confirmed.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — Admin authentication
- `NEXT_PUBLIC_SITE_URL` — Public site URL (defaults to vercel app)
- `SMTP_EMAIL` / `SMTP_PASSWORD` — Gmail SMTP for transactional emails

## Implementation Status (vs Agent Instructions Doc)

### Done
- **Section 4 (Rebrand):** Colors, fonts, brand tokens applied. XELLÉ references removed.
- **Section 5 (Product meat fields):** storageType, priceUnit, cutType, prepOptions, variants — all with JSONB safety. StorageBadge component.
- **Section 6 (Order pipeline):** 5-stage statuses, email triggers at each stage, order queue with advisory locks for concurrent safety.
- **Section 7 (Delivery):** Lagos-only zones in `lib/deliveryPricing.ts`. Interstate removed entirely.
- **Section 8 (Email):** 9+ email templates in `lib/email.ts`. Rebranded.
- **Section 9 (Features):** Newsletter (signup, campaigns, unsubscribe), bundles (full builder UI + admin), subscriptions (multi-step + admin).
- **Section 10 (Admin):** Dashboard with products, orders, customers, analytics, CMS, inventory, coupons, delivery zones, newsletter, subscriptions, bundles, settings.
- **Section 11 (Notifications):** NotificationBell with polling, sound alerts, new order + pending payment detection.
- **Section 13 (Storefront):** Homepage (Hero, PromiseBar, NewArrivals, HomeCta, AboutSnippet, Footer), shop with filters/active chips, product detail, checkout with queue waiting room.
- **Section 14:** Stockpile removed entirely. Interstate removed — Lagos only.
- **Migrations 001-013** created.
- **About page** admin-editable (promise text, quote, stats).
- **DB seeded** via `scripts/seed.ts`.

### Remaining (from Agent Instructions Doc)
- **Section 3:** Bcrypt admin auth with rate limiting (currently plain password comparison).
- **Section 7.3:** DeliveryScheduler with capacity slots (`components/modules/DeliveryScheduler.tsx` exists but not wired).
- **Section 6.2:** ~~Sequential order status validation~~ — DONE. API enforces one-step-at-a-time transitions. Admin UI only shows valid next statuses.
- **Section 6.4:** New checkout fields: prep_instructions, delivery date/slot selection.
- **Section 9.4:** Recipes CMS (not started).
- **Section 12:** Cron jobs (subscription renewals, delivery reminders, expiry sweep).
- **Section 14 (migration):** RLS policy tightening (migration 014).
- **Section 15:** Pre-launch testing checklist items.
- **Custom texts wiring:** `lib/textDefaults.ts` has TEXT_GROUPS and `getText()` but admin settings form doesn't render grouped editor yet, and components don't call `getText()` yet.

## RULES
- When done with a task, very short and brief summary
- Each feature should be done thoroughly, well featured and all features must be working, no skeletons
- Use as little tokens as possible
- Always save context to this file to help you know where you are at all times
