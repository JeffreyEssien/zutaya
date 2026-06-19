# Paystack Integration — Research & Implementation Plan

_Date: 2026-06-18. Goal: rip out WhatsApp + bank transfer, ship a single, perfect Paystack Inline checkout (+ subscriptions + refunds)._

---

## Decisions (locked)

| Decision | Choice | Reason |
|---|---|---|
| Mode | **Inline Popup V2** (`js.paystack.co/v2/inline.js`) | User stays on site; no redirect; modern API. |
| Server flow | `POST /transaction/initialize` → return `access_code` to client → `PaystackPop.resumeTransaction(access_code)` | Inline V2 contract. Secret key never touches browser. |
| Fulfillment signal | **Both** verify (on callback) AND webhook, with one idempotent SQL UPDATE | Webhooks can drop; callback alone is untrusted. |
| Reference format | `ZY-YYYYMMDD-XXXX-a{N}` (N = attempt counter) | Paystack rejects duplicate refs; retries need fresh ref. |
| Amount unit | **kobo everywhere** at the API boundary (NGN × 100) | Top pitfall. Normalize once. |
| Channels | `card, bank, ussd, qr, bank_transfer` | Drop `mobile_money` (GH/KE) and `eft`/`apple_pay` (not NG). |
| Customer model | Create Paystack Customer on first checkout; store `customer_code` | Auth bound to email-at-creation; defensive for email changes. |
| Subscriptions | Native Plan for `weekly/monthly`. **Biweekly** = cron + `charge_authorization` | Paystack has no biweekly interval. |
| Fees | 1.5% + ₦100, cap ₦2,000, waived ≤ ₦2,500. Customer pays **half** as line-item "Processing Fee" | Per spec. Fixed-point iteration for exact split. |
| Refunds | Admin-triggered from OrderDetailPanel. Full + partial. Webhook completes. | Per spec. ~10 business days to settle. |

---

## Environment variables (need from user)

```
PAYSTACK_PUBLIC_KEY=pk_test_...   (then pk_live_...)
PAYSTACK_SECRET_KEY=sk_test_...   (then sk_live_...)
PAYSTACK_WEBHOOK_URL_PATH=/api/paystack/webhook   (set in Paystack dashboard)
```

Webhook IPs to allowlist (still valid 2026): `52.31.139.75`, `52.49.173.169`, `52.214.14.220`.

---

## Architecture — happy paths

### 1. One-off order (6 steps)
1. Client clicks **Pay** → `POST /api/paystack/initialize` with cart.
2. Server computes gross + processing fee (fixed-point), upserts `payments` row (`reference=ZY-…-a1`, `status='pending'`, `amount_kobo`), calls Paystack `POST /transaction/initialize` with `email, amount, currency:"NGN", reference, channels, metadata:{order_id}, customer:customer_code`.
3. Server returns `{ access_code, reference }`. Client: `new PaystackPop().resumeTransaction(access_code, { onSuccess, onCancel })`.
4. `onSuccess` → `router.push('/checkout/verify?reference=…')`.
5. `/checkout/verify` page calls `GET /api/paystack/verify?reference=…`. Server hits `GET /transaction/verify/:reference`, asserts `status==='success'` AND `amount` matches DB. Single atomic transition: `UPDATE payments SET status='paid' WHERE reference=$1 AND status<>'paid' RETURNING *`. Only the row that flips runs fulfillment.
6. Webhook arrives in parallel and runs same idempotent SQL; whichever lost is a no-op.

**Fulfillment side-effects (run once, on the winning transition):**
- Send order receipt email
- Order: set `status='processing'` (or keep `pending` if admin needs to confirm stock)
- Increment coupon `usage_count`
- Call `increment_delivery_capacity` RPC
- Write audit log

### 2. Subscription (3 steps)
1. Admin creates Plan once: `POST /plan` → store `plan_code`.
2. Customer signup → `/api/paystack/initialize` with `plan: plan_code` in metadata; Paystack auto-creates Subscription on first charge.
3. `subscription.create` webhook → store `subscription_code, email_token, authorization_code, customer_code`.
4. Cancel: `POST /api/paystack/subscription/disable { code, token }`.
5. **Biweekly**: Vercel cron every 14 days → `POST /transaction/charge_authorization { authorization_code, email, amount }`. Idempotency key = `sub_id||scheduled_date`.

### 3. Refund
Admin in `OrderDetailPanel` clicks Refund → `POST /api/paystack/refund { reference, amount? }` → Paystack `POST /refund`. Set `payments.refund_status='pending'`. Webhook `refund.processed` → flip to `processed`, restore inventory, email customer, audit.

---

## Files to TEAR OUT

(All cited file:line from explore agent.)

### UI
- `components/modules/CheckoutForm.tsx:26` — `paymentMethod` prop type
- `CheckoutForm.tsx:94` — state init
- `CheckoutForm.tsx:186-187` — order assignment
- `CheckoutForm.tsx:229-250` — WhatsApp redirect flow
- `CheckoutForm.tsx:425-450` — payment method picker UI
- `components/modules/BankTransferPanel.tsx` — **delete entire file**
- `app/checkout/page.tsx:18, 79-95` — `bank_transfer` state + panel routing
- `OrderDetailPanel.tsx:76-88` — `handleApprovePayment`
- `OrderDetailPanel.tsx:144-152, 165` — payment-method display

### API
- `app/api/orders/[id]/route.ts:106-152` — PATCH paymentStatus/senderName
- `app/api/orders/route.ts:49-51` — email send moves to verify/webhook

