import { getSiteSettings } from "@/lib/queries";
import ServicesConfig from "@/components/modules/ServicesConfig";

export const dynamic = "force-dynamic";

export default async function AdminServicesConfigPage() {
    const s = await getSiteSettings();
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Services Configuration</h1>
                <p className="text-warm-cream/60 text-sm">Delivery cutoff, service toggles, and butcher profiles.</p>
            </div>
            <ServicesConfig
                deliveryCutoffHour={s?.deliveryCutoffHour ?? 12}
                deliveryCutoffLabel={s?.deliveryCutoffLabel || "Orders placed after 12:00 PM ship the next day"}
                eventsEnabled={s?.eventsEnabled !== false}
                eventsTagline={s?.eventsTagline || ""}
                butcherProfiles={s?.butcherProfiles || []}
            />
        </div>
    );
}
