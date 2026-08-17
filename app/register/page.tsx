"use client";

import { useState } from "react";
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const status = useAuthStore((s) => s.status);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await register(name, email, password);
      // Your register endpoint doesn't log the user in automatically
      // (no cookies set) — so we show a success state pointing to /login,
      // rather than redirecting straight into the app
      setSuccess(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg">
            <UserPlus className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-slate-900 font-semibold text-lg">
            Create an account
          </h1>
        </div>

        {success ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Account created — you can log in now
            </div>
            <a
              href="/login"
              className="block w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 transition-colors"
            >
              Go to login
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

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
                minLength={8}
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
              {status === "loading" ? "Creating account..." : "Register"}
            </button>

            {formError && (
              <div className="flex items-center gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Log in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
