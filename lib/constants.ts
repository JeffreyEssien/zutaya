export const SITE_NAME = "Zúta Ya";
export const SITE_DESCRIPTION = "Premium Meat Delivery · Lagos";
export const CURRENCY = "NGN";
export const LOW_STOCK_THRESHOLD = 5;

export const SITE_EMAIL = "zutayao@gmail.com";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zutaya.vercel.app";

export const BUSINESS_PHONE = "07042038491";
export const BUSINESS_HOURS = "8am – 6pm, Monday – Saturday";
export const INSTAGRAM_HANDLE = "@zuutaya";

export const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Events", href: "/events" },
    { label: "Bundles", href: "/bundles" },
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
            { label: "Customers", href: "/admin/customers", icon: "users" },
        ],
    },
    {
        heading: "Catalog",
        links: [
            { label: "Products", href: "/admin/products", icon: "package" },
            { label: "Categories", href: "/admin/categories", icon: "tag" },
            { label: "Inventory", href: "/admin/inventory", icon: "box" },
            { label: "Bundles", href: "/admin/bundles", icon: "gift" },
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
            { label: "Events", href: "/admin/events", icon: "star" },
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

export const WHATSAPP_NUMBER = "2347042038491";

// Bank Transfer Details
export const BANK_NAME = "Providus Bank";
export const BANK_ACCOUNT_NUMBER = "1301608403";
export const BANK_ACCOUNT_NAME = "Baylow Services Limited";

// Order Status Pipeline
export const ORDER_STATUSES = ["pending", "processing", "packed", "out_for_delivery", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
