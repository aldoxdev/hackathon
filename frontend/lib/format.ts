// Formato de moneda para Mexico: separador de miles por coma, punto decimal.
export function formatMoney(value: number, decimals = 2): string {
  const numero = Number.isFinite(value) ? value : 0;
  return `$${numero.toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
