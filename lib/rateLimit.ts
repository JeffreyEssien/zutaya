/**
 * Supabase-backed sliding-bucket rate limiter.
 *
 * Each check increments a counter in the `rate_limits` table keyed by
 * (bucket_key, window_start). Window starts are rounded to the nearest
 * minute (or other granularity you pass in), so requests in the same
 * minute share a counter.
 *
 * If the DB is unavailable, we fail OPEN (allow the request) rather
 * than block legitimate users on infrastructure flakiness.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export interface RateLimitResult {
    allowed: boolean;
    current: number;
    limit: number;
    retryAfterSeconds: number;
}

interface CheckArgs {
    /** Stable identifier for the bucket. e.g. "init:ip:1.2.3.4" or "init:email:foo@bar.com" */
    key: string;
    /** Max events allowed in the window. */
    limit: number;
    /** Window length in seconds (e.g. 60 for "per minute", 3600 for "per hour"). */
    windowSeconds: number;
}

function bucketStart(windowSeconds: number): Date {
    const ms = windowSeconds * 1000;
    return new Date(Math.floor(Date.now() / ms) * ms);
}

export async function checkRateLimit(args: CheckArgs): Promise<RateLimitResult> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
        return { allowed: true, current: 0, limit: args.limit, retryAfterSeconds: 0 };
    }

    const window = bucketStart(args.windowSeconds);

    const { data, error } = await supabase.rpc("increment_rate_limit", {
        p_bucket_key: args.key,
        p_window_start: window.toISOString(),
    });

    if (error) {
        // Fail open — better to occasionally let one slip through than block real users
        console.warn("Rate limit RPC failed (failing open):", error.message);
        return { allowed: true, current: 0, limit: args.limit, retryAfterSeconds: 0 };
    }

    const current = (data as number | null) ?? 0;
    const allowed = current <= args.limit;
    const retryAfterSeconds = allowed
        ? 0
        : Math.max(1, Math.ceil((window.getTime() + args.windowSeconds * 1000 - Date.now()) / 1000));

    return { allowed, current, limit: args.limit, retryAfterSeconds };
}

/** Convenience: extract the client IP from common headers + fallback. */
export function getClientIp(request: Request): string {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const real = request.headers.get("x-real-ip");
    if (real) return real.trim();
    return "unknown";
}
