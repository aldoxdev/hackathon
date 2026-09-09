"use client";

import {
  CartesianGrid,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

export type CategoriaAbc = "estrella" | "caballo_batalla" | "enigma" | "perro";

export interface PuntoAbc {
  nombre: string;
  unidadesVendidas: number;
  margenUnitario: number;
  categoria: CategoriaAbc;
}

const COLOR_POR_CATEGORIA: Record<CategoriaAbc, string> = {
  estrella: "#0ca30c",
  caballo_batalla: "#fab219",
  enigma: "#ec835a",
  perro: "#d03b3b",
};

const LABEL_POR_CATEGORIA: Record<CategoriaAbc, string> = {
  estrella: "Estrellas",
  caballo_batalla: "Caballos de batalla",
  enigma: "Enigmas",
  perro: "Perros",
};

const LABEL_SINGULAR_POR_CATEGORIA: Record<CategoriaAbc, string> = {
  estrella: "Estrella",
  caballo_batalla: "Caballo de batalla",
  enigma: "Enigma",
  perro: "Perro",
};

interface TooltipPayloadItem {
  payload: PuntoAbc;
}

function TooltipPersonalizado({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const punto = payload[0].payload;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-900">{punto.nombre}</p>
      <p className="text-zinc-600">{punto.unidadesVendidas} unidades vendidas</p>
      <p className="text-zinc-600">Margen por unidad: {formatMoney(punto.margenUnitario)}</p>
      <p className="mt-1" style={{ color: COLOR_POR_CATEGORIA[punto.categoria] }}>
        {LABEL_SINGULAR_POR_CATEGORIA[punto.categoria]}
      </p>
    </div>
  );
}

export function AbcScatterChart({
  puntos,
  medianaUnidades,
  medianaMargen,
}: {
  puntos: PuntoAbc[];
  medianaUnidades: number;
  medianaMargen: number;
}) {
  const categorias = Object.keys(COLOR_POR_CATEGORIA) as CategoriaAbc[];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        Cada punto es un platillo (pasa el mouse para ver el detalle). Mas a la derecha = se vende
        mas. Mas arriba = deja mas ganancia por unidad. Las lineas punteadas marcan la mediana; el
        color de cada punto ya te dice a que categoria pertenece.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#e1e0d9" strokeWidth={1} />

          <XAxis
            type="number"
            dataKey="unidadesVendidas"
            name="Unidades vendidas"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            label={{
              value: "Popularidad (unidades vendidas) →",
              position: "insideBottom",
              offset: -5,
              fontSize: 11,
              fill: "#52514e",
            }}
          />
          <YAxis
            type="number"
            dataKey="margenUnitario"
            name="Margen por unidad"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={55}
          >
            <Label
              value="Margen por unidad ($) →"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: "middle" }}
              fontSize={11}
              fill="#52514e"
            />
          </YAxis>
          <ZAxis range={[160, 160]} />
          <ReferenceLine x={medianaUnidades} stroke="#c3c2b7" strokeDasharray="3 3">
            <Label
              value="Mediana de ventas"
              position="insideTopRight"
              fontSize={10}
              fill="#898781"
            />
          </ReferenceLine>
          <ReferenceLine y={medianaMargen} stroke="#c3c2b7" strokeDasharray="3 3">
            <Label
              value="Mediana de margen"
              position="insideTopRight"
              fontSize={10}
              fill="#898781"
            />
          </ReferenceLine>
          <Tooltip content={<TooltipPersonalizado />} cursor={{ strokeDasharray: "3 3" }} />
          {categorias.map((cat) => (
            <Scatter
              key={cat}
              name={LABEL_POR_CATEGORIA[cat]}
              data={puntos.filter((p) => p.categoria === cat)}
              fill={COLOR_POR_CATEGORIA[cat]}
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              <LabelList
                dataKey="nombre"
                position="top"
                style={{ fontSize: 10, fill: "#52514e" }}
              />
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        {categorias.map((cat) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_POR_CATEGORIA[cat] }}
            />
            {LABEL_POR_CATEGORIA[cat]}
          </span>
        ))}
      </div>
    </div>
  );
}
