"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { api } from "@/lib/api";

interface Mensaje {
  autor: "usuario" | "asistente";
  texto: string;
}

export function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto]);

  async function handleEnviar(e: FormEvent) {
    e.preventDefault();
    const texto = pregunta.trim();
    if (!texto || enviando) return;

    setMensajes((prev) => [...prev, { autor: "usuario", texto }]);
    setPregunta("");
    setEnviando(true);
    try {
      const { respuesta } = await api.chatAsistente(texto);
      setMensajes((prev) => [...prev, { autor: "asistente", texto: respuesta }]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        { autor: "asistente", texto: `No pude responder: ${(err as Error).message}` },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {abierto && (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Asistente de tu negocio</p>
              <p className="text-xs text-zinc-500">Pregunta sobre tus cifras de este mes</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {mensajes.length === 0 && (
              <p className="text-sm text-zinc-500">
                Preguntame, por ejemplo: &quot;¿Como voy este mes?&quot; o &quot;¿Cual es mi platillo mas
                vendido?&quot;. Esta informacion se comparte con OpenAI para poder responderte.
              </p>
            )}
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.autor === "usuario"
                    ? "ml-auto bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {m.texto}
              </div>
            ))}
            {enviando && <div className="max-w-[85%] rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">Pensando...</div>}
            <div ref={finRef} />
          </div>

          <form onSubmit={handleEnviar} className="flex items-center gap-2 border-t border-zinc-200 p-3">
            <input
              type="text"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              disabled={enviando}
            />
            <button
              type="submit"
              disabled={enviando || !pregunta.trim()}
              aria-label="Enviar"
              className="btn-primary rounded-md p-2 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar chat" : "Abrir chat del asistente"}
        className="btn-primary flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
      >
        {abierto ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
