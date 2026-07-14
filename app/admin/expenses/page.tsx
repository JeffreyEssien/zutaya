import { getExpenses } from "@/lib/expenses";
import { getOrders } from "@/lib/queries";
import ExpensesContent from "@/components/modules/ExpensesContent";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
    const [expenses, orders] = await Promise.all([
        getExpenses(),
        getOrders().catch(() => []),
    ]);

    // Minimal paid-order revenue points for the P&L (keep client payload small).
    const revenuePoints = orders
        .filter((o) => o.paymentStatus === "payment_confirmed")
        .map((o) => ({ total: o.total, date: o.createdAt }));

    return <ExpensesContent initialExpenses={expenses} revenuePoints={revenuePoints} />;
}
