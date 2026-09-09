const LIMITACIONES = [
  {
    tema: "ISR (RESICO)",
    nota:
      "Las cifras del Estado de Resultados se muestran antes de ISR. El calculo de ISR bajo RESICO usa tablas de tasas escalonadas que cambian cada año y queda para una version futura.",
  },
  {
    tema: "Merma / desperdicio",
    nota:
      "El costo de alimentos que ve aqui es teorico (segun receta). No resta ingredientes que se echan a perder o se desperdician en la cocina.",
  },
  {
    tema: "Multi-negocio",
    nota:
      "Esta version opera para un solo negocio. La base esta preparada para poder extenderse a varios negocios en el futuro.",
  },
  {
    tema: "Roles de usuario",
    nota: "Un solo usuario (el dueño) captura toda la informacion; no hay cuentas para empleados con permisos distintos.",
  },
  {
    tema: "Conversion entre magnitudes",
    nota:
      "No se convierte automaticamente entre masa y volumen (por ejemplo, gramos a mililitros), porque eso requeriria conocer la densidad de cada ingrediente.",
  },
  {
    tema: "Costeo de inventario",
    nota:
      "El costo de un insumo es un precio de referencia vigente (tu compra mas reciente), no un promedio ponderado de existencias. La app no rastrea cuanto te queda en existencia de un insumo comprado a un precio anterior.",
  },
  {
    tema: "Flujo de efectivo (version simplificada)",
    nota:
      "La pantalla de Flujo de Efectivo muestra cuanto entro y salio por efectivo/banco, un saldo estimado a partir de un saldo inicial que tu capturas, y los traspasos que hagas entre tu caja y tu banco. Es un flujo simplificado (asume que todo se cobra/paga el mismo dia, sin creditos) y depende de que registres todos tus movimientos: no incluye retiros personales del dueño ni dinero que se mueva fuera de la app.",
  },
];

export default function AlcancePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Alcance y limitaciones del MVP</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Esta app se construyo como un MVP de hackathon. Estas son las limitaciones conocidas,
          declaradas de forma transparente.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {LIMITACIONES.map((l) => (
          <li key={l.tema} className="p-5">
            <p className="font-medium text-zinc-900">{l.tema}</p>
            <p className="mt-1 text-sm text-zinc-600">{l.nota}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
