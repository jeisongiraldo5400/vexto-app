import type { AuthUser } from "./types";

export function canAccess(
  user: AuthUser | null,
  module: string,
  ...permissions: string[]
) {
  return (
    !!user &&
    (module === "core" || !!user.modulosHabilitados?.includes(module)) &&
    permissions.some((p) => user.permisos?.includes(p))
  );
}

/** Primer y segundo segmento de la ruta (`/clientes/nuevo` → `["clientes", "nuevo"]`). */
function segments(path: string) {
  const parts = path.split("?")[0].split("/").filter((p) => p && !p.startsWith("("));
  return [parts[0] ?? "", parts[1] ?? ""] as const;
}

/** Módulos de gestión: [licencia, permiso de lista, permiso de alta, permiso del detalle]. */
const MANAGEMENT: Record<string, [string, string, string, string]> = {
  clientes: ["clientes", "clientes:ver", "clientes:crear", "clientes:editar"],
  separados: ["ventas", "separados:ver", "separados:crear", "separados:ver"],
  creditos: ["ventas", "ventas:ver", "ventas:crear", "ventas:ver"],
  pagos: ["pagos", "pagos:ver", "pagos:crear", "pagos:ver"],
  devoluciones: [
    "ventas",
    "devoluciones:ver",
    "devoluciones:crear",
    "devoluciones:ver",
  ],
};

/** Permisos del módulo `caja`; cualquiera de ellos deja ver la caja propia. */
export const CAJA_PERMISOS = [
  "caja:ver",
  "caja:abrir",
  "caja:cerrar",
  "caja:movimientos",
  "caja:aprobar",
];

export function canOpenPath(user: AuthUser | null, path: string) {
  const [first, second] = segments(path);
  // Caja: opt-in por empresa. El cierre exige `caja:cerrar`; el resto, cualquier permiso.
  if (first === "caja")
    return canAccess(
      user,
      "caja",
      ...(second === "cerrar" ? ["caja:cerrar"] : CAJA_PERMISOS),
    );
  const managed = MANAGEMENT[first];
  if (managed) {
    const [module, list, create, detail] = managed;
    const permission = !second
      ? list
      : second === "nuevo" || second === "nueva"
        ? create
        : detail;
    return canAccess(user, module, permission);
  }
  if (first === "perfil") return !!user;
  if (path.includes("productos"))
    return canAccess(user, "inventario", "productos:ver");
  if (path.includes("reparacion/nueva"))
    return canAccess(user, "reparaciones", "reparaciones:crear");
  if (path.includes("reparaci"))
    return canAccess(user, "reparaciones", "reparaciones:ver");
  if (path.includes("gastos")) return canAccess(user, "finanzas", "gastos:ver");
  if (path.includes("chat-venta"))
    return canAccess(user, "chat_ventas", "ventas:crear", "pos:crear");
  if (path.endsWith("/venta"))
    return canAccess(user, "pos", "ventas:crear", "pos:crear");
  return true;
}
