"use client";

import { useState, FormEvent } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface FormData {
  name: string;
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

const timeSlots = [
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM",
];

const occasions = [
  "None", "Birthday", "Anniversary", "Date Night",
  "Business Dinner", "Engagement", "Other",
];

export default function Reservation() {
  const sectionRef = useScrollReveal();
  const [formData, setFormData] = useState<FormData>({
    name: "",
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
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
  };

  const inputClass = (field: string) =>
    `w-full bg-background border ${
      errors[field] ? "border-red-500/70" : "border-surface-border"
    } px-4 py-3 text-foreground placeholder-foreground/30 focus:border-gold focus:outline-none transition-colors duration-300`;

  // Today's date for min attribute
  const today = new Date().toISOString().split("T")[0];

  if (submitted) {
    return (
      <section id="reservation" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8 bg-surface">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-gold rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-gold">
            Reservation Confirmed
          </h2>
          <p className="text-foreground/60 text-lg">
            Thank you, {formData.name}. We&apos;ve reserved your table for{" "}
            <span className="text-gold">{formData.guests} guests</span> on{" "}
            <span className="text-gold">{formData.date}</span> at{" "}
            <span className="text-gold">{formData.time}</span>.
          </p>
          <p className="text-foreground/40 text-sm">
            A confirmation has been sent to {formData.email}. We look forward to welcoming you.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                name: "", email: "", phone: "", date: "",
                time: "", guests: "2", occasion: "None", requests: "",
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
    <section
      id="reservation"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 lg:px-8 bg-surface"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Book Your Experience
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mt-2 mb-4">
            Reserve a Table
          </h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
          <p className="text-foreground/50 mt-6 max-w-xl mx-auto">
            Secure your evening at Percentco. For parties of 8 or more, please
            contact us directly.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Name */}
          <div>
            <label htmlFor="res-name" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Full Name *
            </label>
            <input
              id="res-name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={inputClass("name")}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
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
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
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
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
            )}
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
              onChange={(e) => handleChange("date", e.target.value)}
              className={`${inputClass("date")} [color-scheme:dark]`}
            />
            {errors.date && (
              <p className="text-red-400 text-xs mt-1">{errors.date}</p>
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
              onChange={(e) => handleChange("time", e.target.value)}
              className={inputClass("time")}
            >
              <option value="">Select a time</option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-red-400 text-xs mt-1">{errors.time}</p>
            )}
          </div>

          {/* Guests */}
          <div>
            <label htmlFor="res-guests" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
              Number of Guests
            </label>
            <select
              id="res-guests"
              value={formData.guests}
              onChange={(e) => handleChange("guests", e.target.value)}
              className={inputClass("guests")}
            >
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n} {n === 1 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
          </div>

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
            <button
              type="submit"
              id="reserve-submit"
              className="group relative px-12 py-4 bg-gold text-background text-sm tracking-widest uppercase font-semibold overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-gold/20"
            >
              <span className="relative z-10">Reserve Now</span>
              <span className="absolute inset-0 bg-gold-light scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
            </button>
            <p className="text-foreground/30 text-xs mt-4">
              By reserving, you agree to our cancellation policy. Please arrive
              15 minutes before your reservation.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
