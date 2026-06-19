export interface MediaItem {
    id: string;
    url: string;
    publicId?: string;
    type: "image" | "video";
    name: string;
    folder?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    createdAt: string;
}

export type HeroDisplayMode = "single" | "slideshow" | "video";

export interface HeroDisplayConfig {
    mode: HeroDisplayMode;
    mediaIds: string[];
    slideshowInterval: number; // seconds
    useFeaturedSlides?: boolean; // when true, slideshow uses featured slides instead of raw media
}

export interface FeaturedSlide {
    id: string;
    type: "product" | "media" | "promo";
    isActive: boolean;
    order: number;
    // For product slides
    productId?: string;
    // For media slides (gallery item)
    mediaId?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    // For promo slides (custom)
    promoImageUrl?: string;
    // Overlay content (all slide types)
    headline?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    overlayPosition?: "bottom-left" | "bottom-right" | "center" | "top-left";
    overlayStyle?: "dark" | "light" | "gradient";
    // Resolved at render time (not stored)
    _resolvedProduct?: Product;
    _resolvedMediaUrl?: string;
}

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
    // Mode-morphing imagery
    imageCooked?: string;
    imageEvent?: string;
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
    bundleId?: string;
    bundleDiscount?: number; // percent
    bundleName?: string;
    completionMode?: CompletionMode;
    processing?: CartItemProcessing;
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
    paymentMethod?: "paystack" | "whatsapp" | "bank_transfer"; // legacy values kept for historical orders
    senderName?: string;
    paymentStatus?: "awaiting_payment" | "payment_submitted" | "payment_confirmed" | "failed" | "refunded" | "partially_refunded";
    paystackReference?: string;
    processingFee?: number;
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
    completionMode?: CompletionMode;
    kitchenReadyAt?: string;
    serviceBookingId?: string;
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
    // Packaging
    packagingFee?: number;
    packagingLabel?: string;
    packagingDescription?: string;
    // Hero display
    heroDisplayConfig?: HeroDisplayConfig;
    // Featured slides for hero
    featuredSlides?: FeaturedSlide[];
    // All editable texts as JSON
    customTexts?: Record<string, string>;
    // Services
    deliveryCutoffHour?: number;
    deliveryCutoffLabel?: string;
    kitchenEnabled?: boolean;
    kitchenHeroImage?: string;
    kitchenTagline?: string;
    kitchenLeadMinutes?: number;
    eventsEnabled?: boolean;
    eventsTagline?: string;
    butcherProfiles?: ButcherProfile[];
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

// ===== Services: Processing / Kitchen / Events =====

export type CompletionMode = "cook_myself" | "event";

export interface Marinade {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    extraFee: number;
    cureHours: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
}

export interface ProcessingOption {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    extraFee: number;
    extendsShelfLife: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
}

export interface EventOccasion {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    typicalHeadcountMin?: number;
    typicalHeadcountMax?: number;
    isActive: boolean;
    sortOrder: number;
}

export interface EventAnimal {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    basePrice: number;
    feedsAdults: number;
    typicalWeightKg?: number;
    isActive: boolean;
    sortOrder: number;
}

export interface EventServiceTier {
    id: string;
    name: string;
    description?: string;
    priceModifier: number;
    pricePerHead: number;
    includes: string[];
    isActive: boolean;
    sortOrder: number;
}

export interface AnimalSelection {
    animalId: string;
    animalName: string;
    quantity: number;
    unitPrice: number;
}

export interface ServiceBooking {
    id: string;
    bookingCode: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    occasionId?: string;
    occasionLabel?: string;
    headcount: number;
    eventDate: string;
    eventTime?: string;
    address: string;
    city?: string;
    state?: string;
    locationNotes?: string;
    animalSelections: AnimalSelection[];
    serviceTierId?: string;
    serviceTierLabel?: string;
    addOns: { label: string; price: number }[];
    estimatedTotal?: number;
    quotedTotal?: number;
    depositAmount?: number;
    depositPaid: boolean;
    status: "inquiry" | "quoted" | "deposit_pending" | "confirmed" | "in_progress" | "complete" | "cancelled";
    adminNotes?: string;
    customerNotes?: string;
    leftoverKg?: number;
    convertedToOrderId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ButcherProfile {
    id: string;
    name: string;
    role: string;
    bio?: string;
    imageUrl?: string;
    specialties?: string[];
}

export interface CartItemProcessing {
    portionGrams?: number;
    processingOptionIds?: string[];
    marinadeId?: string;
    vacuumSealed?: boolean;
    notes?: string;
}

