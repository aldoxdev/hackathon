"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

// Solo iconos, sin texto ni colores de acento propios: "Ver" y "Editar" quedan en gris
// neutro (mismo tono, no compiten con el color de marca del negocio) y solo "Eliminar" -la
// unica accion irreversible- usa rojo. Antes "Editar" era azul fijo, pero ese azul no
// aparece en ningun otro lado de la paleta y se sentia fuera de lugar; el gris neutro es
// la convencion mas comun (neutro = accion segura, rojo = destructiva) y funciona sin
// importar que color de marca elija el negocio. El title/aria-label reemplaza el texto
// visible para que el icono siga siendo entendible y accesible.

const BASE = "inline-flex items-center justify-center rounded p-1.5 transition-colors";
const NEUTRO = `${BASE} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900`;
const PELIGRO = `${BASE} text-red-600 hover:bg-red-50`;

export function VerLink({ href }: { href: string }) {
  return (
    <Link href={href} title="Ver" aria-label="Ver" className={`mr-1 ${NEUTRO}`}>
      <Eye size={16} />
    </Link>
  );
}

export function EditarLink({ href }: { href: string }) {
  return (
    <Link href={href} title="Editar" aria-label="Editar" className={`mr-1 ${NEUTRO}`}>
      <Pencil size={16} />
    </Link>
  );
}

export function EditarButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Editar" aria-label="Editar" className={`mr-1 ${NEUTRO}`}>
      <Pencil size={16} />
    </button>
  );
}

export function EliminarButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Eliminar" aria-label="Eliminar" className={PELIGRO}>
      <Trash2 size={16} />
    </button>
  );
}
