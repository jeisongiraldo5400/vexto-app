import { crearVenta } from '@/admin/sales/adapters/sales.adapter';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, loadSession } = vi.hoisted(() => ({ apiFetch: vi.fn(), loadSession: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/session/secure-session', () => ({ loadSession }));

const body = (id: string) => ({ almacenId: 'almacen', items: [{ productoId: id, cantidad: 1 }], pagos: [{ metodoPagoId: 'efectivo', monto: 10, montoRecibido: 10 }] });
const key = (call: number) => apiFetch.mock.calls[call][1].headers['Idempotency-Key'];

beforeEach(() => {
  vi.resetAllMocks();
  loadSession.mockResolvedValue({ user: { id: 'usuario' }, empresaId: 'empresa-a' });
});

describe('idempotencia de ventas móviles', () => {
  it('conserva la clave tras un fallo y la renueva tras confirmar éxito', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValue({ id: 'venta' });
    await expect(crearVenta(body('retry'))).rejects.toThrow('Conexión');
    await crearVenta(body('retry'));
    expect(key(0)).toBe(key(1));
    await crearVenta(body('retry'));
    expect(key(2)).not.toBe(key(1));
  });
  it('dos envíos simultáneos de la misma intención usan una clave', async () => {
    apiFetch.mockResolvedValue({ id: 'venta' });
    await Promise.all([crearVenta(body('concurrent')), crearVenta(body('concurrent'))]);
    expect(key(0)).toBe(key(1));
  });
  it('separa claves por empresa', async () => {
    apiFetch.mockRejectedValue(new Error('Sin conexión'));
    await expect(crearVenta(body('company'))).rejects.toThrow();
    loadSession.mockResolvedValue({ user: { id: 'usuario' }, empresaId: 'empresa-b' });
    await expect(crearVenta(body('company'))).rejects.toThrow();
    expect(key(0)).not.toBe(key(1));
  });
});
