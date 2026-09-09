import { ArrowDown, ArrowUp } from "lucide-react";

export function TrendBadge({ variacionPct }: { variacionPct: number | null }) {
  if (variacionPct === null) return null;

  const subio = variacionPct >= 0;
  const Icon = subio ? ArrowUp : ArrowDown;
  const clase = subio ? "text-green-700" : "text-red-600";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${clase}`}>
      <Icon size={12} />
      {Math.abs(variacionPct).toFixed(0)}% vs. periodo anterior
    </span>
  );
}
