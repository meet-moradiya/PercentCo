"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface StationInfo {
  _id: string;
  name: string;
  slug: string;
  servePhase: number;
  cookCount: number;
  cookNames: string[];
}

interface QueueItem {
  _itemIndex: number;
  menuItemId: string;
  name: string;
  quantity: number;
  isJain: boolean;
  stationName: string;
  stationSlug: string;
  servePhase: number;
  itemStatus: string;
  startedAt: string | null;
  readyAt: string | null;
  preparedBy: string | null;
  preCookable: boolean;
}

interface QueueOrder {
  _id: string;
  tableNumber: number;
  customerName: string;
  notes: string;
  createdAt: string;
  status: string;
  items: QueueItem[];
}

export default function CookQueue() {
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const prevItemCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load available stations and current user's active station on mount
  const loadStations = useCallback(async () => {
    try {
      const res = await fetch("/api/chef/stations");
      const data = await res.json();
      if (data.stations) setStations(data.stations);
      
      // We can also fetch the current user to get their activeStation
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.admin && userData.admin.activeStation) {
           setSelectedStation(userData.admin.activeStation);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load orders for selected station
  const loadOrders = useCallback(async () => {
    if (!selectedStation) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const station = stations.find((s) => s._id === selectedStation);
      if (!station) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/chef/orders?station=${station.slug}`);
      const data = await res.json();
      
      const allOrders: QueueOrder[] = data.orders || [];

      // Sort orders by creation time (oldest first)
      allOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Check for new pending items and play sound
      const totalItems = allOrders.reduce((s, o) => s + o.items.filter((i) => i.itemStatus === "pending").length, 0);
      if (totalItems > prevItemCountRef.current && prevItemCountRef.current > 0) {
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Dg3x0bXV8goeEe3JodHyCh4V+dG1zeIGGhH1zbXR5gYaFfXNtdHmBhoV9c210eYGGhX1zbXR5gYaFfXNtdHmBhoV9c210eQ==");
          }
          audioRef.current.play().catch(() => {});
        } catch { /* audio not available */ }
      }
      prevItemCountRef.current = totalItems;

      setOrders(allOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedStation, stations]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Select station and save to server
  const handleStationSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stationId = e.target.value;
    setSelectedStation(stationId);
    try {
      await fetch("/api/cook/station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });
      // Orders will reload automatically via loadOrders effect
    } catch (e) {
      console.error(e);
    }
  };

  // Update item status
  const updateItemStatus = async (orderId: string, itemIndex: number, status: string) => {
    const key = `${orderId}-${itemIndex}`;
    setUpdatingItem(key);
    try {
      await fetch("/api/chef/orders/item-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, itemIndex, status }),
      });
      loadOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingItem(null);
    }
  };

  // Time elapsed formatting
  const getTimeElapsed = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  // Urgency color based on age
  const getUrgencyColor = (dateStr: string) => {
    const mins = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (mins > 30) return "border-l-red-500 bg-red-500/5";
    if (mins > 20) return "border-l-orange-500 bg-orange-500/5";
    if (mins > 10) return "border-l-yellow-500 bg-yellow-500/5";
    return "border-l-green-500 bg-green-500/5";
  };

  // Separate items into categories
  const pendingItems: { order: QueueOrder; item: QueueItem }[] = [];
  const cookingItems: { order: QueueOrder; item: QueueItem }[] = [];
  const readyItems: { order: QueueOrder; item: QueueItem }[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (item.itemStatus === "pending") pendingItems.push({ order, item });
      else if (item.itemStatus === "preparing") cookingItems.push({ order, item });
      else if (item.itemStatus === "ready") readyItems.push({ order, item });
    }
  }

  return (
    <div>
      {/* Header with Native Select Dropdown */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Cook Station Queue</h1>
          <p className="text-muted text-sm mt-1">Select your station to view incoming orders</p>
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-muted text-xs mb-1.5 tracking-wider uppercase">Active Station</label>
          <select
            value={selectedStation}
            onChange={handleStationSelect}
            className="w-full bg-surface border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
          >
            <option value="">-- Select Station --</option>
            {stations.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} (Phase {s.servePhase})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats bar */}
      {selectedStation && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingItems.length}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Cooking</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{cookingItems.length}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Ready</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{readyItems.length}</p>
          </div>
        </div>
      )}

      {/* No station selected */}
      {!selectedStation && (
        <div className="bg-surface border border-surface-border p-12 text-center">
          <svg className="w-16 h-16 text-muted/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
          <p className="text-foreground text-lg font-medium mb-2">No Station Selected</p>
          <p className="text-muted text-sm mb-4">Please select a kitchen station from the dropdown above to view orders.</p>
        </div>
      )}

      {/* Loading */}
      {loading && selectedStation && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Queue */}
      {!loading && selectedStation && (
        <div className="space-y-6">
          {/* Pending Items — Main focus */}
          {pendingItems.length > 0 && (
            <div>
              <h2 className="text-foreground font-medium mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                Pending ({pendingItems.length})
              </h2>
              <div className="space-y-2">
                {pendingItems.map(({ order, item }) => (
                  <div
                    key={`${order._id}-${item._itemIndex}`}
                    className={`bg-surface border border-surface-border border-l-4 ${getUrgencyColor(order.createdAt)} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gold font-bold">T{order.tableNumber}</span>
                        <span className="text-foreground font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="px-1.5 py-0.5 text-xs bg-gold/20 text-gold border border-gold/30 font-bold">×{item.quantity}</span>
                        )}
                        {item.isJain && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 uppercase tracking-wider">Jain</span>
                        )}
                        {item.preCookable && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-400/30 uppercase tracking-wider" title="Usually in stock — click Ready if available">💡 Pre-cookable</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span>{getTimeElapsed(order.createdAt)} ago</span>
                        {order.notes && <span className="text-blue-400">📝 {order.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateItemStatus(order._id, item._itemIndex, "preparing")}
                        disabled={updatingItem === `${order._id}-${item._itemIndex}`}
                        className="px-4 py-2 text-xs bg-orange-500/15 text-orange-400 border border-orange-400/30 hover:bg-orange-500/25 transition-colors tracking-wider uppercase font-semibold disabled:opacity-50"
                      >
                        ▶ Start Cooking
                      </button>
                      <button
                        onClick={() => updateItemStatus(order._id, item._itemIndex, "ready")}
                        disabled={updatingItem === `${order._id}-${item._itemIndex}`}
                        className="px-4 py-2 text-xs bg-green-500/15 text-green-400 border border-green-400/30 hover:bg-green-500/25 transition-colors tracking-wider uppercase font-semibold disabled:opacity-50"
                      >
                        ✓ Ready
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cooking Items */}
          {cookingItems.length > 0 && (
            <div>
              <h2 className="text-foreground font-medium mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                Cooking ({cookingItems.length})
              </h2>
              <div className="space-y-2">
                {cookingItems.map(({ order, item }) => (
                  <div
                    key={`${order._id}-${item._itemIndex}`}
                    className="bg-surface border border-surface-border border-l-4 border-l-orange-500 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gold font-bold">T{order.tableNumber}</span>
                        <span className="text-foreground font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="px-1.5 py-0.5 text-xs bg-gold/20 text-gold border border-gold/30 font-bold">×{item.quantity}</span>
                        )}
                        {item.isJain && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 uppercase tracking-wider">Jain</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="text-orange-400">⏱ Cooking for {item.startedAt ? getTimeElapsed(item.startedAt) : "..."}</span>
                        {item.preparedBy && <span>by {item.preparedBy}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => updateItemStatus(order._id, item._itemIndex, "ready")}
                      disabled={updatingItem === `${order._id}-${item._itemIndex}`}
                      className="px-5 py-2 text-xs bg-green-500/15 text-green-400 border border-green-400/30 hover:bg-green-500/25 transition-colors tracking-wider uppercase font-semibold disabled:opacity-50"
                    >
                      ✓ Mark Ready
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready Items (collapsed) */}
          {readyItems.length > 0 && (
            <div>
              <h2 className="text-foreground font-medium mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                Ready ({readyItems.length})
              </h2>
              <div className="space-y-1">
                {readyItems.map(({ order, item }) => (
                  <div
                    key={`${order._id}-${item._itemIndex}`}
                    className="bg-surface border border-surface-border border-l-4 border-l-green-500 px-4 py-2.5 flex items-center justify-between opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gold font-bold text-sm">T{order.tableNumber}</span>
                      <span className="text-foreground text-sm">{item.name}</span>
                      {item.quantity > 1 && <span className="text-xs text-gold">×{item.quantity}</span>}
                    </div>
                    <span className="text-green-400 text-xs">✓ Ready</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {pendingItems.length === 0 && cookingItems.length === 0 && readyItems.length === 0 && (
            <div className="bg-surface border border-surface-border p-12 text-center">
              <p className="text-muted text-lg">No active orders for your station</p>
              <p className="text-muted/60 text-sm mt-1">New orders will appear here automatically</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
