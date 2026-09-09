import {
  CompraInsumo,
  CompraInsumoInput,
  ConfiguracionNegocio,
  ConfiguracionNegocioInput,
  ConsumoIndirecto,
  ConsumoIndirectoInput,
  GastoFijo,
  GastoFijoInput,
  Insumo,
  InsumoInput,
  Receta,
  RecetaInput,
  RecetaInsumo,
  RecetaInsumoInput,
  TraspasoCaja,
  TraspasoCajaInput,
  Venta,
  VentaInput,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseErrorMessage(res: Response): Promise<string> {
  const texto = await res.text();
  try {
    const data = JSON.parse(texto);
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(", ");
    }
  } catch {
    // no era JSON, se usa el texto plano
  }
  return texto || `Error ${res.status}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getInsumos: () => request<Insumo[]>("/insumos"),
  getInsumo: (id: number) => request<Insumo>(`/insumos/${id}`),
  createInsumo: (data: InsumoInput) =>
    request<Insumo>("/insumos", { method: "POST", body: JSON.stringify(data) }),
  updateInsumo: (id: number, data: InsumoInput) =>
    request<Insumo>(`/insumos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteInsumo: (id: number) => request<void>(`/insumos/${id}`, { method: "DELETE" }),

  getRecetas: () => request<Receta[]>("/recetas"),
  getReceta: (id: number) => request<Receta>(`/recetas/${id}`),
  createReceta: (data: RecetaInput) =>
    request<Receta>("/recetas", { method: "POST", body: JSON.stringify(data) }),
  updateReceta: (id: number, data: RecetaInput) =>
    request<Receta>(`/recetas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteReceta: (id: number) => request<void>(`/recetas/${id}`, { method: "DELETE" }),

  getRecetaInsumos: () => request<RecetaInsumo[]>("/receta-insumos"),
  createRecetaInsumo: (data: RecetaInsumoInput) =>
    request<RecetaInsumo>("/receta-insumos", { method: "POST", body: JSON.stringify(data) }),
  deleteRecetaInsumo: (id: number) => request<void>(`/receta-insumos/${id}`, { method: "DELETE" }),

  getVentas: () => request<Venta[]>("/ventas"),
  createVenta: (data: VentaInput) =>
    request<Venta>("/ventas", { method: "POST", body: JSON.stringify(data) }),
  updateVenta: (id: number, data: VentaInput) =>
    request<Venta>(`/ventas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVenta: (id: number) => request<void>(`/ventas/${id}`, { method: "DELETE" }),

  getGastosFijos: () => request<GastoFijo[]>("/gastos-fijos"),
  createGastoFijo: (data: GastoFijoInput) =>
    request<GastoFijo>("/gastos-fijos", { method: "POST", body: JSON.stringify(data) }),
  updateGastoFijo: (id: number, data: GastoFijoInput) =>
    request<GastoFijo>(`/gastos-fijos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGastoFijo: (id: number) => request<void>(`/gastos-fijos/${id}`, { method: "DELETE" }),

  getConfiguracionNegocio: () => request<ConfiguracionNegocio>("/configuracion-negocio"),
  updateConfiguracionNegocio: (data: ConfiguracionNegocioInput) =>
    request<ConfiguracionNegocio>("/configuracion-negocio", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getConsumoIndirecto: () => request<ConsumoIndirecto[]>("/consumo-indirecto"),
  createConsumoIndirecto: (data: ConsumoIndirectoInput) =>
    request<ConsumoIndirecto>("/consumo-indirecto", { method: "POST", body: JSON.stringify(data) }),
  updateConsumoIndirecto: (id: number, data: ConsumoIndirectoInput) =>
    request<ConsumoIndirecto>(`/consumo-indirecto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteConsumoIndirecto: (id: number) =>
    request<void>(`/consumo-indirecto/${id}`, { method: "DELETE" }),

  getComprasInsumo: () => request<CompraInsumo[]>("/compras-insumo"),
  createCompraInsumo: (data: CompraInsumoInput) =>
    request<CompraInsumo>("/compras-insumo", { method: "POST", body: JSON.stringify(data) }),
  updateCompraInsumo: (id: number, data: CompraInsumoInput) =>
    request<CompraInsumo>(`/compras-insumo/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCompraInsumo: (id: number) => request<void>(`/compras-insumo/${id}`, { method: "DELETE" }),

  getTraspasosCaja: () => request<TraspasoCaja[]>("/traspasos-caja"),
  createTraspasoCaja: (data: TraspasoCajaInput) =>
    request<TraspasoCaja>("/traspasos-caja", { method: "POST", body: JSON.stringify(data) }),
  updateTraspasoCaja: (id: number, data: TraspasoCajaInput) =>
    request<TraspasoCaja>(`/traspasos-caja/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTraspasoCaja: (id: number) => request<void>(`/traspasos-caja/${id}`, { method: "DELETE" }),

  resetDemo: (perfil: "restaurante" | "un_producto" = "restaurante") =>
    request<{ status: string }>(`/admin/reset-demo?perfil=${perfil}`, { method: "POST" }),

  importExcel: async (file: File): Promise<ImportExcelResultado> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/admin/import-excel`, { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    return res.json();
  },
};

export interface ImportExcelResultado {
  insumos_creados: number;
  recetas_creadas: number;
  receta_insumos_creados: number;
  ventas_creadas: number;
  gastos_fijos_creados: number;
  errores: { hoja: string; fila: number; mensaje: string }[];
}
