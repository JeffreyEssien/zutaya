import { getSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase";
import type {
    Marinade,
    ProcessingOption,
    EventOccasion,
    EventAnimal,
    EventServiceTier,
    ServiceBooking,
    AnimalSelection,
} from "@/types";

const sb = () => getSupabaseClient();
const sbAdmin = () => getSupabaseServiceClient() || getSupabaseClient();

/* ── Marinades ── */
export async function getMarinades(activeOnly = false): Promise<Marinade[]> {
    const supabase = sb();
    if (!supabase) return [];
    let q = supabase.from("marinades").select("*").order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(toMarinade);
}

export async function upsertMarinade(m: Partial<Marinade> & { name: string }): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = {
        name: m.name,
        description: m.description ?? null,
        image_url: m.imageUrl ?? null,
        extra_fee: m.extraFee ?? 0,
        cure_hours: m.cureHours ?? 0,
        is_active: m.isActive ?? true,
        sort_order: m.sortOrder ?? 0,
    };
    if (m.id) row.id = m.id;
    const { error } = await supabase.from("marinades").upsert(row);
    if (error) throw error;
}

export async function deleteMarinade(id: string): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const { error } = await supabase.from("marinades").delete().eq("id", id);
    if (error) throw error;
}

const toMarinade = (d: any): Marinade => ({
    id: d.id,
    name: d.name,
    description: d.description ?? undefined,
    imageUrl: d.image_url ?? undefined,
    extraFee: Number(d.extra_fee || 0),
    cureHours: Number(d.cure_hours || 0),
    isActive: !!d.is_active,
    sortOrder: Number(d.sort_order || 0),
    createdAt: d.created_at,
});

/* ── Processing Options ── */
export async function getProcessingOptions(activeOnly = false): Promise<ProcessingOption[]> {
    const supabase = sb();
    if (!supabase) return [];
    let q = supabase.from("processing_options").select("*").order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(toProcessingOption);
}

export async function upsertProcessingOption(o: Partial<ProcessingOption> & { label: string }): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = {
        label: o.label,
        description: o.description ?? null,
        icon: o.icon ?? null,
        extra_fee: o.extraFee ?? 0,
        extends_shelf_life: o.extendsShelfLife ?? false,
        is_active: o.isActive ?? true,
        sort_order: o.sortOrder ?? 0,
    };
    if (o.id) row.id = o.id;
    const { error } = await supabase.from("processing_options").upsert(row);
    if (error) throw error;
}

export async function deleteProcessingOption(id: string): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const { error } = await supabase.from("processing_options").delete().eq("id", id);
    if (error) throw error;
}

const toProcessingOption = (d: any): ProcessingOption => ({
    id: d.id,
    label: d.label,
    description: d.description ?? undefined,
    icon: d.icon ?? undefined,
    extraFee: Number(d.extra_fee || 0),
    extendsShelfLife: !!d.extends_shelf_life,
    isActive: !!d.is_active,
    sortOrder: Number(d.sort_order || 0),
    createdAt: d.created_at,
});

/* ── Event Occasions ── */
export async function getEventOccasions(activeOnly = false): Promise<EventOccasion[]> {
    const supabase = sb();
    if (!supabase) return [];
    let q = supabase.from("event_occasions").select("*").order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? undefined,
        icon: d.icon ?? undefined,
        typicalHeadcountMin: d.typical_headcount_min ?? undefined,
        typicalHeadcountMax: d.typical_headcount_max ?? undefined,
        isActive: !!d.is_active,
        sortOrder: Number(d.sort_order || 0),
    }));
}

export async function upsertEventOccasion(o: Partial<EventOccasion> & { name: string }): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = {
        name: o.name,
        description: o.description ?? null,
        icon: o.icon ?? null,
        typical_headcount_min: o.typicalHeadcountMin ?? null,
        typical_headcount_max: o.typicalHeadcountMax ?? null,
        is_active: o.isActive ?? true,
        sort_order: o.sortOrder ?? 0,
    };
    if (o.id) row.id = o.id;
    const { error } = await supabase.from("event_occasions").upsert(row);
    if (error) throw error;
}

