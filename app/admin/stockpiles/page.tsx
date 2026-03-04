import StockpileManagement from "@/components/modules/StockpileManagement";

export const dynamic = "force-dynamic";

export default function AdminStockpilePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-2xl text-brand-dark">Stockpiles</h1>
                <p className="text-brand-dark/60 text-sm">Manage customer stockpiles — items paid for but awaiting combined shipment.</p>
            </div>
            <StockpileManagement />
        </div>
    );
}
