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
  status: "pending" | "preparing" | "ready";
  notes: string;
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "preparing" | "ready";

export default function ChefDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/chef/orders");
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

  const updateStatus = async (orderId: string, newStatus: "preparing" | "ready") => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/chef/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
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
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  const statusConfig = {
    pending: {
      bg: "bg-yellow-500/10 border-yellow-500/30",
      badge: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30",
      label: "Pending",
      dot: "bg-yellow-400",
    },
    preparing: {
      bg: "bg-blue-500/10 border-blue-500/30",
      badge: "bg-blue-500/20 text-blue-400 border-blue-400/30",
      label: "Preparing",
      dot: "bg-blue-400",
    },
    ready: {
      bg: "bg-green-500/10 border-green-500/30",
      badge: "bg-green-500/20 text-green-400 border-green-400/30",
      label: "Ready",
      dot: "bg-green-400",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-foreground font-semibold">Kitchen Orders</h1>
        <p className="text-muted text-sm mt-1">Manage incoming orders — prepare and mark them ready for service.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Preparing</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{preparingCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Ready</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{readyCount}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex border-b border-surface-border mb-6 overflow-x-auto no-scrollbar">
        {([
          { key: "all" as StatusFilter, label: "All Orders", count: orders.length },
          { key: "pending" as StatusFilter, label: "Pending", count: pendingCount },
          { key: "preparing" as StatusFilter, label: "Preparing", count: preparingCount },
          { key: "ready" as StatusFilter, label: "Ready", count: readyCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-px flex items-center gap-2 text-nowrap ${
              filter === tab.key ? "border-orange-400 text-orange-400" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 border ${filter === tab.key ? "border-orange-400/30 text-orange-400" : "border-surface-border text-muted"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-surface border border-surface-border p-12 text-center">
          <svg className="w-12 h-12 text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-muted text-sm">No orders found.</p>
          <p className="text-muted/60 text-xs mt-1">Orders will appear here when customers place them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const config = statusConfig[order.status];
            const isUpdating = updatingId === order._id;
            return (
              <div key={order._id} className={`border p-5 transition-all ${config.bg}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">T{order.tableNumber}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${config.badge}`}>
                      {config.label}
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
                      <span className="text-orange-400 font-semibold">×{item.quantity}</span>
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
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateStatus(order._id, "preparing")}
                      disabled={isUpdating}
                      className="flex-1 py-2 bg-blue-500 text-white text-xs font-semibold tracking-wider uppercase hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "▶ Start Preparing"}
                    </button>
                  )}
                  {order.status === "preparing" && (
                    <button
                      onClick={() => updateStatus(order._id, "ready")}
                      disabled={isUpdating}
                      className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "✓ Mark Ready"}
                    </button>
                  )}
                  {order.status === "ready" && (
                    <div className="flex-1 py-2 text-center text-xs text-green-400 font-semibold tracking-wider uppercase border border-green-400/30 bg-green-500/5">
                      ✓ Ready for Service
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
