import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import OwambeWizard from "@/components/modules/OwambeWizard";
import { getEventOccasions, getEventAnimals, getEventServiceTiers } from "@/lib/servicesQueries";
import { getSiteSettings } from "@/lib/queries";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Outdoor Butchery — On-Site Slaughter & Chef Service in Lagos",
    description:
        "Book Zúta Ya's Outdoor Butchery for your event — on-site slaughter, professional cuts and grilling for owambe, parties and ceremonies across Lagos. Get a tailored quote in 24 hours.",
    alternates: { canonical: "/events" },
    openGraph: {
        title: "Outdoor Butchery | Zúta Ya",
        description:
            "On-site slaughter, butchery & chef service for events across Lagos. From slaughter to plate, we handle it all.",
        url: "/events",
        type: "website",
    },
};

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
