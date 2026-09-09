"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Insumo,
  MAGNITUD_LABEL,
  Magnitud,
  TipoUsoInsumo,
  UNIDADES_COMPRA,
  UNIDAD_BASE,
} from "@/lib/types";
import { HelpIcon } from "@/components/HelpIcon";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton, VerLink } from "@/components/RowActions";

const MAGNITUDES: Magnitud[] = ["masa", "volumen", "pieza"];

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [tipoUso, setTipoUso] = useState<TipoUsoInsumo>("directo");
  const [magnitud, setMagnitud] = useState<Magnitud>("masa");

  // Insumo directo: se captura la compra y el costo por unidad base se calcula solo.
  const [unidadCompra, setUnidadCompra] = useState(UNIDADES_COMPRA["masa"][0].value);
  const [precioCompra, setPrecioCompra] = useState("");
  const [cantidadComprada, setCantidadComprada] = useState("");

  // Insumo indirecto: costo de referencia capturado a mano.
  const [costoManual, setCostoManual] = useState("");

  // Al editar, el costo se ajusta directamente (no se reconstruye la compra original).
  const [costoEdicion, setCostoEdicion] = useState("");

  function cargarInsumos() {
    setLoading(true);
    api
      .getInsumos()
      .then(setInsumos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarInsumos();
  }, []);

  function handleMagnitudChange(nueva: Magnitud) {
    setMagnitud(nueva);
    setUnidadCompra(UNIDADES_COMPRA[nueva][0].value);
  }

  const costoCalculado = useMemo(() => {
    const precio = parseFloat(precioCompra);
    const cantidad = parseFloat(cantidadComprada);
    if (!precio || !cantidad) return null;
    const factor =
      UNIDADES_COMPRA[magnitud].find((u) => u.value === unidadCompra)?.factor ?? 1;
    return precio / (cantidad * factor);
  }, [precioCompra, cantidadComprada, unidadCompra, magnitud]);

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setTipoUso("directo");
    setMagnitud("masa");
    setUnidadCompra(UNIDADES_COMPRA["masa"][0].value);
    setPrecioCompra("");
    setCantidadComprada("");
    setCostoManual("");
    setCostoEdicion("");
  }

  function handleEditar(insumo: Insumo) {
    setEditandoId(insumo.id);
    setNombre(insumo.nombre);
    setTipoUso(insumo.tipo_uso);
    setMagnitud(insumo.magnitud);
    setCostoEdicion(String(insumo.costo_por_unidad_base));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const costoPorUnidadBase = editandoId
      ? parseFloat(costoEdicion)
      : tipoUso === "directo"
        ? costoCalculado
        : parseFloat(costoManual);
    if (!nombre.trim() || !costoPorUnidadBase || costoPorUnidadBase <= 0) {
      setError("Completa el nombre y los datos de costo antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        magnitud,
        tipo_uso: tipoUso,
        costo_por_unidad_base: costoPorUnidadBase,
      };
      if (editandoId) {
        await api.updateInsumo(editandoId, payload);
      } else {
        await api.createInsumo(payload);
      }
      limpiarFormulario();
      cargarInsumos();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este insumo? Si esta en uso por alguna receta, no se podra eliminar.")) return;
    try {
      await api.deleteInsumo(id);
      if (editandoId === id) limpiarFormulario();
      cargarInsumos();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Insumos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Da de alta los ingredientes que usas en tus recetas (directos) y los de uso general
          como servilletas o gas (indirectos).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Nombre del insumo
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Carne de res"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Magnitud
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={magnitud}
              onChange={(e) => handleMagnitudChange(e.target.value as Magnitud)}
            >
              {MAGNITUDES.map((m) => (
                <option key={m} value={m}>
                  {MAGNITUD_LABEL[m]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
            <legend className="mb-1 flex items-center">
              Tipo de uso
              <HelpIcon texto="Directo: se puede medir exactamente por platillo (ej. la carne de un taco). Indirecto: uso general que no se mide por platillo (ej. servilletas, gas), su costo se captura a mano cada mes." />
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={tipoUso === "directo"}
                  onChange={() => setTipoUso("directo")}
                />
                Directo (se mide por platillo)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={tipoUso === "indirecto"}
                  onChange={() => setTipoUso("indirecto")}
                />
                Indirecto (uso general)
              </label>
            </div>
          </fieldset>

          {editandoId ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center">
                Costo por unidad ({UNIDAD_BASE[magnitud]}) ($)
                <HelpIcon texto="Este numero se actualiza a mano cada vez que cambie el precio de tu proveedor." />
              </span>
              <input
                type="number"
                step="0.0001"
                min="0"
                className="rounded-md border border-zinc-300 px-3 py-2"
                value={costoEdicion}
                onChange={(e) => setCostoEdicion(e.target.value)}
              />
            </label>
          ) : tipoUso === "directo" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Unidad de compra
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  value={unidadCompra}
                  onChange={(e) => setUnidadCompra(e.target.value)}
                >
                  {UNIDADES_COMPRA[magnitud].map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  Precio de compra ($)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="rounded-md border border-zinc-300 px-3 py-2"
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(e.target.value)}
                    placeholder="Ej. 180"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Cantidad comprada
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="rounded-md border border-zinc-300 px-3 py-2"
                    value={cantidadComprada}
                    onChange={(e) => setCantidadComprada(e.target.value)}
                    placeholder="Ej. 1"
                  />
                </label>
              </div>
              <p className="flex items-center self-end text-sm text-zinc-600 sm:col-span-2">
                {costoCalculado
                  ? `Costo calculado: ${formatMoney(costoCalculado, 4)} por ${UNIDAD_BASE[magnitud]}`
                  : "El costo por unidad se calcula solo a partir de la compra."}
                <HelpIcon texto="Este costo es tu precio de referencia vigente, no un promedio de tus compras pasadas. Para actualizarlo mas adelante, edita el insumo aqui, o registra una compra en Movimientos > Compra de insumos (con la opcion de actualizar el costo marcada)." />
              </p>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              Costo de referencia por {UNIDAD_BASE[magnitud]} ($)
              <input
                type="number"
                step="0.0001"
                min="0"
                className="rounded-md border border-zinc-300 px-3 py-2"
                value={costoManual}
                onChange={(e) => setCostoManual(e.target.value)}
                placeholder="Ej. 0.05"
              />
            </label>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar insumo"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancelar edicion
            </button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Magnitud</th>
              <th className="px-4 py-3 font-medium">
                <span className="flex items-center">
                  Costo por unidad base
                  <HelpIcon
                    direccion="abajo"
                    texto="Se calcula dividiendo lo que pagaste entre la cantidad comprada, convertida a la unidad base (gramos, mililitros o piezas). Ej. $160 por 1 kg = $0.16 por gramo."
                  />
                </span>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && insumos.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  Aun no hay insumos registrados.
                </td>
              </tr>
            )}
            {insumos.map((insumo) => (
              <tr key={insumo.id}>
                <td className="px-4 py-3">{insumo.nombre}</td>
                <td className="px-4 py-3 capitalize">{insumo.tipo_uso}</td>
                <td className="px-4 py-3">{MAGNITUD_LABEL[insumo.magnitud]}</td>
                <td className="px-4 py-3">
                  {formatMoney(Number(insumo.costo_por_unidad_base), 4)} / {UNIDAD_BASE[insumo.magnitud]}
                </td>
                <td className="px-4 py-3 text-right">
                  <VerLink href={`/insumos/ver?id=${insumo.id}`} />
                  <EditarButton onClick={() => handleEditar(insumo)} />
                  <EliminarButton onClick={() => handleDelete(insumo.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
