"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
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

      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gold tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
            PERCENTCO
          </h1>
          <p className="text-muted text-sm tracking-widest uppercase mt-2">
            Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-surface-border p-8 transition-colors duration-300">
          <h2 className="text-xl text-foreground mb-6 font-medium">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-muted text-sm mb-2 tracking-wider uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                placeholder="admin@percentco.com"
              />
            </div>

            <div>
              <label className="block text-muted text-sm mb-2 tracking-wider uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-background font-semibold tracking-widest uppercase text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted/60 text-xs mt-6">
          Protected area. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
