import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fg-sky" aria-hidden>
        <div className="fg-sky__rings" />
        <div className="fg-sky__glow" />
      </div>
      <div className="app-content">{children}</div>
    </>
  );
}
