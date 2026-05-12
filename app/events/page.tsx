import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import OwambeWizard from "@/components/modules/OwambeWizard";
import { getEventOccasions, getEventAnimals, getEventServiceTiers } from "@/lib/servicesQueries";
import { getSiteSettings } from "@/lib/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
    const [occasions, animals, tiers, settings] = await Promise.all([
        getEventOccasions(true), getEventAnimals(true), getEventServiceTiers(true), getSiteSettings(),
    ]);
    if (settings?.eventsEnabled === false) redirect("/shop");

    return (
        <>
            <Header />
            <main className="min-h-screen">
                <OwambeWizard
                    occasions={occasions}
                    animals={animals}
                    tiers={tiers}
                    tagline={settings?.eventsTagline || "From slaughter to plate, on-site."}
                />
            </main>
            <Footer />
        </>
    );
}
