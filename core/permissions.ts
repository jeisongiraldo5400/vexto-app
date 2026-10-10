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

export function canOpenPath(user: AuthUser | null, path: string) {
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
