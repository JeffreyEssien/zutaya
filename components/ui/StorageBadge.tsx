type StorageType = "fresh" | "chilled" | "frozen";

const config: Record<StorageType, { label: string; icon: string; bg: string; text: string }> = {
    fresh:   { label: "Fresh",   icon: "\u{1F33F}", bg: "#D4EDDA", text: "#1A4A1A" },
    chilled: { label: "Chilled", icon: "\u2744",    bg: "#D0E8FF", text: "#1A3A5C" },
    frozen:  { label: "Frozen",  icon: "\u{1F9CA}", bg: "#E8F4FD", text: "#1A3A5C" },
};

export function StorageBadge({ type }: { type: StorageType }) {
    const c = config[type];
    return (
        <span
            style={{ background: c.bg, color: c.text }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        >
            {c.icon} {c.label}
        </span>
    );
}
