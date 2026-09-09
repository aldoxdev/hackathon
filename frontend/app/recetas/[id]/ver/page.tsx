"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { FoodCostBadge } from "@/components/FoodCostBadge";
import { formatMoney } from "@/lib/format";
import { Insumo, Receta, RecetaInsumo, TASA_IVA_LABEL, UNIDAD_BASE } from "@/lib/types";

export default function VerRecetaPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [receta, setReceta] = useState<Receta | null>(null);
  const [filas, setFilas] = useState<RecetaInsumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getReceta(id), api.getRecetaInsumos(), api.getInsumos()])
      .then(([r, todasRecetaInsumos, todosInsumos]) => {
        setReceta(r);
        setFilas(todasRecetaInsumos.filter((ri) => ri.receta_id === id));
        setInsumos(todosInsumos);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const costoTotal = filas.reduce((total, fila) => {
    const insumo = insumosById.get(fila.insumo_id);
    if (!insumo) return total;
    return total + fila.cantidad_usada * Number(insumo.costo_por_unidad_base);
  }, 0);
  const foodCostPct =
    receta && Number(receta.precio_venta) > 0 ? (costoTotal / Number(receta.precio_venta)) * 100 : 0;

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  if (error || !receta) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">
        {error ?? "No se encontro la receta."}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{receta.nombre}</h1>
          <p className="mt-1 text-sm text-zinc-600">Solo lectura. Aqui no se guarda ningun cambio.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/recetas/${receta.id}`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Editar
          </Link>
          <Link href="/recetas" className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:underline">
            Volver
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-zinc-500">Precio de venta</p>
          <p className="mt-1 text-lg font-medium text-zinc-900">{formatMoney(Number(receta.precio_venta))}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">IVA</p>
          <p className="mt-1 text-lg font-medium text-zinc-900">{TASA_IVA_LABEL[receta.tasa_iva]}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Costo de alimentos %</p>
          <div className="mt-1">
            <FoodCostBadge foodCostPct={foodCostPct} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Insumos de la receta</h2>

        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-2 font-medium">Insumo</th>
              <th className="py-2 font-medium">Cantidad</th>
              <th className="py-2 font-medium">Costo por unidad</th>
              <th className="py-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filas.length === 0 && (
              <tr>
                <td className="py-4 text-zinc-500" colSpan={4}>
                  Esta receta todavia no tiene insumos agregados.
                </td>
              </tr>
            )}
            {filas.map((fila) => {
              const insumo = insumosById.get(fila.insumo_id);
              if (!insumo) return null;
              const subtotal = fila.cantidad_usada * Number(insumo.costo_por_unidad_base);
              return (
                <tr key={fila.id}>
                  <td className="py-2">{insumo.nombre}</td>
                  <td className="py-2">
                    {fila.cantidad_usada} {UNIDAD_BASE[insumo.magnitud]}
                  </td>
                  <td className="py-2">
                    {formatMoney(Number(insumo.costo_por_unidad_base), 4)} / {UNIDAD_BASE[insumo.magnitud]}
                  </td>
                  <td className="py-2">{formatMoney(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">Costo total de insumos</span>
          <span className="font-medium text-zinc-900">{formatMoney(costoTotal)}</span>
        </div>
      </div>
    </div>
  );
}
