import { getZutayaPackages, getSiteSettings } from "@/lib/queries";
import PackagesClient from "@/components/modules/PackagesClient";
import JsonLd from "@/components/JsonLd";
import { packageSchema, breadcrumbSchema } from "@/lib/seo";

// Stock-driven availability must be fresh, so render on demand.
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
    const [packages, settings] = await Promise.all([
        getZutayaPackages(true),
        getSiteSettings(),
    ]);

    const schemas = [
        ...packages.map((pkg) => packageSchema(pkg)),
        breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Packages", path: "/bundles" },
        ]),
    ];

    return (
        <>
            <JsonLd data={schemas} />
            <PackagesClient packages={packages} customTexts={settings?.customTexts} />
        </>
    );
}
