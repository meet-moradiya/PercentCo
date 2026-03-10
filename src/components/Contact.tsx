"use client";

import { useState, FormEvent } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface InquiryData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function Contact() {
  const sectionRef = useScrollReveal();
  const [formData, setFormData] = useState<InquiryData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.message) {
      setErrorMsg("All fields are required.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again later.");
      setStatus("error");
    }
  };

  const handleChange = (field: keyof InquiryData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (status === "error") setStatus("idle");
  };

  const inputClass =
    "w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-foreground/30 focus:border-gold focus:outline-none transition-colors duration-300";

  return (
    <section id="contact" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">Get in Touch</span>
          <h2 className="font-display text-4xl md:text-5xl mt-2 mb-4">Contact Us</h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
          <p className="text-foreground/50 mt-6 max-w-xl mx-auto">
            Have a question, feedback, or a special request? Send us a message and our team will get back to you shortly.
          </p>
        </div>

        {status === "success" ? (
          <div className="max-w-lg mx-auto text-center border border-gold/30 p-12 bg-gold/5 animate-in fade-in duration-500">
            <svg className="w-16 h-16 text-gold mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-2xl text-gold font-display mb-4">Message Received</h3>
            <p className="text-foreground/60 mb-8 text-sm">
              Thank you for reaching out. We will respond to your inquiry at {formData.email} as soon as possible.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="px-8 py-3 border border-gold text-gold tracking-widest uppercase text-xs hover:bg-gold hover:text-background transition-all duration-300"
            >
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="inq-name" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
                  Name *
                </label>
                <input
                  id="inq-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label htmlFor="inq-phone" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
                  Phone *
                </label>
                <input
                  id="inq-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inq-email" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
                Email *
              </label>
              <input
                id="inq-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={inputClass}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label htmlFor="inq-message" className="block text-sm text-foreground/50 mb-2 tracking-wider uppercase">
                Message *
              </label>
              <textarea
                id="inq-message"
                rows={5}
                value={formData.message}
                onChange={(e) => handleChange("message", e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="How can we help you?"
              />
            </div>

            {status === "error" && <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm text-center">{errorMsg}</div>}

            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="group relative px-12 py-4 bg-gold text-background text-sm tracking-widest uppercase font-semibold overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-gold/20 disabled:opacity-60 disabled:cursor-not-allowed w-full md:w-auto"
              >
                <span className="relative z-10">{status === "submitting" ? "Sending..." : "Send Message"}</span>
                <span className="absolute inset-0 bg-gold-light scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
