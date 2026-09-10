"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { calcularCostoReceta } from "@/lib/costeo";
import { Insumo, Receta, RecetaInsumo, TASA_IVA_LABEL } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { FoodCostBadge } from "@/components/FoodCostBadge";
import { EditarLink, EliminarButton, VerLink } from "@/components/RowActions";

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetaInsumos, setRecetaInsumos] = useState<RecetaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setLoading(true);
    Promise.all([api.getRecetas(), api.getInsumos(), api.getRecetaInsumos()])
      .then(([r, i, ri]) => {
        setRecetas(r);
        setInsumos(i);
        setRecetaInsumos(ri);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta receta? También se eliminan sus insumos asociados.")) return;
    try {
      await api.deleteReceta(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const insumosById = new Map(insumos.map((i) => [i.id, i]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Recetas</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Arma tus platillos a partir de los insumos ya registrados y revisa su costo de alimentos %.
          </p>
        </div>
        <Link
          href="/recetas/nueva"
          className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
        >
          Nueva receta
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Precio de venta</th>
              <th className="px-4 py-3 font-medium">Costo insumos</th>
              <th className="px-4 py-3 font-medium">Costo de alimentos %</th>
              <th className="px-4 py-3 font-medium">IVA</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && recetas.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  Aun no hay recetas registradas.
                </td>
              </tr>
            )}
            {recetas.map((receta) => {
              const costo = calcularCostoReceta(receta.id, recetaInsumos, insumosById);
              const foodCostPct = receta.precio_venta > 0 ? (costo / receta.precio_venta) * 100 : 0;
              return (
                <tr key={receta.id}>
                  <td className="px-4 py-3">
                    <Link href={`/recetas/ver?id=${receta.id}`} className="hover:underline">
                      {receta.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatMoney(Number(receta.precio_venta))}</td>
                  <td className="px-4 py-3">{formatMoney(costo)}</td>
                  <td className="px-4 py-3">
                    <FoodCostBadge foodCostPct={foodCostPct} />
                  </td>
                  <td className="px-4 py-3">{TASA_IVA_LABEL[receta.tasa_iva]}</td>
                  <td className="px-4 py-3 text-right">
                    <VerLink href={`/recetas/ver?id=${receta.id}`} />
                    <EditarLink href={`/recetas/editar?id=${receta.id}`} />
                    <EliminarButton onClick={() => handleDelete(receta.id)} />
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