export async function deleteEventOccasion(id: string): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const { error } = await supabase.from("event_occasions").delete().eq("id", id);
    if (error) throw error;
}

/* ── Event Animals ── */
export async function getEventAnimals(activeOnly = false): Promise<EventAnimal[]> {
    const supabase = sb();
    if (!supabase) return [];
    let q = supabase.from("event_animals").select("*").order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? undefined,
        imageUrl: d.image_url ?? undefined,
        basePrice: Number(d.base_price || 0),
        feedsAdults: Number(d.feeds_adults || 1),
        typicalWeightKg: d.typical_weight_kg != null ? Number(d.typical_weight_kg) : undefined,
        isActive: !!d.is_active,
        sortOrder: Number(d.sort_order || 0),
    }));
}

export async function upsertEventAnimal(a: Partial<EventAnimal> & { name: string; basePrice: number; feedsAdults: number }): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = {
        name: a.name,
        description: a.description ?? null,
        image_url: a.imageUrl ?? null,
        base_price: a.basePrice,
        feeds_adults: a.feedsAdults,
        typical_weight_kg: a.typicalWeightKg ?? null,
        is_active: a.isActive ?? true,
        sort_order: a.sortOrder ?? 0,
    };
    if (a.id) row.id = a.id;
    const { error } = await supabase.from("event_animals").upsert(row);
    if (error) throw error;
}

export async function deleteEventAnimal(id: string): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const { error } = await supabase.from("event_animals").delete().eq("id", id);
    if (error) throw error;
}

/* ── Event Service Tiers ── */
export async function getEventServiceTiers(activeOnly = false): Promise<EventServiceTier[]> {
    const supabase = sb();
    if (!supabase) return [];
    let q = supabase.from("event_service_tiers").select("*").order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? undefined,
        priceModifier: Number(d.price_modifier || 0),
        pricePerHead: Number(d.price_per_head || 0),
        includes: d.includes || [],
        isActive: !!d.is_active,
        sortOrder: Number(d.sort_order || 0),
    }));
}

export async function upsertEventServiceTier(t: Partial<EventServiceTier> & { name: string }): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = {
        name: t.name,
        description: t.description ?? null,
        price_modifier: t.priceModifier ?? 0,
        price_per_head: t.pricePerHead ?? 0,
        includes: t.includes ?? [],
        is_active: t.isActive ?? true,
        sort_order: t.sortOrder ?? 0,
    };
    if (t.id) row.id = t.id;
    const { error } = await supabase.from("event_service_tiers").upsert(row);
    if (error) throw error;
}

export async function deleteEventServiceTier(id: string): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const { error } = await supabase.from("event_service_tiers").delete().eq("id", id);
    if (error) throw error;
}

/* ── Service Bookings ── */
function genBookingCode(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `EV-${ymd}-${rand}`;
}

export async function createServiceBooking(input: Omit<ServiceBooking, "id" | "bookingCode" | "createdAt" | "updatedAt" | "status" | "depositPaid">): Promise<ServiceBooking> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const code = genBookingCode();
    const row: any = {
        booking_code: code,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        occasion_id: input.occasionId ?? null,
        occasion_label: input.occasionLabel ?? null,
        headcount: input.headcount,
        event_date: input.eventDate,
        event_time: input.eventTime ?? null,
        address: input.address,
        city: input.city ?? null,
        state: input.state ?? null,
        location_notes: input.locationNotes ?? null,
        animal_selections: input.animalSelections,
        service_tier_id: input.serviceTierId ?? null,
        service_tier_label: input.serviceTierLabel ?? null,
        add_ons: input.addOns,
        estimated_total: input.estimatedTotal ?? null,
        customer_notes: input.customerNotes ?? null,
        status: "inquiry",
    };
    const { data, error } = await supabase.from("service_bookings").insert(row).select().single();
    if (error || !data) throw error;
    return toServiceBooking(data);
}

export async function getServiceBookings(): Promise<ServiceBooking[]> {
    const supabase = sbAdmin();
    if (!supabase) return [];
    const { data } = await supabase.from("service_bookings").select("*").order("created_at", { ascending: false });
    return (data || []).map(toServiceBooking);
}

