import { getEventOccasions, getEventAnimals, getEventServiceTiers } from "@/lib/servicesQueries";
import EventsAdmin from "@/components/modules/EventsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
    const [occasions, animals, tiers] = await Promise.all([
        getEventOccasions(false), getEventAnimals(false), getEventServiceTiers(false),
    ]);
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Outdoor Events</h1>
                <p className="text-warm-cream/60 text-sm">Manage occasions, animals (with yield math), and service tiers used by the Plan My Owambe wizard.</p>
            </div>
            <EventsAdmin initialOccasions={occasions} initialAnimals={animals} initialTiers={tiers} />
        </div>
    );
}
