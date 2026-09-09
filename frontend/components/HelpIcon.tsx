"use client";

import { useState } from "react";

export function HelpIcon({
  texto,
  direccion = "arriba",
}: {
  texto: string;
  direccion?: "arriba" | "abajo";
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        onBlur={() => setAbierto(false)}
        aria-label="Ayuda"
        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 hover:bg-zinc-300"
      >
        ?
      </button>
      {abierto && (
        <span
          className={`absolute left-1/2 z-20 w-56 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-xs font-normal normal-case text-white shadow-lg ${
            direccion === "arriba" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {texto}
        </span>
      )}
    </span>
  );
}
