"use client";

interface MarqueeBannerProps {
    text?: string;
    variant?: "dark" | "red" | "green";
}

export default function MarqueeBanner({ text = "FRESH MEAT", variant = "green" }: MarqueeBannerProps) {
    const bg = variant === "red" ? "bg-brand-red" : variant === "green" ? "bg-brand-green" : "bg-deep-espresso";
    const textColor = "text-warm-cream";

    return (
        <div className={`${bg} py-4 md:py-5 overflow-hidden select-none`}>
            <div className="animate-marquee whitespace-nowrap flex items-center">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-6 md:gap-10 shrink-0 mx-3 md:mx-5">
                        <span className={`font-serif text-xl md:text-2xl ${textColor}/90 tracking-widest`}>
                            {text}
                        </span>
                        <span className={`${textColor}/30 text-lg`}>&#10042;</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
