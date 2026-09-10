"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RotateCcw, Send, X } from "lucide-react";
import { api } from "@/lib/api";
import { ChatMessage } from "./ChatMessage";

interface Mensaje {
  autor: "usuario" | "asistente";
  texto: string;
}

const PREGUNTAS_SUGERIDAS = [
  "¿Como funciona esta aplicacion?",
  "¿Como voy este mes?",
  "¿Cual es mi platillo mas vendido?",
  "¿Que puedo hacer para mejorar mis ganancias?",
];

export function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto]);

  useEffect(() => {
    const aparecer = setTimeout(() => setMostrarBienvenida(true), 900);
    return () => clearTimeout(aparecer);
  }, []);

  function abrirChat() {
    setMostrarBienvenida(false);
    setAbierto(true);
  }

  async function enviarPregunta(texto: string) {
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

  function handleEnviar(e: FormEvent) {
    e.preventDefault();
    enviarPregunta(pregunta.trim());
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {abierto && (
        <div className="flex h-[28rem] w-80 max-h-[80vh] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl md:h-[36rem] md:w-[26rem]">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Asistente de tu negocio</p>
              <p className="text-xs text-zinc-500">Pregunta sobre tus cifras de este mes</p>
            </div>
            <div className="flex items-center gap-1">
              {mensajes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMensajes([])}
                  aria-label="Nueva conversacion"
                  title="Nueva conversacion"
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar chat"
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500">
                  Preguntame algo sobre tu negocio, o prueba una de estas:
                </p>
                <div className="flex flex-col gap-2">
                  {PREGUNTAS_SUGERIDAS.map((sugerencia) => (
                    <button
                      key={sugerencia}
                      type="button"
                      onClick={() => enviarPregunta(sugerencia)}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      {sugerencia}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-400">
                  Esta informacion se procesa con inteligencia artificial para poder responderte.
                </p>
              </div>
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
                {m.autor === "asistente" ? <ChatMessage texto={m.texto} /> : m.texto}
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

      {mostrarBienvenida && !abierto && (
        <div
          onClick={abrirChat}
          className="chat-burbuja-bienvenida relative max-w-[15rem] cursor-pointer rounded-2xl rounded-br-sm border border-zinc-200 bg-white p-4 shadow-xl"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMostrarBienvenida(false);
            }}
            aria-label="Cerrar mensaje"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-zinc-700"
          >
            <X size={12} />
          </button>
          <p className="text-sm font-semibold text-zinc-900">Soy tu asesor financiero</p>
          <p className="mt-1 text-sm text-zinc-600">¿En que te puedo ayudar?</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrirChat())}
        aria-label={abierto ? "Cerrar chat" : "Abrir chat del asistente"}
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-lg md:h-20 md:w-20 ${
          abierto ? "btn-primary" : "chat-boton-resplandor"
        }`}
      >
        {abierto ? (
          <X size={28} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/bot-asesor.png" alt="" className="h-full w-full object-cover" />
        )}
      </button>
    </div>
  );
}
