// Bumpa API client — pulls orders from the Bumpa store.
//
// Contract confirmed 2026-07-10 from api.getbumpa.com/docs/openapi.yaml:
//   • Base:   https://api.getbumpa.com
//   • Orders: GET /api/v1/orders  → { success, orders: <Laravel paginator> }
//   • Single: GET /api/orders/{id}
//   • Auth:   OAuth2 client_credentials — POST /oauth/token with client_id +
//             client_secret → access_token → send as Bearer. A secret ALONE
//             does NOT authenticate. If Bumpa confirms the secret works as a
//             direct bearer token, set BUMPA_AUTH_MODE=bearer.
//
// No products endpoint exists — order lines carry Bumpa's internal product_id
// (+ options + sometimes sku), which lib/bumpaSync.ts maps to zutaya products.

const BASE = (process.env.BUMPA_API_BASE || "https://api.getbumpa.com").replace(/\/+$/, "");
const SECRET = process.env.BUMPA_API_SECRET || "";
const CLIENT_ID = process.env.BUMPA_CLIENT_ID || "";
const AUTH_MODE = (process.env.BUMPA_AUTH_MODE || "oauth").toLowerCase(); // "oauth" | "bearer"

export interface BumpaContactDetails {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
}

export interface BumpaOrderItem {
    id: number;
    product_id: number | null;
    product_variation_id: number | null;
    order_id: number;
    name: string | null;
    sku: string | null;
    options: string | null; // variant label, e.g. "M-WHITE"
    quantity: string; // decimal string, e.g. "2.00"
    price: string;
    total: string;
    thumbnail_url: string | null;
}

export interface BumpaOrder {
    id: number;
    store_id: number;
    channel: string | null;
    origin: string | null;
    status: string | null; // OPEN, ...
    payment_status: string | null; // PAID, ...
    shipping_status: string | null; // UNFULFILLED, ...
    currency_code: string | null;
    total: string | null;
    sub_total: string | null;
    grand_total: string | null;
    amount_paid: string | null;
    shipping_price: string | null;
    total_discount: string | null;
    order_date: string | null;
    unique_hash: string | null;
    created_at: string | null;
    updated_at: string | null;
    customer_details: BumpaContactDetails | null;
    shipping_details: BumpaContactDetails | null;
    order_items: BumpaOrderItem[] | null;
    [key: string]: unknown;
}

interface Paginator<T> {
    current_page: number;
    data: T[];
    next_page_url: string | null;
    last_page?: number;
    total?: number;
    per_page?: number | string;
}

export interface BumpaConfigStatus {
    base: string;
    authMode: string;
    hasSecret: boolean;
    hasClientId: boolean;
    configured: boolean;
    /** Human-readable reason the client can't authenticate yet (or null). */
    blocker: string | null;
}

/** True when we have everything needed to attempt an authenticated call. */
export function isBumpaConfigured(): boolean {
    if (!SECRET) return false;
    if (AUTH_MODE === "bearer") return true;
    return Boolean(CLIENT_ID);
}

export function bumpaConfigStatus(): BumpaConfigStatus {
    let blocker: string | null = null;
    if (!SECRET) blocker = "BUMPA_API_SECRET is not set.";
    else if (AUTH_MODE === "oauth" && !CLIENT_ID)
        blocker =
            "Waiting on BUMPA_CLIENT_ID. Bumpa's OAuth needs a client_id + secret pair; " +
            "ask Bumpa support for your client_id, or set BUMPA_AUTH_MODE=bearer if the secret works directly.";
    return {
        base: BASE,
        authMode: AUTH_MODE,
        hasSecret: Boolean(SECRET),
        hasClientId: Boolean(CLIENT_ID),
        configured: isBumpaConfigured(),
        blocker,
    };
}

// In-memory access-token cache (per server instance).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
    if (AUTH_MODE === "bearer") return SECRET;
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
    if (!CLIENT_ID) {
        throw new Error(
            "BUMPA_CLIENT_ID is not set (required for OAuth). Ask Bumpa support for your client_id, " +
                "or set BUMPA_AUTH_MODE=bearer if the secret works directly.",
        );
    }
    const res = await fetch(`${BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            grant_type: "client_credentials",
            client_id: CLIENT_ID,
            client_secret: SECRET,
            scope: "*",
        }),
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const token = json.access_token as string | undefined;
    if (!res.ok || !token) {
        const detail = json.error_description || json.message || JSON.stringify(json);
        throw new Error(`Bumpa OAuth token exchange failed (${res.status}): ${detail}`);
    }
    const expiresIn = Number(json.expires_in) || 3600;
    cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
}

async function bumpaGet<T>(path: string): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const detail = json.message || json.error || `HTTP ${res.status}`;
        throw new Error(`Bumpa GET ${path} failed (${res.status}): ${detail}`);
    }
    return json as T;
}

/** Fetch one page of orders. Returns the page's orders + the next page number. */
export async function fetchOrdersPage(
    page = 1,
): Promise<{ orders: BumpaOrder[]; nextPage: number | null }> {
    const body = await bumpaGet<{ success: boolean; orders: Paginator<BumpaOrder> }>(
        `/api/v1/orders?page=${page}`,
    );
    const pag = body.orders;
    const nextPage = pag?.next_page_url ? (pag.current_page ?? page) + 1 : null;
    return { orders: pag?.data ?? [], nextPage };
}

/** Fetch all order pages (bounded by maxPages). Callers dedupe by id. */
export async function fetchAllOrders(maxPages = 25): Promise<BumpaOrder[]> {
    const all: BumpaOrder[] = [];
    let page: number | null = 1;
    let guard = 0;
    while (page !== null && guard < maxPages) {
        const { orders, nextPage } = await fetchOrdersPage(page);
        all.push(...orders);
        page = nextPage;
        guard++;
    }
    return all;
}
