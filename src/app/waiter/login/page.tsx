"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function WaiterLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const role = data.admin?.role;
      if (role === "waiter") {
        router.push("/waiter");
      } else if (role === "admin") {
        router.push("/admin");
      } else if (role === "chef") {
        router.push("/chef");
      } else {
        router.push("/waiter");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gold tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
            PERCENTCO
          </h1>
          <p className="text-muted text-sm tracking-widest uppercase mt-2">
            Service Portal
          </p>
        </div>

        <div className="bg-surface border border-surface-border p-8 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/15 border border-blue-400/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg text-foreground font-medium">Waiter Sign In</h2>
              <p className="text-xs text-muted">Access the service display system</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-muted text-sm mb-2 tracking-wider uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-blue-400 focus:outline-none transition-colors"
                placeholder="waiter@percentco.com"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-blue-400 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white font-semibold tracking-widest uppercase text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted/60 text-xs mt-6">
          Service staff access only.
        </p>
      </div>
    </div>
  );
}
