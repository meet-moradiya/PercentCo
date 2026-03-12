"use client";

import { useEffect, useState, useCallback } from "react";

interface TableInfo {
  number: number;
  capacity: number;
  isActive: boolean;
  status: "available" | "reserved" | "occupied" | "pending";
  reservation?: { name: string; time: string; guests: number };
  nextBooking?: { name: string; time: string; guests: number; minutesUntil: number };
  orderCode?: string;
}

interface Stats {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  seatedReservations: number;
  completedToday: number;
  noShowToday: number;
  cancelledToday: number;
  todayReservations: number;
  totalMenuItems: number;
  totalTables: number;
  activeTables: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [floorTables, setFloorTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Walk-in state
  const [showWalkin, setShowWalkin] = useState(false);
  const [walkinFirstName, setWalkinFirstName] = useState("");
  const [walkinLastName, setWalkinLastName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinEmail, setWalkinEmail] = useState("");
  const [walkinGuests, setWalkinGuests] = useState(2);
  const [walkinTable, setWalkinTable] = useState<number | null>(null);
  const [walkinSaving, setWalkinSaving] = useState(false);
  const [walkinError, setWalkinError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      const [resRes, menuRes, settingsRes, codesRes] = await Promise.all([
        fetch("/api/reservations?limit=100"),
        fetch("/api/menu"),
        fetch("/api/settings"),
        fetch("/api/table-codes"),
      ]);

      const resData = await resRes.json();
      const menuData = await menuRes.json();
      const settingsData = await settingsRes.json();
      const codesData = (await codesRes.ok) ? await codesRes.json() : { codes: [] };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reservations: any[] = resData.reservations || [];
      const settings = settingsData.settings;
      const tables = settings?.tables || [];
      const slotDuration: number = settings?.slotDuration || 90;
      const BUFFER = 15;

      // Parse time helper (12h -> minutes)
      const parseTime = (ts: string): number => {
        const match = ts.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return 0;
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const p = match[3].toUpperCase();
        if (p === "PM" && h !== 12) h += 12;
        if (p === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const todayRes = reservations.filter((r: any) => r.date === today);

      setStats({
        totalReservations: resData.pagination?.total || reservations.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingReservations: reservations.filter((r: any) => r.status === "pending").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        confirmedReservations: reservations.filter((r: any) => r.status === "confirmed").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seatedReservations: reservations.filter((r: any) => r.status === "seated").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        completedToday: todayRes.filter((r: any) => r.status === "completed").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        noShowToday: todayRes.filter((r: any) => r.status === "no-show").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cancelledToday: todayRes.filter((r: any) => r.status === "cancelled").length,
        todayReservations: todayRes.length,
        totalMenuItems: menuData.items?.length || 0,
        totalTables: tables.length,
        activeTables: tables.filter((t: { isActive: boolean }) => t.isActive).length,
      });

      // Build time-aware floor plan
      const floor: TableInfo[] = tables
        .filter((t: { isActive: boolean }) => t.isActive)
        .map((t: { number: number; capacity: number; isActive: boolean }) => {
          // Find all active reservations for this table today
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tableRes = todayRes.filter((r: any) => r.tableNumber === t.number && ["confirmed", "seated", "pending"].includes(r.status));

          // Check if anyone is currently seated
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const seatedRes = tableRes.find((r: any) => r.status === "seated");
          if (seatedRes) {
            // Find OTP code for this table
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tableCode = (codesData.codes || []).find((c: any) => c.tableNumber === t.number);
            return {
              ...t,
              status: "occupied" as const,
              reservation: { name: seatedRes.name, time: seatedRes.time, guests: seatedRes.guests },
              orderCode: tableCode?.code,
            };
          }

          // Check if any booking is currently active (now is within its window)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeBooking = tableRes.find((r: any) => {
            const rMin = parseTime(r.time);
            const windowStart = rMin - BUFFER;
            const windowEnd = rMin + slotDuration;
            return nowMin >= windowStart && nowMin < windowEnd;
          });

          if (activeBooking) {
            const st: TableInfo["status"] = activeBooking.status === "confirmed" ? "reserved" : "pending";
            return {
              ...t,
              status: st,
              reservation: { name: activeBooking.name, time: activeBooking.time, guests: activeBooking.guests },
            };
          }

          // Table is currently available — find the next upcoming booking
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const futureBookings = tableRes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((r: any) => parseTime(r.time) > nowMin)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => parseTime(a.time) - parseTime(b.time));

          const nextBooking =
            futureBookings.length > 0
              ? {
                  name: futureBookings[0].name,
                  time: futureBookings[0].time,
                  guests: futureBookings[0].guests,
                  minutesUntil: parseTime(futureBookings[0].time) - nowMin,
                }
              : undefined;

          return {
            ...t,
            status: "available" as const,
            nextBooking,
          };
        });

      setFloorTables(floor);
      setRecentBookings(reservations.slice(0, 5));
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      case "seated":
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "completed":
        return "text-muted bg-muted/10 border-muted/30";
      case "no-show":
        return "text-orange-400 bg-orange-400/10 border-orange-400/30";
      case "cancelled":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      default:
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    }
  };

  const floorColor = (status: TableInfo["status"]) => {
    switch (status) {
      case "available":
        return "border-green-500/40 bg-green-500/5";
      case "reserved":
        return "border-gold/60 bg-gold/10";
      case "occupied":
        return "border-blue-400/60 bg-blue-400/10";
      case "pending":
        return "border-yellow-400/60 bg-yellow-400/10";
    }
  };

  const floorDot = (status: TableInfo["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-400";
      case "reserved":
        return "bg-gold";
      case "occupied":
        return "bg-blue-400";
      case "pending":
        return "bg-yellow-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openWalkin = () => {
    setShowWalkin(true);
    setWalkinFirstName("");
    setWalkinLastName("");
    setWalkinPhone("");
    setWalkinEmail("");
    setWalkinGuests(2);
    setWalkinTable(null);
    setWalkinError("");
  };

  const handleWalkin = async () => {
    if (walkinTable === null) return;
    setWalkinSaving(true);
    setWalkinError("");
    try {
      const res = await fetch("/api/reservations/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: walkinFirstName || "Walk-in",
          lastName: walkinLastName || "Guest",
          phone: walkinPhone,
          email: walkinEmail,
          guests: walkinGuests,
          tableNumber: walkinTable,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setWalkinError(data.error || "Failed to seat walk-in");
        return;
      }
      setShowWalkin(false);
      loadData();
    } catch {
      setWalkinError("Network error");
    } finally {
      setWalkinSaving(false);
    }
  };

  // Available tables for walk-in (only "available" ones from floor)
  const availableForWalkin = floorTables.filter((t) => t.status === "available");

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Real-time overview of your restaurant operations</p>
        </div>
        <button
          onClick={openWalkin}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
            />
          </svg>
          Seat Walk-in
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Bookings", value: stats?.todayReservations || 0, color: "text-gold" },
          { label: "Currently Seated", value: stats?.seatedReservations || 0, color: "text-blue-400" },
          { label: "Pending Approval", value: stats?.pendingReservations || 0, color: "text-yellow-400" },
          { label: "Active Tables", value: `${stats?.activeTables || 0}/${stats?.totalTables || 0}`, color: "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-surface-border p-6 transition-colors duration-300">
            <p className="text-muted text-sm tracking-wider uppercase">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Confirmed", value: stats?.confirmedReservations || 0, color: "text-green-400" },
          { label: "Completed Today", value: stats?.completedToday || 0, color: "text-muted" },
          { label: "No-Shows Today", value: stats?.noShowToday || 0, color: "text-orange-400" },
          { label: "Menu Items", value: stats?.totalMenuItems || 0, color: "text-gold" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-surface-border p-4 transition-colors duration-300">
            <p className="text-muted text-xs tracking-wider uppercase">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Live Floor View */}
      <div className="bg-surface border border-surface-border mb-8 transition-colors duration-300">
        <div className="px-6 py-4 border-b border-surface-border flex gap-6 flex-col md:flex-row items-center justify-between">
          <h2 className="text-foreground font-medium">Today&apos;s Table Floor</h2>
          <div className="flex items-center flex-wrap justify-center gap-4 text-xs">
            {[
              { label: "Available", color: "bg-green-400" },
              { label: "Reserved", color: "bg-gold" },
              { label: "Occupied", color: "bg-blue-400" },
              { label: "Pending", color: "bg-yellow-400" },
            ].map((legend) => (
              <span key={legend.label} className="flex items-center gap-1.5 text-muted">
                <span className={`w-2 h-2 rounded-full ${legend.color}`} />
                {legend.label}
              </span>
            ))}
          </div>
        </div>
        {floorTables.length === 0 ? (
          <div className="p-8 text-center text-muted">No tables configured. Go to Settings to add tables.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
            {floorTables.map((table) => (
              <div key={table.number} className={`border rounded p-3 text-center transition-all ${floorColor(table.status)}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${floorDot(table.status)}`} />
                  <span className="text-foreground font-bold text-sm">T{table.number}</span>
                </div>
                <p className="text-muted text-[10px]">{table.capacity} seats</p>
                {table.reservation && (
                  <div className="mt-2 border-t border-surface-border pt-2">
                    <p className="text-foreground text-xs truncate">{table.reservation.name}</p>
                    <p className="text-muted text-[10px]">
                      {table.reservation.time} · {table.reservation.guests}p
                    </p>
                  </div>
                )}
                {table.status === "occupied" && table.orderCode && (
                  <div className="mt-1.5 bg-gold/10 border border-gold/20 rounded px-2 py-1">
                    <p className="text-gold/70 text-[8px] uppercase tracking-wider">OTP Code</p>
                    <p className="text-gold font-bold text-sm tracking-widest">{table.orderCode}</p>
                  </div>
                )}
                {table.status === "available" && table.nextBooking && (
                  <div className="mt-2 border-t border-surface-border pt-2">
                    <p className="text-gold/70 text-[9px] uppercase tracking-wider">Next</p>
                    <p className="text-foreground/60 text-[10px] truncate">{table.nextBooking.name}</p>
                    <p className="text-muted text-[9px]">
                      {table.nextBooking.time}
                      {table.nextBooking.minutesUntil <= 30 && <span className="text-orange-400 ml-1">({table.nextBooking.minutesUntil}m)</span>}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="bg-surface border border-surface-border transition-colors duration-300">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="text-foreground font-medium">Recent Bookings</h2>
        </div>
        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-muted">No reservations yet.</div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentBookings.map((booking) => (
              <div key={booking._id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">{booking.name}</p>
                  <p className="text-muted text-sm">
                    {booking.date} at {booking.time} · {booking.guests} guests
                    {booking.tableNumber && <span className="text-gold"> · T{booking.tableNumber}</span>}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs uppercase tracking-wider border ${statusColor(booking.status)}`}>{booking.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Walk-in Modal */}
      {showWalkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-lg">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium text-lg">Seat Walk-in Customer</h2>
              <button onClick={() => setShowWalkin(false)} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {walkinError && <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">{walkinError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={walkinFirstName}
                    onChange={(e) => setWalkinFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={walkinLastName}
                    onChange={(e) => setWalkinLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={walkinEmail}
                    onChange={(e) => setWalkinEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Phone *</label>
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Number of Guests *</label>
                  <select
                    value={walkinGuests}
                    onChange={(e) => {
                      setWalkinGuests(Number(e.target.value));
                      setWalkinTable(null);
                    }}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Guest" : "Guests"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Select Table *</label>
                {availableForWalkin.length === 0 ? (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">No tables available right now.</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableForWalkin
                      .filter((t) => t.capacity >= walkinGuests)
                      .map((t) => (
                        <button
                          key={t.number}
                          onClick={() => setWalkinTable(t.number)}
                          className={`p-3 border text-center transition-all ${
                            walkinTable === t.number
                              ? "border-gold bg-gold/10 text-gold"
                              : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
                          }`}
                        >
                          <p className="font-bold">T{t.number}</p>
                          <p className="text-[10px] mt-0.5">{t.capacity} seats</p>
                          {t.nextBooking && (
                            <p className={`text-[9px] mt-1 ${t.nextBooking.minutesUntil <= 30 ? "text-orange-400" : "text-muted/60"}`}>
                              Next: {t.nextBooking.time}
                            </p>
                          )}
                        </button>
                      ))}
                    {availableForWalkin.filter((t) => t.capacity >= walkinGuests).length === 0 && (
                      <p className="col-span-4 text-muted text-sm text-center py-3">No tables fit {walkinGuests} guests. Try fewer guests.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button
                onClick={() => setShowWalkin(false)}
                className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWalkin}
                disabled={walkinTable === null || walkinSaving}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {walkinSaving ? "Seating..." : "Seat Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
