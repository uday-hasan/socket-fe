"use client";

import { useState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await login(email, password);
      // Redirect after success — swap for your router of choice
      window.location.href = "/";
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg">
            <LogIn className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-slate-900 font-semibold text-lg">Log in</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-500 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-500 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-sm font-medium py-2.5 transition-colors"
          >
            {status === "loading" ? "Logging in..." : "Log in"}
          </button>

          {formError && (
            <div className="flex items-center gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <p className="text-xs text-slate-500 text-center">
            No account?{" "}
            <a
              href="/register"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
