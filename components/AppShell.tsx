import type { ReactNode } from "react";
import Image from "next/image";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed right-4 top-4 z-0 rounded-lg border border-[#3b3218] bg-black/45 p-1 opacity-80 backdrop-blur">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={48}
          height={48}
          className="h-12 w-12 rounded-md object-contain"
          priority
        />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute top-1/3 right-8 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
      </div>
      <div className="relative z-10 pointer-events-auto">{children}</div>
    </div>
  );
}
