"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RecetaBuilder } from "@/components/RecetaBuilder";

function EditarRecetaContenido() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  return <RecetaBuilder recetaIdInicial={id} />;
}

export default function EditarRecetaPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>}>
      <EditarRecetaContenido />
    </Suspense>
  );
}
