"use client";

import { useEffect, useState, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reservation = any;

import ConfirmModal from "@/components/ConfirmModal";

interface TableOption {
  number: number;
  capacity: number;
}

export default function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [assignModal, setAssignModal] = useState<{ id: string; date: string; time: string; guests: number } | null>(null);
  const [availableTables, setAvailableTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const [editModal, setEditModal] = useState<{ id: string; date: string; time: string; guests: number; name: string } | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Fetch time slots from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const { openTime = "18:00", closeTime = "22:00", slotInterval = 30 } = data.settings;
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
          setTimeSlots(slots);
        }
      })
      .catch(() => {});
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (filter !== "all") params.set("status", filter);
      if (dateFilter) params.set("date", dateFilter);

      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      setReservations(data.reservations || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filter, dateFilter]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const updateStatus = async (id: string, status: string, tableNumber?: number | null) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { status };
      if (tableNumber !== undefined) body.tableNumber = tableNumber;

      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Update failed");
        return;
      }

      loadReservations();
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const openAssignModal = async (reservation: Reservation) => {
    setAssignModal({
      id: reservation._id,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
    });
    setSelectedTable(null);

    try {
      const res = await fetch(`/api/availability?date=${reservation.date}&time=${reservation.time}&guests=${reservation.guests}`);
      const data = await res.json();
      setAvailableTables(data.suitableTables || []);
    } catch {
      setAvailableTables([]);
    }
  };

  const confirmWithTable = async () => {
    if (!assignModal || selectedTable === null) return;
    await updateStatus(assignModal.id, "confirmed", selectedTable);
    setAssignModal(null);
  };

  const openEditModal = (reservation: Reservation) => {
    setEditModal({
      id: reservation._id,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      name: reservation.name,
    });
    setEditDate(reservation.date);
    setEditTime(reservation.time);
  };

  const confirmEdit = async () => {
    if (!editModal) return;
    try {
      const res = await fetch(`/api/reservations/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: editDate, time: editTime }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Update failed");
        return;
      }
      loadReservations();
      setEditModal(null);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      loadReservations();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleExport = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams({ format });
    if (filter !== "all") params.set("status", filter);
    if (dateFilter) params.set("from", dateFilter);
    window.open(`/api/reservations/export?${params}`, "_blank");
  };

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

  const allStatuses = ["all", "pending", "confirmed", "seated", "completed", "no-show", "cancelled"];

  const displayed = timeFilter ? reservations.filter((r: Reservation) => r.time === timeFilter) : reservations;

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Reservations</h1>
          <p className="text-muted text-sm mt-1">Manage table bookings and guest lifecycle</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 px-4 py-2 border border-surface-border text-muted text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex items-center gap-2 px-4 py-2 border border-surface-border text-muted text-sm tracking-wider uppercase hover:border-green-400 hover:text-green-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {allStatuses.map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-all ${
              filter === s ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {s === "no-show" ? "No-Show" : s}
          </button>
        ))}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-surface border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none scheme-dark"
        />
        {timeSlots.length > 0 && (
          <select
            value={timeFilter}
            onChange={(e) => {
              setTimeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-surface border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
          >
            <option value="">All Times</option>
            {timeSlots.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        {(dateFilter || timeFilter) && (
          <button
            onClick={() => {
              setDateFilter("");
              setTimeFilter("");
              setPage(1);
            }}
            className="px-2 py-1.5 text-red-400 text-xs hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface border border-surface-border overflow-x-auto transition-colors duration-300">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-8 text-center text-muted">No reservations found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                <th className="px-3 py-3 text-left">Guest</th>
                <th className="px-3 py-3 text-left">Contact</th>
                <th className="px-3 py-3 text-left">Date & Time</th>
                <th className="px-3 py-3 text-left">Guests</th>
                <th className="px-3 py-3 text-left">Table</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {displayed.map((r: Reservation) => (
                <tr key={r._id} className="hover:bg-surface-light transition-colors">
                  <td className="px-3 py-3">
                    <p className="text-foreground font-medium text-sm">{r.name}</p>
                    {r.occasion !== "None" && <p className="text-gold text-[10px] mt-0.5">{r.occasion}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-foreground/60 text-xs">{r.email}</p>
                    <p className="text-muted text-[10px]">{r.phone}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-foreground text-sm">{r.date}</p>
                    <p className="text-muted text-xs">{r.time}</p>
                  </td>
                  <td className="px-3 py-3 text-foreground text-sm">{r.guests}</td>
                  <td className="px-3 py-3">
                    {r.tableNumber ? (
                      <span className="text-gold font-medium text-sm">T{r.tableNumber}</span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.status === "pending" && (
                        <button
                          onClick={() => openAssignModal(r)}
                          className="px-2 py-0.5 text-[10px] text-green-400 border border-green-400/30 hover:bg-green-400/10 transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {r.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(r._id, "seated")}
                          className="px-2 py-0.5 text-[10px] text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
                        >
                          Seat
                        </button>
                      )}
                      {r.status === "seated" && (
                        <button
                          onClick={() => updateStatus(r._id, "completed")}
                          className="px-2 py-0.5 text-[10px] text-muted border border-muted/30 hover:bg-muted/10 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {r.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(r._id, "no-show")}
                          className="px-2 py-0.5 text-[10px] text-orange-400 border border-orange-400/30 hover:bg-orange-400/10 transition-colors"
                        >
                          No-Show
                        </button>
                      )}
                      {["pending", "confirmed"].includes(r.status) && (
                        <button
                          onClick={() => setConfirmCancelId(r._id)}
                          className="px-2 py-0.5 text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {["pending", "confirmed"].includes(r.status) && (
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-2 py-0.5 text-[10px] text-blue-300 border border-blue-300/30 hover:bg-blue-300/10 transition-colors"
                        >
                          Edit Time
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteId(r._id)}
                        className="px-2 py-0.5 text-[10px] text-red-400/60 border border-red-400/20 hover:bg-red-400/10 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 text-sm border transition-colors ${
                page === p ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:border-foreground/30"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Assign Table Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium">Assign Table & Confirm</h2>
              <button onClick={() => setAssignModal(null)} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted text-sm mb-4">
                Select a table for <span className="text-foreground">{assignModal.guests} guests</span> on{" "}
                <span className="text-foreground">{assignModal.date}</span> at <span className="text-foreground">{assignModal.time}</span>
              </p>

              {availableTables.length === 0 ? (
                <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                  No suitable tables available for this slot. Try a different time.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {availableTables.map((t) => (
                    <button
                      key={t.number}
                      onClick={() => setSelectedTable(t.number)}
                      className={`p-3 border text-center transition-all ${
                        selectedTable === t.number
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <p className="font-bold">T{t.number}</p>
                      <p className="text-[10px] mt-0.5">{t.capacity} seats</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button
                onClick={() => setAssignModal(null)}
                className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmWithTable}
                disabled={selectedTable === null}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Confirm & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Date/Time Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium">Edit Reservation Details</h2>
              <button onClick={() => setEditModal(null)} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted text-sm mb-4">
                Update reservation time for <span className="text-foreground">{editModal.name}</span> ({editModal.guests} guests).
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted font-medium uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-surface border border-surface-border text-foreground px-4 py-2.5 outline-none focus:border-gold transition-colors scheme-dark"
                  />
                </div>
                {timeSlots.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted font-medium uppercase tracking-wider">Time</label>
                    <select
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full bg-surface border border-surface-border text-foreground px-4 py-2.5 outline-none focus:border-gold transition-colors"
                    >
                      <option value="" disabled>
                        Select Time
                      </option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={!editDate || !editTime || (editDate === editModal.date && editTime === editModal.time)}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Reservation"
        message="Are you sure you want to permanently delete this reservation? This cannot be undone."
        onConfirm={() => {
          if (confirmDeleteId) deleteReservation(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        isOpen={!!confirmCancelId}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this reservation?"
        onConfirm={() => {
          if (confirmCancelId) {
            updateStatus(confirmCancelId, "cancelled");
            setConfirmCancelId(null);
          }
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
