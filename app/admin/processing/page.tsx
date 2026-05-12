import { getMarinades, getProcessingOptions } from "@/lib/servicesQueries";
import ProcessingAdmin from "@/components/modules/ProcessingAdmin";

export const dynamic = "force-dynamic";

export default async function AdminProcessingPage() {
    const [marinades, options] = await Promise.all([getMarinades(false), getProcessingOptions(false)]);
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Processing & Marinades</h1>
                <p className="text-warm-cream/60 text-sm">Manage prep options and marinade presets shown on every product page.</p>
            </div>
            <ProcessingAdmin initialMarinades={marinades} initialOptions={options} />
        </div>
    );
}
