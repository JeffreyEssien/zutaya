import { cn } from "@/lib/cn";

interface SummaryCardProps {
    title: string;
    value: string;
    accent: "purple" | "amber" | "red" | "green";
}

const accentStyles: Record<string, { bg: string; text: string; dot: string }> = {
    purple: { bg: "bg-brand-green/10", text: "text-brand-green", dot: "bg-brand-green" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500/100" },
    red: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500/100" },
    green: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500/100" },
};

export default function SummaryCard({ title, value, accent }: SummaryCardProps) {
    const styles = accentStyles[accent];

    return (
        <div className={cn("rounded-lg p-6", styles.bg)}>
            <div className="flex items-center gap-2 mb-3">
                <span className={cn("w-2 h-2 rounded-full", styles.dot)} />
                <p className="text-sm text-warm-cream/60">{title}</p>
            </div>
            <p className={cn("text-3xl font-serif", styles.text)}>{value}</p>
        </div>
    );
}
