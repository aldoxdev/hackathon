// Sesion de demo: no hay autenticacion real (sin backend de usuarios), solo una bandera en
// localStorage para simular el flujo de login/logout mientras se hace la demo del producto.
const CLAVE_SESION = "mcc_sesion_activa";

export function haySesionActiva(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CLAVE_SESION) === "1";
}

export function iniciarSesion(): void {
  localStorage.setItem(CLAVE_SESION, "1");
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION);
}
