"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { HelpIcon } from "@/components/HelpIcon";
import { CompraInsumo, Insumo, MedioPago, MEDIO_PAGO_LABEL, UNIDADES_COMPRA, UNIDAD_BASE } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton } from "@/components/RowActions";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ComprasInsumosPage() {
  const [compras, setCompras] = useState<CompraInsumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [insumoId, setInsumoId] = useState<number | "">("");
  const [fecha, setFecha] = useState(hoyISO());
  const [unidadCompra, setUnidadCompra] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [cantidadComprada, setCantidadComprada] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("banco");
  const [actualizarCosto, setActualizarCosto] = useState(true);

  const { periodo, setPeriodo } = usePeriodo();

  function cargar() {
    setLoading(true);
    Promise.all([api.getComprasInsumo(), api.getInsumos()])
      .then(([c, i]) => {
        setCompras(c);
        setInsumos(i);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  const insumosDirectos = insumos.filter((i) => i.tipo_uso === "directo");
  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const insumoSeleccionado = insumoId ? insumosById.get(insumoId) : undefined;

  function handleSelectInsumo(id: number | "") {
    setInsumoId(id);
    const insumo = id ? insumosById.get(id) : undefined;
    setUnidadCompra(insumo ? UNIDADES_COMPRA[insumo.magnitud][0].value : "");
  }

  const costoCalculado = useMemo(() => {
    if (!insumoSeleccionado) return null;
    const precio = parseFloat(precioCompra);
    const cantidad = parseFloat(cantidadComprada);
    if (!precio || !cantidad) return null;
    const factor =
      UNIDADES_COMPRA[insumoSeleccionado.magnitud].find((u) => u.value === unidadCompra)?.factor ?? 1;
    return precio / (cantidad * factor);
  }, [insumoSeleccionado, precioCompra, cantidadComprada, unidadCompra]);

  function limpiarFormulario() {
    setEditandoId(null);
    setInsumoId("");
    setUnidadCompra("");
    setFecha(hoyISO());
    setPrecioCompra("");
    setCantidadComprada("");
    setMedioPago("banco");
    setActualizarCosto(true);
  }

  function handleEditar(compra: CompraInsumo) {
    setEditandoId(compra.id);
    setInsumoId(compra.insumo_id);
    setFecha(compra.fecha);
    setUnidadCompra(compra.unidad_compra);
    setPrecioCompra(String(compra.precio_compra));
    setCantidadComprada(String(compra.cantidad_comprada));
    setMedioPago(compra.medio_pago);
    setActualizarCosto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!insumoId || !fecha || !costoCalculado || costoCalculado <= 0) {
      setError("Selecciona un insumo y completa precio y cantidad validos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        insumo_id: insumoId,
        fecha,
        unidad_compra: unidadCompra,
        cantidad_comprada: parseFloat(cantidadComprada),
        precio_compra: parseFloat(precioCompra),
        costo_por_unidad_base: costoCalculado,
        medio_pago: medioPago,
        actualizar_costo_referencia: actualizarCosto,
      };
      if (editandoId) {
        await api.updateCompraInsumo(editandoId, payload);
      } else {
        await api.createCompraInsumo(payload);
      }
      limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta compra?")) return;
    try {
      await api.deleteCompraInsumo(id);
      if (editandoId === id) limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const comprasDelPeriodo = compras.filter((c) => fechaEnPeriodo(c.fecha, periodo));
  const totalPeriodo = comprasDelPeriodo.reduce((sum, c) => sum + Number(c.precio_compra), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Compra de insumos"
        subtitle="Registra cada compra de un insumo directo con su fecha y medio de pago. Esto alimenta tu Flujo de Efectivo."
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Insumo
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={insumoId}
              onChange={(e) => handleSelectInsumo(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Selecciona un insumo directo</option>
              {insumosDirectos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Fecha de la compra
            <input
              type="date"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          {insumoSeleccionado && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Unidad de compra
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  value={unidadCompra}
                  onChange={(e) => setUnidadCompra(e.target.value)}
                >
                  {UNIDADES_COMPRA[insumoSeleccionado.magnitud].map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  Precio pagado ($)
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

              <fieldset className="flex flex-col gap-1 text-sm">
                <legend className="mb-1">Medio de pago</legend>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={medioPago === "efectivo"}
                      onChange={() => setMedioPago("efectivo")}
                    />
                    Efectivo
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={medioPago === "banco"}
                      onChange={() => setMedioPago("banco")}
                    />
                    Banco
                  </label>
                </div>
              </fieldset>

              <p className="flex items-center self-end text-sm text-zinc-600">
                {costoCalculado
                  ? `Nuevo costo de referencia: ${formatMoney(costoCalculado, 4)} por ${UNIDAD_BASE[insumoSeleccionado.magnitud]}`
                  : "El costo por unidad se calcula solo."}
                <HelpIcon texto="Esto es diferente del costo de tus platillos vendidos (eso ya se calcula solo con el catalogo de Insumos). Aqui registras cuando pagaste por tus insumos, para saber cuanto dinero salio de tu bolsillo." />
              </p>

              <label className="flex items-center gap-2 self-end text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={actualizarCosto}
                  onChange={(e) => setActualizarCosto(e.target.checked)}
                />
                Actualizar el costo de referencia de este insumo con este precio
                <HelpIcon texto="Marcado: el catalogo de Insumos usara este precio para costear tus recetas de aqui en adelante. Desmarcalo si esta compra fue algo atipico (una compra de emergencia a un precio distinto de lo normal) y no quieres que cambie tu costeo." />
              </label>
            </>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar compra"}
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-900">Historial</h2>
          <PeriodSelector value={periodo} onChange={setPeriodo} />
        </div>

        {!loading && (
          <p className="text-sm text-zinc-600">
            Total comprado ({PERIODO_LABEL[periodo].toLowerCase()}):{" "}
            <span className="font-medium text-zinc-900">{formatMoney(totalPeriodo)}</span>
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Precio pagado</th>
              <th className="px-4 py-3 font-medium">Medio de pago</th>
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
            {!loading && comprasDelPeriodo.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  No hay compras registradas en {PERIODO_LABEL[periodo].toLowerCase()}.
                </td>
              </tr>
            )}
            {[...comprasDelPeriodo]
              .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
              .map((compra) => {
                const insumo = insumosById.get(compra.insumo_id);
                return (
                  <tr key={compra.id}>
                    <td className="px-4 py-3">{compra.fecha}</td>
                    <td className="px-4 py-3">{insumo?.nombre ?? "(eliminado)"}</td>
                    <td className="px-4 py-3">
                      {compra.cantidad_comprada} {compra.unidad_compra}
                    </td>
                    <td className="px-4 py-3">{formatMoney(Number(compra.precio_compra))}</td>
                    <td className="px-4 py-3">{MEDIO_PAGO_LABEL[compra.medio_pago]}</td>
                    <td className="px-4 py-3 text-right">
                      <EditarButton onClick={() => handleEditar(compra)} />
                      <EliminarButton onClick={() => handleDelete(compra.id)} />
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
