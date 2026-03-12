"use client";

import { useState, useEffect, FormEvent } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  occasion: string;
  requests: string;
}

interface FormErrors {
  [key: string]: string;
}

const occasions = ["None", "Birthday", "Anniversary", "Date Night", "Business Dinner", "Engagement", "Other"];

function generateTimeSlots(openTime: string, closeTime: string, interval: number): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  for (let m = openMin; m <= closeMin; m += interval) {
    const h24 = Math.floor(m / 60);
    const mins = m % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
    slots.push(`${h12}:${mins.toString().padStart(2, "0")} ${ampm}`);
  }
  return slots;
}

// Client-side time parser (same logic as server-side but for the browser)
function parseTimeSlot(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export default function Reservation() {
  const sectionRef = useScrollReveal();
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>([]);
  const [closedDates, setClosedDates] = useState<{ date: string; reason: string }[]>([]);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    guests: "2",
    occasion: "None",
    requests: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Fetch restaurant settings to build dynamic time slots and closed dates
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const slots = generateTimeSlots(data.settings.openTime || "18:00", data.settings.closeTime || "22:00", data.settings.slotInterval || 30);
          setAllTimeSlots(slots);
          setClosedDates(data.settings.closedDates || []);
        }
      })
      .catch(() => {
        setAllTimeSlots(generateTimeSlots("18:00", "22:00", 30));
      });
  }, []);

  // Filter out past time slots when selected date is today
  const today = new Date().toISOString().split("T")[0];
  const filteredTimeSlots =
    formData.date === today
      ? allTimeSlots.filter((slot) => {
          const slotMin = parseTimeSlot(slot);
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          return slotMin > nowMin;
        })
      : allTimeSlots;

  // Check if selected date is a closed date
  const closedDateEntry = formData.date ? closedDates.find((c) => c.date === formData.date) : null;
  const isClosedDate = !!closedDateEntry;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[\d\s()-]{7,15}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid phone number";
    }
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.time) newErrors.time = "Time is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // Clear availability when date/time/guests change
    if (["date", "time", "guests"].includes(field)) {
      setAvailability(null);
    }
  };

  // Availability check
  const [availability, setAvailability] = useState<{
    available: boolean;
    availableTables: number;
    totalTables: number;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Auto-check availability when date, time, and guests are all set
  const checkAvailability = async (date: string, time: string, guests: string) => {
    if (!date || !time) return;
    setCheckingAvailability(true);
    try {
      const res = await fetch(`/api/availability?date=${date}&time=${time}&guests=${guests}`);
      if (res.ok) {
        const data = await res.json();
        setAvailability(data);
      }
    } catch {
      // Silently fail — availability check is a nice-to-have
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Trigger availability check when date/time/guests change
  const handleFieldWithAvailability = (field: keyof FormData, value: string) => {
    handleChange(field, value);
    const next = { ...formData, [field]: value };
    if (next.date && next.time) {
      checkAvailability(next.date, next.time, next.guests);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-background border ${
      errors[field] ? "border-red-500/70" : "border-surface-border"
    } px-4 py-3 text-foreground placeholder-foreground/30 focus:border-gold focus:outline-none transition-colors duration-300`;

  // today already defined above for slot filtering

  if (submitted) {
    return (
      <section id="reservation" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8 bg-surface">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-gold rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-4xl text-gold">Reservation Confirmed</h2>
          <p className="text-foreground/60 text-lg">
            Thank you, {formData.firstName}. We&apos;ve reserved your table for <span className="text-gold">{formData.guests} guests</span> on{" "}
            <span className="text-gold">{formData.date}</span> at <span className="text-gold">{formData.time}</span>.
          </p>
          <p className="text-foreground/40 text-sm">A confirmation has been sent to {formData.email}. We look forward to welcoming you.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                date: "",
                time: "",
                guests: "2",
                occasion: "None",
                requests: "",
              });
            }}
            className="mt-4 px-8 py-3 border border-gold text-gold tracking-widest uppercase text-sm hover:bg-gold hover:text-background transition-all duration-300"
          >
            Make Another Reservation
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="reservation" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">Book Your Experience</span>
          <h2 className="font-display text-4xl md:text-5xl mt-2 mb-4">Reserve a Table</h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
          <p className="text-foreground/50 mt-6 max-w-xl mx-auto">
            Secure your evening at Percentco. For parties of 8 or more, please contact us directly.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="grid md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="res-firstName" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              First Name *
            </label>
            <input
              id="res-firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={inputClass("firstName")}
            />
            {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="res-lastName" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Last Name *
            </label>
            <input
              id="res-lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={inputClass("lastName")}
            />
            {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="res-email" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Email *
            </label>
            <input
              id="res-email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={inputClass("email")}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="res-phone" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Phone *
            </label>
            <input
              id="res-phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={inputClass("phone")}
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="res-date" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Date *
            </label>
            <input
              id="res-date"
              type="date"
              min={today}
              value={formData.date}
              onChange={(e) => handleFieldWithAvailability("date", e.target.value)}
              className={`${inputClass("date")} scheme-dark`}
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
            {isClosedDate && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                Restaurant is closed on this date — {closedDateEntry!.reason}
              </p>
            )}
          </div>

          {/* Time */}
          <div>
            <label htmlFor="res-time" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Time *
            </label>
            <select
              id="res-time"
              value={formData.time}
              onChange={(e) => handleFieldWithAvailability("time", e.target.value)}
              className={inputClass("time")}
            >
              <option value="">{formData.date === today && filteredTimeSlots.length === 0 ? "No slots available today" : "Select a time"}</option>
              {filteredTimeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.time && <p className="text-red-400 text-xs mt-1">{errors.time}</p>}
          </div>

          {/* Guests */}
          <div>
            <label htmlFor="res-guests" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Number of Guests
            </label>
            <select
              id="res-guests"
              value={formData.guests}
              onChange={(e) => handleFieldWithAvailability("guests", e.target.value)}
              className={inputClass("guests")}
            >
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n} {n === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Indicator */}
          {(availability || checkingAvailability) && formData.date && formData.time && (
            <div className="md:col-span-2">
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-foreground/40 text-sm">
                  <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                  Checking availability...
                </div>
              ) : availability?.available ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {availability.availableTables} of {availability.totalTables} tables available
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  No tables available for this slot — please try a different date or time
                </div>
              )}
            </div>
          )}

          {/* Occasion */}
          <div className="md:col-span-2">
            <label htmlFor="res-occasion" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Occasion
            </label>
            <select
              id="res-occasion"
              value={formData.occasion}
              onChange={(e) => handleChange("occasion", e.target.value)}
              className={inputClass("occasion")}
            >
              {occasions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Special Requests */}
          <div className="md:col-span-2">
            <label htmlFor="res-requests" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Special Requests
            </label>
            <textarea
              id="res-requests"
              rows={4}
              placeholder="Dietary requirements, seating preferences, special arrangements..."
              value={formData.requests}
              onChange={(e) => handleChange("requests", e.target.value)}
              className={`${inputClass("requests")} resize-none`}
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2 text-center mt-4">
            {apiError && <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">{apiError}</div>}
            <button
              type="submit"
              id="reserve-submit"
              disabled={submitting || isClosedDate}
              className="group relative px-12 py-4 bg-gold text-background text-sm tracking-widest uppercase font-semibold overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-gold/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{submitting ? "Reserving..." : "Reserve Now"}</span>
              <span className="absolute inset-0 bg-gold-light scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
            </button>
            <p className="text-foreground/30 text-xs mt-4">
              By reserving, you agree to our cancellation policy. Please arrive 15 minutes before your reservation.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
