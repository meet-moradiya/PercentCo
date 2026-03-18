"use client";

import { useEffect, useState, useCallback } from "react";

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  isJain: boolean;
}

interface Order {
  _id: string;
  tableNumber: number;
  customerName: string;
  items: OrderItem[];
  status: "ready" | "served";
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

type StatusFilter = "all" | "ready" | "served";

export default function WaiterDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const markServed = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/waiter/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "served" }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: "served" as const, completedAt: new Date().toISOString() } : o
          )
        );
      }
    } catch (error) {
      console.error("Failed to update order:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const servedCount = orders.filter((o) => o.status === "served").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-foreground font-semibold">Service Orders</h1>
        <p className="text-muted text-sm mt-1">Pick up ready orders and mark them as served.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Ready to Serve</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{readyCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Served Today</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{servedCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4 hidden sm:block">
          <p className="text-muted text-xs tracking-wider uppercase">Total Orders</p>
          <p className="text-2xl font-bold text-foreground mt-1">{orders.length}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex border-b border-surface-border mb-6 overflow-x-auto no-scrollbar">
        {([
          { key: "all" as StatusFilter, label: "All Orders", count: orders.length },
          { key: "ready" as StatusFilter, label: "Ready", count: readyCount },
          { key: "served" as StatusFilter, label: "Served", count: servedCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-px flex items-center gap-2 text-nowrap ${
              filter === tab.key ? "border-blue-400 text-blue-400" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 border ${filter === tab.key ? "border-blue-400/30 text-blue-400" : "border-surface-border text-muted"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-surface border border-surface-border p-12 text-center">
          <svg className="w-12 h-12 text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-muted text-sm">No orders to display.</p>
          <p className="text-muted/60 text-xs mt-1">Ready orders will appear here when the kitchen marks them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isReady = order.status === "ready";
            const isUpdating = updatingId === order._id;
            return (
              <div
                key={order._id}
                className={`border p-5 transition-all ${
                  isReady
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-surface border-surface-border opacity-60"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">T{order.tableNumber}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                        isReady
                          ? "bg-green-500/20 text-green-400 border-green-400/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-400/30"
                      }`}
                    >
                      {isReady ? "Ready" : "Served"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">{formatTime(order.createdAt)}</p>
                    <p className="text-[10px] text-muted/60">{getTimeSince(order.createdAt)}</p>
                  </div>
                </div>

                {/* Customer */}
                <p className="text-sm text-muted mb-3 capitalize">
                  <span className="text-foreground/60">Customer:</span> {order.customerName}
                </p>

                {/* Items */}
                <div className="space-y-1.5 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{item.name}</span>
                        {item.isJain && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-green-500/15 text-green-400 border border-green-400/30 uppercase tracking-wider">
                            Jain
                          </span>
                        )}
                      </div>
                      <span className="text-blue-400 font-semibold">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-background/50 border border-surface-border px-3 py-2 mb-3">
                    <p className="text-xs text-muted">
                      <span className="text-foreground/60 uppercase tracking-wider text-[10px]">Note: </span>
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  {isReady ? (
                    <button
                      onClick={() => markServed(order._id)}
                      disabled={isUpdating}
                      className="flex-1 py-2 bg-blue-500 text-white text-xs font-semibold tracking-wider uppercase hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "✓ Mark Served"}
                    </button>
                  ) : (
                    <div className="flex-1 py-2 text-center text-xs text-blue-400 font-semibold tracking-wider uppercase border border-blue-400/30 bg-blue-500/5">
                      ✓ Served {order.completedAt ? `at ${formatTime(order.completedAt)}` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-6 text-center">
        <p className="text-muted/40 text-[10px] tracking-wider uppercase">Auto-refreshes every 15 seconds</p>
      </div>
    </div>
  );
}
