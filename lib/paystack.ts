/**
 * Paystack SDK wrapper — single source of truth for every Paystack API call.
 *
 * Conventions:
 *  - Amounts are in KOBO at every API boundary. Convert at the edges only.
 *  - Reference format: ZY-YYYYMMDD-XXXX-aN (N = attempt counter)
 *  - All functions throw on network failure / non-2xx; callers decide what to do.
 */

import crypto from "node:crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
    return key;
}

export function publicKey(): string {
    const key = process.env.PAYSTACK_PUBLIC_KEY;
    if (!key) throw new Error("PAYSTACK_PUBLIC_KEY is not set");
    return key;
}

/**
 * Guard the env a payment flow needs BEFORE we touch the DB or Paystack.
 * Returns a clean list of problems (empty = healthy). Callers use this to
 * fail loudly at request time instead of silently stranding paid orders
 * (e.g. a wrong NEXT_PUBLIC_SITE_URL → broken callback_url + webhook URL).
 */
export function validatePaymentEnv(): string[] {
    const problems: string[] = [];
    if (!process.env.PAYSTACK_SECRET_KEY) problems.push("PAYSTACK_SECRET_KEY is not set");
    if (!process.env.PAYSTACK_PUBLIC_KEY) problems.push("PAYSTACK_PUBLIC_KEY is not set");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
        problems.push("NEXT_PUBLIC_SITE_URL is not set (breaks Paystack callback + webhook URLs)");
    } else if (!/^https?:\/\//.test(siteUrl)) {
        problems.push(`NEXT_PUBLIC_SITE_URL must start with http(s):// — got "${siteUrl}"`);
    }

    // Live secret keys with a localhost/preview callback URL is a misconfig that
    // strands real money — flag it rather than charge against a dead callback.
    if (process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") && siteUrl && /localhost|127\.0\.0\.1/.test(siteUrl)) {
        problems.push("Live PAYSTACK_SECRET_KEY with a localhost NEXT_PUBLIC_SITE_URL — refusing to charge real cards against a local callback");
    }
    return problems;
}

// ═══ Currency helpers ═══

export const nairaToKobo = (naira: number): number => Math.round(naira * 100);
export const koboToNaira = (kobo: number): number => kobo / 100;

// ═══ Fee calculation ═══
// Nigerian local card fee: 1.5% + ₦100, capped at ₦2000, waived if txn ≤ ₦2500.
// Customer pays half as a "Processing Fee" line item. Use fixed-point iteration
// so customer + business each pay (or absorb) exactly the right amount.

export function paystackFeeKobo(grossKobo: number): number {
    if (grossKobo <= 250_000) return 0; // ≤ ₦2500 waived
    const raw = Math.ceil(grossKobo * 0.015) + 10_000; // 1.5% + ₦100 (in kobo)
    return Math.min(raw, 200_000); // cap at ₦2000
}

/**
 * Solve: customer = paystackFee(base + customer) / 2
 * Three iterations is enough — the function is piecewise-linear and converges fast.
 */
export function customerProcessingFeeKobo(baseKobo: number): number {
    let customer = 0;
    for (let i = 0; i < 3; i++) {
        customer = Math.ceil(paystackFeeKobo(baseKobo + customer) / 2);
    }
    return customer;
}

// ═══ Reference helpers ═══

/**
 * Build a Paystack reference for an order attempt.
 * Format: ZY-YYYYMMDD-XXXX-aN where N is the attempt count for this order.
 */
export function buildReference(orderId: string, attempt = 1): string {
    return `${orderId}-a${attempt}`;
}

export function parseReference(reference: string): { orderId: string; attempt: number } | null {
    const m = reference.match(/^(.+)-a(\d+)$/);
    if (!m) return null;
    return { orderId: m[1], attempt: Number(m[2]) };
}

// ═══ Webhook signature verification ═══

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const expected = crypto
        .createHmac("sha512", secretKey())
        .update(rawBody)
        .digest("hex");
    // Timing-safe compare
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ═══ Core HTTP helper ═══

interface PaystackResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

