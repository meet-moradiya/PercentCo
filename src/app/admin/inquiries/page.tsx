"use client";

import { useEffect, useState, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inquiry = any;

import ConfirmModal from "@/components/ConfirmModal";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries?status=${filter}`);
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Update failed");
      loadInquiries();
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const deleteInquiry = async (id: string) => {
    try {
      await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
      loadInquiries();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "contacted":
        return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "resolved":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      default:
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    }
  };

  const allStatuses = ["all", "pending", "contacted", "resolved"];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-foreground font-semibold">Customer Inquiries</h1>
        <p className="text-muted text-sm mt-1">Manage and respond to messages from the public website.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {allStatuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-all ${
              filter === s ? "border-gold text-gold bg-gold/10" : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-surface border border-surface-border p-8 text-center text-muted">No inquiries found.</div>
        ) : (
          inquiries.map((iq) => (
            <div key={iq._id} className="bg-surface border border-surface-border p-5 flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-foreground font-medium text-lg">{iq.name}</h3>
                  <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${statusColor(iq.status)}`}>{iq.status}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted mb-3">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    <a href={`mailto:${iq.email}`} className="hover:text-gold hover:underline">
                      {iq.email}
                    </a>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                    {iq.phone}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted/60">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(iq.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-background border border-surface-border p-4 text-sm text-foreground/80 whitespace-pre-wrap">{iq.message}</div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2 shrink-0 md:w-32">
                {iq.status === "pending" && (
                  <button
                    onClick={() => updateStatus(iq._id, "contacted")}
                    className="flex-1 py-1.5 px-3 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-center"
                  >
                    Mark Contacted
                  </button>
                )}
                {(iq.status === "pending" || iq.status === "contacted") && (
                  <button
                    onClick={() => updateStatus(iq._id, "resolved")}
                    className="flex-1 py-1.5 px-3 text-xs bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors text-center"
                  >
                    Mark Resolved
                  </button>
                )}
                <button
                  onClick={() => setConfirmDeleteId(iq._id)}
                  className="flex-1 py-1.5 px-3 text-xs text-red-400/60 border border-red-400/20 hover:bg-red-400/10 hover:text-red-400 transition-colors text-center"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Inquiry"
        message="Are you sure you want to permanently delete this inquiry? This action cannot be undone."
        onConfirm={() => {
          if (confirmDeleteId) deleteInquiry(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
