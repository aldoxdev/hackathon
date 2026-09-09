"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function BrandHeader() {
  const [nombre, setNombre] = useState("Mi restaurante");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    api
      .getConfiguracionNegocio()
      .then((config) => {
        setNombre(config.nombre_negocio);
        setLogoUrl(config.logo_url);
        document.documentElement.style.setProperty("--brand-primary", config.color_primario);
        document.documentElement.style.setProperty("--brand-secondary", config.color_secundario);
      })
      .catch(() => {
        // sin conexion al backend: se queda el nombre por defecto
      });
  }, []);

  return (
    <span className="flex items-center gap-2">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
      )}
      {nombre}
    </span>
  );
}