async function call<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown }
): Promise<PaystackResponse<T>> {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
        method: init.method,
        headers: {
            Authorization: `Bearer ${secretKey()}`,
            "Content-Type": "application/json",
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as PaystackResponse<T> | null;
    if (!res.ok || !json) {
        throw new Error(
            `Paystack ${init.method} ${path} failed: ${res.status} ${json?.message || res.statusText}`,
        );
    }
    if (!json.status) {
        throw new Error(`Paystack ${path}: ${json.message}`);
    }
    return json;
}

// ═══ Transaction ═══

export interface InitializeArgs {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
    channels?: PaystackChannel[];
    plan?: string;       // Paystack plan code (turns this into a subscription start)
    customer?: string;   // Paystack customer_code (optional)
}

export type PaystackChannel =
    | "card"
    | "bank"
    | "ussd"
    | "qr"
    | "bank_transfer"
    | "mobile_money";

export const DEFAULT_CHANNELS: PaystackChannel[] = [
    "card",
    "bank",
    "ussd",
    "qr",
    "bank_transfer",
];

export interface InitializeResponse {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export async function initializeTransaction(
    args: InitializeArgs,
): Promise<InitializeResponse> {
    const body: Record<string, unknown> = {
        email: args.email,
        amount: args.amountKobo,
        reference: args.reference,
        currency: "NGN",
        channels: args.channels ?? DEFAULT_CHANNELS,
    };
    if (args.callbackUrl) body.callback_url = args.callbackUrl;
    if (args.metadata) body.metadata = args.metadata;
    if (args.plan) body.plan = args.plan;
    if (args.customer) body.customer = args.customer;

    const res = await call<InitializeResponse>("/transaction/initialize", {
        method: "POST",
        body,
    });
    return res.data;
}

/**
 * Paystack transaction status. `success`/`failed`/`abandoned` are the common
 * terminal states, but verify can also return in-flight or other terminal
 * states — `reversed` (charge reversed), `pending`/`ongoing`/`processing`/
 * `queued` (not yet settled, e.g. bank transfer / pay-with-transfer awaiting
 * the customer). The `(string & {})` keeps the union open so callers must
 * handle the unexpected rather than the type lying to them.
 */
export type PaystackTxnStatus =
    | "success"
    | "failed"
    | "abandoned"
    | "reversed"
    | "pending"
    | "ongoing"
    | "processing"
    | "queued"
    | (string & {});

export interface VerifyResponse {
    id: number;
    status: PaystackTxnStatus;
    reference: string;
    amount: number;
    channel: string;
    paid_at: string | null;
    created_at: string;
    currency: string;
    gateway_response: string;
    fees: number;
    customer: {
        id: number;
        customer_code: string;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
    };
    authorization: {
        authorization_code: string;
        card_type?: string;
        last4?: string;
        exp_month?: string;
        exp_year?: string;
        bank?: string | null;
        channel?: string;
        reusable?: boolean;
    };
    plan?: string | null;
    subscription?: { subscription_code: string; email_token: string } | null;
    metadata?: Record<string, unknown> | string;
}

export async function verifyTransaction(reference: string): Promise<VerifyResponse> {
    const res = await call<VerifyResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        { method: "GET" },
    );
    return res.data;
}

// ═══ Charge saved card (recurring) ═══

export interface ChargeAuthorizationArgs {
    authorizationCode: string;
    email: string;
    amountKobo: number;
    reference: string;
    metadata?: Record<string, unknown>;
}

export async function chargeAuthorization(
    args: ChargeAuthorizationArgs,
): Promise<VerifyResponse> {
    const res = await call<VerifyResponse>("/transaction/charge_authorization", {
        method: "POST",
        body: {
            authorization_code: args.authorizationCode,
            email: args.email,
            amount: args.amountKobo,
            reference: args.reference,
            currency: "NGN",
            metadata: args.metadata,
        },
    });
    return res.data;
}

// ═══ Customer ═══

export interface CreateCustomerArgs {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export interface PaystackCustomer {
    id: number;
    customer_code: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export async function createCustomer(args: CreateCustomerArgs): Promise<PaystackCustomer> {
    const res = await call<PaystackCustomer>("/customer", {
        method: "POST",
        body: args,
    });
    return res.data;
}

export async function fetchCustomer(emailOrCode: string): Promise<PaystackCustomer | null> {
    try {
        const res = await call<PaystackCustomer>(
            `/customer/${encodeURIComponent(emailOrCode)}`,
            { method: "GET" },
        );
        return res.data;
    } catch {
        return null;
    }
}

/** Idempotent: returns existing customer if email already registered. */
export async function findOrCreateCustomer(args: CreateCustomerArgs): Promise<PaystackCustomer> {
    const existing = await fetchCustomer(args.email);
    if (existing) return existing;
    return createCustomer(args);
}

// ═══ Plans ═══

export type PaystackInterval =
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "biannually"
    | "annually";

export interface CreatePlanArgs {
    name: string;
    amountKobo: number;
    interval: PaystackInterval;
    description?: string;
    currency?: "NGN";
    invoice_limit?: number;
}

export interface PaystackPlan {
    id: number;
    name: string;
    plan_code: string;
    amount: number;
    interval: string;
    integration: number;
    domain: string;
    is_archived: boolean;
}

export async function createPlan(args: CreatePlanArgs): Promise<PaystackPlan> {
    const res = await call<PaystackPlan>("/plan", {
        method: "POST",
        body: {
            name: args.name,
            amount: args.amountKobo,
            interval: args.interval,
            description: args.description,
            currency: args.currency ?? "NGN",
            invoice_limit: args.invoice_limit,
        },
    });
    return res.data;
}

// ═══ Subscriptions ═══

export async function disableSubscription(code: string, token: string): Promise<void> {
    await call<unknown>("/subscription/disable", {
        method: "POST",
        body: { code, token },
    });
}

export async function enableSubscription(code: string, token: string): Promise<void> {
    await call<unknown>("/subscription/enable", {
        method: "POST",
        body: { code, token },
    });
}

// ═══ Refund ═══

export interface RefundArgs {
    transaction: string; // reference or paystack txn id
    amountKobo?: number; // omit for full refund
    customerNote?: string;
    merchantNote?: string;
}

export interface RefundResponse {
    transaction: { id: number; reference: string };
    amount: number;
    status: "pending" | "processing" | "processed" | "failed";
    currency: string;
    refunded_at?: string;
}

export async function refundTransaction(args: RefundArgs): Promise<RefundResponse> {
    const body: Record<string, unknown> = { transaction: args.transaction };
    if (args.amountKobo != null) body.amount = args.amountKobo;
    if (args.customerNote) body.customer_note = args.customerNote;
    if (args.merchantNote) body.merchant_note = args.merchantNote;
    const res = await call<RefundResponse>("/refund", { method: "POST", body });
    return res.data;
}
