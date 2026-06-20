import { Order, Product, Profile, Coupon, InventoryLog, InventoryItem, Subscription } from "@/types";
import type { PaymentRow } from "@/lib/payments";

export interface AnalyticsData {
    sales: {
        totalRevenue: number;
        netRevenue: number;
        shippingRevenue: number;
        aov: number;
        revenueByStatus: Record<string, number>;
        trend: { date: string; value: number }[];
    };
    inventory: {
        totalValuationCost: number;
        totalValuationRetail: number;
        projectedMargin: number;
        lowStockCount: number;
        outOfStockCount: number;
        shrinkageValue: number;
        totalItems: number;
    };
    products: {
        topSelling: { id: string; name: string; quantity: number; revenue: number }[];
        turnoverRate: number;
    };
    customers: {
        total: number;
        new: number;
        returningRate: number;
        clv: number;
        registeredVsGuest: { registered: number; guest: number };
        growthTrend: { date: string; count: number }[];
    };
    marketing: {
        couponUsage: number;
        discountImpact: number;
        topCoupons: { code: string; count: number }[];
    };
    operations: {
        fulfillmentRate: number;
        backlog: number;
        recentActivityCount: number;
    };
    profit: {
        totalCOGS: number;
        grossProfit: number;
        grossMargin: number;
        profitPerOrder: number;
    };
    // NEW: 4 deep insights
    revenueVelocity: {
        avg7d: number;
        avg30d: number;
        trendPercent: number; // % change 7d vs 30d (positive = accelerating)
    };
    categoryPerformance: {
        name: string;
        revenue: number;
        unitsSold: number;
        aov: number;
        orderCount: number;
    }[];
    conversionFunnel: {
        pending: number;
        shipped: number;
        delivered: number;
        pendingToShippedRate: number;
        shippedToDeliveredRate: number;
        overallConversionRate: number;
    };
    peakHours: {
        hour: number;
        count: number;
        revenue: number;
    }[];
    // Meat-specific metrics
    meat: {
        totalKgSold: number;
        kgByCategory: { name: string; kg: number }[];
        expiringStockCount: number;
        expiringItems: { name: string; expiryDate: string; stock: number }[];
        deliveryZoneBreakdown: { zone: string; orders: number; revenue: number }[];
        grossMarginTrend: { date: string; margin: number }[];
    };
    // ⭐ Deep insights (2026-06-19) — derived from existing-but-unanalyzed data
    retention: {
        segments: { segment: string; customers: number; revenue: number; avgOrders: number }[];
        repeatRevenueShare: number;       // % of revenue from customers with >1 order
        medianDaysBetweenOrders: number;  // reorder cadence
    };
    basket: { pair: string; count: number; confidence: number }[];
    paymentHealth: {
        totalAttempts: number;
        paidCount: number;
        successRate: number;
        abandonmentRate: number;
        failedCount: number;
        pendingCount: number;
        avgMinutesToPay: number;
        feesPctOfRevenue: number;
        totalFees: number;
        refundRate: number;
        refundedAmount: number;
    } | null;
    subscriptions: {
        activeCount: number;
        pausedCount: number;
        cancelledCount: number;
        mrr: number;
        arr: number;
        avgSubValue: number;
        churnRate: number;
        byFrequency: { frequency: string; count: number; mrr: number }[];
    } | null;
}