### DB / mappers
- `lib/queries.ts:45, 47, 103, 105, 400-401` — payment_method/payment_status field plumbing
- `lib/queries.ts:298-305` — pending payment submissions query
- `lib/queries.ts:439-455` — `updatePaymentInfo()` — delete

### Constants / email
- `lib/constants.ts:46, 49-51` — BANK_NAME / BANK_ACCOUNT_NUMBER / BANK_ACCOUNT_NAME (keep WHATSAPP_NUMBER for support)
- `lib/email.ts:149-154, 177-179, 250-279` — bank transfer notice + admin display + sendPaymentApprovedEmail

### Types
- `types/index.ts:165, 167` — paymentMethod / paymentStatus enums

---

## Files to ADD

```
lib/paystack.ts                              # SDK wrapper + fee calc
app/api/paystack/initialize/route.ts
app/api/paystack/verify/route.ts
app/api/paystack/webhook/route.ts
app/api/paystack/refund/route.ts
app/api/paystack/subscription/disable/route.ts
app/api/admin/plans/route.ts                 # CRUD for Plans
app/checkout/verify/page.tsx                 # post-popup landing
supabase/migrations/023_paystack_payments.sql
```

---

## Migration 023 — schema sketch

```sql
-- payments table (one row per attempt)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,              -- ZY-...-aN
  order_id text REFERENCES orders(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_kobo bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',      -- pending|paid|failed|abandoned
  channel text,
  paid_at timestamptz,
  fees_kobo bigint,
  authorization_code text,
  customer_code text,
  refund_status text,                          -- null|pending|processed|failed
  refunded_amount_kobo bigint,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);

-- subscriptions extensions
ALTER TABLE subscriptions
  ADD COLUMN paystack_plan_code text,
  ADD COLUMN paystack_subscription_code text,
  ADD COLUMN paystack_email_token text,
  ADD COLUMN paystack_authorization_code text,
  ADD COLUMN paystack_customer_code text;

-- orders cleanup (keep historical payment_method column? — DECIDE)
-- Option A (clean): drop payment_method, payment_status
-- Option B (safe): leave for historical orders, default new ones to 'paystack'
-- Default plan: Option B — leave columns, default to 'paystack' on new rows.
```

---

## Fee calculation (drop into lib/paystack.ts)

```ts
export function paystackFeeKobo(grossKobo: number): number {
  if (grossKobo <= 250_000) return 0;          // ≤ ₦2500 waived
  const raw = Math.ceil(grossKobo * 0.015) + 10_000; // 1.5% + ₦100
  return Math.min(raw, 200_000);                // cap ₦2000
}

// Customer pays half. Solve: customer = paystackFee(gross + customer) / 2
export function customerProcessingFeeKobo(baseKobo: number): number {
  let customer = 0;
  for (let i = 0; i < 3; i++) {
    customer = Math.ceil(paystackFeeKobo(baseKobo + customer) / 2);
  }
  return customer;
}
```

---

## Webhook handler (App Router pattern)

```ts
// app/api/paystack/webhook/route.ts
import crypto from "node:crypto";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const raw = await req.text();                 // raw body for HMAC
  const sig = req.headers.get("x-paystack-signature");
  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(raw).digest("hex");
  if (!sig || sig !== expected) return new Response("bad sig", { status: 401 });
  const event = JSON.parse(raw);
  // dispatch by event.event, run idempotent transitions, return 200 fast
  return new Response("ok");
}
```

---

## Top pitfalls (avoid these)

1. **Kobo/Naira mixup** — normalize at the API boundary, never in components.
2. **Trusting client `onSuccess`** — always server-verify.
3. **Reusing `reference` on retry** — Paystack returns "Duplicate Transaction Reference." Append attempt counter.
4. **Parsing body before HMAC** — must hash raw text.
5. **Double fulfillment** — gate with `UPDATE … WHERE status<>'paid' RETURNING`.

---

## Test plan (Paystack sandbox)

- Test card: **5060 6666 6666 6666 666**, any future exp, CVV `123`, PIN `1234`, OTP `123456`.
- Cases: happy path · cancel · declined · webhook signature bad · webhook fires before verify · verify fires before webhook · refund full · refund partial · subscription create → charge_authorization → disable.

---

## Open questions for user

1. **Paystack keys** — share `pk_test_...` + `sk_test_...` so we can run the e2e. (Live keys later.)
2. **Customer table** — currently we store customers inline on orders. OK to add `customers` table now (or stash `customer_code` on orders + denormalize)? Default plan: add `customers` table in migration 023.
3. **Historical `payment_method` column** — drop, or keep for historical orders? Default plan: **keep** (Option B above), new rows default to `'paystack'`.
4. **Biweekly cadence** — confirm we need it (currently in subscription options). If only weekly/monthly, we skip the `charge_authorization` cron path and use native Paystack subscriptions for everything.

---

## Source docs

- InlineJS: https://paystack.com/docs/developer-tools/inlinejs/
- V1→V2 migration: https://paystack.com/docs/guides/migrating-from-inlinejs-v1-to-v2/
- Transaction API: https://paystack.com/docs/api/transaction/
- Verify Payments: https://paystack.com/docs/payments/verify-payments/
- Webhooks: https://paystack.com/docs/payments/webhooks/
- Subscriptions: https://paystack.com/docs/payments/subscriptions/
- Plan API: https://paystack.com/docs/api/plan/
- Subscription API: https://paystack.com/docs/api/subscription/
- Refund API: https://paystack.com/docs/api/refund/
- Pricing: https://paystack.com/pricing
- Channels: https://paystack.com/docs/payments/payment-channels/
- Test cards: https://paystack.com/docs/payments/test-payments/
- Customer API: https://paystack.com/docs/api/customer/
