import { foodCostSemaforo } from "@/lib/types";

const ESTILOS = {
  verde: "bg-green-100 text-green-800",
  amarillo: "bg-yellow-100 text-yellow-800",
  rojo: "bg-red-100 text-red-800",
};

export function FoodCostBadge({ foodCostPct }: { foodCostPct: number }) {
  const nivel = foodCostSemaforo(foodCostPct);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ESTILOS[nivel]}`}>
      {foodCostPct.toFixed(1)}%
    </span>
  );
}
