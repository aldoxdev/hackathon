"use client";

import { Calendar } from "lucide-react";
import { PERIODO_LABEL, PeriodoTipo } from "@/lib/periodo";

const OPCIONES: PeriodoTipo[] = ["mes_actual", "mes_pasado", "anio_actual", "anio_pasado", "todo"];

export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodoTipo;
  onChange: (v: PeriodoTipo) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700">
      <Calendar size={14} className="text-zinc-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodoTipo)}
        className="bg-transparent focus:outline-none"
      >
        {OPCIONES.map((o) => (
          <option key={o} value={o}>
            {PERIODO_LABEL[o]}
          </option>
        ))}
      </select>
    </label>
  );
}
