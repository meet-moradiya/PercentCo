"use client";

import { useState, useEffect, useCallback } from "react";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Date Range" },
];

export default function CustomersPage() {
  const [filter, setFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [visitsFilter, setVisitsFilter] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ filter });
      if (filter === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, customFrom, customTo]);

  useEffect(() => {
    if (filter === "custom" && (!customFrom || !customTo)) return;
    fetchCustomers();
  }, [filter, customFrom, customTo, fetchCustomers]);

  const handleExport = (formatType: "csv" | "xlsx") => {
    const params = new URLSearchParams({ format: formatType, filter });
    if (filter === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    params.set("visits", visitsFilter);
    window.open(`/api/customers?${params}`, "_blank");
  };

  const displayedCustomers = customers.filter(c => {
    if (visitsFilter === "all") return true;
    if (visitsFilter === "8+") return c.visits >= 8;
    return c.visits === parseInt(visitsFilter);
  });

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div>
        <h1 className="text-2xl text-foreground font-semibold">Customers</h1>
        <p className="text-muted text-sm mt-1">Manage and export customer data and visit history.</p>
      </div>

      <div className="bg-surface border border-surface-border p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-all ${
                filter === s.value ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
          {filter === "custom" && (
            <div className="flex items-center gap-3 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-sm focus:border-gold outline-none"
              />
              <span className="text-muted text-sm tracking-widest uppercase">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-sm focus:border-gold outline-none"
              />
            </div>
          )}
          <select
            value={visitsFilter}
            onChange={(e) => setVisitsFilter(e.target.value)}
            className="ml-2 px-3 py-1.5 bg-surface border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
          >
            <option value="all">Visits: All</option>
            {["1", "2", "3", "4", "5", "6", "7", "8", "8+"].map(v => (
              <option key={v} value={v}>Visits: {v}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-3 self-start xl:self-auto">
          <button
            onClick={() => handleExport("csv")}
            disabled={filter === "custom" && (!customFrom || !customTo)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-border text-muted text-xs tracking-wider uppercase hover:text-gold hover:border-gold transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            disabled={filter === "custom" && (!customFrom || !customTo)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-border text-muted text-xs tracking-wider uppercase hover:text-green-400 hover:border-green-400 transition-colors disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-surface border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface-light/30">
                <th className="px-6 py-4 text-xs tracking-widest uppercase text-muted font-medium">Customer Name</th>
                <th className="px-6 py-4 text-xs tracking-widest uppercase text-muted font-medium">Contact Summary</th>
                <th className="px-6 py-4 text-xs tracking-widest uppercase text-muted font-medium">Total Visits</th>
                <th className="px-6 py-4 text-xs tracking-widest uppercase text-muted font-medium">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted">
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted">
                    No customers found for this period.
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-surface-light/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground capitalize">{c.name || "Walk-In Customer"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">{c.phone}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{c.visits}</td>
                    <td className="px-6 py-4 text-sm text-foreground">₹{c.totalSpent.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
