"use client";

import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Stats = any;

type InsightTab = "traffic" | "operations" | "audience" | "inquiries";

export default function InsightsPage() {
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>("traffic");
  const [chartRange, setChartRange] = useState<"7" | "30">("7");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-center text-muted">Failed to load statistics.</div>;
  }

  const { reservations, dailyTrend, hourlyTrend, tables, customers, occasions, inquiries } = stats;

  const tabs: { id: InsightTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "traffic",
      label: "Traffic & Sources",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
    },
    {
      id: "operations",
      label: "Tables & Peak Times",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "audience",
      label: "Audience & Occasions",
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
      id: "inquiries",
      label: "Inquiries",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
      ),
    },
  ];

  const StatBox = ({ label, value, subtext }: { label: string; value: React.ReactNode; subtext?: string }) => (
    <div className="bg-surface border border-surface-border p-6 shadow-sm">
      <p className="text-muted text-xs tracking-wider uppercase mb-2">{label}</p>
      <p className="text-4xl font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted/70 mt-2">{subtext}</p>}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl text-foreground font-semibold">Insights & Analytics</h1>
        <p className="text-muted text-sm mt-1">Comprehensive intelligence for restaurant management.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 text-sm tracking-wider uppercase border-b-2 transition-all -mb-px flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === t.id ? "border-gold text-gold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
        {/* ========================================================= */}
        {/* TRAFFIC & SOURCES TAB */}
        {/* ========================================================= */}
        {activeTab === "traffic" && (
          <div className="space-y-8">
            <h2 className="text-xl text-foreground font-medium">Reservations & Walk-Ins</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox
                label="Today"
                value={reservations.today.total}
                subtext={`${reservations.today.online} Online / ${reservations.today.walkin} Walk-Ins`}
              />
              <StatBox
                label="This Week"
                value={reservations.week.total}
                subtext={`${reservations.week.online} Online / ${reservations.week.walkin} Walk-Ins`}
              />
              <StatBox
                label="This Month"
                value={reservations.month.total}
                subtext={`${reservations.month.online} Online / ${reservations.month.walkin} Walk-Ins`}
              />
            </div>

            <div className="bg-surface border border-surface-border p-6 mt-8">
              <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-foreground font-medium">Reservations per Day</h2>
                <div className="flex bg-background border border-surface-border rounded-sm overflow-hidden">
                  <button
                    onClick={() => setChartRange("7")}
                    className={`px-4 py-1.5 text-xs tracking-wider uppercase ${chartRange === "7" ? "bg-gold text-background font-semibold" : "text-muted hover:bg-surface-light"}`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setChartRange("30")}
                    className={`px-4 py-1.5 text-xs tracking-wider uppercase border-l border-surface-border ${chartRange === "30" ? "bg-gold text-background font-semibold" : "text-muted hover:bg-surface-light"}`}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              {dailyTrend.length === 0 ? (
                <div className="text-muted text-sm text-center py-12">No data yet.</div>
              ) : (
                <div className="flex items-end justify-between h-56 gap-1 md:gap-2 mt-4 pt-4 border-t border-surface-border">
                  {(() => {
                    const data = chartRange === "7" ? dailyTrend.slice(-7) : dailyTrend.slice(-30);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const max = Math.max(...data.map((d: any) => d.online + d.walkin), 1);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return data.map((day: any) => {
                      const total = day.online + day.walkin;
                      const pOnline = (day.online / Math.max(total, 1)) * 100;
                      const pWalkin = (day.walkin / Math.max(total, 1)) * 100;
                      const hTotal = (total / max) * 100;
                      const label = new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      return (
                        <div key={day.date} className="flex flex-col items-center flex-1 group">
                          <div className="w-full relative flex flex-col justify-end items-center h-full">
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-foreground text-background text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none flex flex-col items-center">
                              <span>
                                <strong>{total}</strong> Tot
                              </span>
                              <span className="text-gold/80">
                                {day.online} Onl | {day.walkin} Wk
                              </span>
                            </div>
                            <div
                              className="w-full max-w-[24px] flex flex-col-reverse relative justify-end"
                              style={{ height: `${hTotal}%`, minHeight: "4px" }}
                            >
                              <div className="w-full bg-gold transition-colors duration-300" style={{ height: `${pOnline}%` }} />
                              <div className="w-full bg-blue-400/80 transition-colors duration-300" style={{ height: `${pWalkin}%` }} />
                            </div>
                          </div>
                          <span className="text-[10px] text-muted mt-2 rotate-45 origin-left md:rotate-0 md:text-center whitespace-nowrap">
                            {label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              <div className="flex justify-center gap-6 mt-6 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gold rounded-sm"></div> Online
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400/80 rounded-sm"></div> Walk-Ins
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* OPERATIONS & TABLES TAB */}
        {/* ========================================================= */}
        {activeTab === "operations" && (
          <div className="space-y-8">
            <h2 className="text-xl text-foreground font-medium">Table Utilization & Peak Times</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatBox label="Total Tables" value={tables.total} />
              <StatBox label="Reserved Today" value={tables.reservedToday} subtext="Confirmed or Seated" />
              <StatBox label="Available Tables" value={tables.available} />
              <StatBox label="Occupancy Rate" value={<span className="text-gold">{tables.occupancyRate}%</span>} />
            </div>

            <div className="bg-surface border border-surface-border p-6 mt-8">
              <h2 className="text-foreground font-medium mb-6">Reservations By Hour (Peak Times)</h2>
              {hourlyTrend.length === 0 ? (
                <div className="text-muted text-sm text-center py-12">No data yet.</div>
              ) : (
                <div className="flex items-end justify-between h-56 gap-2 mt-4 pt-4 border-t border-surface-border">
                  {(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const max = Math.max(...hourlyTrend.map((d: any) => d.online + d.walkin), 1);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return hourlyTrend.map((hour: any) => {
                      const total = hour.online + hour.walkin;
                      const hTotal = (total / max) * 100;
                      return (
                        <div key={hour.time} className="flex flex-col items-center flex-1 group">
                          <div className="w-full relative flex flex-col justify-end items-center h-full">
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-foreground text-background text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              {total} bookings
                            </div>
                            <div
                              className="w-full max-w-[32px] bg-red-400/80 group-hover:bg-red-400 transition-colors duration-300"
                              style={{ height: `${hTotal}%`, minHeight: "4px" }}
                            />
                          </div>
                          <span className="text-[10px] text-muted mt-2 rotate-45 origin-left md:rotate-0 md:text-center whitespace-nowrap">
                            {hour.time}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* AUDIENCE & OCCASIONS TAB */}
        {/* ========================================================= */}
        {activeTab === "audience" && (
          <div className="space-y-8">
            <h2 className="text-xl text-foreground font-medium">Customer Insights</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="Total Unique Customers" value={customers.total} subtext="Tracked via phone number" />
              <StatBox label="New Customers (This Month)" value={<span className="text-green-400">+{customers.newThisMonth}</span>} />
              <StatBox label="Returning Customers" value={<span className="text-blue-400">{customers.returning}</span>} subtext="Booked 2+ times" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-surface border border-surface-border p-6">
                <h2 className="text-foreground font-medium mb-6">Popular Occasions</h2>
                {occasions.length === 0 ? (
                  <p className="text-sm text-muted">No occasion data available.</p>
                ) : (
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {occasions.slice(0, 5).map((occ: any, i: number) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const max = occasions[0].count;
                      const percentage = Math.round((occ.count / max) * 100);
                      return (
                        <div key={occ.name} className="relative">
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-foreground font-medium">
                              {i + 1}. {occ.name}
                            </span>
                            <span className="text-muted">{occ.count} bookings</span>
                          </div>
                          <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                            <div className="bg-gold h-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* INQUIRIES TAB */}
        {/* ========================================================= */}
        {activeTab === "inquiries" && (
          <div className="space-y-8">
            <h2 className="text-xl text-foreground font-medium">Contact Inquiries</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="Inquiries Today" value={inquiries.today} />
              <StatBox
                label="Pending Action"
                value={<span className={inquiries.pending > 0 ? "text-yellow-400" : "text-foreground"}>{inquiries.pending}</span>}
              />
              <StatBox label="Resolved Tickets" value={<span className="text-green-400">{inquiries.resolved}</span>} />
            </div>

            <div className="p-6 bg-surface border border-surface-border flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Manage Customer Feedback</p>
                <p className="text-sm text-muted mt-1">Review full messages and update statuses in the Inquiries tab.</p>
              </div>
              <a
                href="/admin/inquiries"
                className="px-6 py-2.5 bg-gold text-background text-sm tracking-wider uppercase font-semibold hover:bg-gold-light transition-colors"
              >
                Open Inbox →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
