"use client";

import { ReactNode } from "react";
import { PeriodSelector } from "./PeriodSelector";
import { usePeriodo } from "@/lib/periodo-context";

// Encabezado compartido: titulo/subtitulo siempre a la izquierda, PeriodSelector siempre en
// el mismo lugar (arriba a la derecha) en toda pantalla que lo necesite, en vez de que cada
// pantalla arme su propio layout de encabezado a mano.
export function PageHeader({
  title,
  subtitle,
  mostrarPeriodo = false,
}: {
  title: string;
  subtitle?: ReactNode;
  mostrarPeriodo?: boolean;
}) {
  const { periodo, setPeriodo } = usePeriodo();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
      </div>
      {mostrarPeriodo && <PeriodSelector value={periodo} onChange={setPeriodo} />}
    </div>
  );
}
