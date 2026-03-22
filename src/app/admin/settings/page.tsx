"use client";
import { useEffect, useState, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { generateQrPng } from "@/lib/qr/generateQR";
import { generateTablePdf, type PdfTheme } from "@/lib/qr/generatePdf";
import { generatePdfZip } from "@/lib/qr/generatePdfZip";
import JSZip from "jszip";
interface TableConfig {
  number: number;
  capacity: number;
  isActive: boolean;
}
interface StationItem {
  _id: string;
  name: string;
  slug: string;
  servePhase: number;
  isActive: boolean;
  sortOrder: number;
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
type SettingsTab = "hours" | "tables" | "closures" | "events" | "admins" | "ordering" | "kitchen";
type OrderMode = "customer" | "waiter" | "both";
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("hours");
  const [orderMode, setOrderMode] = useState<OrderMode>("both");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", role: "admin" as "admin" | "chef" | "waiter" });
  const [loadingAdmins, setLoadingAdmins] = useState(false);
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
  // QR state
  const [qrCustomText, setQrCustomText] = useState("");
  const [qrSelected, setQrSelected] = useState<Set<number>>(new Set());
  const [qrGenerating, setQrGenerating] = useState(false);
  const [previewTable, setPreviewTable] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfTheme, setPdfTheme] = useState<PdfTheme>("dark");
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
  const [confirmDeleteTableNum, setConfirmDeleteTableNum] = useState<number | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState<{ id: string; email: string } | null>(null);
  // Station management
  const [stations, setStations] = useState<StationItem[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationForm, setStationForm] = useState({ name: "", servePhase: 2, sortOrder: 0 });
  const [savingStation, setSavingStation] = useState(false);
  const [confirmDeleteStation, setConfirmDeleteStation] = useState<{ id: string; name: string } | null>(null);

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
        setQrCustomText(data.settings.qrCustomText || "");
        setOrderMode(data.settings.orderMode || "both");
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
  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch("/api/admins");
      const data = await res.json();
      if (data.admins) setAdmins(data.admins);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab === "admins" && admins.length === 0) loadAdmins();
  }, [activeTab, loadAdmins, admins.length]);
  const loadStations = useCallback(async () => {
    setLoadingStations(true);
    try {
      const res = await fetch("/api/admin/stations");
      const data = await res.json();
      if (data.stations) setStations(data.stations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStations(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab === "kitchen" && stations.length === 0) loadStations();
  }, [activeTab, loadStations, stations.length]);
  const openStationCreate = () => {
    setEditingStationId(null);
    setStationForm({ name: "", servePhase: 2, sortOrder: 0 });
    setShowStationModal(true);
  };
  const openStationEdit = (s: StationItem) => {
    setEditingStationId(s._id);
    setStationForm({ name: s.name, servePhase: s.servePhase, sortOrder: s.sortOrder });
    setShowStationModal(true);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveStation = async () => {
    if (!stationForm.name) return;
    setSavingStation(true);
    try {
      if (editingStationId) {
        const res = await fetch(`/api/admin/stations/${editingStationId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stationForm) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const res = await fetch("/api/admin/stations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stationForm) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      setShowStationModal(false);
      loadStations();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingStation(false);
    }
  };
  const deleteStation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/stations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadStations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(e.message);
    }
  };
  const toggleStation = async (s: StationItem) => {
    try {
      await fetch(`/api/admin/stations/${s._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !s.isActive }) });
      loadStations();
    } catch (e) {
      console.error(e);
    }
  };
  const addAdmin = async () => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) return alert("Fill all fields");
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdminForm({ name: "", email: "", password: "", role: "admin" });
      loadAdmins();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(e.message);
    }
  };
  const deleteAdmin = async (id: string, email: string) => {
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadAdmins();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(e.message);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalTables: tables.length,
          tables,
          slotDuration,
          openTime,
          closeTime,
          slotInterval,
          closedDates,
          events,
          qrCustomText,
          orderMode,
        }),
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
  const confirmRemoveTable = (num: number) => setTables(tables.filter((t) => t.number !== num));
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
  // ========== QR CODE FUNCTIONS (Vector-based via svg2pdf.js) ==========
  const getBaseUrl = () => (typeof window !== "undefined" ? window.location.origin : "");
  const downloadSingleQrPng = async (tableNum: number) => {
    const url = `${getBaseUrl()}/order?table=${tableNum}`;
    const dataUrl = await generateQrPng(url, 1200);
    const link = document.createElement("a");
    link.download = `table-${tableNum}-qr.png`;
    link.href = dataUrl;
    link.click();
  };
  const downloadSinglePdf = async (tableNum: number) => {
    const blob = await generateTablePdf(tableNum, getBaseUrl(), qrCustomText, pdfTheme);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `table-${tableNum}-qr.pdf`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadQrZip = async () => {
    if (qrSelected.size === 0) return;
    setQrGenerating(true);
    try {
      const zip = new JSZip();
      for (const num of qrSelected) {
        const url = `${getBaseUrl()}/order?table=${num}`;
        const dataUrl = await generateQrPng(url, 1200);
        zip.file(`table-${num}-qr.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.download = "table-qr-codes.zip";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setQrGenerating(false);
    }
  };
  const downloadPdfZip = async () => {
    if (qrSelected.size === 0) return;
    setQrGenerating(true);
    try {
      const blob = await generatePdfZip(Array.from(qrSelected), getBaseUrl(), qrCustomText, pdfTheme);
      const link = document.createElement("a");
      link.download = "table-qr-pdfs.zip";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setQrGenerating(false);
    }
  };
  const openPdfPreview = async (tableNum: number) => {
    setPreviewTable(tableNum);
    const blob = await generateTablePdf(tableNum, getBaseUrl(), qrCustomText, pdfTheme);
    setPreviewUrl(URL.createObjectURL(blob));
  };
  const closePdfPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewTable(null);
  };
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
    admins: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    ordering: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        />
      </svg>
    ),
    kitchen: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  };
  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "hours", label: "Hours & Slots" },
    { key: "tables", label: "Tables" },
    { key: "closures", label: "Closures" },
    { key: "events", label: "Events & Promos" },
    { key: "ordering", label: "Ordering" },
    { key: "kitchen", label: "Kitchen" },
    { key: "admins", label: "Staff" },
  ];
  const servePhaseLabels: Record<number, { label: string; color: string }> = {
    1: { label: "Immediate (Starters/Drinks)", color: "text-green-400" },
    2: { label: "Main Course", color: "text-blue-400" },
    3: { label: "Dessert", color: "text-purple-400" },
  };
  const orderModes: { key: OrderMode; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: "customer",
      title: "Customer Self-Order",
      desc: "Customers scan the QR code at their table and place orders using an OTP sent to their email. Waiters cannot place orders.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      ),
    },
    {
      key: "waiter",
      title: "Waiter Only",
      desc: "Only waiters can place orders from their portal. The online customer order page is disabled and inaccessible.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      key: "both",
      title: "Both (Recommended)",
      desc: "Customers can scan & order with OTP, and waiters can also place orders from their portal. Best flexibility.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
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
      <div className="flex border-b border-surface-border mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-px flex items-center justify-center gap-2 ${
              activeTab === t.key ? "border-gold text-gold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span className="mr-1.5">{tabIcons[t.key as keyof typeof tabIcons]}</span>
            <span className="text-nowrap">{t.label}</span>
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
          {/* QR Codes Section */}
          <div className="bg-surface border border-surface-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground font-medium">QR Code Downloads</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (qrSelected.size === activeTables.length) setQrSelected(new Set());
                    else setQrSelected(new Set(activeTables.map((t) => t.number)));
                  }}
                  className="px-3 py-1.5 text-[10px] border border-surface-border text-muted hover:text-foreground hover:border-foreground/30 tracking-wider uppercase transition-colors"
                >
                  {qrSelected.size === activeTables.length ? "Deselect All" : "Select All"}
                </button>
                {qrSelected.size > 0 && (
                  <>
                    <button
                      onClick={downloadQrZip}
                      disabled={qrGenerating}
                      className="px-3 py-1.5 text-[10px] border border-gold text-gold tracking-wider uppercase hover:bg-gold hover:text-background transition-all disabled:opacity-50"
                    >
                      {qrGenerating ? "..." : `${qrSelected.size} PNG (ZIP)`}
                    </button>
                    <button
                      onClick={downloadPdfZip}
                      disabled={qrGenerating}
                      className="px-3 py-1.5 text-[10px] bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                    >
                      {qrGenerating ? "..." : `${qrSelected.size} PDF (ZIP)`}
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Custom text field */}
            <div className="mb-4">
              <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Custom Text (below QR on PDF)</label>
              <textarea
                rows={2}
                value={qrCustomText}
                onChange={(e) => setQrCustomText(e.target.value)}
                placeholder="Scan to order from your table..."
                className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none resize-none transition-colors text-sm"
              />
            </div>
            {/* Theme toggle */}
            <div className="flex items-center gap-3">
              <span className="text-muted text-xs tracking-wider uppercase">PDF Theme</span>
              <div className="flex border border-surface-border">
                <button
                  onClick={() => setPdfTheme("dark")}
                  className={`px-4 py-1.5 text-xs tracking-wider uppercase transition-all ${pdfTheme === "dark" ? "bg-gray-900 text-gold border-r border-surface-border" : "text-muted hover:text-foreground"}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setPdfTheme("light")}
                  className={`px-4 py-1.5 text-xs tracking-wider uppercase transition-all ${pdfTheme === "light" ? "bg-white text-gray-800 border-l border-surface-border" : "text-muted hover:text-foreground"}`}
                >
                  Light
                </button>
              </div>
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
                {tables.map((table) => {
                  const isQrSelected = qrSelected.has(table.number);
                  return (
                    <div
                      key={table.number}
                      className={`border p-4 text-center transition-all ${table.isActive ? (isQrSelected ? "border-gold bg-gold/5" : "border-surface-border bg-background") : "border-surface-border bg-background/50 opacity-50"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground font-bold text-lg">T{table.number}</p>
                        {table.isActive && (
                          <button
                            onClick={() => {
                              setQrSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(table.number)) next.delete(table.number);
                                else next.add(table.number);
                                return next;
                              });
                            }}
                            className={`w-5 h-5 border flex items-center justify-center transition-colors ${isQrSelected ? "border-gold bg-gold text-background" : "border-surface-border hover:border-foreground/30"}`}
                          >
                            {isQrSelected && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
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
                          onClick={() => setConfirmDeleteTableNum(table.number)}
                          className="px-2 py-1 text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      {/* QR download buttons */}
                      {table.isActive && (
                        <div className="flex gap-1 mt-2 justify-center">
                          <button
                            onClick={() => downloadSingleQrPng(table.number)}
                            className="px-2 py-1 text-[9px] border border-surface-border text-muted hover:text-foreground hover:border-foreground/30 tracking-wider uppercase transition-colors"
                          >
                            PNG
                          </button>
                          <button
                            onClick={() => downloadSinglePdf(table.number)}
                            className="px-2 py-1 text-[9px] border border-surface-border text-muted hover:text-foreground hover:border-foreground/30 tracking-wider uppercase transition-colors"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => openPdfPreview(table.number)}
                            className="px-2 py-1 text-[9px] border border-gold text-gold hover:bg-gold hover:text-background tracking-wider uppercase transition-all"
                          >
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
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
      {/* ========== STAFF TAB ========== */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Total Staff</p>
              <p className="text-2xl font-bold text-foreground mt-1">{admins.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Chefs</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">{admins.filter((a) => a.role === "chef").length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Waiters</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{admins.filter((a) => a.role === "waiter").length}</p>
            </div>
          </div>
          <div className="bg-surface border border-surface-border p-6">
            <h2 className="text-foreground font-medium mb-4">Add New Staff Member</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Name</label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none"
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Password</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-wider uppercase mb-1.5">Role</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as "admin" | "chef" | "waiter" })}
                  className="bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="chef">Chef</option>
                  <option value="waiter">Waiter</option>
                </select>
              </div>
              <button
                onClick={addAdmin}
                className="px-5 py-2.5 bg-gold text-background text-sm font-semibold tracking-wider uppercase hover:bg-gold-light"
              >
                + Add Staff
              </button>
            </div>
          </div>
          <div className="bg-surface border border-surface-border">
            <div className="px-6 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-medium">Staff Accounts</h2>
              <p className="text-xs text-muted mt-1">Manage all internal users — admins, chefs, and waiters.</p>
            </div>
            {loadingAdmins ? (
              <div className="p-8 text-center text-muted">Loading...</div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No staff accounts found.</div>
            ) : (
              <div className="divide-y divide-surface-border">
                {admins.map((a) => {
                  const roleBadge =
                    a.role === "chef"
                      ? "bg-orange-500/15 text-orange-400 border-orange-400/30"
                      : a.role === "waiter"
                        ? "bg-blue-500/15 text-blue-400 border-blue-400/30"
                        : "bg-gold/15 text-gold border-gold/30";
                  const roleLabel = a.role === "chef" ? "Chef" : a.role === "waiter" ? "Waiter" : "Admin";
                  return (
                    <div key={a._id} className="flex justify-between items-center p-4 hover:bg-surface-light transition-colors">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{a.name}</p>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${roleBadge}`}>
                              {roleLabel}
                            </span>
                          </div>
                          <p className="text-sm text-muted">{a.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteAdmin({ id: a._id, email: a.email })}
                        className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========== KITCHEN TAB ========== */}
      {activeTab === "kitchen" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Total Stations</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stations.length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stations.filter((s) => s.isActive).length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Phase 1 (Immediate)</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stations.filter((s) => s.servePhase === 1).length}</p>
            </div>
            <div className="bg-surface border border-surface-border p-5">
              <p className="text-muted text-xs tracking-wider uppercase">Phase 2 (Main)</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stations.filter((s) => s.servePhase === 2).length}</p>
            </div>
          </div>
          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={openStationCreate}
              className="px-6 py-2.5 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors"
            >
              + Add Station
            </button>
          </div>
          {/* Stations list */}
          <div className="bg-surface border border-surface-border">
            <div className="px-6 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-medium">Kitchen Stations</h2>
              <p className="text-xs text-muted mt-1">Each station receives items from orders automatically. Cooks select their station when they log in.</p>
            </div>
            {loadingStations ? (
              <div className="p-8 text-center text-muted">Loading...</div>
            ) : stations.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No stations configured. Add stations like Curry, Tandoor, Rice, etc.</div>
            ) : (
              <div className="divide-y divide-surface-border">
                {stations.map((s) => {
                  const phaseInfo = servePhaseLabels[s.servePhase] || servePhaseLabels[2];
                  return (
                    <div key={s._id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-surface-light transition-colors gap-3 ${!s.isActive ? "opacity-50" : ""}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground text-lg">{s.name}</p>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-surface-border ${phaseInfo.color}`}>
                            Phase {s.servePhase}
                          </span>
                          {!s.isActive && (
                            <span className="px-2 py-0.5 text-[10px] border border-surface-border text-muted uppercase tracking-wider">Inactive</span>
                          )}
                        </div>
                        <p className="text-muted text-xs">{phaseInfo.label} · Slug: {s.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStation(s)}
                          className={`px-2 py-1 text-xs border transition-colors ${s.isActive ? "text-green-400 border-green-400/30 hover:bg-green-400/10" : "text-muted border-surface-border hover:text-foreground"}`}
                        >
                          {s.isActive ? "Active" : "Off"}
                        </button>
                        <button
                          onClick={() => openStationEdit(s)}
                          className="px-2 py-1 text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteStation({ id: s._id, name: s.name })}
                          className="px-2 py-1 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Info box */}
          <div className="bg-surface border border-surface-border p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="text-sm text-foreground font-medium">Serve Phases</p>
                <ul className="text-xs text-muted mt-1 space-y-1 list-disc list-inside">
                  <li><strong className="text-green-400">Phase 1 — Immediate:</strong> Items serve as soon as they are ready (starters, drinks, salads)</li>
                  <li><strong className="text-blue-400">Phase 2 — Main Course:</strong> Items wait until ALL Phase 2 items for the table are ready, then serve together</li>
                  <li><strong className="text-purple-400">Phase 3 — Dessert:</strong> Items wait until Phase 2 items are served before being released to the kitchen</li>
                </ul>
                <p className="text-xs text-muted mt-2">After creating stations, assign menu items to stations from the <strong>Menu Items</strong> page.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Station Create/Edit Modal */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium text-lg">{editingStationId ? "Edit Station" : "Add Station"}</h2>
              <button onClick={() => setShowStationModal(false)} className="text-muted hover:text-foreground text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Station Name *</label>
                <input
                  type="text"
                  value={stationForm.name}
                  onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                  placeholder="e.g. Curry, Tandoor, Rice, Salad"
                />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Serve Phase *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((phase) => {
                    const info = servePhaseLabels[phase];
                    return (
                      <button
                        key={phase}
                        onClick={() => setStationForm({ ...stationForm, servePhase: phase })}
                        className={`p-3 border-2 text-center transition-all ${
                          stationForm.servePhase === phase
                            ? "border-gold bg-gold/5"
                            : "border-surface-border hover:border-foreground/20"
                        }`}
                      >
                        <p className={`text-sm font-semibold ${stationForm.servePhase === phase ? "text-gold" : info.color}`}>Phase {phase}</p>
                        <p className="text-[10px] text-muted mt-0.5">{phase === 1 ? "Immediate" : phase === 2 ? "Main Course" : "Dessert"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Sort Order</label>
                <input
                  type="number"
                  value={stationForm.sortOrder}
                  onChange={(e) => setStationForm({ ...stationForm, sortOrder: Number(e.target.value) })}
                  className="w-24 bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button onClick={() => setShowStationModal(false)} className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveStation}
                disabled={savingStation || !stationForm.name}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {savingStation ? "Saving..." : editingStationId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========== ORDERING TAB ========== */}
      {activeTab === "ordering" && (
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border">
            <div className="px-6 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-medium">Order System Mode</h2>
              <p className="text-xs text-muted mt-1">Choose how food orders are placed at your restaurant.</p>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-3">
              {orderModes.map((m) => {
                const active = orderMode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setOrderMode(m.key)}
                    className={`text-left p-5 border-2 transition-all ${
                      active
                        ? "border-gold bg-gold/5"
                        : "border-surface-border hover:border-foreground/20 bg-surface"
                    }`}
                  >
                    <div className={`mb-3 ${active ? "text-gold" : "text-muted"}`}>{m.icon}</div>
                    <h3 className={`font-semibold text-sm mb-1 ${active ? "text-gold" : "text-foreground"}`}>{m.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{m.desc}</p>
                    {active && (
                      <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-gold uppercase tracking-wider font-semibold">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-surface border border-surface-border p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="text-sm text-foreground font-medium">How it works</p>
                <ul className="text-xs text-muted mt-1 space-y-1 list-disc list-inside">
                  <li><strong>Customer Self-Order:</strong> Customers use the /order page with OTP verification. Waiters cannot place orders.</li>
                  <li><strong>Waiter Only:</strong> The /order page is disabled for customers. Only waiters can place orders from their portal.</li>
                  <li><strong>Both:</strong> Both systems work simultaneously — customers can self-order and waiters can place orders too.</li>
                </ul>
                <p className="text-xs text-muted mt-2">Remember to click <strong>Save Changes</strong> to apply.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PDF Preview Modal */}
      {previewTable !== null && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium">PDF Preview — Table {previewTable}</h2>
              <button onClick={closePdfPreview} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-background">
              <iframe src={previewUrl} className="w-full h-[65vh] border-0" title="PDF Preview" />
            </div>
            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button
                onClick={closePdfPreview}
                className="px-4 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  downloadSinglePdf(previewTable);
                  closePdfPreview();
                }}
                className="px-4 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteTableNum}
        title="Delete Table"
        message={`Are you sure you want to delete Table ${confirmDeleteTableNum}?`}
        onConfirm={() => {
          if (confirmDeleteTableNum !== null) confirmRemoveTable(confirmDeleteTableNum);
        }}
        onCancel={() => setConfirmDeleteTableNum(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteAdmin}
        title="Remove Administrator"
        message={`Are you sure you want to remove ${confirmDeleteAdmin?.email} from administrators?`}
        onConfirm={() => {
          if (confirmDeleteAdmin) deleteAdmin(confirmDeleteAdmin.id, confirmDeleteAdmin.email);
        }}
        onCancel={() => setConfirmDeleteAdmin(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteStation}
        title="Delete Station"
        message={`Are you sure you want to delete "${confirmDeleteStation?.name}"? Menu items assigned to this station must be reassigned first.`}
        onConfirm={() => {
          if (confirmDeleteStation) deleteStation(confirmDeleteStation.id);
        }}
        onCancel={() => setConfirmDeleteStation(null)}
      />
    </div>
  );
}
