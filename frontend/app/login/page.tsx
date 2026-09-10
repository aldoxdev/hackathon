"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/auth";

type Vista = "login" | "registro";

export default function LoginPage() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("login");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    iniciarSesion();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mi-cuenta-conmigo-cropped.png"
          alt="Mi Cuenta Conmigo"
          className="h-24 w-auto object-contain"
        />

        <div className="mt-4 w-full rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-5 text-center">
            <p
              className="mb-1 text-xs font-semibold tracking-wide"
              style={{ color: "var(--brand-primary)" }}
            >
              BIENVENIDO
            </p>
            <h1 className="text-xl font-semibold text-zinc-900">
              {vista === "login" ? "Inicia sesion" : "Crea tu cuenta"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Entiende mejor las finanzas de tu negocio.
            </p>
          </div>

          <div className="mb-5 flex rounded-md border border-zinc-200 p-1">
            <button
              type="button"
              onClick={() => setVista("login")}
              className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition ${
                vista === "login" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => setVista("registro")}
              className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition ${
                vista === "registro" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {vista === "registro" && (
              <label className="flex flex-col gap-1 text-sm">
                Nombre del negocio
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  placeholder="Taqueria Los Compadres"
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              Correo electronico
              <input
                type="email"
                required
                className="rounded-md border border-zinc-300 px-3 py-2"
                placeholder="tu@negocio.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Contraseña
              <input
                type="password"
                required
                className="rounded-md border border-zinc-300 px-3 py-2"
                placeholder="Tu contraseña"
              />
            </label>

            <button type="submit" className="btn-primary mt-1 rounded-md px-4 py-2 text-sm font-medium">
              {vista === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">o continua con</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-md border border-zinc-200 py-2 text-sm text-zinc-400"
            >
              Google
            </button>
            <button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-md border border-zinc-200 py-2 text-sm text-zinc-400"
            >
              Facebook
            </button>
          </div>

          <div
            className="mt-5 rounded-md p-3"
            style={{ backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, white)" }}
          >
            <p className="mb-1 text-xs font-semibold" style={{ color: "var(--brand-primary)" }}>
              Modo demo
            </p>
            <p className="text-xs leading-relaxed text-zinc-600">
              Por ahora tu acceso se guarda solo en este navegador. Estamos preparando
              autenticacion real — incluyendo inicio de sesion con Google y Facebook — para una
              proxima version.
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-400">Tu negocio. Tus numeros. Tus decisiones.</p>
      </div>
    </div>
  );
}
