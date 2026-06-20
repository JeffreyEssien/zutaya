/**
 * Dashboard ("operate") metrics — distinct from analytics ("analyse").
 *
 * Everything here is scoped to TODAY / right-now and is action-oriented:
 *  - alerts: counts that demand action (each maps to an admin page)
 *  - pulse:  is today normal? (today vs. same weekday last week, vs. typical pace)
 *  - lists:  today's delivery run + the latest orders
 *
 * Cheap pure function over already-fetched data. Amounts are naira (orders) and
 * kobo (payments) — payments are converted at the edge.
 */

import type { Order, Profile, InventoryItem, Product } from "@/types";
import type { PaymentRow, DisputeRow } from "@/lib/payments";

const DAY = 86_400_000;
const dateStr = (d: number | string | Date) => new Date(d).toISOString().slice(0, 10);

export interface DashboardData {
    alerts: {
        awaitingPayment: number;
        failedPaymentsToday: number;
        disputesDueSoon: number;
        expiringSoon: number;
        expiringValue: number;
        newOrdersToConfirm: number;
        oldestPendingHours: number;
        deliveriesToday: number;
        reorderNow: number;
        unquotedBookings: number;
    };
    pulse: {
        revenueToday: number;
        revenueSameDayLastWeek: number;
        revenueDeltaPct: number;
        ordersToday: number;
        ordersAvg7d: number;
        newCustomersToday: number;
        paceExpected: number;   // revenue you'd typically have by this hour
        paceActual: number;     // revenue so far today
        paceDeltaPct: number;
    };
    deliveriesTodayList: {
        id: string;
        customerName: string;
        zone: string;
        slot: string;
        total: number;
        status: string;
    }[];
    latestOrders: {
        id: string;
        customerName: string;
        total: number;
        status: string;
        paymentStatus?: string;
        createdAt: string;
    }[];
}

export function calculateDashboard(args: {
    orders: Order[];
    customers: Profile[];
    inventoryItems: InventoryItem[];
    products: Product[];
    payments: PaymentRow[];
    disputes: DisputeRow[];
    pendingBookings: number;
}): DashboardData {
    const { orders, customers, inventoryItems, payments, disputes, pendingBookings } = args;
    const now = Date.now();
    const today = dateStr(now);
    const lastWeekSameDay = dateStr(now - 7 * DAY);

    // ── Alerts ──
    const awaitingPayment = orders.filter(
        (o) =>
            (o.status as string) !== "cancelled" &&
            (o.paymentStatus === "awaiting_payment" || o.paymentStatus === "payment_submitted"),
    ).length;

    const failedPaymentsToday = payments.filter(
        (p) => (p.status === "failed" || p.status === "abandoned") && p.created_at && dateStr(p.created_at) === today,
    ).length;

    const disputesDueSoon = disputes.filter((d) => {
        if (d.status === "resolved" || !d.due_at) return false;
        const due = new Date(d.due_at).getTime();
        return due - now <= 2 * DAY; // due within 48h (or already overdue)
    }).length;

    const expiringList = inventoryItems.filter(
        (i) => i.expiryDate && i.stock > 0 && new Date(i.expiryDate).getTime() - now <= 3 * DAY,
    );
    const expiringSoon = expiringList.length;
    const expiringValue = expiringList.reduce((s, i) => s + i.stock * (i.sellingPrice || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === "pending");
    const newOrdersToConfirm = pendingOrders.length;
    const oldestPendingHours = pendingOrders.reduce((max, o) => {
        const h = (now - new Date(o.createdAt).getTime()) / 3_600_000;
        return h > max ? h : max;
    }, 0);

    const deliveriesTodayOrders = orders.filter(
        (o) =>
            o.requestedDeliveryDate &&
            o.requestedDeliveryDate.slice(0, 10) === today &&
            o.status !== "delivered" &&
            (o.status as string) !== "cancelled",
    );

    const reorderNow = inventoryItems.filter((i) => i.stock <= (i.reorderLevel ?? 0)).length;

    // ── Pulse ──
    const revenueToday = orders
        .filter((o) => dateStr(o.createdAt) === today)
        .reduce((s, o) => s + o.total, 0);
    const revenueSameDayLastWeek = orders
        .filter((o) => dateStr(o.createdAt) === lastWeekSameDay)
        .reduce((s, o) => s + o.total, 0);
    const ordersToday = orders.filter((o) => dateStr(o.createdAt) === today).length;
    const ordersLast7d = orders.filter((o) => new Date(o.createdAt).getTime() >= now - 7 * DAY).length;
    const newCustomersToday = customers.filter((c) => dateStr(c.createdAt) === today).length;

    const pace = computePace(orders, now);

    return {
        alerts: {
            awaitingPayment,
            failedPaymentsToday,
            disputesDueSoon,
            expiringSoon,
            expiringValue,
            newOrdersToConfirm,
            oldestPendingHours: Math.round(oldestPendingHours),
            deliveriesToday: deliveriesTodayOrders.length,
            reorderNow,
            unquotedBookings: pendingBookings,
        },
        pulse: {
            revenueToday,
            revenueSameDayLastWeek,
            revenueDeltaPct: revenueSameDayLastWeek > 0
                ? ((revenueToday - revenueSameDayLastWeek) / revenueSameDayLastWeek) * 100
                : revenueToday > 0 ? 100 : 0,
            ordersToday,
            ordersAvg7d: ordersLast7d / 7,
            newCustomersToday,
            paceExpected: pace.expected,
            paceActual: revenueToday,
            paceDeltaPct: pace.expected > 0 ? ((revenueToday - pace.expected) / pace.expected) * 100 : 0,
        },
        deliveriesTodayList: deliveriesTodayOrders
            .sort((a, b) => (a.requestedDeliverySlot || "").localeCompare(b.requestedDeliverySlot || ""))
            .slice(0, 12)
            .map((o) => ({
                id: o.id,
                customerName: o.customerName,
                zone: o.deliveryZone || "—",
                slot: o.requestedDeliverySlot || "—",
                total: o.total,
                status: o.status,
            })),
        latestOrders: [...orders]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
            .map((o) => ({
                id: o.id,
                customerName: o.customerName,
                total: o.total,
                status: o.status,
                paymentStatus: o.paymentStatus,
                createdAt: o.createdAt,
            })),
    };
}

/**
 * "Pace to now": how much revenue you'd typically have by the current hour.
 * Builds an hour-of-day cumulative revenue distribution from the trailing 28
 * days (excluding today), then scales by the trailing-7d average daily revenue.
 */
function computePace(orders: Order[], now: number): { expected: number } {
    const todayStr = dateStr(now);
    const currentHour = new Date(now).getUTCHours();

    const hist = orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= now - 28 * DAY && dateStr(o.createdAt) !== todayStr;
    });
    if (hist.length === 0) return { expected: 0 };

    let revUpToHour = 0;
    let revTotal = 0;
    hist.forEach((o) => {
        const h = new Date(o.createdAt).getUTCHours();
        revTotal += o.total;
        if (h <= currentHour) revUpToHour += o.total;
    });
    const cumFraction = revTotal > 0 ? revUpToHour / revTotal : 0;

    const last7 = orders
        .filter((o) => new Date(o.createdAt).getTime() >= now - 7 * DAY && dateStr(o.createdAt) !== todayStr)
        .reduce((s, o) => s + o.total, 0);
    const avgDaily = last7 / 7;

    return { expected: avgDaily * cumFraction };
}
