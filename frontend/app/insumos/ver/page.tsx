"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { HelpIcon } from "@/components/HelpIcon";
import { Insumo, MAGNITUD_LABEL, Receta, RecetaInsumo, UNIDAD_BASE } from "@/lib/types";

function VerInsumoContenido() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  const [insumo, setInsumo] = useState<Insumo | null>(null);
  const [recetaInsumos, setRecetaInsumos] = useState<RecetaInsumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getInsumo(id), api.getRecetaInsumos(), api.getRecetas()])
      .then(([i, ri, r]) => {
        setInsumo(i);
        setRecetaInsumos(ri.filter((fila) => fila.insumo_id === id));
        setRecetas(r);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const recetasById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  if (error || !insumo) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-red-600">
        {error ?? "No se encontro el insumo."}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{insumo.nombre}</h1>
          <p className="mt-1 text-sm text-zinc-600">Solo lectura. Aqui no se guarda ningun cambio.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/insumos"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Volver a Insumos
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-zinc-500">Tipo de uso</p>
          <p className="mt-1 text-lg font-medium capitalize text-zinc-900">{insumo.tipo_uso}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Magnitud</p>
          <p className="mt-1 text-lg font-medium text-zinc-900">{MAGNITUD_LABEL[insumo.magnitud]}</p>
        </div>
        <div>
          <p className="flex items-center text-xs text-zinc-500">
            Costo por unidad base
            <HelpIcon texto="Se calcula dividiendo lo que pagaste entre la cantidad comprada, convertida a la unidad base (gramos, mililitros o piezas). Ej. $160 por 1 kg = $0.16 por gramo." />
          </p>
          <p className="mt-1 text-lg font-medium text-zinc-900">
            {formatMoney(Number(insumo.costo_por_unidad_base), 4)} / {UNIDAD_BASE[insumo.magnitud]}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Se usa en estas recetas</h2>

        <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-max text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-2 font-medium">Receta</th>
              <th className="py-2 font-medium">Cantidad usada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {recetaInsumos.length === 0 && (
              <tr>
                <td className="py-4 text-zinc-500" colSpan={2}>
                  Este insumo todavia no se usa en ninguna receta.
                </td>
              </tr>
            )}
            {recetaInsumos.map((fila) => {
              const receta = recetasById.get(fila.receta_id);
              return (
                <tr key={fila.id}>
                  <td className="py-2">{receta?.nombre ?? "(receta eliminada)"}</td>
                  <td className="py-2">
                    {fila.cantidad_usada} {UNIDAD_BASE[insumo.magnitud]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default function VerInsumoPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>}>
      <VerInsumoContenido />
    </Suspense>
  );
}
