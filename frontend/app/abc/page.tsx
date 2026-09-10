"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { calcularCostoReceta } from "@/lib/costeo";
import { Insumo, Receta, RecetaInsumo, Venta } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { AbcScatterChart } from "@/components/AbcScatterChart";

type Categoria = "estrella" | "caballo_batalla" | "enigma" | "perro";

const CATEGORIA_INFO: Record<Categoria, { label: string; desc: string; clase: string }> = {
  estrella: {
    label: "Estrella",
    desc: "Se vende mucho y deja buen margen. Cuidalo y destacalo en el menu.",
    clase: "bg-green-100 text-green-800",
  },
  caballo_batalla: {
    label: "Caballo de batalla",
    desc: "Se vende mucho pero con margen bajo. Busca subir precio o bajar costo.",
    clase: "bg-yellow-100 text-yellow-800",
  },
  enigma: {
    label: "Enigma",
    desc: "Deja buen margen pero casi no se vende. Promuevelo mas.",
    clase: "bg-orange-100 text-orange-800",
  },
  perro: {
    label: "Perro",
    desc: "Se vende poco y deja poco margen. Considera quitarlo del menu.",
    clase: "bg-red-100 text-red-800",
  },
};

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function AbcPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetaInsumos, setRecetaInsumos] = useState<RecetaInsumo[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getRecetas(), api.getInsumos(), api.getRecetaInsumos(), api.getVentas()]).then(
      ([r, i, ri, v]) => {
        setRecetas(r);
        setInsumos(i);
        setRecetaInsumos(ri);
        setVentas(v);
        setLoading(false);
      }
    );
  }, []);

  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const filas = recetas
    .map((receta) => {
      const unidadesVendidas = ventas
        .filter((v) => v.receta_id === receta.id)
        .reduce((s, v) => s + Number(v.cantidad_vendida), 0);
      const costoActual = calcularCostoReceta(receta.id, recetaInsumos, insumosById);
      const margenUnitario = Number(receta.precio_venta) - costoActual;
      return { receta, unidadesVendidas, margenUnitario, costoActual };
    })
    .filter((f) => f.unidadesVendidas > 0);

  const medianaUnidades = mediana(filas.map((f) => f.unidadesVendidas));
  const medianaMargen = mediana(filas.map((f) => f.margenUnitario));

  const clasificadas = filas.map((f) => {
    const altaPopularidad = f.unidadesVendidas >= medianaUnidades;
    const altoMargen = f.margenUnitario >= medianaMargen;
    let categoria: Categoria;
    if (altaPopularidad && altoMargen) categoria = "estrella";
    else if (altaPopularidad && !altoMargen) categoria = "caballo_batalla";
    else if (!altaPopularidad && altoMargen) categoria = "enigma";
    else categoria = "perro";
    return { ...f, categoria };
  });

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Analisis ABC de platillos</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Cruza popularidad (unidades vendidas) contra margen de contribucion por platillo. Es
            una foto de largo plazo para decidir que hacer con el menu, no un corte mensual.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700">
          Todo el historial
        </span>
      </div>

      {clasificadas.length < 2 ? (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Necesitas al menos 2 platillos con ventas registradas para ver este analisis.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.keys(CATEGORIA_INFO) as Categoria[]).map((cat) => (
              <div key={cat} className="rounded-lg border border-zinc-200 bg-white p-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_INFO[cat].clase}`}>
                  {CATEGORIA_INFO[cat].label}
                </span>
                <p className="mt-2 text-xs text-zinc-600">{CATEGORIA_INFO[cat].desc}</p>
              </div>
            ))}
          </div>

          <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-900">Popularidad vs. margen</p>
            <p className="text-xs text-zinc-500">
              Las lineas punteadas marcan la mediana de cada eje: ahi se dividen los 4 cuadrantes.
            </p>
            <div className="mt-4 min-w-0">
              <AbcScatterChart
                puntos={clasificadas.map((f) => ({
                  nombre: f.receta.nombre,
                  unidadesVendidas: f.unidadesVendidas,
                  margenUnitario: f.margenUnitario,
                  categoria: f.categoria,
                }))}
                medianaUnidades={medianaUnidades}
                medianaMargen={medianaMargen}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Platillo</th>
                  <th className="px-4 py-3 font-medium">Unidades vendidas</th>
                  <th className="px-4 py-3 font-medium">Precio de venta</th>
                  <th className="px-4 py-3 font-medium">Margen por unidad</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clasificadas
                  .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
                  .map((f) => (
                    <tr key={f.receta.id}>
                      <td className="px-4 py-3">{f.receta.nombre}</td>
                      <td className="px-4 py-3">{f.unidadesVendidas}</td>
                      <td className="px-4 py-3">{formatMoney(Number(f.receta.precio_venta))}</td>
                      <td className="px-4 py-3">{formatMoney(f.margenUnitario)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_INFO[f.categoria].clase}`}
                        >
                          {CATEGORIA_INFO[f.categoria].label}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
