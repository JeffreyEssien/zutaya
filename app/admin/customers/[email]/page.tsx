import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getOrders } from "@/lib/queries";
import { getServiceBookings } from "@/lib/servicesQueries";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";

export const dynamic = "force-dynamic";

export default async function CustomerTimelinePage({ params }: { params: Promise<{ email: string }> }) {
    const { email: rawEmail } = await params;
    const email = decodeURIComponent(rawEmail).toLowerCase();
    if (!email) return notFound();

    const [orders, bookings] = await Promise.all([getOrders(), getServiceBookings()]);
    const customerOrders = orders.filter((o) => o.email.toLowerCase() === email);
    const customerBookings = bookings.filter((b) => b.customerEmail.toLowerCase() === email);

    // Subscriptions
    const supabase = getSupabaseServiceClient();
    const { data: subsData } = supabase ? await supabase.from("subscriptions").select("*").ilike("customer_email", email) : { data: [] as any[] };
    const subs = subsData || [];

    const totalSpent = customerOrders.reduce((s, o) => s + o.total, 0);
    const name = customerOrders[0]?.customerName || customerBookings[0]?.customerName || email;

    type Event = { ts: string; type: string; title: string; sub?: string; total?: number; href?: string };
    const events: Event[] = [];
    customerOrders.forEach((o) => events.push({ ts: o.createdAt, type: "order", title: `Order ${o.id}`, sub: `${o.status} · ${o.items.length} items`, total: o.total, href: `/admin/orders` }));
    customerBookings.forEach((b) => events.push({ ts: b.createdAt, type: "booking", title: `Event booking ${b.bookingCode}`, sub: `${b.occasionLabel || ""} · ${b.headcount} pax · ${b.status.replace("_", " ")}`, total: b.quotedTotal || b.estimatedTotal, href: `/admin/bookings` }));
    subs.forEach((s: any) => events.push({ ts: s.created_at, type: "sub", title: `Subscription ${s.frequency}`, sub: `Status ${s.status} · next ${s.next_order_date}` }));
    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return (
        <div className="space-y-6">
            <Link href="/admin/customers" className="inline-flex items-center gap-1 text-xs text-warm-cream/50 hover:text-warm-cream"><ChevronLeft size={14} /> Back to customers</Link>
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">{name}</h1>
                <p className="text-warm-cream/50 text-sm">{email}</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
                <Stat label="Orders" value={String(customerOrders.length)} />
                <Stat label="Bookings" value={String(customerBookings.length)} />
                <Stat label="Lifetime spend" value={formatCurrency(totalSpent)} />
            </div>

            <section className="bg-raised rounded-xl border border-warm-cream/15 p-5">
                <h2 className="font-serif text-lg text-warm-cream mb-4">Timeline</h2>
                {events.length === 0 ? (
                    <p className="text-warm-cream/40 text-sm">No activity yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {events.map((e, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${e.type === "order" ? "bg-brand-green" : e.type === "booking" ? "bg-amber-400" : "bg-blue-400"}`} />
                                <div className="flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="text-warm-cream text-sm font-medium">{e.title}</p>
                                        <p className="text-[11px] text-warm-cream/40">{new Date(e.ts).toLocaleDateString()}</p>
                                    </div>
                                    {e.sub && <p className="text-xs text-warm-cream/55 mt-0.5">{e.sub}</p>}
                                    {e.total != null && <p className="text-xs text-brand-green mt-0.5">{formatCurrency(e.total)}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-raised rounded-xl border border-warm-cream/15 p-4">
            <p className="text-[11px] uppercase tracking-wider text-warm-cream/40">{label}</p>
            <p className="font-serif text-2xl text-warm-cream mt-1">{value}</p>
        </div>
    );
}
