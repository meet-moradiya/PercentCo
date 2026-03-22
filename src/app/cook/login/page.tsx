"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CookLogin() {
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
      if (role === "cook") {
        router.push("/cook");
      } else if (role === "chef") {
        router.push("/chef");
      } else if (role === "admin") {
        router.push("/admin");
      } else if (role === "waiter") {
        router.push("/waiter");
      } else {
        router.push("/cook");
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
            Cook Portal
          </p>
        </div>

        <div className="bg-surface border border-surface-border p-8 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500/15 border border-orange-400/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.545 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg text-foreground font-medium">Cook Sign In</h2>
              <p className="text-xs text-muted">Access your kitchen station</p>
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
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-orange-400 focus:outline-none transition-colors"
                placeholder="cook@percentco.com"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-surface-border px-4 py-3 text-foreground placeholder-muted/50 focus:border-orange-400 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 text-white font-semibold tracking-widest uppercase text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted/60 text-xs mt-6">
          Authorized kitchen staff access only.
        </p>
      </div>
    </div>
  );
}
