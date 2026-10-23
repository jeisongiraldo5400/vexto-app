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
  it("las pestañas Venta y Reparaciones conservan la lógica previa del layout", () => {
    // Lógica inline anterior de app/(app)/(tabs)/_layout.tsx.
    const legacyVenta = (u: AuthUser | null) =>
      !!(
        u?.modulosHabilitados?.includes("pos") &&
        (u?.permisos?.includes("ventas:crear") ||
          u?.permisos?.includes("pos:crear"))
      );
    const legacyReparaciones = (u: AuthUser | null) =>
      !!u?.modulosHabilitados?.includes("reparaciones") &&
      !!u?.permisos?.includes("reparaciones:ver");
    const permisos = [
      [],
      ["ventas:crear"],
      ["pos:crear"],
      ["reparaciones:ver"],
      ["reparaciones:crear"],
      ["ventas:crear", "reparaciones:ver"],
    ];
    const modulos = [
      [],
      ["pos"],
      ["reparaciones"],
      ["pos", "reparaciones"],
      ["core"],
    ];
    const cases: (AuthUser | null)[] = [null];
    for (const p of permisos) for (const m of modulos) cases.push(user(p, m));
    for (const u of cases) {
      expect(canOpenPath(u, "/venta")).toBe(legacyVenta(u));
      expect(canOpenPath(u, "/reparaciones")).toBe(legacyReparaciones(u));
    }
  });
});

describe("módulos de gestión (clientes, separados, créditos, pagos, devoluciones, perfil)", () => {
  it.each([
    ["/clientes", ["clientes:ver"], ["clientes"], true],
    ["/clientes", ["clientes:ver"], [], false],
    ["/clientes/nuevo", ["clientes:ver"], ["clientes"], false],
    ["/clientes/nuevo", ["clientes:crear"], ["clientes"], true],
    ["/clientes/abc", ["clientes:ver"], ["clientes"], false],
    ["/clientes/abc", ["clientes:editar"], ["clientes"], true],
    ["/separados", ["separados:ver"], ["ventas"], true],
    ["/separados", ["separados:ver"], ["pos"], false],
    ["/separados/nuevo", ["separados:ver"], ["ventas"], false],
    ["/separados/nuevo", ["separados:crear"], ["ventas"], true],
    ["/separados/s1", ["separados:ver"], ["ventas"], true],
    ["/creditos", ["ventas:ver"], ["ventas"], true],
    ["/creditos/c1", ["ventas:crear"], ["ventas"], false],
    ["/pagos", ["pagos:ver"], ["pagos"], true],
    ["/pagos", ["pagos:ver"], ["ventas"], false],
    ["/pagos/nuevo", ["pagos:ver"], ["pagos"], false],
    ["/pagos/nuevo", ["pagos:crear"], ["pagos"], true],
    ["/devoluciones", ["devoluciones:ver"], ["ventas"], true],
    ["/devoluciones/nueva", ["devoluciones:ver"], ["ventas"], false],
    ["/devoluciones/nueva", ["devoluciones:crear"], ["ventas"], true],
    ["/devoluciones/d1", ["devoluciones:ver"], ["ventas"], true],
  ])("%s con %j y módulos %j → %s", (path, permisos, modulos, expected) => {
    expect(canOpenPath(user(permisos, modulos), path)).toBe(expected);
  });

  it("ignora grupos de ruta y query string", () => {
    const u = user(["clientes:crear"], ["clientes"]);
    expect(canOpenPath(u, "/(app)/clientes/nuevo?x=1")).toBe(true);
  });

  it("perfil: cualquier sesión", () => {
    expect(canOpenPath(user([], []), "/perfil")).toBe(true);
    expect(canOpenPath(null, "/perfil")).toBe(false);
  });
});
