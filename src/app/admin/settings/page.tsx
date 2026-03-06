"use client";

import { useEffect, useState, useCallback } from "react";

interface TableConfig {
  number: number;
  capacity: number;
  isActive: boolean;
}
interface ClosedDate {
  date: string;
  reason: string;
}
interface EventPromo {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  discount: string;
  badgeColor: string;
  isActive: boolean;
}

type SettingsTab = "hours" | "tables" | "closures" | "events";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("hours");
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [slotDuration, setSlotDuration] = useState(90);
  const [openTime, setOpenTime] = useState("18:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [slotInterval, setSlotInterval] = useState(30);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [events, setEvents] = useState<EventPromo[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedReason, setNewClosedReason] = useState("Holiday");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const [addCapacity, setAddCapacity] = useState(4);
  // Event form
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    discount: "",
    badgeColor: "gold",
    isActive: true,
  });

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.settings) {
        setTables(data.settings.tables || []);
        setSlotDuration(data.settings.slotDuration || 90);
        setOpenTime(data.settings.openTime || "18:00");
        setCloseTime(data.settings.closeTime || "22:00");
        setSlotInterval(data.settings.slotInterval || 30);
        setClosedDates(data.settings.closedDates || []);
        setEvents(data.settings.events || []);
      }
    } catch (error) {
      console.error("Load settings error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalTables: tables.length, tables, slotDuration, openTime, closeTime, slotInterval, closedDates, events }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Table helpers
  const addTables = () => {
    const maxNum = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) : 0;
    const nt: TableConfig[] = [];
    for (let i = 0; i < addCount; i++) nt.push({ number: maxNum + i + 1, capacity: addCapacity, isActive: true });
    setTables([...tables, ...nt]);
  };
  const removeTable = (num: number) => setTables(tables.filter((t) => t.number !== num));
  const toggleTable = (num: number) => setTables(tables.map((t) => (t.number === num ? { ...t, isActive: !t.isActive } : t)));
  const updateCapacity = (num: number, cap: number) => setTables(tables.map((t) => (t.number === num ? { ...t, capacity: Math.max(1, cap) } : t)));

  // Closure helpers
  const addClosedDate = () => {
    if (!newClosedDate || closedDates.some((c) => c.date === newClosedDate)) return;
    setClosedDates([...closedDates, { date: newClosedDate, reason: newClosedReason || "Holiday" }]);
    setNewClosedDate("");
    setNewClosedReason("Holiday");
  };
  const removeClosedDate = (date: string) => setClosedDates(closedDates.filter((c) => c.date !== date));

  // Event helpers
  const openEventCreate = () => {
    setEditingEventId(null);
    setEventForm({ title: "", description: "", startDate: "", endDate: "", discount: "", badgeColor: "gold", isActive: true });
    setShowEventModal(true);
  };
  const openEventEdit = (ev: EventPromo) => {
    setEditingEventId(ev.id);
    setEventForm({
      title: ev.title,
      description: ev.description,
      startDate: ev.startDate,
      endDate: ev.endDate,
      discount: ev.discount,
      badgeColor: ev.badgeColor,
      isActive: ev.isActive,
    });
    setShowEventModal(true);
  };
  const saveEvent = () => {
    if (!eventForm.title || !eventForm.startDate || !eventForm.endDate) return;
    if (editingEventId) {
      setEvents(events.map((e) => (e.id === editingEventId ? { ...eventForm, id: editingEventId } : e)));
    } else {
      setEvents([...events, { ...eventForm, id: Date.now().toString() }]);
    }
    setShowEventModal(false);
  };
  const deleteEvent = (id: string) => setEvents(events.filter((e) => e.id !== id));
  const toggleEvent = (id: string) => setEvents(events.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e)));

  // Utilities
  const formatDate = (ds: string) => {
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, "0");
    const label = i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
    return { value: `${h}:00`, label };
  });
  const generatePreviewSlots = () => {
    const slots: string[] = [];
    const [oh, om] = openTime.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    for (let m = openMin; m <= closeMin; m += slotInterval) {
      const h24 = Math.floor(m / 60);
      const mins = m % 60;
      const ampm = h24 >= 12 ? "PM" : "AM";
      const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
      slots.push(`${h12}:${mins.toString().padStart(2, "0")} ${ampm}`);
    }
    return slots;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const activeTables = tables.filter((t) => t.isActive);
  const totalCapacity = activeTables.reduce((s, t) => s + t.capacity, 0);
  const previewSlots = generatePreviewSlots();
  const today = new Date().toISOString().split("T")[0];
  const upcomingClosures = closedDates.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastClosures = closedDates.filter((c) => c.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const badgeColors = [
    { key: "gold", label: "Gold", cls: "bg-gold/20 text-gold border-gold/30" },
    { key: "red", label: "Red", cls: "bg-red-500/20 text-red-400 border-red-400/30" },
    { key: "green", label: "Green", cls: "bg-green-500/20 text-green-400 border-green-400/30" },
    { key: "blue", label: "Blue", cls: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
    { key: "purple", label: "Purple", cls: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
  ];
  const getBadgeCls = (c: string) => badgeColors.find((b) => b.key === c)?.cls || badgeColors[0].cls;

  const tabIcons: Record<SettingsTab, React.ReactNode> = {
    hours: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
    tables: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v1.5H3.75V6zM5.25 7.5V18a2.25 2.25 0 002.25 2.25h9A2.25 2.25 0 0018.75 18V7.5"
        />
      </svg>
    ),
    closures: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
    events: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "hours", label: "Hours & Slots" },
    { key: "tables", label: "Tables" },
    { key: "closures", label: "Closures" },
    { key: "events", label: "Events & Promos" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Restaurant Settings</h1>
          <p className="text-muted text-sm mt-1">Configure your restaurant operations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-[1px] flex items-center justify-center gap-2 ${
              activeTab === t.key ? "border-gold text-gold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span className="mr-1.5">{tabIcons[t.key]}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ========== HOURS TAB ========== */}
      {activeTab === "hours" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Opening</p>
              <p className="text-xl font-bold text-foreground mt-1">{hours.find((h) => h.value === openTime)?.label}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Closing</p>
              <p className="text-xl font-bold text-foreground mt-1">{hours.find((h) => h.value === closeTime)?.label}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Bookable Slots</p>
              <p className="text-xl font-bold text-blue-400 mt-1">{previewSlots.length}</p>
            </div>
          </div>

          {/* Hours Config */}
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-4">Restaurant Hours</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Opening Time</label>
                <select
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                >
                  {hours.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Closing Time</label>
                <select
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                >
                  {hours.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Slot Interval</label>
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reservation Duration */}
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-4">Reservation Duration</h2>
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="bg-background border border-surface-border px-4 py-2 text-foreground focus:border-gold focus:outline-none transition-colors"
              >
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
              <span className="text-muted text-xs">How long each table is reserved per booking</span>
            </div>
          </div>

          {/* Slot Preview */}
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-3">Available Time Slots Preview</h2>
            <div className="flex flex-wrap gap-1.5">
              {previewSlots.map((slot) => (
                <span key={slot} className="px-2.5 py-1 text-xs border border-surface-border text-foreground">
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== TABLES TAB ========== */}
      {activeTab === "tables" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Total</p>
              <p className="text-2xl font-bold text-foreground mt-1">{tables.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{activeTables.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Capacity</p>
              <p className="text-2xl font-bold text-gold mt-1">{totalCapacity} seats</p>
            </div>
          </div>

          {/* Add Tables */}
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-4">Add Tables</h2>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Count</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={addCount}
                  onChange={(e) => setAddCount(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-background border border-surface-border px-3 py-2 text-foreground focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Seats per table</label>
                <select
                  value={addCapacity}
                  onChange={(e) => setAddCapacity(Number(e.target.value))}
                  className="bg-background border border-surface-border px-4 py-2 text-foreground focus:border-gold focus:outline-none transition-colors"
                >
                  {[2, 4, 6, 8, 10, 12].map((c) => (
                    <option key={c} value={c}>
                      {c} seats
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addTables}
                className="px-5 py-2 bg-gold text-background text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="bg-surface border border-surface-border">
            <div className="px-6 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-medium">Tables</h2>
            </div>
            {tables.length === 0 ? (
              <div className="p-8 text-center text-muted">No tables configured. Add some above.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                {tables.map((table) => (
                  <div
                    key={table.number}
                    className={`border p-4 text-center transition-all ${table.isActive ? "border-surface-border bg-background" : "border-surface-border bg-background/50 opacity-50"}`}
                  >
                    <p className="text-foreground font-bold text-lg">T{table.number}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <button
                        onClick={() => updateCapacity(table.number, table.capacity - 1)}
                        className="w-6 h-6 text-xs border border-surface-border text-muted hover:text-foreground hover:border-foreground/30"
                      >
                        −
                      </button>
                      <span className="text-gold text-sm w-12">{table.capacity} seats</span>
                      <button
                        onClick={() => updateCapacity(table.number, table.capacity + 1)}
                        className="w-6 h-6 text-xs border border-surface-border text-muted hover:text-foreground hover:border-foreground/30"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-1 mt-3 justify-center">
                      <button
                        onClick={() => toggleTable(table.number)}
                        className={`px-2 py-1 text-[10px] uppercase tracking-wider border transition-colors ${table.isActive ? "text-green-400 border-green-400/30" : "text-muted border-surface-border"}`}
                      >
                        {table.isActive ? "Active" : "Off"}
                      </button>
                      <button
                        onClick={() => removeTable(table.number)}
                        className="px-2 py-1 text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== CLOSURES TAB ========== */}
      {activeTab === "closures" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Upcoming Closures</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{upcomingClosures.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Total Closures Set</p>
              <p className="text-2xl font-bold text-foreground mt-1">{closedDates.length}</p>
            </div>
          </div>

          {/* Add closure */}
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-2">Add Closure</h2>
            <p className="text-muted text-xs mb-4">Visitors will see a notice and cannot book on closed dates.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Date</label>
                <input
                  type="date"
                  value={newClosedDate}
                  min={today}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Reason</label>
                <input
                  type="text"
                  value={newClosedReason}
                  onChange={(e) => setNewClosedReason(e.target.value)}
                  placeholder="Holiday, Private Event..."
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors w-56"
                />
              </div>
              <button
                onClick={addClosedDate}
                disabled={!newClosedDate}
                className="px-5 py-2.5 bg-gold text-background text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-30"
              >
                + Add Closure
              </button>
            </div>
          </div>

          {/* Upcoming */}
          {upcomingClosures.length > 0 && (
            <div className="bg-surface border border-surface-border p-6">
              <h2 className="text-foreground font-medium mb-3">Upcoming Closures</h2>
              <div className="space-y-2">
                {upcomingClosures.map((c) => (
                  <div key={c.date} className="flex items-center justify-between bg-red-500/5 border border-red-400/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-foreground text-sm font-medium">{formatDate(c.date)}</span>
                      <span className="text-muted text-xs">— {c.reason}</span>
                    </div>
                    <button onClick={() => removeClosedDate(c.date)} className="text-red-400/60 hover:text-red-400 text-lg">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {pastClosures.length > 0 && (
            <div className="bg-surface border border-surface-border p-6">
              <h2 className="text-foreground font-medium mb-3">Past Closures</h2>
              <div className="space-y-1">
                {pastClosures.slice(0, 5).map((c) => (
                  <div key={c.date} className="flex items-center justify-between px-4 py-2 opacity-50">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-muted" />
                      <span className="text-muted text-sm">{formatDate(c.date)}</span>
                      <span className="text-muted text-xs">— {c.reason}</span>
                    </div>
                    <button onClick={() => removeClosedDate(c.date)} className="text-muted/60 hover:text-red-400 text-sm">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {closedDates.length === 0 && (
            <div className="bg-surface border border-surface-border p-8 text-center text-muted text-sm">
              No closures set. The restaurant is open every day.
            </div>
          )}
        </div>
      )}

      {/* ========== EVENTS TAB ========== */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Total Events</p>
              <p className="text-2xl font-bold text-foreground mt-1">{events.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Active Events</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{events.filter((e) => e.isActive).length}</p>
            </div>
          </div>

          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={openEventCreate}
              className="px-6 py-2.5 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors"
            >
              + Add Event / Promo
            </button>
          </div>

          {/* Events list */}
          {events.length === 0 ? (
            <div className="bg-surface border border-surface-border p-8 text-center text-muted text-sm">
              No events or promotions set. Click above to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className={`bg-surface border border-surface-border p-5 transition-all ${!ev.isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-foreground font-semibold text-lg">{ev.title}</h3>
                        {ev.discount && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold border ${getBadgeCls(ev.badgeColor)}`}>{ev.discount}</span>
                        )}
                        {!ev.isActive && (
                          <span className="px-2 py-0.5 text-[10px] border border-surface-border text-muted uppercase tracking-wider">Inactive</span>
                        )}
                      </div>
                      {ev.description && <p className="text-muted text-sm mb-2">{ev.description}</p>}
                      <p className="text-muted text-xs">
                        {formatDate(ev.startDate)} → {formatDate(ev.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEvent(ev.id)}
                        className={`px-2 py-1 text-xs border transition-colors ${ev.isActive ? "text-green-400 border-green-400/30 hover:bg-green-400/10" : "text-muted border-surface-border hover:text-foreground"}`}
                      >
                        {ev.isActive ? "Active" : "Off"}
                      </button>
                      <button
                        onClick={() => openEventEdit(ev)}
                        className="px-2 py-1 text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="px-2 py-1 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium text-lg">{editingEventId ? "Edit Event" : "Create Event / Promo"}</h2>
              <button onClick={() => setShowEventModal(false)} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                  placeholder="Valentine's Day Special"
                />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Description</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none resize-none transition-colors"
                  placeholder="Enjoy a complimentary dessert with every couple's dinner..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Start Date *</label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">End Date *</label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Discount / Offer</label>
                  <input
                    type="text"
                    value={eventForm.discount}
                    onChange={(e) => setEventForm({ ...eventForm, discount: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                    placeholder="20% OFF, Free Dessert..."
                  />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Badge Color</label>
                  <div className="flex gap-2 mt-1">
                    {badgeColors.map((bc) => (
                      <button
                        key={bc.key}
                        onClick={() => setEventForm({ ...eventForm, badgeColor: bc.key })}
                        className={`w-8 h-8 border-2 transition-all ${eventForm.badgeColor === bc.key ? "scale-110 " + bc.cls : "border-surface-border opacity-50 hover:opacity-100"}`}
                        title={bc.label}
                      >
                        <span className={`block w-full h-full ${bc.cls}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.isActive}
                  onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-foreground text-sm">Active (visible on website)</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                disabled={!eventForm.title || !eventForm.startDate || !eventForm.endDate}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {editingEventId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
