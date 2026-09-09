"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  ChefHat,
  FileSpreadsheet,
  FileText,
  Info,
  LayoutDashboard,
  Landmark,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { BrandHeader } from "./BrandHeader";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  titulo: string;
  items: NavItem[];
}

const GRUPOS: NavGroup[] = [
  {
    titulo: "Catalogos",
    items: [
      { href: "/insumos", label: "Insumos", icon: Package },
      { href: "/recetas", label: "Recetas", icon: ChefHat },
    ],
  },
  {
    titulo: "Movimientos",
    items: [
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/egresos/compras-insumos", label: "Compra de insumos", icon: ShoppingBag },
      { href: "/consumo-indirecto", label: "Consumo indirecto", icon: Receipt },
      { href: "/gastos-fijos", label: "Gastos fijos", icon: Landmark },
      { href: "/traspasos-caja", label: "Traspasos caja-banco", icon: ArrowLeftRight },
    ],
  },
  {
    titulo: "Reportes",
    items: [
      { href: "/", label: "Resumen", icon: LayoutDashboard },
      { href: "/estado-resultados", label: "Estado de resultados", icon: FileText },
      { href: "/flujo-efectivo", label: "Flujo de efectivo", icon: Wallet },
      { href: "/abc", label: "ABC de platillos", icon: BarChart3 },
    ],
  },
  {
    titulo: "Configuracion",
    items: [
      { href: "/importar", label: "Importar Excel", icon: FileSpreadsheet },
      { href: "/glosario", label: "Glosario", icon: BookOpen },
      { href: "/alcance", label: "Alcance del MVP", icon: Info },
      { href: "/configuracion", label: "Negocio", icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col overflow-hidden border-r-2 bg-white"
      style={{ borderRightColor: "var(--brand-secondary, #123256)" }}
    >
      <div className="border-b border-zinc-200 px-5 py-5">
        <Link href="/" className="text-base font-semibold text-zinc-900">
          <BrandHeader />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {grupo.titulo}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {grupo.items.map((item) => {
                const activo =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium"
                      style={
                        activo
                          ? {
                              backgroundColor: "color-mix(in srgb, var(--brand-primary, #149968) 12%, white)",
                              color: "var(--brand-primary, #149968)",
                            }
                          : undefined
                      }
                    >
                      <span className={activo ? "" : "text-zinc-500"}>
                        <Icon size={17} />
                      </span>
                      <span className={activo ? "" : "text-zinc-700"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-zinc-200 bg-white px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mi-cuenta-conmigo-cropped.png"
          alt="Mi Cuenta Conmigo"
          className="h-[125px] w-auto object-contain"
        />
        <p className="text-center text-[11px] text-zinc-400">Gestion financiera para tu negocio</p>
      </div>
    </aside>
  );
}
