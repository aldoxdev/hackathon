"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BrandHeader } from "./BrandHeader";
import { ChatWidget } from "./ChatWidget";
import { PeriodoProvider } from "@/lib/periodo-context";
import { haySesionActiva } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [listo, setListo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/login") {
      setListo(true);
      return;
    }
    if (haySesionActiva()) {
      setListo(true);
    } else {
      router.replace("/login");
    }
  }, [pathname, router]);

  // La pantalla de login se muestra sola, sin sidebar ni chat.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Mientras se checa la sesion (o si va a redirigir a /login), no mostrar nada del dashboard.
  if (!listo) {
    return null;
  }

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

      <ChatWidget />
    </div>
  );
}
