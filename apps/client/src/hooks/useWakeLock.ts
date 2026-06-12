import { useEffect } from "react";

/** Keep the screen awake while `active` (best effort; not all browsers support it). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (cancelled) void lock.release();
          else sentinel = lock;
        })
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}

export function vibrate(pattern: number | number[]): void {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}
