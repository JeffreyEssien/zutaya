import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

interface StockIndicatorProps {
    stock: number;
}

export default function StockIndicator({ stock }: StockIndicatorProps) {
    if (stock === 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-red-600 font-medium text-sm">Out of Stock</span>
            </div>
        );
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
        // Deliberately reveals NO count or proportion — just a friendly urgency cue.
        return (
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-amber-600 font-medium text-sm">
                    Low stock — selling fast
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-600 font-medium text-sm">In Stock</span>
        </div>
    );
}
