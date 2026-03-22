"use client";

import { useEffect, useState, useCallback } from "react";

interface TableItem {
  name: string;
  quantity: number;
  stationName: string;
  servePhase: number;
  itemStatus: string;
  isJain: boolean;
}

interface TableOrder {
  _id: string;
  customerName: string;
  status: string;
  createdAt: string;
  notes: string;
  items: TableItem[];
}

interface ServeGroup {
  phase: number;
  phaseLabel: string;
  items: { name: string; quantity: number; itemStatus: string; stationName: string }[];
  allReady: boolean;
  canServe: boolean;
}

interface TableData {
  tableNumber: number;
  orders: TableOrder[];
  totalItems: number;
  readyItems: number;
  preparingItems: number;
  pendingItems: number;
  urgency: "critical" | "attention" | "on-track";
  oldestOrderTime: string;
  serveGroups: ServeGroup[];
}

interface Stats {
  activeTables: number;
  totalPending: number;
  totalPreparing: number;
  totalReady: number;
  criticalTables: number;
}

export default function ChefDashboard() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTables: 0, totalPending: 0, totalPreparing: 0, totalReady: 0, criticalTables: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tables" | "stations">("tables");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/chef/table-tracker");
      const data = await res.json();
      if (data.tables) setTables(data.tables);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getTimeElapsed = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "< 1m";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const urgencyStyles: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    critical: { bg: "bg-red-500/5", border: "border-red-500/40", badge: "bg-red-500 text-white", text: "URGENT" },
    attention: { bg: "bg-yellow-500/5", border: "border-yellow-500/40", badge: "bg-yellow-500 text-background", text: "ATTENTION" },
    "on-track": { bg: "bg-green-500/5", border: "border-green-500/40", badge: "bg-green-500/20 text-green-400", text: "ON TRACK" },
  };

  // Station-level overview
  const stationMap = new Map<string, { name: string; pending: number; cooking: number; ready: number }>();
  for (const table of tables) {
    for (const order of table.orders) {
      for (const item of order.items) {
        const sName = item.stationName || "Unassigned";
        if (!stationMap.has(sName)) stationMap.set(sName, { name: sName, pending: 0, cooking: 0, ready: 0 });
        const s = stationMap.get(sName)!;
        if (item.itemStatus === "pending") s.pending += item.quantity;
        else if (item.itemStatus === "preparing") s.cooking += item.quantity;
        else if (item.itemStatus === "ready") s.ready += item.quantity;
      }
    }
  }
  const stationStats = Array.from(stationMap.values()).sort((a, b) => (b.pending + b.cooking) - (a.pending + a.cooking));

  // Mark order as served
  const markServed = async (orderId: string) => {
    try {
      await fetch("/api/chef/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "ready" }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Chef Dashboard</h1>
          <p className="text-muted text-sm mt-1">Table tracker & station overview for serving coordination</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("tables")}
            className={`px-4 py-2 text-xs tracking-wider uppercase border transition-all ${
              viewMode === "tables" ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:text-foreground"
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setViewMode("stations")}
            className={`px-4 py-2 text-xs tracking-wider uppercase border transition-all ${
              viewMode === "stations" ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:text-foreground"
            }`}
          >
            Stations
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Active Tables</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.activeTables}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Pending Items</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.totalPending}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Preparing</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{stats.totalPreparing}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Ready</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.totalReady}</p>
        </div>
        <div className="bg-surface border border-surface-border p-4">
          <p className="text-muted text-xs tracking-wider uppercase">Critical</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.criticalTables}</p>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "tables" && (
        <div className="space-y-3">
          {tables.length === 0 ? (
            <div className="bg-surface border border-surface-border p-12 text-center">
              <p className="text-muted text-lg">No active tables</p>
              <p className="text-muted/60 text-sm mt-1">Tables with orders will appear here automatically</p>
            </div>
          ) : (
            tables.map((table) => {
              const us = urgencyStyles[table.urgency];
              const isExpanded = expandedTable === table.tableNumber;
              const progress = table.totalItems > 0 ? Math.round((table.readyItems / table.totalItems) * 100) : 0;

              return (
                <div key={table.tableNumber} className={`${us.bg} border ${us.border} transition-all`}>
                  {/* Table header */}
                  <button
                    onClick={() => setExpandedTable(isExpanded ? null : table.tableNumber)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-gold text-xl font-bold">T{table.tableNumber}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${us.badge}`}>{us.text}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-medium">
                            {table.orders.map(o => o.customerName).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                          </span>
                          <span className="text-muted text-xs">· {getTimeElapsed(table.oldestOrderTime)} ago</span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-32 h-1.5 bg-surface-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted">{table.readyItems}/{table.totalItems} ready</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-muted">
                        <span className="text-yellow-400">{table.pendingItems}P</span>
                        {" · "}
                        <span className="text-orange-400">{table.preparingItems}C</span>
                        {" · "}
                        <span className="text-green-400">{table.readyItems}R</span>
                      </div>
                      <svg className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded content — Serve Groups */}
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 border-t border-surface-border/50 pt-3">
                      {table.serveGroups.map((group) => {
                        const phaseColors: Record<number, string> = {
                          1: "border-green-400/30 bg-green-500/5",
                          2: "border-blue-400/30 bg-blue-500/5",
                          3: "border-purple-400/30 bg-purple-500/5",
                        };
                        return (
                          <div key={group.phase} className={`border p-3 ${phaseColors[group.phase] || "border-surface-border"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-foreground text-sm font-medium">{group.phaseLabel}</span>
                              <div className="flex items-center gap-2">
                                {group.allReady && (
                                  <span className="px-2 py-0.5 text-[10px] bg-green-500/20 text-green-400 border border-green-400/30 uppercase tracking-wider font-semibold">
                                    All Ready
                                  </span>
                                )}
                                {group.canServe && (
                                  <span className="px-2 py-0.5 text-[10px] bg-gold/20 text-gold border border-gold/30 uppercase tracking-wider font-semibold animate-pulse">
                                    🍽 Can Serve
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {group.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      item.itemStatus === "ready" ? "bg-green-400" :
                                      item.itemStatus === "preparing" ? "bg-orange-400 animate-pulse" :
                                      "bg-yellow-400"
                                    }`} />
                                    <span className="text-foreground">{item.name}</span>
                                    {item.quantity > 1 && <span className="text-xs text-gold">×{item.quantity}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.stationName && (
                                      <span className="text-[10px] text-muted uppercase tracking-wider">{item.stationName}</span>
                                    )}
                                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                                      item.itemStatus === "ready" ? "text-green-400" :
                                      item.itemStatus === "preparing" ? "text-orange-400" :
                                      "text-yellow-400"
                                    }`}>
                                      {item.itemStatus}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {/* Order-level actions */}
                      <div className="flex justify-end gap-2">
                        {table.orders.map((order) => {
                          if (order.status === "ready" || order.status === "partially_ready") {
                            return (
                              <button
                                key={order._id}
                                onClick={() => markServed(order._id)}
                                className="px-4 py-2 text-xs bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors tracking-wider uppercase font-semibold"
                              >
                                🍽 Mark All Ready
                              </button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Station Overview */}
      {viewMode === "stations" && (
        <div className="space-y-4">
          {stationStats.length === 0 ? (
            <div className="bg-surface border border-surface-border p-12 text-center">
              <p className="text-muted text-lg">No station data</p>
              <p className="text-muted/60 text-sm mt-1">Station load will appear when orders come in</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stationStats.map((station) => {
                const total = station.pending + station.cooking + station.ready;
                const load = station.pending + station.cooking;
                const loadLevel = load > 10 ? "high" : load > 5 ? "medium" : "low";
                const loadColors = {
                  high: "border-red-400/40 bg-red-500/5",
                  medium: "border-yellow-400/40 bg-yellow-500/5",
                  low: "border-green-400/40 bg-green-500/5",
                };
                return (
                  <div key={station.name} className={`border p-5 ${loadColors[loadLevel]} transition-all`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-foreground font-semibold text-lg">{station.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold ${
                        loadLevel === "high" ? "text-red-400 bg-red-500/20 border border-red-400/30" :
                        loadLevel === "medium" ? "text-yellow-400 bg-yellow-500/20 border border-yellow-400/30" :
                        "text-green-400 bg-green-500/20 border border-green-400/30"
                      }`}>
                        {loadLevel} load
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-xl font-bold text-yellow-400">{station.pending}</p>
                        <p className="text-[10px] text-muted uppercase tracking-wider">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-orange-400">{station.cooking}</p>
                        <p className="text-[10px] text-muted uppercase tracking-wider">Cooking</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-400">{station.ready}</p>
                        <p className="text-[10px] text-muted uppercase tracking-wider">Ready</p>
                      </div>
                    </div>
                    {/* Load bar */}
                    <div className="mt-3 h-2 bg-surface-border rounded-full overflow-hidden">
                      {total > 0 && (
                        <div className="h-full flex">
                          <div className="bg-green-400" style={{ width: `${(station.ready / total) * 100}%` }} />
                          <div className="bg-orange-400" style={{ width: `${(station.cooking / total) * 100}%` }} />
                          <div className="bg-yellow-400" style={{ width: `${(station.pending / total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
