"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { TIPS } from "@/lib/tips";

// Algunos tips tienen ~50 palabras (ej. rentabilidad vs. flujo de efectivo) — 15s da tiempo
// razonable de leerlos sin prisa antes de que rote solo.
const INTERVALO_MS = 15000;

export function TipsWidget() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const tip = TIPS[indice];

  function anterior() {
    setIndice((i) => (i === 0 ? TIPS.length - 1 : i - 1));
  }

  function siguiente() {
    setIndice((i) => (i === TIPS.length - 1 ? 0 : i + 1));
  }

  // Rota solo cada INTERVALO_MS. Usar anterior/siguiente reinicia la cuenta (indice esta en las
  // dependencias), y pasar el mouse encima la pausa para poder leer con calma.
  useEffect(() => {
    if (pausado) return;
    const timer = setInterval(siguiente, INTERVALO_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, pausado]);

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-5"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-700">
          {tip.texto}
          {tip.href && (
            <Link href={tip.href} className="ml-1.5 whitespace-nowrap font-medium text-zinc-900 hover:underline">
              Ir alla &rarr;
            </Link>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={anterior}
          aria-label="Tip anterior"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs text-zinc-400">
          {indice + 1}/{TIPS.length}
        </span>
        <button
          type="button"
          onClick={siguiente}
          aria-label="Siguiente tip"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
