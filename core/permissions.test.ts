import { describe, expect, it } from "vitest";
import { canAccess, canOpenPath } from "./permissions";
import type { AuthUser } from "./types";

const user = (permisos: string[], modulosHabilitados: string[]): AuthUser => ({
  id: "u",
  email: "u@test",
  fullName: null,
  roleId: "r",
  permisos,
  modulosHabilitados,
});
describe("acceso móvil por permisos y licencia", () => {
  it("no muestra módulos con permiso pero sin licencia", () => {
    expect(canOpenPath(user(["gastos:ver"], []), "/gastos")).toBe(false);
    expect(canOpenPath(user(["reparaciones:ver"], []), "/reparacion/id")).toBe(
      false,
    );
  });
  it("no concede gastos por rol o licencia sin permiso", () => {
    expect(
      canAccess(
        {
          ...user([], ["finanzas"]),
          rol: { id: "r", codigo: "admin", nombre: "Admin" },
        },
        "finanzas",
        "gastos:ver",
      ),
    ).toBe(false);
  });
  it("separa recepción de consulta de órdenes", () => {
    const reception = user(["reparaciones:crear"], ["reparaciones"]);
    expect(canOpenPath(reception, "/reparacion/nueva")).toBe(true);
    expect(canOpenPath(reception, "/reparacion/id")).toBe(false);
  });
  it("chat requiere módulo y permiso de venta", () => {
    expect(canOpenPath(user([], ["chat_ventas"]), "/chat-venta")).toBe(false);
    expect(
      canOpenPath(user(["pos:crear"], ["chat_ventas"]), "/chat-venta"),
    ).toBe(true);
  });
});
