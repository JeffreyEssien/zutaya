export const SITE_NAME = "Zúta Ya";
export const SITE_DESCRIPTION = "Premium Meat Delivery · Lagos";
export const CURRENCY = "NGN";
export const LOW_STOCK_THRESHOLD = 5;

// ── Order quantity limits ──
// Weight-priced products (priceUnit === "per_kg") are sold in 0.5 kg steps,
// from a 1 kg minimum up to a 50 kg per-order cap. Above the cap, customers are
// directed to contact the team (WhatsApp / enquiry email) for a bulk quote.
export const ORDER_MIN_KG = 1;
export const ORDER_MAX_KG = 50;
export const ORDER_STEP_KG = 0.5;

export const SITE_EMAIL = "zutayao@gmail.com";
// Public-facing enquiries address shown in "Get in Touch". Kept separate from
// SITE_EMAIL, which is also the SMTP sending/fallback address (Gmail-based).
export const CONTACT_EMAIL = "enquiry@zutayang.com";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zutaya.vercel.app";

export const BUSINESS_PHONE = "07042038491";
export const BUSINESS_HOURS = "8am – 6pm, Monday – Saturday";
export const INSTAGRAM_HANDLE = "@zuutaya";

// Physical business address (used for local SEO / structured data + footer).
export const BUSINESS_ADDRESS = {
    street: "68 Community Road, Akoka",
    locality: "Yaba",
    region: "Lagos",
    country: "NG",
    /** One-line human-readable form. */
    full: "68 Community Road, Akoka, Yaba, Lagos",
} as const;

export const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Outdoor Butchery", href: "/events" },
    { label: "Packages", href: "/bundles" },
    { label: "Track Order", href: "/track" },
] as const;

// Admin navigation grouped by workflow area, ordered by how often each area is
// touched (daily ops at the top, system at the bottom). The sidebar renders these
// as collapsible sections. `ADMIN_NAV_LINKS` below is derived (flat) for any
// consumer that just needs every link.
export const ADMIN_NAV_GROUPS = [
    {
        heading: "Overview",
        links: [
            { label: "Dashboard", href: "/admin", icon: "grid" },
            { label: "Analytics", href: "/admin/analytics", icon: "chart" },
        ],
    },
    {
        heading: "Orders & Payments",
        links: [
            { label: "Orders", href: "/admin/orders", icon: "clipboard" },
            { label: "Payments", href: "/admin/payments", icon: "creditcard" },
            { label: "Disputes", href: "/admin/disputes", icon: "alerttriangle" },
            { label: "Bumpa Orders", href: "/admin/bumpa", icon: "refresh" },
            { label: "Expenses", href: "/admin/expenses", icon: "creditcard" },
            { label: "Customers", href: "/admin/customers", icon: "users" },
        ],
    },
    {
        heading: "Catalog",
        links: [
            { label: "Products", href: "/admin/products", icon: "package" },
            { label: "Categories", href: "/admin/categories", icon: "tag" },
            { label: "Inventory", href: "/admin/inventory", icon: "box" },
            { label: "Packages", href: "/admin/bundles", icon: "gift" },
            { label: "Reviews", href: "/admin/reviews", icon: "star" },
        ],
    },
    {
        heading: "Operations",
        links: [
            { label: "Delivery", href: "/admin/delivery", icon: "truck" },
            { label: "Processing", href: "/admin/processing", icon: "package" },
            { label: "Subscriptions", href: "/admin/subscriptions", icon: "refresh" },
        ],
    },
    {
        heading: "Events & Services",
        links: [
            { label: "Outdoor Butchery", href: "/admin/events", icon: "star" },
            { label: "Bookings", href: "/admin/bookings", icon: "clipboard" },
            { label: "Services Config", href: "/admin/services-config", icon: "cog" },
        ],
    },
    {
        heading: "Marketing & Content",
        links: [
            { label: "Featured", href: "/admin/featured", icon: "star" },
            { label: "Gallery", href: "/admin/gallery", icon: "image" },
            { label: "CMS Pages", href: "/admin/pages", icon: "file" },
            { label: "Newsletter", href: "/admin/newsletter", icon: "mail" },
            { label: "Coupons", href: "/admin/coupons", icon: "ticket" },
        ],
    },
    {
        heading: "System",
        links: [
            { label: "Cron Jobs", href: "/admin/cron", icon: "clock" },
            { label: "Audit Log", href: "/admin/audit", icon: "shield" },
            { label: "Settings", href: "/admin/settings", icon: "cog" },
        ],
    },
] as const;

// Flat list of every admin link — kept for backward-compatibility.
export const ADMIN_NAV_LINKS = ADMIN_NAV_GROUPS.flatMap((g) => [...g.links]);

// Bookkeeping expense categories (shared by the expenses form + server module).
export const EXPENSE_CATEGORIES = [
    "Inventory / Stock Purchase",
    "Logistics & Delivery",
    "Packaging",
    "Salaries & Wages",
    "Rent",
    "Utilities",
    "Marketing & Ads",
    "Equipment",
    "Transaction Fees",
    "Other",
] as const;

export const WHATSAPP_NUMBER = "2347042038491";

// Bank Transfer Details
export const BANK_NAME = "Providus Bank";
export const BANK_ACCOUNT_NUMBER = "1301608403";
export const BANK_ACCOUNT_NAME = "Baylow Services Limited";

// Order Status Pipeline
export const ORDER_STATUSES = ["pending", "processing", "packed", "out_for_delivery", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
