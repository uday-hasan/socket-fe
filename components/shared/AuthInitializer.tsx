"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

// Mount this once near the root of your app (e.g. in layout.tsx). It does
// not render anything — its only job is calling fetchMe() once, so a page
// refresh with a still-valid accessToken cookie restores the session
// (and reconnects the socket) instead of showing a logged-out state.
export function AuthInitializer() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return null;
}
