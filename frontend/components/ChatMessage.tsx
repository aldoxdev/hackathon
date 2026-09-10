import Link from "next/link";
import { Fragment, ReactNode } from "react";

// Orden importa: primero el caso de un link envuelto en negritas (**[texto](/ruta)**), que el
// modelo escribe seguido — si no se prueba primero, la alternativa de negrita generica "gana" y
// se traga el link completo como texto plano dentro de un <strong>.
const PATRON_INLINE =
  /\*\*\[([^\]]+)\]\((\/[^)]*)\)\*\*|\*\*(.+?)\*\*|\[([^\]]+)\]\((\/[^)]*)\)/g;

function renderLink(texto: string, href: string, key: string) {
  return (
    <Link key={key} href={href} className="font-medium underline" style={{ color: "var(--brand-primary)" }}>
      {texto}
    </Link>
  );
}

function formatearLinea(linea: string, key: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let ultimo = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  PATRON_INLINE.lastIndex = 0;
  while ((match = PATRON_INLINE.exec(linea)) !== null) {
    if (match.index > ultimo) partes.push(linea.slice(ultimo, match.index));
    if (match[1] !== undefined) {
      // link envuelto en negritas: **[texto](/ruta)**
      partes.push(<strong key={`${key}-${i}`}>{renderLink(match[1], match[2], `${key}-${i}-link`)}</strong>);
    } else if (match[3] !== undefined) {
      partes.push(<strong key={`${key}-${i}`}>{match[3]}</strong>);
    } else {
      partes.push(renderLink(match[4], match[5], `${key}-${i}`));
    }
    ultimo = PATRON_INLINE.lastIndex;
    i++;
  }
  if (ultimo < linea.length) partes.push(linea.slice(ultimo));
  return partes;
}

interface Bloque {
  tipo: "parrafo" | "lista";
  lineas: string[];
}

interface ItemLista {
  texto: string;
  hijos: string[];
}

function agruparPorIndentacion(lineas: string[]): ItemLista[] {
  const items: ItemLista[] = [];
  for (const linea of lineas) {
    const indent = linea.match(/^\s*/)?.[0].length ?? 0;
    const contenido = linea.replace(/^\s*(\d+\.|-)\s+/, "");
    if (indent === 0 || items.length === 0) {
      items.push({ texto: contenido, hijos: [] });
    } else {
      items[items.length - 1].hijos.push(contenido);
    }
  }
  return items;
}

export function ChatMessage({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  const bloques: Bloque[] = [];
  for (const linea of lineas) {
    if (linea.trim() === "") continue;
    const esLista = /^\s*(\d+\.|-)\s+/.test(linea);
    const tipo: Bloque["tipo"] = esLista ? "lista" : "parrafo";
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.tipo === tipo) {
      ultimo.lineas.push(linea);
    } else {
      bloques.push({ tipo, lineas: [linea] });
    }
  }

  return (
    <div className="space-y-2">
      {bloques.map((bloque, bi) => {
        if (bloque.tipo === "lista") {
          const numerada = /^\s*\d+\./.test(bloque.lineas[0]);
          const ListaTag = numerada ? "ol" : "ul";
          const items = agruparPorIndentacion(bloque.lineas);
          return (
            <ListaTag key={bi} className={numerada ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
              {items.map((item, ii) => (
                <li key={ii}>
                  {formatearLinea(item.texto, `${bi}-${ii}`)}
                  {item.hijos.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 pt-1">
                      {item.hijos.map((hijo, hi) => (
                        <li key={hi}>{formatearLinea(hijo, `${bi}-${ii}-${hi}`)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ListaTag>
          );
        }
        return (
          <Fragment key={bi}>
            {bloque.lineas.map((linea, li) => (
              <p key={li}>{formatearLinea(linea, `${bi}-${li}`)}</p>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
