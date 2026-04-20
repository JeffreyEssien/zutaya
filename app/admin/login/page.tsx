"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                const redirectTo = searchParams.get("from") || "/admin";
                router.push(redirectTo);
                router.refresh();
            } else {
                setError(data.error || "Invalid credentials");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-dark rounded-2xl mb-4 shadow-lg">
                        <Lock size={24} className="text-white" />
                    </div>
                    <h1 className="font-serif text-3xl text-warm-cream tracking-wider">Zúta Ya</h1>
                    <p className="text-warm-cream/40 text-xs mt-1 uppercase tracking-widest">Admin Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-2xl shadow-xl shadow-brand-dark/5 border border-warm-cream/10 p-7 space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-[10px] text-warm-cream/40 mb-1.5 uppercase tracking-wider font-medium">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-cream/25" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                placeholder="admin@zutayang.com"
                                className="w-full border border-warm-cream/20 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all bg-[#1e1e1e]"
                                autoFocus
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-[10px] text-warm-cream/40 mb-1.5 uppercase tracking-wider font-medium">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-cream/25" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                placeholder="Enter your password"
                                className="w-full border border-warm-cream/20 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all bg-[#1e1e1e]"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-cream/25 hover:text-warm-cream/50 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle size={14} className="text-red-500 shrink-0" />
                            <p className="text-red-600 text-xs">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full bg-brand-dark text-white rounded-xl py-3 text-sm font-medium hover:bg-brand-dark/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </span>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <p className="text-center text-[10px] text-warm-cream/20 mt-6">
                    All admin actions are monitored and logged
                </p>
            </div>
        </div>
    );
}
