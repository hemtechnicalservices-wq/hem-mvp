import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* If you have background/overlay layers, keep them non-interactive */}
      <div className="pointer-events-none fixed inset-0 -z-10" />

      {/* Interactive app content */}
      <div className="relative z-10 pointer-events-auto">{children}</div>
    </div>
  );
}