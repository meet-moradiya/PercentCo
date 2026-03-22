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

interface CookAccount {
  _id: string;
  name: string;
  email: string;
  activeStation?: {
    _id: string;
    name: string;
  } | null;
}

export default function ChefDashboard() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTables: 0, totalPending: 0, totalPreparing: 0, totalReady: 0, criticalTables: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tables" | "stations" | "cooks">("tables");

  const [cooks, setCooks] = useState<CookAccount[]>([]);
  const [newCookName, setNewCookName] = useState("");
  const [newCookEmail, setNewCookEmail] = useState("");
  const [newCookPassword, setNewCookPassword] = useState("");
  const [creatingCook, setCreatingCook] = useState(false);

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

  const loadCooks = useCallback(async () => {
    try {
      const res = await fetch("/api/chef/cooks");
      const data = await res.json();
      if (data.cooks) setCooks(data.cooks);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (viewMode === "cooks") {
      loadCooks();
    }
  }, [viewMode, loadCooks]);

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

  // Cook Management handlers
  const handleCreateCook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCook(true);
    try {
      const res = await fetch("/api/chef/cooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCookName, email: newCookEmail, password: newCookPassword }),
      });
      if (res.ok) {
        setNewCookName("");
        setNewCookEmail("");
        setNewCookPassword("");
        loadCooks();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create cook account");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingCook(false);
    }
  };

  const handleDeleteCook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cook account?")) return;
    try {
       const res = await fetch(`/api/chef/cooks/${id}`, { method: "DELETE" });
       if (res.ok) {
         loadCooks();
       }
    } catch (error) {
       console.error(error);
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
          <p className="text-muted text-sm mt-1">Coordination & Kitchen Management</p>
        </div>
        <div className="flex gap-2 bg-surface p-1 border border-surface-border">
          <button
            onClick={() => setViewMode("tables")}
            className={`px-4 py-2 text-xs tracking-wider uppercase transition-all ${
              viewMode === "tables" ? "bg-gold text-white font-semibold shadow-md" : "text-muted hover:text-foreground hover:bg-surface-border/50"
            }`}
          >
            Tables
          </button>
          <button
            onClick={() => setViewMode("stations")}
            className={`px-4 py-2 text-xs tracking-wider uppercase transition-all ${
              viewMode === "stations" ? "bg-gold text-white font-semibold shadow-md" : "text-muted hover:text-foreground hover:bg-surface-border/50"
            }`}
          >
            Stations
          </button>
          <button
            onClick={() => setViewMode("cooks")}
            className={`px-4 py-2 text-xs tracking-wider uppercase transition-all ${
              viewMode === "cooks" ? "bg-gold text-white font-semibold shadow-md" : "text-muted hover:text-foreground hover:bg-surface-border/50"
            }`}
          >
            Cooks
          </button>
        </div>
      </div>

      {viewMode !== "cooks" && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Active Tables</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.activeTables}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.totalPending}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Cooking</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{stats.totalPreparing}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Ready</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.totalReady}</p>
          </div>
          <div className="bg-surface border border-surface-border p-4">
            <p className="text-muted text-xs tracking-wider uppercase">Urgent</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.criticalTables}</p>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "tables" && (
        <div className="space-y-3">
          {tables.length === 0 ? (
            <div className="bg-surface border border-surface-border p-12 text-center">
              <p className="text-muted text-lg">No active tables</p>
              <p className="text-muted/60 text-sm mt-1">Tables with orders will appear here automatically</p>
            </div>
          ) : (
             /* Code remains the same for table mapping */
            tables.map((table) => {
              const us = urgencyStyles[table.urgency];
              const isExpanded = expandedTable === table.tableNumber;
              const progress = table.totalItems > 0 ? Math.round((table.readyItems / table.totalItems) * 100) : 0;

              return (
                <div key={table.tableNumber} className={`${us.bg} border ${us.border} transition-all`}>
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
                      <div className="flex justify-end gap-2 mt-4">
                        {table.orders.map((order) => {
                           if (order.status === "ready" || order.status === "partially_ready") {
                             return (
                               <button
                                 key={order._id}
                                 onClick={() => markServed(order._id)}
                                 className="px-4 py-2 text-xs bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors tracking-wider uppercase font-semibold"
                               >
                                 🍽 Mark All Order Items Ready
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
                  high: "border-red-400/40 bg-red-500/5 text-red-400",
                  medium: "border-yellow-400/40 bg-yellow-500/5 text-yellow-500",
                  low: "border-green-400/40 bg-green-500/5 text-green-400",
                };
                return (
                  <div key={station.name} className={`border p-5 ${loadColors[loadLevel]} transition-all`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-foreground font-semibold text-lg">{station.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold ${loadColors[loadLevel]}`}>
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
                    <div className="mt-4 h-1.5 bg-surface-border rounded-full overflow-hidden flex">
                      <div className="bg-green-400" style={{ width: `${total ? (station.ready / total) * 100 : 0}%` }} />
                      <div className="bg-orange-400" style={{ width: `${total ? (station.cooking / total) * 100 : 0}%` }} />
                      <div className="bg-yellow-400" style={{ width: `${total ? (station.pending / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cooks Management View */}
      {viewMode === "cooks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-medium text-foreground mb-4">Active Cooks</h2>
             {cooks.length === 0 ? (
                <div className="bg-surface border border-surface-border p-8 text-center text-muted">
                    No cook accounts found.
                </div>
             ) : (
                <div className="space-y-3">
                  {cooks.map((cook) => (
                     <div key={cook._id} className="bg-surface border border-surface-border p-4 flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-medium">{cook.name}</p>
                          <p className="text-muted text-xs">{cook.email}</p>
                          <div className="mt-2 flex items-center gap-2">
                             <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Assigned Station:</span>
                             {cook.activeStation ? (
                               <span className="px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 text-[10px] uppercase tracking-wider font-bold">
                                  {cook.activeStation.name}
                               </span>
                             ) : (
                               <span className="text-xs text-muted/60">Not currently assigned</span>
                             )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCook(cook._id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 hover:border-red-400/30 border border-transparent transition-all rounded"
                          title="Delete Cook Account"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                     </div>
                  ))}
                </div>
             )}
          </div>
          
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Create New Cook</h2>
            <form onSubmit={handleCreateCook} className="bg-surface border border-surface-border p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Cook Name</label>
                <input
                  required
                  type="text"
                  value={newCookName}
                  onChange={(e) => setNewCookName(e.target.value)}
                  className="w-full bg-background border border-surface-border px-3 py-2 text-foreground focus:border-gold outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Email / Login ID</label>
                <input
                  required
                  type="email"
                  value={newCookEmail}
                  onChange={(e) => setNewCookEmail(e.target.value)}
                  className="w-full bg-background border border-surface-border px-3 py-2 text-foreground focus:border-gold outline-none"
                  placeholder="cook1@percentco.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={newCookPassword}
                  onChange={(e) => setNewCookPassword(e.target.value)}
                  className="w-full bg-background border border-surface-border px-3 py-2 text-foreground focus:border-gold outline-none"
                  placeholder="Enter temporary password"
                />
              </div>
              <button
                type="submit"
                disabled={creatingCook}
                className="w-full py-2 bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors tracking-wider uppercase font-semibold text-xs mt-2 disabled:opacity-50"
              >
                {creatingCook ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
