import { cookies } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: "admin" | "super_admin";
    isActive: boolean;
    lastLoginAt: string | null;
}

const SESSION_DURATION_DAYS = 7;

/**
 * Authenticate admin by email + password.
 * Returns admin user + session token, or null.
 */
export async function authenticateAdmin(
    email: string,
    password: string
): Promise<{ admin: AdminUser; token: string } | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .single();

    if (error || !data) return null;

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) return null;

    // Generate session token
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    // Store session
    await supabase.from("admin_sessions").insert({
        admin_id: data.id,
        token,
        expires_at: expiresAt.toISOString(),
    });

    // Update last login
    await supabase
        .from("admin_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", data.id);

    return {
        admin: {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            isActive: data.is_active,
            lastLoginAt: new Date().toISOString(),
        },
        token,
    };
}

/**
 * Validate a session token. Returns admin user or null.
 */
export async function validateSession(token: string): Promise<AdminUser | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !token) return null;

    const { data, error } = await supabase
        .from("admin_sessions")
        .select("*, admin_users(*)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (error || !data || !data.admin_users) return null;

    const u = data.admin_users as any;
    if (!u.is_active) return null;

    return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
    };
}

/**
 * Get current admin from cookies (for server components / API routes).
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;
    return validateSession(token);
}

/**
 * Destroy a session (logout).
 */
export async function destroySession(token: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !token) return;
    await supabase.from("admin_sessions").delete().eq("token", token);
}

/**
 * Log an admin action to the audit trail.
 */
export async function logAdminAction(params: {
    adminId: string;
    adminEmail: string;
    adminName: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: string;
    ipAddress?: string;
}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.from("admin_audit_logs").insert({
        admin_id: params.adminId,
        admin_email: params.adminEmail,
        admin_name: params.adminName,
        action: params.action,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        details: params.details || null,
        ip_address: params.ipAddress || null,
    });
}

/**
 * Get audit logs.
 */
export async function getAuditLogs(limit = 200): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}
