"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { PeriodoTipo } from "./periodo";

interface PeriodoContextValue {
  periodo: PeriodoTipo;
  setPeriodo: (p: PeriodoTipo) => void;
}

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

// Estado global (no por pantalla): al elegir un periodo en cualquier pantalla que lo use,
// se mantiene igual al navegar a otra, en vez de reiniciar a "Este mes" cada vez.
export function PeriodoProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodo] = useState<PeriodoTipo>("mes_actual");
  return <PeriodoContext.Provider value={{ periodo, setPeriodo }}>{children}</PeriodoContext.Provider>;
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error("usePeriodo debe usarse dentro de PeriodoProvider");
  return ctx;
}
