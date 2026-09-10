"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { HelpIcon } from "@/components/HelpIcon";
import { cerrarSesion } from "@/lib/auth";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [perfilDemo, setPerfilDemo] = useState<"restaurante" | "un_producto" | "taqueria">("taqueria");

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [eslogan, setEslogan] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#149968");
  const [colorSecundario, setColorSecundario] = useState("#123256");
  const [saldoInicialEfectivo, setSaldoInicialEfectivo] = useState("0");
  const [saldoInicialBanco, setSaldoInicialBanco] = useState("0");
  const [fechaSaldoInicial, setFechaSaldoInicial] = useState(hoyISO());

  useEffect(() => {
    api
      .getConfiguracionNegocio()
      .then((config) => {
        setNombreNegocio(config.nombre_negocio);
        setEslogan(config.eslogan ?? "");
        setLogoUrl(config.logo_url ?? "");
        setColorPrimario(config.color_primario);
        setColorSecundario(config.color_secundario);
        setSaldoInicialEfectivo(String(config.saldo_inicial_efectivo));
        setSaldoInicialBanco(String(config.saldo_inicial_banco));
        setFechaSaldoInicial(config.fecha_saldo_inicial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    if (!nombreNegocio.trim()) {
      setError("El nombre del negocio no puede quedar vacio.");
      return;
    }

    setSaving(true);
    try {
      await api.updateConfiguracionNegocio({
        nombre_negocio: nombreNegocio.trim(),
        eslogan: eslogan.trim() || null,
        logo_url: logoUrl.trim() || null,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        saldo_inicial_efectivo: parseFloat(saldoInicialEfectivo) || 0,
        saldo_inicial_banco: parseFloat(saldoInicialBanco) || 0,
        fecha_saldo_inicial: fechaSaldoInicial,
      });
      setGuardado(true);
      // recarga completa para que el nombre/colores se reflejen en el header y en toda la app
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const NOMBRES_PERFIL: Record<typeof perfilDemo, string> = {
    restaurante: "Sazon de Barrio (restaurante)",
    un_producto: "Chicharrones Dona Meche (un solo producto)",
    taqueria: "Taqueria Los Compadres (taqueria)",
  };

  function handleCerrarSesion() {
    cerrarSesion();
    router.push("/login");
  }

  async function handleResetDemo() {
    const nombrePerfil = NOMBRES_PERFIL[perfilDemo];
    const confirmado = window.confirm(
      `Esto borra TODOS tus datos (insumos, recetas, ventas, gastos) y los reemplaza con el ejemplo de "${nombrePerfil}". No se puede deshacer. ¿Continuar?`
    );
    if (!confirmado) return;

    setReseteando(true);
    try {
      await api.resetDemo(perfilDemo);
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setReseteando(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Configuracion del negocio</h1>
        <p className="mt-1 text-sm text-zinc-600">
          El nombre, eslogan, logo y colores se pueden cambiar aqui en cualquier momento; se
          reflejan en toda la app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Nombre del negocio
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Eslogan (opcional)
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={eslogan}
              onChange={(e) => setEslogan(e.target.value)}
              placeholder="Ej. Sabor casero, todos los dias"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            URL del logo (opcional)
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Color primario
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 rounded border border-zinc-300"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                />
                <span className="text-zinc-500">{colorPrimario}</span>
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Color secundario
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 rounded border border-zinc-300"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                />
                <span className="text-zinc-500">{colorSecundario}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <h2 className="flex items-center text-sm font-medium text-zinc-900">
            Saldo inicial
            <HelpIcon texto="El punto de partida de tu Flujo de Efectivo: cuanto tenias en cada cuenta a la fecha indicada. A partir de ahi se suman/restan tus ventas, compras y gastos segun su medio de pago." />
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cuanto tenias en cada cuenta antes de empezar a registrar movimientos aqui.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Efectivo / caja ($)
              <input
                type="number"
                step="0.01"
                className="rounded-md border border-zinc-300 px-3 py-2"
                value={saldoInicialEfectivo}
                onChange={(e) => setSaldoInicialEfectivo(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Banco ($)
              <input
                type="number"
                step="0.01"
                className="rounded-md border border-zinc-300 px-3 py-2"
                value={saldoInicialBanco}
                onChange={(e) => setSaldoInicialBanco(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Fecha de este saldo
              <input
                type="date"
                className="rounded-md border border-zinc-300 px-3 py-2"
                value={fechaSaldoInicial}
                onChange={(e) => setFechaSaldoInicial(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-md bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-600">Vista previa del boton principal:</span>
          <span
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            {nombreNegocio || "Mi restaurante"}
          </span>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {guardado && <p className="mb-4 text-sm text-green-700">Guardado. Recargando...</p>}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Sesion</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Cierra tu sesion de demo para volver a ver la pantalla de inicio de sesion.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCerrarSesion}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar sesion
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-sm font-medium text-red-900">Zona de datos demo</h2>
        <p className="mt-1 text-sm text-red-800">
          Borra todos los datos capturados y los reemplaza con un set de datos de ejemplo curado.
          Util para pruebas o para dejar la app lista antes de una demo.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setPerfilDemo("restaurante")}
            className={`flex-1 rounded-md border px-4 py-2 text-left text-sm transition ${
              perfilDemo === "restaurante"
                ? "border-red-400 bg-white font-medium text-red-900 ring-1 ring-red-400"
                : "border-red-200 bg-red-50 text-red-800 hover:bg-white"
            }`}
          >
            Restaurante
            <span className="block text-xs font-normal text-red-700">
              Sazon de Barrio — negocio establecido, ~$78,000/mes
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPerfilDemo("un_producto")}
            className={`flex-1 rounded-md border px-4 py-2 text-left text-sm transition ${
              perfilDemo === "un_producto"
                ? "border-red-400 bg-white font-medium text-red-900 ring-1 ring-red-400"
                : "border-red-200 bg-red-50 text-red-800 hover:bg-white"
            }`}
          >
            Un solo producto
            <span className="block text-xs font-normal text-red-700">
              Chicharrones Dona Meche — 1 receta, ~$20,000/mes
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPerfilDemo("taqueria")}
            className={`flex-1 rounded-md border px-4 py-2 text-left text-sm transition ${
              perfilDemo === "taqueria"
                ? "border-red-400 bg-white font-medium text-red-900 ring-1 ring-red-400"
                : "border-red-200 bg-red-50 text-red-800 hover:bg-white"
            }`}
          >
            Taqueria
            <span className="block text-xs font-normal text-red-700">
              Los Compadres — 10 platillos, ~$99,000/mes
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetDemo}
          disabled={reseteando}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {reseteando ? "Restableciendo..." : "Restablecer datos de ejemplo"}
        </button>
      </div>
    </div>
  );
}
