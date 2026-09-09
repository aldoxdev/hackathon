"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VentasPorMes } from "@/lib/indicadores";
import { formatMoney } from "@/lib/format";

const COLOR_VENTAS = "#2a78d6";
const COLOR_MARGEN = "#eb6834";

const MES_CORTO: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function formatearMes(mes: string): string {
  const [anio, mm] = mes.split("-");
  return `${MES_CORTO[mm] ?? mm} ${anio.slice(2)}`;
}

function TooltipPersonalizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-zinc-600">
          {p.dataKey === "ventas" ? "Ventas" : "Margen"}: {formatMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

export function VentasTrendChart({ datos }: { datos: VentasPorMes[] }) {
  if (datos.length < 2) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Necesitas ventas en al menos 2 meses distintos para ver la tendencia.
      </p>
    );
  }

  const puntos = datos.map((d) => ({ ...d, mesCorto: formatearMes(d.mes) }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: COLOR_VENTAS }} />
          Ventas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: COLOR_MARGEN }} />
          Margen de contribucion
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={puntos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" strokeWidth={1} />
          <XAxis
            dataKey="mesCorto"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<TooltipPersonalizado />} />
          <Line
            type="monotone"
            dataKey="ventas"
            stroke={COLOR_VENTAS}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fcfcfb" }}
          />
          <Line
            type="monotone"
            dataKey="margen"
            stroke={COLOR_MARGEN}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fcfcfb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
