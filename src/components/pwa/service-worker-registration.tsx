"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) once on mount.
 * Registration is skipped in development so stale caches never
 * interfere with `next dev` hot reloading.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
