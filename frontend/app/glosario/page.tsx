const TERMINOS = [
  {
    termino: "Costo de alimentos %",
    definicion:
      "Que tan caro te sale hacer un platillo, comparado con lo que cobras por el. Se calcula: (costo de insumos del platillo / precio de venta) x 100. Un rango sano suele ser 25-35%.",
  },
  {
    termino: "Margen de contribucion",
    definicion:
      "Lo que te queda de cada venta despues de pagar los insumos de ese platillo (precio de venta menos costo de insumos). Con eso pagas tus gastos fijos y, lo que sobra, es tu ganancia.",
  },
  {
    termino: "Punto de equilibrio",
    definicion:
      "Cuantos platillos necesitas vender al mes para que tus ventas cubran exactamente tus gastos fijos (renta, nomina, luz, etc.), sin ganar ni perder.",
  },
  {
    termino: "Rentabilidad neta %",
    definicion:
      "El porcentaje de tus ventas que realmente se convierte en ganancia, despues de descontar insumos y gastos fijos.",
  },
  {
    termino: "Ticket promedio",
    definicion: "En promedio, cuanto gasta un cliente cada vez que te compra.",
  },
  {
    termino: "Insumo directo",
    definicion:
      "Un ingrediente que se puede medir exactamente en cada platillo (ej. la carne de un taco). Su costo se calcula solo a partir de lo que pagaste por comprarlo.",
  },
  {
    termino: "Insumo indirecto",
    definicion:
      "Algo que usas en general pero no puedes medir platillo por platillo (ej. servilletas, gas, salsas de mesa). Tu registras cuanto gastaste en el al mes, sin receta.",
  },
  {
    termino: "Snapshot de costos",
    definicion:
      "Cuando registras una venta, el costo de esa venta queda congelado para siempre. Si despues suben los precios de tus insumos, tus ventas pasadas no cambian.",
  },
  {
    termino: "IVA (16%, 0%, exento, no objeto)",
    definicion:
      "La etiqueta fiscal de cada platillo o gasto. La mayoria de los platillos llevan IVA 16%. Algunos productos tienen tasa 0% o estan exentos. Nomina, por ejemplo, no es objeto de este impuesto.",
  },
  {
    termino: "Estado de Resultados",
    definicion:
      "Un resumen formal de tus ingresos, costos, gastos y ganancia del mes. Es el documento que normalmente pide un banco o una entidad de financiamiento.",
  },
  {
    termino: "Analisis ABC de platillos",
    definicion:
      "Clasifica tus platillos en 4 grupos segun que tanto se venden y que tanto margen dejan: estrellas (los mejores), caballos de batalla (se venden mucho, dejan poco), enigmas (dejan mucho, se venden poco) y perros (ni se venden ni dejan margen).",
  },
  {
    termino: "Trazabilidad efectivo/banco",
    definicion:
      "Que porcentaje de tus ventas y gastos pasan por el banco (tarjeta, transferencia) en vez de efectivo. Entre mas alto, mas facil es comprobarle tu historial a una entidad de financiamiento.",
  },
];

export default function GlosarioPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Glosario</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Explicaciones en lenguaje sencillo de los terminos financieros que usa la app.
        </p>
      </div>

      <dl className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {TERMINOS.map((t) => (
          <div key={t.termino} className="p-5">
            <dt className="font-medium text-zinc-900">{t.termino}</dt>
            <dd className="mt-1 text-sm text-zinc-600">{t.definicion}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
