import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Sitio 100% estatico: no hay rutas de API propias ni componentes de servidor con datos
  // dinamicos, todo el fetching es del lado del cliente hacia el backend de FastAPI. Esto
  // permite hospedarlo en cualquier CDN/static host (Render Static Site incluido) sin
  // necesitar un servidor Node.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
