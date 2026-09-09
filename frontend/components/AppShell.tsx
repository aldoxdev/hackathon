"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BrandHeader } from "./BrandHeader";
import { PeriodoProvider } from "@/lib/periodo-context";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="text-zinc-700">
          <Menu size={22} />
        </button>
        <span className="text-sm font-semibold">
          <BrandHeader />
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <main className="flex flex-1 flex-col overflow-y-auto pt-14 md:pt-0">
        <PeriodoProvider>{children}</PeriodoProvider>
      </main>
    </div>
  );
}
