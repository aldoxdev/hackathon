export interface Tip {
  texto: string;
  href?: string;
}

// Tips rotativos del Dashboard: vocabulario, confusiones conceptuales reales, como interpretar
// los KPIs, flujo de trabajo, y funciones que el usuario quiza no ha descubierto. Cada uno se
// verifico contra como la app realmente calcula las cosas (lib/indicadores.ts, Estado de
// Resultados, Flujo de Efectivo) antes de escribirse aqui.
export const TIPS: Tip[] = [
  {
    texto:
      "Margen de contribucion es lo que te queda de una venta despues de pagar los insumos. No es lo mismo que tu ganancia real: todavia falta restarle los Gastos fijos para saber tu Rentabilidad neta.",
  },
  {
    texto:
      "Punto de equilibrio es cuantos platillos necesitas vender al mes solo para cubrir tus Gastos fijos, sin ganar ni perder todavia.",
  },
  {
    texto:
      "Costo de alimentos % te dice que tan caro te sale hacer un platillo comparado con lo que cobras por el. Entre 25% y 35% suele ser saludable.",
  },
  {
    texto:
      "Por que tu Rentabilidad neta y tu Flujo de efectivo no coinciden: la Rentabilidad cuenta el costo de un insumo cuando lo VENDES; el Flujo de efectivo lo cuenta cuando lo PAGAS. Si compraste insumos que aun no usas, baja tu efectivo pero tu rentabilidad todavia no lo refleja.",
  },
  {
    texto:
      "En Estado de resultados, Utilidad bruta es tu ganancia despues de insumos. Utilidad de operacion / neta es despues de TAMBIEN restar tus Gastos fijos — esa es la que de verdad te queda.",
  },
  {
    texto:
      "Punto de equilibrio se mide en platillos al mes, no en pesos, porque no todos tus platillos dejan la misma ganancia por unidad — se calcula con tu margen promedio, asi que cambia segun que tanto vendas de cada cosa.",
  },
  {
    texto:
      "Si cambias el costo de un insumo hoy, tus ventas pasadas no se recalculan — quedan congeladas con el costo de cuando las vendiste, para que tu historial siempre refleje lo que realmente paso.",
  },
  {
    texto:
      "El IVA que cobras en cada venta no es tuyo — lo recaudas para pagarselo despues al SAT. Por eso no cuenta como parte de tu utilidad.",
  },
  {
    texto:
      "Tu Rentabilidad neta se ve baja a principios de mes? Es normal: tus Gastos fijos se registran completos desde el dia 1, pero tus ventas del mes apenas se estan acumulando. Conforme avancen los dias, el numero se ajusta.",
  },
  {
    texto:
      "Un food cost % en rojo no significa que el platillo este mal — puede que solo necesite subir un poco de precio o revisar la porcion.",
  },
  {
    texto:
      "Registra cada venta el mismo dia que ocurre — asi tu Resumen siempre refleja la realidad de tu negocio.",
  },
  {
    texto:
      "Gastos fijos y Consumo indirecto se capturan una vez al mes, no por cada venta — hazlo al inicio o cierre de mes, cuando ya sepas los montos.",
  },
  {
    texto: "En Gastos fijos puedes copiar los del mes pasado con un clic, si no cambiaron.",
    href: "/gastos-fijos",
  },
  {
    texto:
      "Usa Traspasos caja-banco cuando deposites el efectivo cobrado — asi tu Flujo de efectivo refleja cuanto tienes realmente en cada cuenta.",
    href: "/traspasos-caja",
  },
];
