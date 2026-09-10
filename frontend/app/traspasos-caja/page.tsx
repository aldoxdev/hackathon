"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HelpIcon } from "@/components/HelpIcon";
import { DIRECCION_TRASPASO_LABEL, DireccionTraspaso, TraspasoCaja } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton } from "@/components/RowActions";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TraspasosCajaPage() {
  const [traspasos, setTraspasos] = useState<TraspasoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [fecha, setFecha] = useState(hoyISO());
  const [monto, setMonto] = useState("");
  const [direccion, setDireccion] = useState<DireccionTraspaso>("caja_a_banco");
  const [nota, setNota] = useState("");

  const { periodo, setPeriodo } = usePeriodo();

  function cargar() {
    setLoading(true);
    api
      .getTraspasosCaja()
      .then(setTraspasos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  function limpiarFormulario() {
    setEditandoId(null);
    setFecha(hoyISO());
    setMonto("");
    setDireccion("caja_a_banco");
    setNota("");
  }

  function handleEditar(t: TraspasoCaja) {
    setEditandoId(t.id);
    setFecha(t.fecha);
    setMonto(String(t.monto));
    setDireccion(t.direccion);
    setNota(t.nota ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto);
    if (!fecha || !montoNum || montoNum <= 0) {
      setError("Completa una fecha y un monto valido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fecha,
        monto: montoNum,
        direccion,
        nota: nota.trim() || null,
      };
      if (editandoId) {
        await api.updateTraspasoCaja(editandoId, payload);
      } else {
        await api.createTraspasoCaja(payload);
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
    if (!confirm("¿Eliminar este traspaso?")) return;
    try {
      await api.deleteTraspasoCaja(id);
      if (editandoId === id) limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const traspasosDelPeriodo = traspasos.filter((t) => fechaEnPeriodo(t.fecha, periodo));
  const totalCajaABanco = traspasosDelPeriodo
    .filter((t) => t.direccion === "caja_a_banco")
    .reduce((s, t) => s + Number(t.monto), 0);
  const totalBancoACaja = traspasosDelPeriodo
    .filter((t) => t.direccion === "banco_a_caja")
    .reduce((s, t) => s + Number(t.monto), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Traspasos entre caja y banco"
        subtitle={
          <>
            Registra cuando mueves dinero entre tu efectivo y tu banco (por ejemplo, depositar lo
            cobrado en caja). No es un ingreso ni un gasto — solo cambia en donde esta tu dinero.
            Alimenta tu Flujo de Efectivo.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Fecha
            <input
              type="date"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Monto ($)
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej. 5000"
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1 flex items-center">
              Direccion
              <HelpIcon texto="De caja a banco: depositas efectivo acumulado a tu cuenta. De banco a caja: retiras para tener cambio o fondo de caja chica." />
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={direccion === "caja_a_banco"}
                  onChange={() => setDireccion("caja_a_banco")}
                />
                De caja a banco
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={direccion === "banco_a_caja"}
                  onChange={() => setDireccion("banco_a_caja")}
                />
                De banco a caja
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            Nota (opcional)
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. Deposito semanal"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar traspaso"}
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
            En {PERIODO_LABEL[periodo].toLowerCase()}: depositado a banco{" "}
            <span className="font-medium text-zinc-900">{formatMoney(totalCajaABanco)}</span>, retirado
            a caja <span className="font-medium text-zinc-900">{formatMoney(totalBancoACaja)}</span>.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Direccion</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Nota</th>
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
            {!loading && traspasosDelPeriodo.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  No hay traspasos registrados en {PERIODO_LABEL[periodo].toLowerCase()}.
                </td>
              </tr>
            )}
            {[...traspasosDelPeriodo]
              .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
              .map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">{t.fecha}</td>
                  <td className="px-4 py-3">{DIRECCION_TRASPASO_LABEL[t.direccion]}</td>
                  <td className="px-4 py-3">{formatMoney(Number(t.monto))}</td>
                  <td className="px-4 py-3 text-zinc-500">{t.nota ?? ""}</td>
                  <td className="px-4 py-3 text-right">
                    <EditarButton onClick={() => handleEditar(t)} />
                    <EliminarButton onClick={() => handleDelete(t.id)} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
