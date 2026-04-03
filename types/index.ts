export interface ProductVariant {
    name: string;
    price?: number;
    stock?: number;
    image?: string;
}

export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    reorderLevel: number;
    supplier?: string;
    createdAt: string;
    updatedAt: string;
    // Meat commerce fields
    stockUnit?: string;
    batchNumber?: string;
    expiryDate?: string;
    storageType?: "fresh" | "chilled" | "frozen";
}

export interface PrepOption {
    id: string;
    label: string;
    extraFee: number;
}

export interface Product {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    category: string;
    brand: string;
    inventoryId?: string;
    stock: number;
    images: string[];
    variants: ProductVariant[];
    isFeatured: boolean;
    isNew: boolean;
    // Meat commerce fields
    categoryId?: string;
    priceUnit?: "per_kg" | "per_pack" | "per_piece" | "whole";
    cutType?: string | null;
    storageType?: "fresh" | "chilled" | "frozen";
    prepOptions?: PrepOption[];
    minWeightKg?: number | null;
    relatedRecipeIds?: string[];
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    image: string;
    description: string;
}

export interface CartItem {
    product: Product;
    variant?: ProductVariant;
    quantity: number;
    selectedPrepOptions?: PrepOption[];
}

export interface Recipe {
    id: string;
    title: string;
    slug: string;
    content: any;
    coverImage?: string;
    ingredientProductIds: string[];
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ShippingAddress {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface Order {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    items: CartItem[];
    total: number;
    subtotal: number;
    shipping: number;
    status: "pending" | "processing" | "packed" | "out_for_delivery" | "delivered";
    createdAt: string;
    shippingAddress: ShippingAddress;
    notes?: string;
    couponCode?: string;
    discountTotal?: number;
    paymentMethod?: "whatsapp" | "bank_transfer";
    senderName?: string;
    paymentStatus?: "awaiting_payment" | "payment_submitted" | "payment_confirmed";
    // Delivery details
    deliveryZone?: string;
    deliveryType?: "doorstep" | "hub_pickup";
    deliveryDiscount?: { percent: number; label: string | null };
    deliveryFee?: number;
    // Meat commerce fields
    packagingFee?: number;
    prepFee?: number;
    prepInstructions?: string;
    requestedDeliveryDate?: string;
    requestedDeliverySlot?: "morning" | "afternoon" | "evening";
    subscriptionId?: string;
}

export interface SiteSettings {
    id: boolean;
    siteName: string;
    logoUrl?: string;
    heroHeading?: string;
    heroSubheading?: string;
    heroImage?: string;
    heroCtaText?: string;
    heroCtaLink?: string;
    // New Fields
    faviconUrl?: string;
    ourStoryHeading?: string;
    ourStoryText?: string;
    whyZutaYaHeading?: string;
    whyZutaYaFeatures?: string;
    // Announcement bar
    announcementBarEnabled?: boolean;
    announcementBarText?: string;
    announcementBarColor?: string;
    // Social links
    socialInstagram?: string;
    socialTwitter?: string;
    socialTiktok?: string;
    socialFacebook?: string;
    // Store info
    businessPhone?: string;
    businessWhatsapp?: string;
    businessAddress?: string;
    // About page
    aboutPromiseText?: string;
    aboutQuote?: string;
    aboutStats?: string;
    // Footer
    footerTagline?: string;
    // Shipping
    freeShippingThreshold?: number;
    // All editable texts as JSON
    customTexts?: Record<string, string>;
}

export interface Coupon {
    id: string;
    code: string;
    discountPercent: number;
    isActive: boolean;
    usageCount: number;
    createdAt: string;
}

export interface FilterState {
    category: string;
    priceRange: [number, number];
    brand: string;
    sortBy: "price-asc" | "price-desc" | "name" | "newest";
}

export interface Profile {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: "customer" | "admin";
    createdAt: string;
}

export interface EnrichedProfile extends Profile {
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string | null;
}

export interface Page {
    id: string;
    slug: string;
    title: string;
    content: any; // TipTap JSON or HTML
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryLog {
    id: string;
    productId: string;
    productName?: string;
    changeAmount: number;
    reason: string;
    createdAt: string;
}

export interface BundleRule {
    id: string;
    name: string;
    description?: string;
    minItems: number;
    maxItems: number;
    discountPercent: number;
    allowedCategoryIds?: string[];
    isActive: boolean;
    createdAt: string;
}

export interface Subscription {
    id: string;
    customerEmail: string;
    customerName: string;
    phone?: string;
    items: SubscriptionItem[];
    frequency: "weekly" | "biweekly" | "monthly";
    deliveryAddress?: ShippingAddress;
    deliveryZone?: string;
    paymentMethod?: string;
    status: "active" | "paused" | "cancelled";
    nextOrderDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

export interface NewsletterSubscriber {
    id: string;
    email: string;
    firstName?: string;
    source: string;
    token: string;
    subscribedAt: string;
    unsubscribedAt?: string | null;
}

export interface NewsletterCampaign {
    id: string;
    subject: string;
    content: string;
    status: "draft" | "sending" | "sent";
    sentAt?: string | null;
    recipientCount: number;
    createdAt: string;
}

