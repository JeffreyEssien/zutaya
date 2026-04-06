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
    { label: "Bundles", href: "/bundles" },
    { label: "Track Order", href: "/track" },
    { label: "About", href: "/#about" },
] as const;

export const ADMIN_NAV_LINKS = [
    { label: "Dashboard", href: "/admin", icon: "grid" },
    { label: "Products", href: "/admin/products", icon: "package" },
    { label: "Orders", href: "/admin/orders", icon: "clipboard" },
    { label: "Customers", href: "/admin/customers", icon: "users" },
    { label: "Analytics", href: "/admin/analytics", icon: "chart" },
    { label: "CMS Pages", href: "/admin/pages", icon: "file" },
    { label: "Inventory", href: "/admin/inventory", icon: "box" },
    { label: "Coupons", href: "/admin/coupons", icon: "ticket" },
    { label: "Delivery", href: "/admin/delivery", icon: "truck" },
    { label: "Newsletter", href: "/admin/newsletter", icon: "mail" },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: "refresh" },
    { label: "Bundles", href: "/admin/bundles", icon: "gift" },
    { label: "Categories", href: "/admin/categories", icon: "tag" },
    { label: "Cron Jobs", href: "/admin/cron", icon: "clock" },
    { label: "Audit Log", href: "/admin/audit", icon: "shield" },
    { label: "Settings", href: "/admin/settings", icon: "cog" },
] as const;

export const WHATSAPP_NUMBER = "2347042038491";

// Bank Transfer Details
export const BANK_NAME = "Providus Bank";
export const BANK_ACCOUNT_NUMBER = "1301608403";
export const BANK_ACCOUNT_NAME = "Baylow Services Limited";

// Order Status Pipeline
export const ORDER_STATUSES = ["pending", "processing", "packed", "out_for_delivery", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
