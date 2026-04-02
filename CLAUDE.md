# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZúTa Ya is a premium meat delivery e-commerce platform serving Lagos and interstate Nigeria. Built with Next.js 16 (App Router), Supabase (Postgres), and deployed on Vercel.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (also serves as the lint/type check gate)
- `npx @biomejs/biome check .` — Lint and format check
- `npx @biomejs/biome check --write .` — Auto-fix lint/format issues

There are no test scripts configured.

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router, React 19, React Compiler (babel plugin)
- **Database:** Supabase (Postgres) via `@supabase/supabase-js` — singleton client in `lib/supabase.ts`
- **State:** Zustand stores with `persist` middleware (`lib/cartStore.ts`, `lib/orderStore.ts`, `lib/notificationStore.ts`)
- **Styling:** Tailwind CSS v4 with custom brand colors defined in `tailwind.config.ts`
- **Rich text:** TipTap editor for CMS pages and recipes
- **Charts:** Recharts for admin analytics
- **Email:** Nodemailer (`lib/email.ts`)
- **Linter/Formatter:** Biome (spaces, double quotes, 100-char line width)

### Code Layout
- `app/` — Next.js App Router pages and API routes
  - `app/admin/` — Admin dashboard (products, orders, customers, analytics, CMS, inventory, coupons, delivery zones, newsletter, subscriptions, bundles, settings)
  - `app/api/` — API routes (orders, search, stockpile, subscriptions, newsletter, bundles, categories, admin endpoints)
  - `app/[slug]/` — Dynamic CMS pages
  - `app/shop/`, `app/checkout/`, `app/track/`, `app/stockpile/`, `app/subscribe/`, `app/bundles/` — Customer-facing pages
  - `app/newsletter/unsubscribe/` — Newsletter unsubscribe confirmation page
- `components/modules/` — Feature-specific components (CheckoutForm, AdminOrdersContent, FilterSidebar, etc.)
- `components/ui/` — Reusable primitives (Button, Badge, Skeletons, etc.)
- `lib/` — Shared logic
  - `queries.ts` — All Supabase queries with `Db*` → app type mappers (`toProduct`, `toOrder`, etc.)
  - `deliveryPricing.ts` — Lagos zone and interstate delivery fee engine with fuzzy area matching
  - `constants.ts` — Site config, nav links, bank transfer details, order statuses
  - `cartStore.ts` — Zustand cart with coupon support
- `types/index.ts` — All shared TypeScript interfaces (Product, Order, CartItem, Stockpile, Subscription, NewsletterSubscriber, NewsletterCampaign, etc.)
- `supabase/` — Database schema (`schema.sql`) and migrations
- `proxy.ts` — Admin auth middleware (cookie-based session with `ADMIN_SESSION_SECRET`)

### Key Patterns
- **Data access:** `lib/queries.ts` is the single data access layer. DB rows use `snake_case`; app types use `camelCase`. Mapper functions (`toProduct`, `toOrder`) handle conversion.
- **Admin auth:** Password-based login sets a session cookie checked by `proxy.ts` middleware. Protected by `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` env vars.
- **Currency:** Nigerian Naira (NGN). Formatting via `lib/formatCurrency.ts`.
- **Order statuses:** `pending → processing → packed → out_for_delivery → delivered` (defined in `lib/constants.ts`).
- **Payment methods:** WhatsApp and bank transfer (no online payment gateway).
- **Delivery pricing:** Two-tier system — Lagos zones (area-based fees) and interstate (state/city with hub pickup vs doorstep options). Hardcoded fallback data with DB-backed overrides.
- **Stockpile:** Feature allowing customers to accumulate items across multiple orders before shipping.
- **Newsletter:** Footer signup → welcome email. Admin campaign CRUD + batch send. Token-based unsubscribe. Tables: `newsletter_subscribers`, `newsletter_campaigns`.
- **Subscriptions:** Multi-step signup at `/subscribe` (select products → details → delivery → confirm). Admin management at `/admin/subscriptions`. Frequencies: weekly/biweekly/monthly. Table: `subscriptions`.
- **Bundles:** Bundle discount rules with category filters. Admin at `/admin/bundles`. Table: `bundle_rules`.
- **Email templates** (`lib/email.ts`): order receipt, payment approved, shipped, delivered, review request, abandoned cart, stockpile lifecycle, newsletter welcome, campaign send, subscription confirmed.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — Admin authentication
- `NEXT_PUBLIC_SITE_URL` — Public site URL (defaults to vercel app)
- `SMTP_EMAIL` / `SMTP_PASSWORD` — Gmail SMTP for transactional emails

RULES
when done with a task, very short and brief summary
each feature should be done thoroughly, well featured and all feautures must be working, no skeletons
use as little tokens as possible
use as little tokens as possible
always save context to this file to help you know where you are at all times