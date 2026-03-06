"use client";

import { useEffect, useState } from "react";

interface ClosedDate {
  date: string;
  reason: string;
}

interface EventPromo {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  discount: string;
  badgeColor: string;
  isActive: boolean;
}

export default function ClosureNotice() {
  const [closures, setClosures] = useState<ClosedDate[]>([]);
  const [events, setEvents] = useState<EventPromo[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const today = new Date().toISOString().split("T")[0];
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);
          const limit = thirtyDays.toISOString().split("T")[0];

          if (data.settings.closedDates) {
            const filtered = data.settings.closedDates
              .filter((c: ClosedDate) => c.date >= today && c.date <= limit)
              .sort((a: ClosedDate, b: ClosedDate) => a.date.localeCompare(b.date));
            setClosures(filtered);
          }

          if (data.settings.events) {
            const activeEvents = data.settings.events.filter(
              (e: EventPromo) => e.isActive && e.endDate >= today && e.startDate <= limit
            );
            setEvents(activeEvents);
          }
        }
      })
      .catch(() => {});
  }, []);

  if ((closures.length === 0 && events.length === 0) || dismissed) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
  };

  const getBadgeClasses = (color: string) => {
    switch (color) {
      case "red": return "bg-red-500/20 text-red-300 border-red-400/30";
      case "green": return "bg-green-500/20 text-green-300 border-green-400/30";
      case "blue": return "bg-blue-500/20 text-blue-300 border-blue-400/30";
      case "purple": return "bg-purple-500/20 text-purple-300 border-purple-400/30";
      default: return "bg-gold/20 text-gold border-gold/30";
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed top-[80px] left-0 right-0 z-40">
      {/* Closure notices */}
      {closures.length > 0 && (
        <div className="bg-red-950/90 backdrop-blur-sm border-b border-red-500/20">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-center relative">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              {closures.length === 1 ? (
                <p className="text-red-200 text-sm">
                  We will be <span className="font-semibold text-red-300">closed</span> on{" "}
                  <span className="font-semibold text-white">{formatDate(closures[0].date)}</span>
                  {closures[0].reason && <span className="text-red-300/80"> — {closures[0].reason}</span>}
                </p>
              ) : (
                <p className="text-red-200 text-sm">
                  Upcoming closures:{" "}
                  {closures.slice(0, 3).map((c, i) => (
                    <span key={c.date}>
                      <span className="font-semibold text-white">{formatDate(c.date)}</span>
                      <span className="text-red-300/80"> ({c.reason})</span>
                      {i < Math.min(closures.length, 3) - 1 && <span className="text-red-400"> · </span>}
                    </span>
                  ))}
                  {closures.length > 3 && <span className="text-red-300/60"> +{closures.length - 3} more</span>}
                </p>
              )}
            </div>
            <button onClick={() => setDismissed(true)} className="absolute right-4 text-red-400/50 hover:text-red-300 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Event / promo notices */}
      {events.length > 0 && (
        <div className="bg-background/90 backdrop-blur-sm border-b border-gold/10">
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {events.map((ev) => {
                const isOngoing = ev.startDate <= today && ev.endDate >= today;
                const isUpcoming = ev.startDate > today;
                return (
                  <div key={ev.title + ev.startDate} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    <span className="text-foreground/90 font-medium">{ev.title}</span>
                    {ev.discount && (
                      <span className={`px-2 py-0.5 text-xs font-semibold border ${getBadgeClasses(ev.badgeColor)}`}>
                        {ev.discount}
                      </span>
                    )}
                    <span className="text-foreground/40 text-xs">
                      {isOngoing ? `Ends ${formatDate(ev.endDate)}` : isUpcoming ? `Starts ${formatDate(ev.startDate)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
