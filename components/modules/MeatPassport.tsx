import { ShieldCheck, MapPin, Award, Clock } from "lucide-react";
import type { Product } from "@/types";

export default function MeatPassport({ product, compact = false }: { product: Product; compact?: boolean }) {
    if (!product.originFarm && !product.originBreed && !product.originHangingHours) return null;
    return (
        <div className={`mt-${compact ? 4 : 8} rounded-xl border border-warm-cream/10 bg-gradient-to-br from-emerald-500/5 to-transparent p-4`}>
            <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} className="text-emerald-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">Meat Passport</p>
            </div>
            <div className={`grid ${compact ? "grid-cols-2" : "sm:grid-cols-2"} gap-3 text-xs`}>
                {product.originFarm && <Row icon={MapPin} label="Origin" value={product.originFarm} />}
                {product.originBreed && <Row icon={Award} label="Breed" value={product.originBreed} />}
                {product.originHangingHours != null && <Row icon={Clock} label="Hung" value={`${product.originHangingHours}h`} />}
                {product.originHalalCertified && <Row icon={ShieldCheck} label="Cert" value="Halal certified" />}
            </div>
        </div>
    );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <Icon size={12} className="text-warm-cream/40 mt-0.5" />
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-warm-cream/40">{label}</p>
                <p className="text-warm-cream/90 truncate">{value}</p>
            </div>
        </div>
    );
}
