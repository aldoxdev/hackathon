"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { FoodCostBadge } from "@/components/FoodCostBadge";
import { HelpIcon } from "@/components/HelpIcon";
import { formatMoney } from "@/lib/format";
import {
  Insumo,
  OrigenReceta,
  TASA_IVA_LABEL,
  TasaIva,
  UNIDAD_BASE,
} from "@/lib/types";

const TASAS_IVA: TasaIva[] = ["iva_16", "iva_0", "exento", "no_objeto"];

interface FilaInsumo {
  id: number; // id real de receta_insumo si ya esta guardada, o negativo si es temporal (receta aun no creada)
  insumo_id: number;
  cantidad_usada: number;
}

export function RecetaBuilder({ recetaIdInicial }: { recetaIdInicial: number | null }) {
  const router = useRouter();
  const esNueva = recetaIdInicial === null;

  const [recetaId, setRecetaId] = useState<number | null>(recetaIdInicial);
  const [nombre, setNombre] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [tasaIva, setTasaIva] = useState<TasaIva>("iva_16");
  const [origen, setOrigen] = useState<OrigenReceta>("manual");

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [filas, setFilas] = useState<FilaInsumo[]>([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState<number | "">("");
  const [cantidadInput, setCantidadInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const todosInsumos = await api.getInsumos();
        setInsumos(todosInsumos);

        if (recetaIdInicial !== null) {
          const [receta, todasRecetaInsumos] = await Promise.all([
            api.getReceta(recetaIdInicial),
            api.getRecetaInsumos(),
          ]);
          setNombre(receta.nombre);
          setPrecioVenta(String(receta.precio_venta));
          setTasaIva(receta.tasa_iva);
          setOrigen(receta.origen);
          setFilas(
            todasRecetaInsumos
              .filter((ri) => ri.receta_id === recetaIdInicial)
              .map((ri) => ({ id: ri.id, insumo_id: ri.insumo_id, cantidad_usada: ri.cantidad_usada }))
          );
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [recetaIdInicial]);

  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const insumosDisponibles = insumos.filter((i) => !filas.some((f) => f.insumo_id === i.id));
  const insumoSeleccionado = selectedInsumoId ? insumosById.get(selectedInsumoId) : undefined;

  const costoTotal = filas.reduce((total, fila) => {
    const insumo = insumosById.get(fila.insumo_id);
    if (!insumo) return total;
    return total + fila.cantidad_usada * Number(insumo.costo_por_unidad_base);
  }, 0);
  const precioNum = parseFloat(precioVenta) || 0;
  const foodCostPct = precioNum > 0 ? (costoTotal / precioNum) * 100 : 0;

  async function handleAgregarInsumo() {
    setError(null);
    const cantidad = parseFloat(cantidadInput);
    if (!selectedInsumoId || !cantidad || cantidad <= 0) {
      setError("Selecciona un insumo y una cantidad valida.");
      return;
    }
    try {
      if (recetaId) {
        const nueva = await api.createRecetaInsumo({
          receta_id: recetaId,
          insumo_id: selectedInsumoId,
          cantidad_usada: cantidad,
        });
        setFilas((prev) => [...prev, { id: nueva.id, insumo_id: selectedInsumoId, cantidad_usada: cantidad }]);
      } else {
        setFilas((prev) => [...prev, { id: -(prev.length + 1), insumo_id: selectedInsumoId, cantidad_usada: cantidad }]);
      }
      setSelectedInsumoId("");
      setCantidadInput("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleQuitarInsumo(fila: FilaInsumo) {
    try {
      if (fila.id > 0) {
        await api.deleteRecetaInsumo(fila.id);
      }
      setFilas((prev) => prev.filter((f) => f.id !== fila.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleGuardarReceta(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const precio = parseFloat(precioVenta);
    if (!nombre.trim() || !precio || precio <= 0) {
      setError("Completa el nombre y el precio de venta.");
      return;
    }

    setSaving(true);
    try {
      if (recetaId) {
        await api.updateReceta(recetaId, { nombre: nombre.trim(), precio_venta: precio, tasa_iva: tasaIva, origen });
      } else {
        const nueva = await api.createReceta({
          nombre: nombre.trim(),
          precio_venta: precio,
          tasa_iva: tasaIva,
          origen: "manual",
        });
        for (const fila of filas) {
          await api.createRecetaInsumo({
            receta_id: nueva.id,
            insumo_id: fila.insumo_id,
            cantidad_usada: fila.cantidad_usada,
          });
        }
      }
      router.push("/recetas");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {esNueva ? "Nueva receta" : `Editar: ${nombre}`}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Agrega insumos de la lista y mira el costo de alimentos % actualizarse al instante.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleGuardarReceta} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Nombre del platillo
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Hamburguesa clasica"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Precio de venta ($)
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="Ej. 120"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="flex items-center">
              Tratamiento fiscal (IVA)
              <HelpIcon texto="La mayoria de los platillos llevan IVA 16%. Algunos productos tienen tasa 0% o estan exentos." />
            </span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={tasaIva}
              onChange={(e) => setTasaIva(e.target.value as TasaIva)}
            >
              {TASAS_IVA.map((t) => (
                <option key={t} value={t}>
                  {TASA_IVA_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-6 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar receta"}
        </button>
        <Link href="/recetas" className="ml-4 text-sm text-zinc-600 hover:underline">
          Cancelar
        </Link>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Insumos de la receta</h2>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Insumo
            <select
              className="min-w-[200px] rounded-md border border-zinc-300 px-3 py-2"
              value={selectedInsumoId}
              onChange={(e) => setSelectedInsumoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecciona un insumo</option>
              {insumosDisponibles.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cantidad usada {insumoSeleccionado ? `(${UNIDAD_BASE[insumoSeleccionado.magnitud]})` : ""}
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-32 rounded-md border border-zinc-300 px-3 py-2"
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
              placeholder="Ej. 150"
            />
          </label>
          <button
            type="button"
            onClick={handleAgregarInsumo}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Agregar
          </button>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-2 font-medium">Insumo</th>
              <th className="py-2 font-medium">Cantidad</th>
              <th className="py-2 font-medium">Subtotal</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filas.length === 0 && (
              <tr>
                <td className="py-4 text-zinc-500" colSpan={4}>
                  Aun no agregas insumos a esta receta.
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
                  <td className="py-2">{formatMoney(subtotal)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleQuitarInsumo(fila)}
                      className="text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">Costo total de insumos</span>
          <span className="font-medium text-zinc-900">{formatMoney(costoTotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3">
          <span className="flex items-center text-sm text-zinc-600">
            Costo de alimentos %
            <HelpIcon texto="Que tan caro te sale este platillo comparado con lo que cobras por el. Un rango sano suele ser 25-35%." />
          </span>
          <FoodCostBadge foodCostPct={foodCostPct} />
        </div>
      </div>
    </div>
  );
}
