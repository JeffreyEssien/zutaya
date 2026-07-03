type StorageType = "fresh" | "chilled" | "frozen";

const config: Record<StorageType, { label: string; dot: string; bg: string; text: string }> = {
    fresh:   { label: "Fresh",   dot: "#2E9E4B", bg: "#E6F4EA", text: "#1B6B2E" },
    chilled: { label: "Chilled", dot: "#2B8AE0", bg: "#E4F0FB", text: "#175A96" },
    frozen:  { label: "Frozen",  dot: "#12A5B8", bg: "#E1F4F7", text: "#0C6B78" },
};

export function StorageBadge({ type }: { type: StorageType }) {
    const c = config[type];
    return (
        <span
            style={{ background: c.bg, color: c.text }}
            className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide leading-none whitespace-nowrap"
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
            {c.label}
        </span>
    );
}
