import { getSupabaseServiceClient } from "@/lib/supabase";
import type { Expense } from "@/types";
export { EXPENSE_CATEGORIES } from "@/lib/constants";

function toExpense(row: any): Expense {
    return {
        id: row.id,
        category: row.category,
        description: row.description || undefined,
        amount: Number(row.amount) || 0,
        incurredOn: row.incurred_on,
        note: row.note || undefined,
        createdAt: row.created_at,
    };
}

/** All expenses, newest first. Optionally limited to the last `sinceDays`. */
export async function getExpenses(sinceDays?: number): Promise<Expense[]> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) return [];
    let q = supabase.from("expenses").select("*").order("incurred_on", { ascending: false }).order("created_at", { ascending: false });
    if (sinceDays && sinceDays > 0) {
        const since = new Date();
        since.setDate(since.getDate() - sinceDays);
        q = q.gte("incurred_on", since.toISOString().slice(0, 10));
    }
    const { data } = await q;
    return (data || []).map(toExpense);
}

export async function createExpense(input: {
    category: string;
    description?: string;
    amount: number;
    incurredOn?: string;
    note?: string;
}): Promise<Expense> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");
    const amount = Number(input.amount);
    if (!input.category) throw new Error("Category is required");
    if (!(amount >= 0) || Number.isNaN(amount)) throw new Error("Amount must be a positive number");

    const { data, error } = await supabase.from("expenses").insert({
        category: input.category,
        description: input.description?.trim() || null,
        amount,
        incurred_on: input.incurredOn || new Date().toISOString().slice(0, 10),
        note: input.note?.trim() || null,
    }).select("*").single();
    if (error) throw error;
    return toExpense(data);
}

export async function updateExpense(id: string, input: {
    category?: string;
    description?: string;
    amount?: number;
    incurredOn?: string;
    note?: string;
}): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");
    const patch: any = {};
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.amount !== undefined) {
        const amount = Number(input.amount);
        if (!(amount >= 0) || Number.isNaN(amount)) throw new Error("Amount must be a positive number");
        patch.amount = amount;
    }
    if (input.incurredOn !== undefined) patch.incurred_on = input.incurredOn;
    if (input.note !== undefined) patch.note = input.note?.trim() || null;
    const { error } = await supabase.from("expenses").update(patch).eq("id", id);
    if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    if (!supabase) throw new Error("Database not available");
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
}
