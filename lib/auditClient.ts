/**
 * Client-side audit log helper.
 * Fire-and-forget — never blocks the caller.
 */
export function logAction(
    action: string,
    entityType?: string,
    entityId?: string,
    details?: string,
): void {
    fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entityType, entityId, details }),
    }).catch(() => {}); // Silent — don't break the UI
}