export function calculateAnalytics(
    orders: Order[],
    products: Product[],
    customers: Profile[],
    coupons: Coupon[],
    inventoryLogs: InventoryLog[],
    inventoryItems: InventoryItem[],
    subscriptions: Subscription[] = [],
    payments: PaymentRow[] = []
): AnalyticsData {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayStart = now.getTime() - (now.getTime() % oneDay);

    // Ensure items is always an array (may arrive as JSON string from DB)
    // Normalize item shape: some have {product: {id, price}}, others have flat {productId, name, price}
    orders = orders.map(o => {
        const rawItems = typeof o.items === "string" ? JSON.parse(o.items) : Array.isArray(o.items) ? o.items : [];
        return {
            ...o,
            items: rawItems.map((item: any) => {
                if (item.product?.id) return item; // already CartItem shape
                return {
                    product: {
                        id: item.productId || item.product_id || "unknown",
                        name: item.name || item.productName || "Unknown",
                        slug: "",
                        price: item.price || 0,
                        image: item.image || "",
                        images: [],
                        description: "",
                        category: item.category || "",
                        brand: "",
                        stock: 0,
                        variants: [],
                        isFeatured: false,
                        isNew: false,
                    },
                    variant: item.variant ? (typeof item.variant === "string" ? { name: item.variant } : item.variant) : undefined,
                    quantity: item.quantity || 1,
                };
            }),
        };
    });

    // --- 1. Sales & Revenue ---
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const netRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const shippingRevenue = orders.reduce((sum, o) => sum + o.shipping, 0);
    const aov = orders.length > 0 ? totalRevenue / orders.length : 0;

    const revenueByStatus = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + o.total;
        return acc;
    }, {} as Record<string, number>);

    // Trend (Last 7 days)
    const trendMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * oneDay).toISOString().split('T')[0];
        trendMap.set(d, 0);
    }
    orders.forEach(o => {
        const key = new Date(o.createdAt).toISOString().split('T')[0];
        if (trendMap.has(key)) {
            trendMap.set(key, trendMap.get(key)! + o.total);
        }
    });
    const revenueTrend = Array.from(trendMap.entries()).map(([date, value]) => ({ date, value }));


    // --- 2. Inventory & Profitability ---
    // Use InventoryItems for accurate valuation
    const totalValuationCost = inventoryItems.reduce((sum, i) => sum + (i.stock * i.costPrice), 0);
    const totalValuationRetail = inventoryItems.reduce((sum, i) => sum + (i.stock * i.sellingPrice), 0);
    const projectedMargin = totalValuationRetail > 0
        ? ((totalValuationRetail - totalValuationCost) / totalValuationRetail) * 100
        : 0;

    const lowStockCount = inventoryItems.filter(i => i.stock <= i.reorderLevel).length;
    const outOfStockCount = inventoryItems.filter(i => i.stock === 0).length;

    // Shrinkage: Sum of negative adjustments not due to orders
    const shrinkageValue = inventoryLogs
        .filter(l => l.changeAmount < 0 && l.reason !== 'order')
        .reduce((sum, l) => {
            // Estimate value lost. We'd need historical cost, but use current item cost approx
            const item = inventoryItems.find(i => i.id === l.productId); // Assuming log.productId maps to inventoryItem.id? 
            // NOTE: logs might link to Product ID, but InventoryItem usually 1:1. 
            // In our schema products link to inventory. Let's try to find via product.
            // If log has product_id, lookup product -> inventory_item -> cost.
            const prod = products.find(p => p.id === l.productId);
            // If we can't find cost, ignore or use avg. 
            // Ideally logs snapshot cost. For now, simplistic:
            return sum + (Math.abs(l.changeAmount) * (prod?.price || 0)); // Using retail price as loss value or cost? Usually Cost.
            // Let's use cost if we can find inventory item derived from product
        }, 0);


    // --- 3. Product Performance ---
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    orders.forEach(order => {
        order.items.forEach(item => {
            const pid = item.product.id;
            const current = productSales.get(pid) || { quantity: 0, revenue: 0 };
            productSales.set(pid, {
                quantity: current.quantity + item.quantity,
                revenue: current.revenue + (item.product.price * item.quantity)
            });
        });
    });

    const topSelling = Array.from(productSales.entries())
        .map(([id, data]) => {
            const product = products.find(p => p.id === id);
            return {
                id,
                name: product?.name || "Unknown",
                quantity: data.quantity,
                revenue: data.revenue
            };
        })
        .sort((a, b) => b.quantity - a.quantity) // Best selling by Volume
        .slice(0, 5);

    const totalUnitsSold = Array.from(productSales.values()).reduce((sum, s) => sum + s.quantity, 0);
    const currentTotalStock = inventoryItems.reduce((sum, i) => sum + i.stock, 0);
    // Simple Turnover: Units Sold / (Current Stock + Units Sold) *approx initial*? 
    // Or just "Sales / Avg Inventory". Let's do Units Sold / Current Stock for a "Run rate" feel
    const turnoverRate = currentTotalStock > 0 ? (totalUnitsSold / currentTotalStock) : 0;


    // --- 4. Customer Insights ---
    const customerSpending = new Map<string, { count: number }>();
    let registeredCount = 0;

    orders.forEach(o => {
        const email = o.email.toLowerCase();
        const current = customerSpending.get(email) || { count: 0 };
        customerSpending.set(email, { count: current.count + 1 });

        // Naive check: if distinct email exists in customers list
        if (customers.some(c => c.email.toLowerCase() === email)) {
            // distinct check handled below
        }
    });

    const uniqueEmails = Array.from(customerSpending.keys());
    uniqueEmails.forEach(email => {
        if (customers.some(c => c.email.toLowerCase() === email)) registeredCount++;
    });

    const totalUnique = uniqueEmails.length;
    const returning = Array.from(customerSpending.values()).filter(c => c.count > 1).length;

    // Growth Trend (Profiles created)
    const custTrendMap = new Map<string, number>();
    // Last 6 months? Or just all time grouped? Let's do last 30 days
    customers.forEach(c => {
        const d = new Date(c.createdAt).toISOString().split('T')[0];
        custTrendMap.set(d, (custTrendMap.get(d) || 0) + 1);
    });
    // Just return raw data for charting if needed, or simplify to "New this month"
    const newCustomersThisMonth = customers.filter(c => new Date(c.createdAt).getTime() >= (now.getTime() - 30 * oneDay)).length;


    // --- 5. Marketing ---
    // Count usage from actual orders
    const ordersWithCoupon = orders.filter(o => !!o.couponCode);
    const couponUsageCount = ordersWithCoupon.length;

    // Top Coupons from actual usage
    const couponUsageMap = new Map<string, number>();
    ordersWithCoupon.forEach(o => {
        if (o.couponCode) {
            couponUsageMap.set(o.couponCode, (couponUsageMap.get(o.couponCode) || 0) + 1);
        }
    });

    const topCoupons = Array.from(couponUsageMap.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Impact: Average % Discount
    // Calculate total discount value given vs total revenue (gross)
    // Gross Revenue would be Total + Discount (what it would have been)
    let totalDiscountGiven = 0;
    let totalGrossRevenue = 0; // Pre-discount subtotal + shipping

    orders.forEach(o => {
        // use stored discountTotal if available
        const discount = o.discountTotal || 0;
        totalDiscountGiven += discount;
        // Gross revenue reconstruction: Total Paid + Discount
        totalGrossRevenue += (o.total + discount);
    });

    // Discount Impact as % of Gross Revenue (or simplified avg discount %)
    const discountImpact = totalGrossRevenue > 0
        ? (totalDiscountGiven / totalGrossRevenue) * 100
        : 0;

    // Fallback: if no orders have coupon data yet (legacy), 
    // we might show 0 or keep the old approximation? 
    // Better to show real data (0) if none found, to avoid confusion.
    // But user asked "hope there is no remaining dummy data". So we stick to real.


    // --- 6. Operations ---
    const fulfilled = orders.filter(o => o.status === 'out_for_delivery' || o.status === 'delivered').length;
    const fulfillmentRate = orders.length > 0 ? (fulfilled / orders.length) * 100 : 0;
    const backlog = orders.filter(o => o.status === 'pending').length;
    const recentActivityCount = inventoryLogs.filter(l => new Date(l.createdAt).getTime() > (now.getTime() - oneDay)).length;


    // --- 7. Profit (Refined) ---
    let totalCOGS = 0;
    orders.forEach(order => {
        order.items.forEach(item => {
            const itemCost = (item as any).costPrice || 0;
            totalCOGS += itemCost * item.quantity;
        });
    });
    const grossProfit = netRevenue - totalCOGS;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const profitPerOrder = orders.length > 0 ? grossProfit / orders.length : 0;


    // --- 8. Revenue Velocity (NEW) ---
    const rev7d = orders
        .filter(o => new Date(o.createdAt).getTime() >= (now.getTime() - 7 * oneDay))
        .reduce((sum, o) => sum + o.total, 0);
    const rev30d = orders
        .filter(o => new Date(o.createdAt).getTime() >= (now.getTime() - 30 * oneDay))
        .reduce((sum, o) => sum + o.total, 0);
    const avg7d = rev7d / 7;
    const avg30d = rev30d / 30;
    const velocityTrend = avg30d > 0 ? ((avg7d - avg30d) / avg30d) * 100 : 0;


    // --- 9. Category Performance (NEW) ---
    const categoryMap = new Map<string, { revenue: number; units: number; orders: Set<string> }>();
    orders.forEach(order => {
        order.items.forEach(item => {
            const cat = item.product.category || "Uncategorized";
            const current = categoryMap.get(cat) || { revenue: 0, units: 0, orders: new Set<string>() };
            current.revenue += item.product.price * item.quantity;
            current.units += item.quantity;
            current.orders.add(order.id);
            categoryMap.set(cat, current);
        });
    });
    const categoryPerformance = Array.from(categoryMap.entries())
        .map(([name, d]) => ({
            name,
            revenue: d.revenue,
            unitsSold: d.units,
            orderCount: d.orders.size,
            aov: d.orders.size > 0 ? d.revenue / d.orders.size : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);


    // --- 10. Conversion Funnel (NEW) ---
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const shippedCount = orders.filter(o => o.status === 'out_for_delivery' || o.status === 'packed').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const totalOrders = orders.length;
    const pendingToShippedRate = totalOrders > 0 ? ((shippedCount + deliveredCount) / totalOrders) * 100 : 0;
    const shippedToDeliveredRate = (shippedCount + deliveredCount) > 0
        ? (deliveredCount / (shippedCount + deliveredCount)) * 100 : 0;
    const overallConversionRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;


    // --- 11. Peak Sales Hours (NEW) ---
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, revenue: 0 }));
    orders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hourlyData[h].count += 1;
        hourlyData[h].revenue += o.total;
    });


    // --- 12. Meat-Specific Metrics (NEW) ---
    // Total kg sold: sum quantity * minWeightKg for products that have it, else count as 1kg per unit
    let totalKgSold = 0;
    const kgByCatMap = new Map<string, number>();
    orders.forEach(order => {
        order.items.forEach(item => {
            const prod = products.find(p => p.id === item.product.id);
            const weightPerUnit = prod?.minWeightKg || 1;
            const kg = item.quantity * weightPerUnit;
            totalKgSold += kg;
            const cat = item.product.category || "Uncategorized";
            kgByCatMap.set(cat, (kgByCatMap.get(cat) || 0) + kg);
        });
    });
    const kgByCategory = Array.from(kgByCatMap.entries())
        .map(([name, kg]) => ({ name, kg: Math.round(kg * 10) / 10 }))
        .sort((a, b) => b.kg - a.kg);

    // Expiring stock: items with expiryDate within 7 days
    const sevenDaysFromNow = now.getTime() + 7 * oneDay;
    const expiringItems = inventoryItems
        .filter(i => i.expiryDate && new Date(i.expiryDate).getTime() <= sevenDaysFromNow && i.stock > 0)
        .map(i => {
            const prod = products.find(p => p.inventoryId === i.id);
            return { name: prod?.name || i.name || "Unknown", expiryDate: i.expiryDate!, stock: i.stock };
        })
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    // Delivery zone breakdown
    const zoneMap = new Map<string, { orders: number; revenue: number }>();
    orders.forEach(o => {
        const zone = o.deliveryZone || "Unknown";
        const cur = zoneMap.get(zone) || { orders: 0, revenue: 0 };
        cur.orders += 1;
        cur.revenue += o.total;
        zoneMap.set(zone, cur);
    });
    const deliveryZoneBreakdown = Array.from(zoneMap.entries())
        .map(([zone, d]) => ({ zone, ...d }))
        .sort((a, b) => b.orders - a.orders);

    // Gross margin trend (last 7 days)
    const grossMarginTrend: { date: string; margin: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const dayStr = new Date(now.getTime() - i * oneDay).toISOString().split("T")[0];
        const dayOrders = orders.filter(o => new Date(o.createdAt).toISOString().split("T")[0] === dayStr);
        const dayRevenue = dayOrders.reduce((s, o) => s + o.subtotal, 0);
        let dayCOGS = 0;
        dayOrders.forEach(o => o.items.forEach(item => {
            dayCOGS += ((item as any).costPrice || 0) * item.quantity;
        }));
        const margin = dayRevenue > 0 ? ((dayRevenue - dayCOGS) / dayRevenue) * 100 : 0;
        grossMarginTrend.push({ date: dayStr, margin: Math.round(margin * 10) / 10 });
    }

    return {
        sales: {
            totalRevenue,
            netRevenue,
            shippingRevenue,
            aov,
            revenueByStatus,
            trend: revenueTrend
        },
        inventory: {
            totalValuationCost,
            totalValuationRetail,
            projectedMargin,
            lowStockCount,
            outOfStockCount,
            shrinkageValue,
            totalItems: inventoryItems.length
        },
        products: {
            topSelling,
            turnoverRate
        },
        customers: {
            total: totalUnique,
            new: newCustomersThisMonth,
            returningRate: totalUnique > 0 ? (returning / totalUnique) * 100 : 0,
            clv: totalUnique > 0 ? totalRevenue / totalUnique : 0,
            registeredVsGuest: { registered: registeredCount, guest: totalUnique - registeredCount },
            growthTrend: []
        },
        marketing: {
            couponUsage: couponUsageCount,
            discountImpact: discountImpact,
            topCoupons
        },
        operations: {
            fulfillmentRate,
            backlog,
            recentActivityCount
        },
        profit: {
            totalCOGS,
            grossProfit,
            grossMargin,
            profitPerOrder
        },
        revenueVelocity: {
            avg7d,
            avg30d,
            trendPercent: velocityTrend,
        },
        categoryPerformance,
        conversionFunnel: {
            pending: pendingCount,
            shipped: shippedCount,
            delivered: deliveredCount,
            pendingToShippedRate,
            shippedToDeliveredRate,
            overallConversionRate,
        },
        peakHours: hourlyData,
        meat: {
            totalKgSold: Math.round(totalKgSold * 10) / 10,
            kgByCategory,
            expiringStockCount: expiringItems.length,
            expiringItems,
            deliveryZoneBreakdown,
            grossMarginTrend,
        },
        retention: computeRetention(orders),
        basket: computeBasket(orders),
        paymentHealth: computePaymentHealth(payments),
        subscriptions: computeSubscriptionMetrics(subscriptions),
    };
}

