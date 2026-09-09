import { formatMoney } from "@/lib/format";

const RADIO = 54;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

function colorPorRentabilidad(pct: number): { fill: string; label: string } {
  if (pct >= 15) return { fill: "#0ca30c", label: "Saludable" };
  if (pct >= 0) return { fill: "#fab219", label: "Ajustada" };
  return { fill: "#d03b3b", label: "Perdidas" };
}

export function RentabilidadMeter({ pct, montoPesos }: { pct: number; montoPesos?: number }) {
  const { fill, label } = colorPorRentabilidad(pct);
  // El arco solo representa 0-100%; valores negativos o >100 se recortan solo para el trazo visual.
  const fraccion = Math.min(Math.max(pct, 0), 100) / 100;
  const offset = CIRCUNFERENCIA * (1 - fraccion);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg viewBox="0 0 130 130" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="65" cy="65" r={RADIO} fill="none" stroke="#e1e0d9" strokeWidth="12" />
          <circle
            cx="65"
            cy="65"
            r={RADIO}
            fill="none"
            stroke={fill}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="text-2xl font-semibold text-zinc-900">{pct.toFixed(1)}%</span>
      </div>
      {montoPesos !== undefined && (
        <span className="text-3xl font-bold" style={{ color: fill }}>
          {formatMoney(montoPesos)}
        </span>
      )}
      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: fill }} />
        {label}
      </div>
    </div>
  );
}
