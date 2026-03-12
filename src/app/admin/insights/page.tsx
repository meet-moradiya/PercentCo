"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import recharts components to avoid SSR issues
const LazyCharts = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } = mod;

      // Return a component that provides all chart components as render prop
      const ChartProvider = ({ children }: { children: (charts: typeof chartComponents) => React.ReactNode }) => {
        return <>{children(chartComponents)}</>;
      };

      const chartComponents = {
        ResponsiveContainer,
        LineChart,
        Line,
        BarChart,
        Bar,
        PieChart,
        Pie,
        Cell,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Legend,
      };

      return ChartProvider;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

const CHART_COLORS = ["#c9a96e", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fbbf24", "#f472b6", "#38bdf8", "#4ade80", "#fb923c"];

const PIE_COLORS = ["#c9a96e", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fbbf24", "#f472b6"];

type TabId = "overview" | "revenue" | "menu" | "reservations" | "customers" | "orders" | "occasions";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Menu",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    id: "reservations",
    label: "Reservations",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    id: "customers",
    label: "Customers",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        />
      </svg>
    ),
  },
  {
    id: "occasions",
    label: "Occasions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    ),
  },
];

const FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const REVENUE_FILTERS = [
  { value: "week", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartComponents = any;

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [filter, setFilter] = useState("all");
  const [revenueFilter, setRevenueFilter] = useState("week");
  const [revenueMetric, setRevenueMetric] = useState<"revenue" | "orders">("revenue");
  const [revenueMode, setRevenueMode] = useState("revenue");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [menuPage, setMenuPage] = useState(1);
  const [menuSort, setMenuSort] = useState("count");
  const [menuDir, setMenuDir] = useState("desc");
  const [menuCategory, setMenuCategory] = useState("all");
  const [menuTimeFilter, setMenuTimeFilter] = useState("all");
  const [menuCustomFrom, setMenuCustomFrom] = useState("");
  const [menuCustomTo, setMenuCustomTo] = useState("");

  const [hourlyFilter, setHourlyFilter] = useState("today");
  const [hourlyDate, setHourlyDate] = useState("");

  const [menuPieMetric, setMenuPieMetric] = useState("revenue");
  const [menuPieType, setMenuPieType] = useState("all");
  const [menuPopularType, setMenuPopularType] = useState("all");

  // Data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [overviewData, setOverviewData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [revenueData, setRevenueData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [menuData, setMenuData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reservationData, setReservationData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customerData, setCustomerData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderData, setOrderData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [occasionData, setOccasionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSection = useCallback(async (section: string, params: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ section, ...params });
      const res = await fetch(`/api/analytics?${query}`);
      const json = await res.json();
      if (json.success) return json.data;
    } catch (err) {
      console.error(`Analytics fetch error (${section}):`, err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case "overview":
        fetchSection("overview", { filter }).then(setOverviewData);
        break;
      case "revenue":
        {
          const params: Record<string, string> = { filter: revenueFilter, mode: revenueMetric, hourlyFilter };
          if (revenueFilter === "custom" && customFromDate && customToDate) {
            params.from = customFromDate;
            params.to = customToDate;
          }
          if (hourlyFilter === "custom" && hourlyDate) {
            params.hourlyDate = hourlyDate;
          }
          fetchSection("revenue", params).then(setRevenueData);
        }
        break;
      case "menu":
        {
          const menuParams: Record<string, string> = {
            page: String(menuPage),
            sort: menuSort,
            dir: menuDir,
            category: menuCategory,
            filter: menuTimeFilter,
            type: menuPopularType,
          };
          if (menuTimeFilter === "custom" && menuCustomFrom && menuCustomTo) {
            menuParams.from = menuCustomFrom;
            menuParams.to = menuCustomTo;
          }
          fetchSection("menu", menuParams).then(setMenuData);
        }
        break;
      case "reservations":
        fetchSection("reservations", { filter }).then(setReservationData);
        break;
      case "customers":
        fetchSection("customers").then(setCustomerData);
        break;
      case "orders":
        fetchSection("orders").then(setOrderData);
        break;
      case "occasions":
        fetchSection("occasions").then(setOccasionData);
        break;
    }
  }, [
    activeTab,
    filter,
    revenueFilter,
    revenueMetric,
    revenueMode,
    menuPage,
    menuSort,
    menuDir,
    menuCategory,
    menuTimeFilter,
    menuCustomFrom,
    menuCustomTo,
    menuPopularType,
    customFromDate,
    customToDate,
    hourlyFilter,
    hourlyDate,
    fetchSection,
  ]);

  const KPICard = ({
    label,
    value,
    subtext,
    color,
    icon,
  }: {
    label: string;
    value: React.ReactNode;
    subtext?: string;
    color?: string;
    icon?: React.ReactNode;
  }) => (
    <div className="bg-surface border border-surface-border p-5 transition-all duration-300 hover:border-gold/30 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-muted text-xs tracking-wider uppercase">{label}</p>
        {icon && <div className="text-gold/40 group-hover:text-gold transition-colors">{icon}</div>}
      </div>
      <p className={`text-3xl font-bold ${color || "text-foreground"}`}>{value}</p>
      {subtext && <p className="text-xs text-muted/70 mt-2">{subtext}</p>}
    </div>
  );

  const FilterPills = ({
    options,
    selected,
    onChange,
  }: {
    options: { value: string; label: string }[];
    selected: string;
    onChange: (v: string) => void;
  }) => (
    <div className="flex flex-wrap bg-background border border-surface-border rounded-sm overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-xs tracking-wider uppercase transition-all border-r border-surface-border last:border-r-0 ${
            selected === opt.value ? "bg-gold text-background font-semibold" : "text-muted hover:bg-surface-light hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const SectionLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Custom tooltip for recharts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-surface-border px-3 py-2 shadow-lg">
          <p className="text-foreground text-xs font-medium mb-1">{label}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString()}`;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl text-foreground font-semibold">Insights & Analytics</h1>
        <p className="text-muted text-sm mt-1">Comprehensive data-driven insights for restaurant performance.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-px flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === t.id ? "border-gold text-gold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl text-foreground font-medium">Dashboard Overview</h2>
              <FilterPills options={FILTERS} selected={filter} onChange={setFilter} />
            </div>

            {loading && !overviewData ? (
              <SectionLoading />
            ) : overviewData ? (
              <>
                {/* Revenue + Orders Card */}
                <div className="bg-surface border border-surface-border p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-muted text-xs tracking-wider uppercase mb-2">Total Revenue</p>
                      <p className="text-4xl font-bold text-gold">{formatCurrency(overviewData.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs tracking-wider uppercase mb-2">Total Orders</p>
                      <p className="text-4xl font-bold text-foreground">{overviewData.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs tracking-wider uppercase mb-2">Total Items</p>
                      <p className="text-4xl font-bold text-blue-400">{overviewData.totalItems}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Avg Order Value" value={formatCurrency(overviewData.aov)} color="text-gold" />
                  <KPICard label="Total Customers" value={overviewData.totalCustomers} color="text-blue-400" />
                  <KPICard
                    label="Repeat Customers"
                    value={`${overviewData.repeatCustomers} (${overviewData.repeatPct}%)`}
                    color="text-green-400"
                    subtext={`Of all customers return`}
                  />
                  <KPICard label="Table Utilization" value={`${overviewData.tableUtilPct}%`} color="text-purple-400" subtext="Tables used today" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    label="Reservations vs Walk-ins"
                    value={`${overviewData.reservationsVsWalkins.online} / ${overviewData.reservationsVsWalkins.walkin}`}
                    subtext="Online / Walk-in"
                    color="text-foreground"
                  />
                  <KPICard
                    label="Cancellation Rate"
                    value={`${overviewData.cancelRate}%`}
                    color={overviewData.cancelRate > 20 ? "text-red-400" : "text-foreground"}
                    subtext={`${overviewData.totalCancellations} cancelled`}
                  />
                  <KPICard
                    label="Avg Dining Duration"
                    value={overviewData.avgDiningDuration > 0 ? `${overviewData.avgDiningDuration}m` : "—"}
                    color="text-foreground"
                    subtext="Average minutes per visit"
                  />
                  <KPICard
                    label="Top Selling"
                    value={overviewData.topSellingItem?.name || "—"}
                    color="text-gold"
                    subtext={overviewData.topSellingItem ? `${overviewData.topSellingItem.count} orders` : "No orders yet"}
                  />
                </div>
              </>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== REVENUE TAB ===== */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl text-foreground font-medium">Revenue Analytics</h2>
                <div className="flex items-center gap-3">
                  {/* Metric selector dropdown */}
                  <select
                    value={revenueMetric}
                    onChange={(e) => setRevenueMetric(e.target.value as "revenue" | "orders")}
                    className="px-4 py-1.5 bg-background border border-surface-border text-foreground text-xs tracking-wider uppercase focus:border-gold focus:outline-none transition-colors"
                  >
                    <option value="revenue">Revenue</option>
                    <option value="orders">Orders</option>
                  </select>
                  <FilterPills options={REVENUE_FILTERS} selected={revenueFilter} onChange={setRevenueFilter} />
                </div>
              </div>

              {/* Custom date range picker */}
              {revenueFilter === "custom" && (
                <div className="flex items-center gap-3 justify-end">
                  <label className="text-muted text-xs tracking-wider uppercase">From</label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
                  />
                  <label className="text-muted text-xs tracking-wider uppercase">To</label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {loading && !revenueData ? (
              <SectionLoading />
            ) : revenueData ? (
              <LazyCharts>
                {(Charts: ChartComponents) => (
                  <>
                    {/* Revenue/Orders Over Time — single metric */}
                    <div className="bg-surface border border-surface-border p-6">
                      <h3 className="text-foreground font-medium mb-6">{revenueMetric === "revenue" ? "Revenue" : "Orders"} Over Time</h3>
                      {revenueData.revenueOverTime.length === 0 ? (
                        <div className="text-muted text-sm text-center py-12">No data for this period.</div>
                      ) : (
                        <div className="h-80">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.LineChart data={revenueData.revenueOverTime}>
                              <Charts.CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                              <Charts.XAxis
                                dataKey="date"
                                stroke="#888"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              />
                              <Charts.YAxis
                                stroke="#888"
                                tick={{ fontSize: 11 }}
                                tickFormatter={revenueMetric === "revenue" ? (v: number) => `₹${v}` : undefined}
                              />
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Line
                                type="monotone"
                                dataKey={revenueMetric}
                                name={revenueMetric === "revenue" ? "Revenue" : "Orders"}
                                stroke={revenueMetric === "revenue" ? "#c9a96e" : "#60a5fa"}
                                strokeWidth={2}
                                dot={{ fill: revenueMetric === "revenue" ? "#c9a96e" : "#60a5fa", r: 4 }}
                                activeDot={{ r: 6, fill: revenueMetric === "revenue" ? "#c9a96e" : "#60a5fa" }}
                              />
                            </Charts.LineChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Revenue by Hour */}
                    <div className="bg-surface border border-surface-border p-6">
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <h3 className="text-foreground font-medium">Revenue by Hour</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <select
                              value={revenueMode}
                              onChange={(e) => setRevenueMode(e.target.value)}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs uppercase tracking-wider focus:border-gold focus:outline-none transition-colors"
                            >
                              <option value="revenue">By Revenue</option>
                              <option value="visits">By Visits</option>
                            </select>
                            <FilterPills
                              options={[
                                { value: "today", label: "Today" },
                                { value: "yesterday", label: "Yesterday" },
                                { value: "custom", label: "Custom" },
                              ]}
                              selected={hourlyFilter}
                              onChange={setHourlyFilter}
                            />
                          </div>
                        </div>
                        {hourlyFilter === "custom" && (
                          <div className="flex items-center gap-3 justify-end mb-2">
                            <label className="text-muted text-xs tracking-wider uppercase">Date</label>
                            <input
                              type="date"
                              value={hourlyDate}
                              onChange={(e) => setHourlyDate(e.target.value)}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
                            />
                          </div>
                        )}
                      </div>
                      {revenueData.revenueByHour.length === 0 ? (
                        <div className="text-muted text-sm text-center py-12">No data for this period.</div>
                      ) : (
                        <div className="h-72">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.BarChart data={revenueData.revenueByHour}>
                              <Charts.CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                              <Charts.XAxis dataKey="hour" stroke="#888" tick={{ fontSize: 11 }} />
                              <Charts.YAxis stroke="#888" tick={{ fontSize: 11 }} />
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Bar
                                dataKey={revenueMode === "revenue" ? "revenue" : "visits"}
                                name={revenueMode === "revenue" ? "Revenue" : "Visits"}
                                fill={revenueMode === "revenue" ? "#c9a96e" : "#60a5fa"}
                                radius={[4, 4, 0, 0]}
                              />
                            </Charts.BarChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </LazyCharts>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== MENU TAB ===== */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <h2 className="text-xl text-foreground font-medium">Menu Performance</h2>

            {loading && !menuData ? (
              <SectionLoading />
            ) : menuData ? (
              <LazyCharts>
                {(Charts: ChartComponents) => (
                  <>
                    {/* Popular Items */}
                    <div className="bg-surface border border-surface-border p-6">
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <h3 className="text-foreground font-medium">Most Popular Items</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <FilterPills
                              options={[{ value: "all", label: "All" }, ...REVENUE_FILTERS]}
                              selected={menuTimeFilter}
                              onChange={(v) => {
                                setMenuTimeFilter(v);
                                setMenuPage(1);
                              }}
                            />
                          </div>
                        </div>

                        {/* Custom date range picker for Menu */}
                        {menuTimeFilter === "custom" && (
                          <div className="flex items-center gap-3 justify-end mb-2">
                            <label className="text-muted text-xs tracking-wider uppercase">From</label>
                            <input
                              type="date"
                              value={menuCustomFrom}
                              onChange={(e) => {
                                setMenuCustomFrom(e.target.value);
                                setMenuPage(1);
                              }}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
                            />
                            <label className="text-muted text-xs tracking-wider uppercase">To</label>
                            <input
                              type="date"
                              value={menuCustomTo}
                              onChange={(e) => {
                                setMenuCustomTo(e.target.value);
                                setMenuPage(1);
                              }}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap justify-end">
                          <select
                            value={menuPopularType}
                            onChange={(e) => {
                              setMenuPopularType(e.target.value);
                              setMenuPage(1);
                            }}
                            className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none"
                          >
                            <option value="all">All Types</option>
                            <option value="regular">Regular</option>
                            <option value="jain">Jain</option>
                          </select>
                          <select
                            value={menuCategory}
                            onChange={(e) => {
                              setMenuCategory(e.target.value);
                              setMenuPage(1);
                            }}
                            className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none"
                          >
                            <option value="all">All Categories</option>
                            <option value="starters">Starters</option>
                            <option value="mains">Main Course</option>
                            <option value="desserts">Desserts</option>
                            <option value="drinks">Beverages</option>
                          </select>
                          <select
                            value={menuSort}
                            onChange={(e) => {
                              setMenuSort(e.target.value);
                              setMenuPage(1);
                            }}
                            className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none"
                          >
                            <option value="count">By Orders</option>
                            <option value="revenue">By Revenue</option>
                            <option value="name">By Name</option>
                          </select>
                          <button
                            onClick={() => {
                              setMenuDir(menuDir === "desc" ? "asc" : "desc");
                              setMenuPage(1);
                            }}
                            className="px-3 py-1.5 border border-surface-border text-muted text-xs hover:border-gold hover:text-gold transition-colors"
                          >
                            {menuDir === "desc" ? "↓ Desc" : "↑ Asc"}
                          </button>
                        </div>
                      </div>

                      {menuData.popularItems.length === 0 ? (
                        <div className="text-muted text-sm text-center py-12">No order data yet.</div>
                      ) : (
                        <>
                          <div className="h-80">
                            <Charts.ResponsiveContainer width="100%" height="100%">
                              <Charts.BarChart data={menuData.popularItems} layout="vertical" margin={{ left: 80 }}>
                                <Charts.CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                                <Charts.XAxis type="number" stroke="#888" tick={{ fontSize: 11 }} />
                                <Charts.YAxis dataKey="name" type="category" stroke="#888" tick={{ fontSize: 11 }} width={80} />
                                <Charts.Tooltip content={<CustomTooltip />} />
                                <Charts.Bar
                                  dataKey={menuSort === "revenue" ? "revenue" : "count"}
                                  name={menuSort === "revenue" ? "Revenue" : "Orders"}
                                  fill="#c9a96e"
                                  radius={[0, 4, 4, 0]}
                                >
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {menuData.popularItems.map((_: any, idx: number) => (
                                    <Charts.Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                  ))}
                                </Charts.Bar>
                              </Charts.BarChart>
                            </Charts.ResponsiveContainer>
                          </div>

                          {/* Pagination */}
                          <div className="flex flex-col items-center mt-6 gap-3">
                            {menuData.pagination.pages > 1 && (
                              <div className="flex justify-center gap-2">
                                {Array.from({ length: menuData.pagination.pages }, (_, i) => i + 1).map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => setMenuPage(p)}
                                    className={`w-8 h-8 text-xs border transition-colors ${
                                      menuPage === p
                                        ? "border-gold text-gold bg-gold/10"
                                        : "border-surface-border text-muted hover:border-foreground/30"
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-muted tracking-wider uppercase">Total items: {menuData.pagination.total}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Category + Jain/Regular */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Category Performance */}
                      <div className="bg-surface border border-surface-border p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                          <h3 className="text-foreground font-medium">Category Performance</h3>
                          <div className="flex gap-2 flex-wrap">
                            <select
                              value={menuPieMetric}
                              onChange={(e) => setMenuPieMetric(e.target.value)}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none"
                            >
                              <option value="revenue">By Revenue</option>
                              <option value="count">By Items</option>
                            </select>
                            <select
                              value={menuPieType}
                              onChange={(e) => setMenuPieType(e.target.value)}
                              className="px-3 py-1.5 bg-background border border-surface-border text-foreground text-xs focus:border-gold focus:outline-none"
                            >
                              <option value="all">All Type</option>
                              <option value="regular">Regular</option>
                              <option value="jain">Jain</option>
                            </select>
                          </div>
                        </div>
                        {menuData.categoryPerformance.length === 0 ? (
                          <div className="text-muted text-sm text-center py-12">No data yet.</div>
                        ) : (
                          <div className="h-72">
                            <Charts.ResponsiveContainer width="100%" height="100%">
                              <Charts.PieChart>
                                <Charts.Pie
                                  data={menuData.categoryPerformance}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  dataKey={
                                    menuPieType === "jain"
                                      ? menuPieMetric === "revenue"
                                        ? "revenueJain"
                                        : "countJain"
                                      : menuPieType === "regular"
                                        ? menuPieMetric === "revenue"
                                          ? "revenueRegular"
                                          : "countRegular"
                                        : menuPieMetric === "revenue"
                                          ? "revenue"
                                          : "count"
                                  }
                                  nameKey="name"
                                  label={({ name, percent }: { name: string; percent: number }) =>
                                    percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                                  }
                                  labelLine={false}
                                >
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {menuData.categoryPerformance.map((_: any, idx: number) => (
                                    <Charts.Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                  ))}
                                </Charts.Pie>
                                <Charts.Tooltip content={<CustomTooltip />} />
                              </Charts.PieChart>
                            </Charts.ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Jain vs Regular */}
                      <div className="bg-surface border border-surface-border p-6">
                        <h3 className="text-foreground font-medium mb-6">Jain vs Regular Orders</h3>
                        <div className="h-72">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.PieChart>
                              <Charts.Pie
                                data={[
                                  { name: "Regular", value: menuData.jainVsRegular.regular },
                                  { name: "Jain", value: menuData.jainVsRegular.jain },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                <Charts.Cell fill="#c9a96e" />
                                <Charts.Cell fill="#34d399" />
                              </Charts.Pie>
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Legend />
                            </Charts.PieChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </LazyCharts>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== RESERVATIONS TAB ===== */}
        {activeTab === "reservations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl text-foreground font-medium">Reservation Analytics</h2>
              <FilterPills options={FILTERS} selected={filter} onChange={setFilter} />
            </div>

            {loading && !reservationData ? (
              <SectionLoading />
            ) : reservationData ? (
              <LazyCharts>
                {(Charts: ChartComponents) => (
                  <>
                    {/* Reservation vs Walk-in Pie */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-surface border border-surface-border p-6">
                        <h3 className="text-foreground font-medium mb-6">Reservation vs Walk-in</h3>
                        <div className="h-72">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.PieChart>
                              <Charts.Pie
                                data={[
                                  { name: "Online Reservations", value: reservationData.reservationVsWalkin.online },
                                  { name: "Walk-in", value: reservationData.reservationVsWalkin.walkin },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                <Charts.Cell fill="#c9a96e" />
                                <Charts.Cell fill="#60a5fa" />
                              </Charts.Pie>
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Legend />
                            </Charts.PieChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      </div>

                      {/* Status Breakdown Bar */}
                      <div className="bg-surface border border-surface-border p-6">
                        <h3 className="text-foreground font-medium mb-6">Status Breakdown</h3>
                        {reservationData.statusBreakdown.length === 0 ? (
                          <div className="text-muted text-sm text-center py-12">No data.</div>
                        ) : (
                          <div className="h-72">
                            <Charts.ResponsiveContainer width="100%" height="100%">
                              <Charts.BarChart data={reservationData.statusBreakdown}>
                                <Charts.CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                                <Charts.XAxis dataKey="status" stroke="#888" tick={{ fontSize: 11 }} />
                                <Charts.YAxis stroke="#888" tick={{ fontSize: 11 }} />
                                <Charts.Tooltip content={<CustomTooltip />} />
                                <Charts.Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {reservationData.statusBreakdown.map((_: any, idx: number) => (
                                    <Charts.Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                  ))}
                                </Charts.Bar>
                              </Charts.BarChart>
                            </Charts.ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Peak Times */}
                    <div className="bg-surface border border-surface-border p-6">
                      <h3 className="text-foreground font-medium mb-6">Peak Reservation Times</h3>
                      {reservationData.peakTimes.length === 0 ? (
                        <div className="text-muted text-sm text-center py-12">No reservation data.</div>
                      ) : (
                        <div className="h-72">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.BarChart data={reservationData.peakTimes}>
                              <Charts.CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                              <Charts.XAxis dataKey="time" stroke="#888" tick={{ fontSize: 10 }} />
                              <Charts.YAxis stroke="#888" tick={{ fontSize: 11 }} />
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Bar dataKey="count" name="Bookings" fill="#f87171" radius={[4, 4, 0, 0]} />
                            </Charts.BarChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </LazyCharts>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== CUSTOMERS TAB ===== */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <h2 className="text-xl text-foreground font-medium">Customer Analytics</h2>

            {loading && !customerData ? (
              <SectionLoading />
            ) : customerData ? (
              <LazyCharts>
                {(Charts: ChartComponents) => (
                  <>
                    {/* New vs Returning + Repeat Rate */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-surface border border-surface-border p-6">
                        <h3 className="text-foreground font-medium mb-6">New vs Returning</h3>
                        <div className="h-56">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.PieChart>
                              <Charts.Pie
                                data={[
                                  { name: "New", value: customerData.newVsReturning.new },
                                  { name: "Returning", value: customerData.newVsReturning.returning },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                <Charts.Cell fill="#34d399" />
                                <Charts.Cell fill="#60a5fa" />
                              </Charts.Pie>
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Legend />
                            </Charts.PieChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      </div>

                      <KPICard
                        label="Repeat Customer Rate"
                        value={`${customerData.repeatRate}%`}
                        color="text-green-400"
                        subtext={`${customerData.totalRepeatCustomers} repeat customers`}
                      />

                      <KPICard
                        label="Total Unique Customers"
                        value={customerData.totalUniqueCustomers}
                        color="text-blue-400"
                        subtext="Tracked via phone number"
                      />
                    </div>

                    {/* Top 10 Customers */}
                    <div className="bg-surface border border-surface-border">
                      <div className="px-6 py-4 border-b border-surface-border">
                        <h3 className="text-foreground font-medium">Top 10 Customers</h3>
                      </div>
                      {customerData.topCustomers.length === 0 ? (
                        <div className="p-8 text-center text-muted">No customer data yet.</div>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                              <th className="px-6 py-3 text-left">#</th>
                              <th className="px-6 py-3 text-left">Customer</th>
                              <th className="px-6 py-3 text-left">Contact Info</th>
                              <th className="px-6 py-3 text-center">Visits</th>
                              <th className="px-6 py-3 text-right">Total Spent</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {customerData.topCustomers.map((c: any, i: number) => (
                              <tr key={i} className="hover:bg-surface-light transition-colors">
                                <td className="px-6 py-3 text-gold font-bold">{i + 1}</td>
                                <td className="px-6 py-3 text-foreground font-medium capitalize">{c.name}</td>
                                <td className="px-6 py-3">
                                  <div className="text-sm text-foreground">{c.email}</div>
                                  <div className="text-xs text-muted">{c.phone}</div>
                                </td>
                                <td className="px-6 py-3 text-center text-foreground">{c.visits}</td>
                                <td className="px-6 py-3 text-right text-gold font-medium">{formatCurrency(c.totalSpent)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Visit Frequency Distribution */}
                    <div className="bg-surface border border-surface-border p-6">
                      <h3 className="text-foreground font-medium mb-2">Visit Frequency Distribution</h3>
                      <p className="text-muted text-xs mb-6">Total unique customers: {customerData.totalUniqueCustomers}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {Object.entries(customerData.visitDistribution).map(([visits, count]) => (
                          <div
                            key={visits}
                            className="bg-background border border-surface-border p-4 text-center hover:border-gold/40 transition-colors"
                          >
                            <p className="text-gold text-2xl font-bold">{count as number}</p>
                            <p className="text-muted text-xs mt-1">
                              {visits === "8+" ? "8+" : visits} {visits === "1" ? "visit" : "visits"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </LazyCharts>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== ORDERS TAB ===== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <h2 className="text-xl text-foreground font-medium">Order Insights</h2>

            {loading && !orderData ? (
              <SectionLoading />
            ) : orderData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard label="Avg Items Per Order" value={orderData.avgItemsPerOrder} color="text-gold" subtext="Understand ordering behavior" />
                <KPICard label="Total Items Sold" value={orderData.totalItems.toLocaleString()} color="text-blue-400" subtext="Across all orders" />
                <KPICard label="Total Orders" value={orderData.totalOrders.toLocaleString()} color="text-green-400" subtext="Excluding cancelled" />
              </div>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}

        {/* ===== OCCASIONS TAB ===== */}
        {activeTab === "occasions" && (
          <div className="space-y-6">
            <h2 className="text-xl text-foreground font-medium">Occasion Analytics</h2>

            {loading && !occasionData ? (
              <SectionLoading />
            ) : occasionData ? (
              <LazyCharts>
                {(Charts: ChartComponents) => (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-surface border border-surface-border p-6">
                      <h3 className="text-foreground font-medium mb-6">Occasion Distribution</h3>
                      {occasionData.occasions.length === 0 ? (
                        <div className="text-muted text-sm text-center py-12">No occasion data available.</div>
                      ) : (
                        <div className="h-80">
                          <Charts.ResponsiveContainer width="100%" height="100%">
                            <Charts.PieChart>
                              <Charts.Pie
                                data={occasionData.occasions}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                dataKey="count"
                                nameKey="name"
                                label={({ name, percentage }: { name: string; percentage: number }) => `${name} ${percentage}%`}
                                labelLine={false}
                              >
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {occasionData.occasions.map((_: any, idx: number) => (
                                  <Charts.Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Charts.Pie>
                              <Charts.Tooltip content={<CustomTooltip />} />
                              <Charts.Legend />
                            </Charts.PieChart>
                          </Charts.ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="bg-surface border border-surface-border p-6">
                      <h3 className="text-foreground font-medium mb-6">Occasion Breakdown</h3>
                      <p className="text-muted text-xs mb-4">Total: {occasionData.total} reservations with occasions</p>
                      {occasionData.occasions.length === 0 ? (
                        <p className="text-sm text-muted">No occasion data available.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {occasionData.occasions.map((occ: any, i: number) => {
                            const max = occasionData.occasions[0].count;
                            const pct = Math.round((occ.count / max) * 100);
                            return (
                              <div key={occ.name}>
                                <div className="flex justify-between text-sm mb-1.5">
                                  <span className="text-foreground font-medium">
                                    {i + 1}. {occ.name}
                                  </span>
                                  <span className="text-muted">
                                    {occ.count} bookings ({occ.percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </LazyCharts>
            ) : (
              <div className="text-muted text-center py-12">No data available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
