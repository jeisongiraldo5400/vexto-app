import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addRepairPhoto,
  estimateAction,
  fetchMyRepairs,
  fetchRepairs,
  partAction,
  payRepair,
  repairAction,
} from './adapters';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', () => ({ postIdempotent }));

beforeEach(() => vi.clearAllMocks());

describe('adapters de reparaciones', () => {
  it('lista con búsqueda codificada, paginación y filtro "mías"', () => {
    fetchRepairs('OR 1&x', 2);
    expect(apiFetch).toHaveBeenLastCalledWith('reparaciones?busqueda=OR+1%26x&pagina=2&limite=50');
    fetchMyRepairs();
    expect(apiFetch).toHaveBeenLastCalledWith('reparaciones/mias?busqueda=&pagina=1&limite=50');
  });

  it('los pagos siempre van por POST idempotente; el resto por apiFetch', () => {
    repairAction('r1', 'pagos', { monto: 1 });
    expect(postIdempotent).toHaveBeenCalledWith('reparaciones/r1/pagos', { monto: 1 });
    payRepair('r1', { monto: 2, metodoPagoId: 'm' }, 'intent-1');
    expect(postIdempotent).toHaveBeenLastCalledWith('reparaciones/r1/pagos', { monto: 2, metodoPagoId: 'm' }, 'intent-1');
    repairAction('r1', 'tecnico', { technicianId: 't' }, 'PUT');
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/r1/tecnico', { method: 'PUT', body: { technicianId: 't' } });
  });

  it('acciones de cotización, repuesto y foto', () => {
    estimateAction('q1', 'aprobar');
    partAction('p1', 'instalar');
    addRepairPhoto('r1', 'B64');
    expect(apiFetch.mock.calls).toEqual([
      ['reparaciones/cotizaciones/q1/aprobar', { method: 'POST', body: {} }],
      ['reparaciones/repuestos/p1/instalar', { method: 'POST', body: {} }],
      ['reparaciones/r1/fotos', { method: 'POST', body: { base64: 'B64', mime: 'image/jpeg', visibility: 'INTERNAL' } }],
    ]);
  });
});
