import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearVentaCredito } from "@/admin/sales/adapters/credito.adapter";
const { apiFetch, loadSession } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  loadSession: vi.fn(),
}));
vi.mock("@/core/http/api", () => ({ apiFetch }));
vi.mock("@/core/session/secure-session", () => ({ loadSession }));
beforeEach(() => {
  vi.resetAllMocks();
  loadSession.mockResolvedValue({ user: { id: "u" }, empresaId: "e" });
});
describe("créditos móviles", () => {
  it("reutiliza intención en reintento y renueva tras éxito", async () => {
    const body = {
      almacenId: "a",
      clienteId: "c",
      items: [{ productoId: "p", cantidad: 1 }],
      cuotaInicial: 0,
      numeroCuotas: 1,
      frecuenciaDias: 30,
    };
    apiFetch
      .mockRejectedValueOnce(new Error("Red"))
      .mockResolvedValue({ ventaId: "v" });
    await expect(crearVentaCredito(body)).rejects.toThrow("Red");
    await crearVentaCredito(body);
    expect(apiFetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      apiFetch.mock.calls[1][1].headers["Idempotency-Key"],
    );
    await crearVentaCredito(body);
    expect(apiFetch.mock.calls[2][1].headers["Idempotency-Key"]).not.toBe(
      apiFetch.mock.calls[1][1].headers["Idempotency-Key"],
    );
  });
});
