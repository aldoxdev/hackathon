"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  agruparVentasPorMes,
  calcularIndicadoresPeriodo,
  calcularPuntoEquilibrioUnidades,
  calcularRentabilidadNetaPct,
  calcularVariacionPct,
} from "@/lib/indicadores";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";
import { ConfiguracionNegocio, ConsumoIndirecto, GastoFijo, Insumo, Receta, Venta } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { FoodCostBadge } from "@/components/FoodCostBadge";
import { HelpIcon } from "@/components/HelpIcon";
import { PageHeader } from "@/components/PageHeader";
import { TrendBadge } from "@/components/TrendBadge";
import { VentasTrendChart } from "@/components/VentasTrendChart";
import { RentabilidadMeter } from "@/components/RentabilidadMeter";

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

export default function Home() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [consumoIndirecto, setConsumoIndirecto] = useState<ConsumoIndirecto[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
  const [loading, setLoading] = useState(true);
  const { periodo } = usePeriodo();

  useEffect(() => {
    Promise.all([
      api.getInsumos(),
      api.getRecetas(),
      api.getVentas(),
      api.getConsumoIndirecto(),
      api.getGastosFijos(),
      api.getConfiguracionNegocio(),
    ])
      .then(([i, r, v, ci, g, c]) => {
        setInsumos(i);
        setRecetas(r);
        setVentas(v);
        setConsumoIndirecto(ci);
        setGastosFijos(g);
        setConfig(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  const checklist: ChecklistItem[] = [
    { label: "Configura tu negocio", done: config?.nombre_negocio !== "Mi restaurante", href: "/configuracion" },
    { label: "Da de alta un insumo", done: insumos.length > 0, href: "/insumos" },
    { label: "Crea una receta", done: recetas.length > 0, href: "/recetas" },
    { label: "Registra una venta", done: ventas.length > 0, href: "/ventas" },
    { label: "Registra tus gastos fijos", done: gastosFijos.length > 0, href: "/gastos-fijos" },
  ];
  const pasosPendientes = checklist.filter((p) => !p.done);

  // Mostrar la tendencia solo cuando la comparacion contra el periodo anterior es justa
  // (mes completo vs mes completo). En año actual seria mes-transcurrido vs año completo pasado,
  // y en "todo" no existe un periodo anterior, asi que en esos casos se omite.
  const mostrarTendencia = periodo === "mes_actual" || periodo === "mes_pasado";

  const ind = calcularIndicadoresPeriodo(ventas, consumoIndirecto, periodo);
  const indAnterior = mostrarTendencia
    ? calcularIndicadoresPeriodo(ventas, consumoIndirecto, periodo, true)
    : null;

  const gastosFijosDelPeriodo = gastosFijos.filter((g) => fechaEnPeriodo(g.periodo, periodo));
  const gastosFijosTotales = gastosFijosDelPeriodo.reduce((s, g) => s + Number(g.monto_mensual), 0);

  // El punto de equilibrio es una pregunta mensual por definicion ("cuantos platillos AL MES"),
  // asi que siempre usa los gastos fijos del mes de calendario actual, sin importar que periodo
  // este viendo el usuario en el resto del dashboard.
  const gastosFijosMesActual = gastosFijos
    .filter((g) => fechaEnPeriodo(g.periodo, "mes_actual"))
    .reduce((s, g) => s + Number(g.monto_mensual), 0);

  const puntoEquilibrio = calcularPuntoEquilibrioUnidades(
    gastosFijosMesActual,
    ind.margenContribucionPromedioUnitario
  );
  const rentabilidadNetaPct = calcularRentabilidadNetaPct(
    ind.ventasTotales,
    ind.margenContribucionTotal,
    gastosFijosTotales
  );
  const utilidadNeta = ind.margenContribucionTotal - gastosFijosTotales;
  const gastosFijosAnteriorTotales = indAnterior
    ? gastosFijos
        .filter((g) => fechaEnPeriodo(g.periodo, periodo, true))
        .reduce((s, g) => s + Number(g.monto_mensual), 0)
    : 0;
  const rentabilidadNetaAnteriorPct = indAnterior
    ? calcularRentabilidadNetaPct(
        indAnterior.ventasTotales,
        indAnterior.margenContribucionTotal,
        gastosFijosAnteriorTotales
      )
    : null;

  const ventasDelPeriodoBanco = ventas.filter(
    (v) => v.medio_pago === "banco" && fechaEnPeriodo(v.fecha, periodo)
  );
  const totalBancoPeriodo = ventasDelPeriodoBanco.reduce((s, v) => s + Number(v.total_venta), 0);
  const pctBanco = ind.ventasTotales > 0 ? (totalBancoPeriodo / ind.ventasTotales) * 100 : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title={config?.eslogan ? config.eslogan : "Bienvenido"}
        subtitle={
          <>
            Viendo: <strong>{PERIODO_LABEL[periodo]}</strong>. Los indicadores se actualizan
            solos conforme registras ventas y gastos.
          </>
        }
        mostrarPeriodo
      />

      {pasosPendientes.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Primeros pasos</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    item.done
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700"
                      : "flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-transparent"
                  }
                >
                  ✓
                </span>
                {item.done ? (
                  <span className="text-zinc-500 line-through">{item.label}</span>
                ) : (
                  <Link href={item.href} className="text-zinc-900 hover:underline">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IndicadorCard
          titulo="Ventas"
          valor={formatMoney(ind.ventasTotales)}
          tendencia={
            indAnterior && <TrendBadge variacionPct={calcularVariacionPct(ind.ventasTotales, indAnterior.ventasTotales)} />
          }
        />
        <IndicadorCard
          titulo="Costo de alimentos %"
          ayuda="Que tan caro te sale hacer tus platillos comparado con lo que cobras por ellos. Un rango sano suele ser 25-35%."
          valor={<FoodCostBadge foodCostPct={ind.foodCostPct} />}
        />
        <IndicadorCard
          titulo="Margen de contribucion"
          ayuda="Lo que te queda de tus ventas despues de pagar los insumos. Con eso pagas tus gastos fijos y, lo que sobra, es tu ganancia."
          valor={formatMoney(ind.margenContribucionTotal)}
          tendencia={
            indAnterior && (
              <TrendBadge
                variacionPct={calcularVariacionPct(
                  ind.margenContribucionTotal,
                  indAnterior.margenContribucionTotal
                )}
              />
            )
          }
        />
        <IndicadorCard
          titulo="Punto de equilibrio"
          ayuda="Cuantos platillos necesitas vender al mes para cubrir exactamente tus gastos fijos, sin ganar ni perder."
          valor={puntoEquilibrio !== null ? `${Math.ceil(puntoEquilibrio)} platillos/mes` : "N/D"}
        />
        <IndicadorCard
          titulo="Rentabilidad neta"
          ayuda="El porcentaje de tus ventas que se convierte en ganancia real, despues de insumos y gastos fijos."
          valor={`${rentabilidadNetaPct.toFixed(1)}%`}
          tendencia={
            rentabilidadNetaAnteriorPct !== null && (
              <TrendBadge variacionPct={calcularVariacionPct(rentabilidadNetaPct, rentabilidadNetaAnteriorPct)} />
            )
          }
        />
        <IndicadorCard
          titulo="Ticket promedio"
          ayuda="En promedio, cuanto gasta un cliente cada vez que te compra."
          valor={formatMoney(ind.ticketPromedio)}
        />
        <IndicadorCard
          titulo="% de ventas por banco"
          ayuda="Que porcentaje de tus ventas paso por el banco (tarjeta, transferencia) en vez de efectivo. Entre mas alto, mejor te ve una entidad de financiamiento."
          valor={`${pctBanco.toFixed(0)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-2">
          <p className="text-sm font-medium text-zinc-900">Ventas y margen por mes</p>
          <p className="text-xs text-zinc-500">Todo tu historial registrado.</p>
          <div className="mt-4 min-w-0">
            <VentasTrendChart datos={agruparVentasPorMes(ventas, consumoIndirecto)} />
          </div>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-900">Rentabilidad neta</p>
          <p className="text-xs text-zinc-500">{PERIODO_LABEL[periodo]}</p>
          <div className="mt-4">
            <RentabilidadMeter pct={rentabilidadNetaPct} montoPesos={utilidadNeta} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/estado-resultados" className="btn-primary rounded-md px-4 py-2 text-sm font-medium">
          Ver Estado de Resultados
        </Link>
        <Link
          href="/abc"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Ver analisis ABC de platillos
        </Link>
      </div>
    </div>
  );
}

function IndicadorCard({
  titulo,
  valor,
  ayuda,
  tendencia,
}: {
  titulo: string;
  valor: ReactNode;
  ayuda?: string;
  tendencia?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="flex items-center text-xs text-zinc-500">
        {titulo}
        {ayuda && <HelpIcon texto={ayuda} />}
      </p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{valor}</p>
      {tendencia && <div className="mt-1">{tendencia}</div>}
    </div>
  );
}
