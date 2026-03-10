"use client";

import { useEffect, useState, useCallback } from "react";

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  tableNumber: number;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: string;
  notes: string;
  createdAt: string;
}

const statusFlow = ["pending", "preparing", "ready", "served"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);

  const loadOrders = useCallback(async () => {
    try {
      let url = "/api/orders?";
      if (filterStatus !== "all") url += `status=${filterStatus}&`;
      if (filterDate) url += `date=${filterDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDate]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadOrders();
    } catch {
      // silent
    }
  };

  const getNextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "preparing": return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "ready": return "text-green-400 bg-green-400/10 border-green-400/30";
      case "served": return "text-muted bg-muted/10 border-muted/30";
      case "cancelled": return "text-red-400 bg-red-400/10 border-red-400/30";
      default: return "text-muted bg-muted/10 border-muted/30";
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Stats
  const activeOrders = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status));
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const totalRevenue = orders.filter((o) => o.status === "served").reduce((s, o) => s + o.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-foreground font-semibold">Orders</h1>
        <p className="text-muted text-sm mt-1">Manage customer orders in real-time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-surface-border p-5">
          <p className="text-muted text-xs tracking-wider uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-5">
          <p className="text-muted text-xs tracking-wider uppercase">Preparing</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{preparingCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-5">
          <p className="text-muted text-xs tracking-wider uppercase">Ready</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{readyCount}</p>
        </div>
        <div className="bg-surface border border-surface-border p-5">
          <p className="text-muted text-xs tracking-wider uppercase">Revenue (Served)</p>
          <p className="text-2xl font-bold text-gold mt-1">₹{totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {["all", "pending", "preparing", "ready", "served", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 text-xs tracking-wider uppercase border transition-colors ${
              filterStatus === s
                ? "border-gold text-gold"
                : "border-surface-border text-muted hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {s}
          </button>
        ))}
        <div className="ml-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-background border border-surface-border px-3 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Active Orders — Kanban-style */}
      {filterStatus === "all" && activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-foreground font-medium mb-3">Active Orders</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              return (
                <div key={order._id} className="bg-surface border border-surface-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-bold">T{order.tableNumber}</span>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${statusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-muted text-xs">{formatTime(order.createdAt)}</span>
                  </div>
                  <p className="text-muted text-xs mb-2">{order.customerName}</p>
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-foreground/80">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-muted">₹{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-muted text-xs mb-3 italic">&quot;{order.notes}&quot;</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                    <span className="text-gold font-bold">₹{order.total.toFixed(0)}</span>
                    <div className="flex gap-2">
                      {nextStatus && (
                        <button
                          onClick={() => updateStatus(order._id, nextStatus)}
                          className="px-3 py-1 text-xs bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                        >
                          {nextStatus === "preparing"
                            ? "Start"
                            : nextStatus === "ready"
                              ? "Mark Ready"
                              : "Mark Served"}
                        </button>
                      )}
                      {order.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(order._id, "cancelled")}
                          className="px-3 py-1 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Orders Table */}
      <div className="bg-surface border border-surface-border">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-foreground font-medium">
            {filterStatus === "all" ? "All Orders" : `${filterStatus} Orders`}
            <span className="text-muted text-sm ml-2">({orders.length})</span>
          </h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-muted">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs tracking-wider uppercase">
                  <th className="text-left p-4">Table</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Items</th>
                  <th className="text-left p-4">Total</th>
                  <th className="text-left p-4">Time</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  return (
                    <tr key={order._id} className="border-b border-surface-border/50 hover:bg-surface-light/30">
                      <td className="p-4 text-foreground font-bold">T{order.tableNumber}</td>
                      <td className="p-4 text-foreground">{order.customerName}</td>
                      <td className="p-4 text-muted">
                        {order.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                      </td>
                      <td className="p-4 text-gold font-semibold">₹{order.total.toFixed(0)}</td>
                      <td className="p-4 text-muted">{formatTime(order.createdAt)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {nextStatus && (
                            <button
                              onClick={() => updateStatus(order._id, nextStatus)}
                              className="px-2 py-0.5 text-[10px] bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                            >
                              {nextStatus === "preparing"
                                ? "Start"
                                : nextStatus === "ready"
                                  ? "Ready"
                                  : "Served"}
                            </button>
                          )}
                          {!["served", "cancelled"].includes(order.status) && (
                            <button
                              onClick={() => updateStatus(order._id, "cancelled")}
                              className="px-2 py-0.5 text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
