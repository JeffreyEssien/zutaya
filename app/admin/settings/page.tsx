import SiteSettingsForm from "@/components/modules/SiteSettingsForm";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Site Settings</h1>
                <p className="text-warm-cream/60 text-sm">Manage global site configuration.</p>
            </div>

            <div className="bg-white/[0.04] rounded-lg border border-warm-cream/20 p-6">
                <SiteSettingsForm />
            </div>
        </div>
    );
}
