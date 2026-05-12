import type { ButcherProfile } from "@/types";

export default function MeetTheButchers({ profiles, headline = "Meet your butchers" }: { profiles: ButcherProfile[]; headline?: string }) {
    if (!profiles || profiles.length === 0) return null;
    return (
        <section className="py-16 md:py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-2">Behind the cleaver</p>
                    <h2 className="font-serif text-3xl md:text-4xl text-warm-cream">{headline}</h2>
                </div>
                <div className={`grid gap-6 ${profiles.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} max-w-4xl mx-auto`}>
                    {profiles.map((p) => (
                        <div key={p.id} className="text-center">
                            {p.imageUrl ? (
                                <div className="w-32 h-32 mx-auto rounded-full bg-cover bg-center mb-4 border-2 border-brand-green/30" style={{ backgroundImage: `url(${p.imageUrl})` }} />
                            ) : (
                                <div className="w-32 h-32 mx-auto rounded-full bg-warm-cream/5 mb-4 flex items-center justify-center text-warm-cream/30 font-serif text-3xl">{p.name[0]}</div>
                            )}
                            <h3 className="font-serif text-xl text-warm-cream">{p.name}</h3>
                            <p className="text-xs text-brand-green uppercase tracking-wider mt-1">{p.role}</p>
                            {p.bio && <p className="text-sm text-warm-cream/55 mt-3 max-w-xs mx-auto">{p.bio}</p>}
                            {p.specialties && p.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                                    {p.specialties.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-warm-cream/8 text-warm-cream/60">{s}</span>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
