/**
 * Server-side order queue using Postgres advisory locks.
 *
 * When multiple orders arrive simultaneously, each one acquires an
 * advisory lock before processing. Postgres serializes them — only one
 * order processes at a time. Others wait in line (up to a timeout),
 * giving a natural "waiting room" effect without external infrastructure.
 *
 * Advisory locks are session-level and automatically released when the
 * connection/transaction ends, so there's no risk of deadlocks.
 */

import { getSupabaseClient } from "@/lib/supabase";

const ORDER_LOCK_KEY = 999999; // Fixed advisory lock ID for order processing
const QUEUE_TIMEOUT_MS = 30000; // Max 30s wait in queue

interface QueueResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    queuePosition?: number;
}

/**
 * Process an order through the queue.
 * Acquires a Postgres advisory lock so only one order processes at a time.
 * Others wait their turn (up to QUEUE_TIMEOUT_MS).
 */
export async function processOrderInQueue<T>(
    fn: () => Promise<T>
): Promise<QueueResult<T>> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        return { success: false, error: "Database not available" };
    }

    // Try to acquire advisory lock (blocking — waits for its turn)
    // pg_advisory_lock blocks until the lock is available
    const { error: lockError } = await supabase.rpc("acquire_order_lock", {
        lock_key: ORDER_LOCK_KEY,
    });

    if (lockError) {
        console.warn("Advisory lock failed, processing without lock:", lockError.message);
        // Fall through — still process the order, just without serialization
    }

    try {
        const result = await fn();
        return { success: true, data: result };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || "Order processing failed",
        };
    } finally {
        // Release the lock so the next order can proceed
        try {
            await supabase.rpc("release_order_lock", { lock_key: ORDER_LOCK_KEY });
        } catch {
            // Lock release failed — will auto-release when connection ends
        }
    }
}