// ============================================================
//  ⭐ Deep insight helpers
// ============================================================

/** RFM-style customer segmentation from order history (Recency / Frequency / Monetary). */
function computeRetention(orders: Order[]): AnalyticsData["retention"] {
    const now = Date.now();
    const day = 86_400_000;
    const byEmail = new Map<string, { count: number; revenue: number; last: number; dates: number[] }>();

    orders.forEach((o) => {
        const email = (o.email || "").toLowerCase();
        if (!email) return;
        const t = new Date(o.createdAt).getTime();
        const cur = byEmail.get(email) || { count: 0, revenue: 0, last: 0, dates: [] };
        cur.count += 1;
        cur.revenue += o.total;
        cur.last = Math.max(cur.last, t);
        cur.dates.push(t);
        byEmail.set(email, cur);
    });

    const segMap = new Map<string, { customers: number; revenue: number; orders: number }>();
    const bump = (seg: string, revenue: number, ordersN: number) => {
        const c = segMap.get(seg) || { customers: 0, revenue: 0, orders: 0 };
        c.customers += 1;
        c.revenue += revenue;
        c.orders += ordersN;
        segMap.set(seg, c);
    };

    let repeatRevenue = 0;
    let totalRev = 0;
    const gaps: number[] = [];

    byEmail.forEach((c) => {
        totalRev += c.revenue;
        if (c.count > 1) repeatRevenue += c.revenue;

        const sorted = [...c.dates].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i] - sorted[i - 1]) / day);

        const recencyDays = (now - c.last) / day;
        let seg: string;
        if (recencyDays > 90) seg = c.count > 1 ? "Lost" : "One-time (cold)";
        else if (c.count >= 4 && recencyDays <= 30) seg = "Champions";
        else if (c.count >= 2 && recencyDays <= 45) seg = "Loyal";
        else if (c.count >= 2) seg = "At-risk";
        else seg = "New";
        bump(seg, c.revenue, c.count);
    });

    const SEG_ORDER = ["Champions", "Loyal", "New", "At-risk", "Lost", "One-time (cold)"];
    const segments = Array.from(segMap.entries())
        .map(([segment, d]) => ({
            segment,
            customers: d.customers,
            revenue: d.revenue,
            avgOrders: d.customers > 0 ? d.orders / d.customers : 0,
        }))
        .sort((a, b) => SEG_ORDER.indexOf(a.segment) - SEG_ORDER.indexOf(b.segment));

    gaps.sort((a, b) => a - b);
    const medianDaysBetweenOrders = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : 0;

    return {
        segments,
        repeatRevenueShare: totalRev > 0 ? (repeatRevenue / totalRev) * 100 : 0,
        medianDaysBetweenOrders,
    };
}

