"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Radio } from "lucide-react";

// Adjust this to match your actual route from router/index.ts if it differs
const NOTIFY_URL = "http://localhost:8000/api/v1/notification";
// const NOTIFY_URL = "https://socket-be.udayhasan.dev/api/v1/notification";

type SubmitState = "idle" | "loading" | "success" | "error";

const Page = () => {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setState("loading");

    try {
      const res = await fetch(NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Request failed");

      setState("success");
      setMessage("");
      // Reset back to idle after a couple seconds so the form is reusable
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg">
            <Radio className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg leading-tight">
              Broadcast notification
            </h1>
            <p className="text-slate-500 text-xs">
              Sent instantly to every connected client
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="message"
              className="block text-xs font-medium text-slate-500 mb-2"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="e.g. Scheduled maintenance starts at 10 PM UTC"
              className="w-full resize-none rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading" || !message.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium py-2.5 transition-colors"
          >
            {state === "loading" ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send broadcast
              </>
            )}
          </button>

          {state === "success" && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Notification broadcast successfully
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Failed to send — check the server is running
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Page;
