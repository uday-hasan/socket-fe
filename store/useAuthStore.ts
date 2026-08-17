import { create } from "zustand";
import { fetcher } from "@/lib/fetcher"; // adjust path to wherever your fetcher actually lives
import { ApiError } from "@/lib/ApiError";
import { useSocketStore } from "./useSocketStore";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Adjust this shape if your backend's sendResponse wraps differently —
// this assumes { success, message, data: { user } }, matching the
// controller pattern you showed earlier (res.status(...).json({ data })).
interface AuthResponse {
  data: User;
}

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Call this once when the app loads — checks whether the httpOnly
  // accessToken cookie from a PREVIOUS session is still valid, so a page
  // refresh doesn't force the user to log in again unnecessarily
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const res = await fetcher<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      set({ user: res.data, status: "authenticated" });

      // THIS is the connection between auth and realtime: only NOW, once
      // we know a valid session exists (and the accessToken cookie is set),
      // do we attempt the WebSocket connection. Connecting any earlier
      // would just fail the auth gate on the backend every time.
      useSocketStore.getState().connect();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      set({ status: "unauthenticated", error: message });
      throw err; // let the form component show its own error state too
    }
  },

  register: async (name, email, password) => {
    set({ status: "loading", error: null });
    try {
      // Your register endpoint doesn't log the user in automatically
      // (no cookies are set by authService.register) — so after a
      // successful registration, we still need an explicit login step
      await fetcher("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword: password,
        }),
      });
      set({ status: "unauthenticated" }); // registered, but not yet logged in
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Registration failed";
      set({ status: "unauthenticated", error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails (e.g. network drop), we still want to
      // clear local state below — the user clicked logout, that intent
      // should win regardless of whether the server call succeeded
    }

    set({ user: null, status: "unauthenticated" });

    // Explicit disconnect, not just letting it drop — this closes the
    // socket immediately rather than waiting for the server to notice.
    // See socketStore.ts for why this matters for the reconnect logic.
    useSocketStore.getState().disconnect();
  },

  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const res = await fetcher<AuthResponse>("/auth/me", { method: "GET" });
      set({ user: res.data, status: "authenticated" });
      useSocketStore.getState().connect();
    } catch {
      // No valid session — this is a NORMAL outcome for a first-time
      // visitor, not an error worth surfacing to the user
      set({ user: null, status: "unauthenticated" });
    }
  },
}));