/** Market-basket affinity: which product pairs are bought together most often. */
function computeBasket(orders: Order[]): AnalyticsData["basket"] {
    const pairCount = new Map<string, number>();
    const itemCount = new Map<string, number>();
    const nameById = new Map<string, string>();

    orders.forEach((o) => {
        const ids = Array.from(new Set(o.items.map((i) => i.product.id)));
        o.items.forEach((i) => nameById.set(i.product.id, i.product.name));
        ids.forEach((id) => itemCount.set(id, (itemCount.get(id) || 0) + 1));
        for (let a = 0; a < ids.length; a++) {
            for (let b = a + 1; b < ids.length; b++) {
                const key = [ids[a], ids[b]].sort().join("|");
                pairCount.set(key, (pairCount.get(key) || 0) + 1);
            }
        }
    });

    return Array.from(pairCount.entries())
        .map(([key, count]) => {
            const [a, b] = key.split("|");
            const minItem = Math.min(itemCount.get(a) || 1, itemCount.get(b) || 1);
            return {
                pair: `${nameById.get(a) || "?"}  +  ${nameById.get(b) || "?"}`,
                count,
                confidence: minItem > 0 ? (count / minItem) * 100 : 0,
            };
        })
        .filter((p) => p.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
}

/** Payment funnel health from the payments ledger (amounts in kobo → naira). */
function computePaymentHealth(payments: PaymentRow[]): AnalyticsData["paymentHealth"] {
    if (!payments || payments.length === 0) return null;

    const total = payments.length;
    const paid = payments.filter((p) => p.status === "paid" || p.status === "refunded" || p.status === "partially_refunded");
    const paidCount = paid.length;
    const failedCount = payments.filter((p) => p.status === "failed").length;
    const abandonedCount = payments.filter((p) => p.status === "abandoned").length;
    const pendingCount = payments.filter((p) => p.status === "pending").length;
    const refunded = payments.filter((p) => p.status === "refunded" || p.status === "partially_refunded");

    let sumMin = 0;
    let n = 0;
    paid.forEach((p) => {
        if (p.paid_at && p.created_at) {
            const dt = (new Date(p.paid_at).getTime() - new Date(p.created_at).getTime()) / 60_000;
            if (dt >= 0 && dt < 60 * 24) {
                sumMin += dt;
                n++;
            }
        }
    });

    const grossKobo = paid.reduce((s, p) => s + (p.total_charged_kobo || 0), 0);
    const feesKobo = paid.reduce((s, p) => s + (p.paystack_fees_kobo || 0), 0);
    const refundedKobo = payments.reduce((s, p) => s + (p.refunded_amount_kobo || 0), 0);

    return {
        totalAttempts: total,
        paidCount,
        successRate: total > 0 ? (paidCount / total) * 100 : 0,
        abandonmentRate: total > 0 ? (abandonedCount / total) * 100 : 0,
        failedCount: failedCount + abandonedCount,
        pendingCount,
        avgMinutesToPay: n > 0 ? sumMin / n : 0,
        feesPctOfRevenue: grossKobo > 0 ? (feesKobo / grossKobo) * 100 : 0,
        totalFees: feesKobo / 100,
        refundRate: paidCount > 0 ? (refunded.length / paidCount) * 100 : 0,
        refundedAmount: refundedKobo / 100,
    };
}

/** Recurring-revenue metrics from subscriptions, normalised to a monthly basis. */
function computeSubscriptionMetrics(subs: Subscription[]): AnalyticsData["subscriptions"] {
    if (!subs || subs.length === 0) return null;

    const monthlyValue = (s: Subscription) => {
        const per = s.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const mult = s.frequency === "weekly" ? 52 / 12 : s.frequency === "biweekly" ? 26 / 12 : 1;
        return per * mult;
    };

    const active = subs.filter((s) => s.status === "active");
    const paused = subs.filter((s) => s.status === "paused");
    const cancelled = subs.filter((s) => s.status === "cancelled");
    const mrr = active.reduce((s, sub) => s + monthlyValue(sub), 0);

    const freqMap = new Map<string, { count: number; mrr: number }>();
    active.forEach((s) => {
        const c = freqMap.get(s.frequency) || { count: 0, mrr: 0 };
        c.count += 1;
        c.mrr += monthlyValue(s);
        freqMap.set(s.frequency, c);
    });

    return {
        activeCount: active.length,
        pausedCount: paused.length,
        cancelledCount: cancelled.length,
        mrr,
        arr: mrr * 12,
        avgSubValue: active.length > 0 ? mrr / active.length : 0,
        churnRate: subs.length > 0 ? (cancelled.length / subs.length) * 100 : 0,
        byFrequency: Array.from(freqMap.entries()).map(([frequency, d]) => ({ frequency, count: d.count, mrr: d.mrr })),
    };
}