export async function getServiceBookingByCode(code: string): Promise<ServiceBooking | null> {
    const supabase = sbAdmin();
    if (!supabase) return null;
    const { data } = await supabase.from("service_bookings").select("*").eq("booking_code", code).maybeSingle();
    return data ? toServiceBooking(data) : null;
}

export async function updateServiceBooking(id: string, patch: Partial<ServiceBooking>): Promise<void> {
    const supabase = sbAdmin();
    if (!supabase) throw new Error("DB unavailable");
    const row: any = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.quotedTotal !== undefined) row.quoted_total = patch.quotedTotal;
    if (patch.depositAmount !== undefined) row.deposit_amount = patch.depositAmount;
    if (patch.depositPaid !== undefined) row.deposit_paid = patch.depositPaid;
    if (patch.adminNotes !== undefined) row.admin_notes = patch.adminNotes;
    if (patch.leftoverKg !== undefined) row.leftover_kg = patch.leftoverKg;
    if (patch.convertedToOrderId !== undefined) row.converted_to_order_id = patch.convertedToOrderId;
    const { error } = await supabase.from("service_bookings").update(row).eq("id", id);
    if (error) throw error;
}

const toServiceBooking = (d: any): ServiceBooking => ({
    id: d.id,
    bookingCode: d.booking_code,
    customerName: d.customer_name,
    customerEmail: d.customer_email,
    customerPhone: d.customer_phone,
    occasionId: d.occasion_id ?? undefined,
    occasionLabel: d.occasion_label ?? undefined,
    headcount: Number(d.headcount || 0),
    eventDate: d.event_date,
    eventTime: d.event_time ?? undefined,
    address: d.address,
    city: d.city ?? undefined,
    state: d.state ?? undefined,
    locationNotes: d.location_notes ?? undefined,
    animalSelections: (typeof d.animal_selections === "string" ? JSON.parse(d.animal_selections) : d.animal_selections) || [],
    serviceTierId: d.service_tier_id ?? undefined,
    serviceTierLabel: d.service_tier_label ?? undefined,
    addOns: (typeof d.add_ons === "string" ? JSON.parse(d.add_ons) : d.add_ons) || [],
    estimatedTotal: d.estimated_total != null ? Number(d.estimated_total) : undefined,
    quotedTotal: d.quoted_total != null ? Number(d.quoted_total) : undefined,
    depositAmount: d.deposit_amount != null ? Number(d.deposit_amount) : undefined,
    depositPaid: !!d.deposit_paid,
    status: d.status,
    adminNotes: d.admin_notes ?? undefined,
    customerNotes: d.customer_notes ?? undefined,
    leftoverKg: d.leftover_kg != null ? Number(d.leftover_kg) : undefined,
    convertedToOrderId: d.converted_to_order_id ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
});

export function calcAnimalsNeeded(animal: EventAnimal, headcount: number): number {
    if (!animal.feedsAdults || animal.feedsAdults <= 0) return 1;
    return Math.max(1, Math.ceil(headcount / animal.feedsAdults));
}

/* ── Dashboard batch ── */
export async function getServicesDashboardData(): Promise<{
    bookings: ServiceBooking[];
    pendingBookings: number;
    upcomingBookings: number;
    activeMarinades: number;
    activeProcessingOptions: number;
}> {
    const supabase = sbAdmin();
    if (!supabase) return { bookings: [], pendingBookings: 0, upcomingBookings: 0, activeMarinades: 0, activeProcessingOptions: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: bk }, { count: mc }, { count: pc }] = await Promise.all([
        supabase.from("service_bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("marinades").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("processing_options").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    const bookings = (bk || []).map(toServiceBooking);
    const pending = bookings.filter((b) => b.status === "inquiry" || b.status === "quoted" || b.status === "deposit_pending").length;
    const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.eventDate) >= new Date(today)).length;
    return {
        bookings: bookings.slice(0, 5),
        pendingBookings: pending,
        upcomingBookings: upcoming,
        activeMarinades: mc || 0,
        activeProcessingOptions: pc || 0,
    };
}
