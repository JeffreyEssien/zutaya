"use client";

import Link from "next/link";
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface RecentOrdersTableProps {
    orders: Order[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
    return (
        <div className="bg-white/[0.04] rounded-lg shadow-sm border border-warm-cream/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-warm-cream/20 flex justify-between items-center bg-warm-cream/5">
                <h3 className="font-serif text-lg text-warm-cream">Recent Orders</h3>
                <Link href="/admin/orders" className="text-sm text-brand-green hover:underline">
                    View All
                </Link>
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#111] text-warm-cream/60 font-medium">
                        <tr>
                            <th className="px-6 py-3">Order ID</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-cream/10">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-warm-cream/40">
                                    No orders yet.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-[#111] transition-colors">
                                    <td className="px-6 py-3 font-mono text-xs text-warm-cream/70">
                                        #{order.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-3 text-warm-cream">{order.customerName}</td>
                                    <td className="px-6 py-3 text-warm-cream/70">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-warm-cream">
                                        {formatCurrency(order.total)}
                                    </td>
                                    <td className="px-6 py-3">
                                        <Badge status={order.status} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col divide-y divide-warm-cream/10">
                {orders.length === 0 ? (
                    <div className="px-6 py-8 text-center text-warm-cream/40 text-sm">
                        No orders yet.
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="p-4 flex flex-col gap-3 hover:bg-[#111]/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-warm-cream text-sm">{order.customerName}</p>
                                    <p className="font-mono text-[10px] text-warm-cream/50 mt-0.5">#{order.id.slice(0, 8)}</p>
                                </div>
                                <Badge status={order.status} />
                            </div>
                            <div className="flex justify-between items-end text-sm">
                                <span className="text-warm-cream/60 text-xs">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                                <span className="font-bold text-warm-cream">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function Badge({ status }: { status: string }) {
    const colors = {
        pending: "bg-amber-100 text-amber-800",
        shipped: "bg-blue-100 text-blue-800",
        delivered: "bg-green-100 text-green-800",
    };
    const style = colors[status as keyof typeof colors] || "bg-warm-cream/5 text-gray-800";
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${style}`}>
            {status}
        </span>
    );
}
