"use client";

import { useState } from "react";
import { api, ImportExcelResultado } from "@/lib/api";

const FORMATO_HOJAS = [
  {
    hoja: "Insumos",
    columnas: "Nombre | Magnitud (masa/volumen/pieza) | Tipo de uso (directo/indirecto) | Costo por unidad",
  },
  {
    hoja: "Recetas",
    columnas: "Nombre | Precio de venta | IVA (iva_16 / iva_0 / exento / no_objeto)",
  },
  {
    hoja: "Receta_Insumos",
    columnas: "Receta (nombre) | Insumo (nombre) | Cantidad usada",
  },
  {
    hoja: "Ventas",
    columnas:
      "Receta (nombre) | Cantidad vendida | Fecha (AAAA-MM-DD) | Medio de pago (efectivo/banco) | Total de venta (opcional) | Costo de insumos (opcional)",
  },
  {
    hoja: "Gastos_Fijos",
    columnas:
      "Concepto | Monto mensual | Categoria | Medio de pago (efectivo/banco) | IVA | Mes (AAAA-MM, opcional: si se omite usa el mes en curso)",
  },
];

export default function ImportarPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ImportExcelResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImportar() {
    if (!archivo) {
      setError("Selecciona primero un archivo .xlsx.");
      return;
    }
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const r = await api.importExcel(archivo);
      setResultado(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  const totalCreados =
    resultado &&
    resultado.insumos_creados +
      resultado.recetas_creadas +
      resultado.receta_insumos_creados +
      resultado.ventas_creadas +
      resultado.gastos_fijos_creados;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Carga masiva por Excel</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sube un archivo .xlsx con las hojas Insumos, Recetas, Receta_Insumos, Ventas y
          Gastos_Fijos. Las referencias entre hojas se resuelven por nombre, no por ID. El orden
          de las hojas dentro del archivo no importa: siempre se procesan en este orden.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900">Formato esperado por hoja</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-600">
          {FORMATO_HOJAS.map((f) => (
            <li key={f.hoja}>
              <span className="font-medium text-zinc-800">{f.hoja}:</span> {f.columnas}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Un insumo o receta que ya exista (mismo nombre) se actualiza en vez de duplicarse. Si
          una fila tiene un error, se omite y se reporta, sin detener el resto de la importacion.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <label className="flex flex-col gap-2 text-sm">
          Archivo Excel (.xlsx)
          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleImportar}
          disabled={cargando || !archivo}
          className="btn-primary mt-6 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {cargando ? "Importando..." : "Importar archivo"}
        </button>
      </div>

      {resultado && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">
            Resultado ({totalCreados} registros importados)
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-600 sm:grid-cols-3">
            <li>Insumos: {resultado.insumos_creados}</li>
            <li>Recetas: {resultado.recetas_creadas}</li>
            <li>Receta-Insumos: {resultado.receta_insumos_creados}</li>
            <li>Ventas: {resultado.ventas_creadas}</li>
            <li>Gastos fijos: {resultado.gastos_fijos_creados}</li>
          </ul>

          {resultado.errores.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-700">
                {resultado.errores.length} fila(s) con error (se omitieron):
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-red-700">
                {resultado.errores.map((e, i) => (
                  <li key={i}>
                    Hoja &quot;{e.hoja}&quot;, fila {e.fila}: {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-green-700">Sin errores.</p>
          )}
        </div>
      )}
    </div>
  );
}
