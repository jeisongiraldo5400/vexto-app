import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { createTestQueryClient, withQuery } from '@/test-utils/fixtures';
import { renderHook } from '@/test-utils/renderer';

import { useEstimateForm } from './use-estimate-form';
import {
  QA_ITEMS,
  useDiagnosisForm,
  usePartForm,
  usePaymentForm,
  usePhotoState,
  useQaForm,
  useWarrantyForm,
} from './use-repair-forms';
import { useRepairRunner } from './use-repair-runner';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue({});
  postIdempotent.mockResolvedValue({});
});

const body = (call = 0) => apiFetch.mock.calls[call][1].body;

describe('usePaymentForm (abono idempotente)', () => {
  it('valida monto es-CO y método', () => {
    const { result } = renderHook(() => usePaymentForm('r1'));
    expect(result.current.invalid).toBe(true);
    result.current.setMethod('efectivo');
    result.current.setAmount('1.50.0');
    expect(result.current.invalid).toBe(true);
    result.current.setAmount('50.000');
    expect(result.current.invalid).toBe(false);
  });

  it('reintenta con la misma intención y la renueva tras el éxito', async () => {
    const { result } = renderHook(() => usePaymentForm('r1'));
    result.current.setMethod('efectivo');
    result.current.setAmount('50.000');
    postIdempotent.mockRejectedValueOnce(new ApiError(0, 'Red'));
    await expect(result.current.pay()).rejects.toThrow('Red');
    await result.current.pay();
    const [first, second] = postIdempotent.mock.calls;
    expect(first).toEqual(['reparaciones/r1/pagos', { monto: 50000, metodoPagoId: 'efectivo' }, expect.any(String)]);
    expect(second[2]).toBe(first[2]);
    expect(result.current.amount).toBe('');

    result.current.setAmount('1.000,5');
    await result.current.pay();
    expect(postIdempotent.mock.calls[2][1]).toEqual({ monto: 1000.5, metodoPagoId: 'efectivo' });
    expect(postIdempotent.mock.calls[2][2]).not.toBe(first[2]);
  });

  it('revertir llama a la acción de cancelar pago', async () => {
    const { result } = renderHook(() => usePaymentForm('r1'));
    await result.current.revert('p9');
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/r1/pagos/p9/cancelar', { method: 'POST', body: {} });
  });
});

describe('formularios del detalle', () => {
  it('diagnóstico envía nota interna y resumen opcional, y limpia', async () => {
    const { result } = renderHook(() => useDiagnosisForm('r1'));
    result.current.setNote('Pantalla rota');
    await result.current.save();
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/r1/diagnosticos', {
      method: 'POST',
      body: { technicalDiagnosis: 'Pantalla rota', foundIssue: 'Pantalla rota', publicSummary: undefined },
    });
    expect(result.current.note).toBe('');
  });

  it('repuestos valida cantidad entera y conserva el almacén', async () => {
    const { result } = renderHook(() => usePartForm('r1'));
    result.current.setProduct('p1');
    result.current.setWarehouse('a1');
    result.current.setQty('1,5');
    expect(result.current.invalid).toBe(true);
    result.current.setQty('2');
    expect(result.current.invalid).toBe(false);
    await result.current.reserve();
    expect(body()).toEqual({ productId: 'p1', almacenId: 'a1', quantity: 2 });
    expect(result.current).toMatchObject({ product: '', qty: '1', warehouse: 'a1' });
  });

  it('QA solo aprueba si todos los ítems pasan', async () => {
    const { result } = renderHook(() => useQaForm('r1'));
    for (const l of QA_ITEMS.slice(1)) result.current.toggle(l, true);
    await result.current.save();
    expect(body().passed).toBe(false);
    result.current.toggle(QA_ITEMS[0], true);
    await result.current.save();
    expect(body(1).passed).toBe(true);
    expect(body(1).items).toHaveLength(QA_ITEMS.length);
  });

  it('garantía calcula el vencimiento y vuelve a los 90 días por defecto', async () => {
    const { result } = renderHook(() => useWarrantyForm('r1'));
    result.current.setDays('30');
    result.current.setTerms('Pantalla');
    await result.current.create();
    const b = body();
    const days = (Date.parse(b.expiresAt) - Date.parse(b.startsAt)) / 86400000;
    expect(Math.round(days)).toBe(30);
    expect(b.terms).toBe('Pantalla');
    expect(result.current.days).toBe('90');
    expect(result.current.invalid).toBe(false);
  });

  it('reclamos: abre con motivo y resuelve con PUT', async () => {
    const { result } = renderHook(() => useWarrantyForm('r1'));
    result.current.setReason('w1', 'Falla');
    await result.current.openClaim('w1');
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/garantias/w1/reclamos', { method: 'POST', body: { reason: 'Falla' } });
    expect(result.current.reasons.w1).toBe('');
    await result.current.resolveClaim('c1', 'REJECTED');
    expect(apiFetch).toHaveBeenLastCalledWith('reparaciones/r1/reclamos/c1', { method: 'PUT', body: { status: 'REJECTED' } });
  });

  it('fotos: arma el data-URI o avisa el error', async () => {
    apiFetch.mockResolvedValueOnce({ mime: 'image/jpeg', base64: 'AAA' });
    const { result } = renderHook(() => usePhotoState('r1'));
    await result.current.viewPhoto('f1');
    expect(result.current.image).toBe('data:image/jpeg;base64,AAA');
    expect(result.current.photoLoading).toBeNull();
    apiFetch.mockRejectedValueOnce(new Error('403'));
    await result.current.viewPhoto('f2');
    expect(Alert.alert).toHaveBeenCalledWith('No se pudo cargar la foto', '403');
  });
});

describe('useEstimateForm', () => {
  const estimate = {
    id: 'e1',
    status: 'DRAFT',
    total: '151000.00',
    discount: '1000.00',
    tax: '0',
    items: [{ type: 'PART', description: 'Pantalla', quantity: '2.000', unit_price: '75500.50' }],
  };

  it('crea un borrador con montos es-CO interpretados', async () => {
    const { result } = renderHook(() => useEstimateForm('r1'));
    result.current.updateLine(0, { unitPrice: '50.000' });
    result.current.addLine();
    result.current.updateLine(1, { description: 'Limpieza', unitPrice: '10.000,5', quantity: '3' });
    result.current.setDiscount('');
    expect(result.current.invalid).toBe(false);
    await result.current.save();
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/r1/cotizaciones', {
      method: 'POST',
      body: {
        items: [
          { type: 'LABOR', description: 'Mano de obra', quantity: 1, unitPrice: 50000 },
          { type: 'SERVICE', description: 'Limpieza', quantity: 3, unitPrice: 10000.5 },
        ],
        discount: 0,
        tax: 0,
      },
    });
    expect(result.current.lines).toHaveLength(1);
  });

  it('edita un borrador existente cargando sus valores', async () => {
    const { result } = renderHook(() => useEstimateForm('r1'));
    result.current.startEdit(estimate);
    expect(result.current.lines[0]).toEqual({ type: 'PART', description: 'Pantalla', quantity: '2', unitPrice: '75.500,5' });
    expect(result.current.discount).toBe('1.000');
    await result.current.save();
    expect(apiFetch).toHaveBeenCalledWith('reparaciones/cotizaciones/e1', {
      method: 'PUT',
      body: { items: [{ type: 'PART', description: 'Pantalla', quantity: 2, unitPrice: 75500.5 }], discount: 1000, tax: 0 },
    });
    expect(result.current.editingEstimate).toBeNull();
  });

  it.each([
    [{ description: ' ' }],
    [{ quantity: '0' }],
    [{ unitPrice: 'abc' }],
  ])('marca inválida la línea %j', (patch) => {
    const { result } = renderHook(() => useEstimateForm('r1'));
    result.current.updateLine(0, patch);
    expect(result.current.invalid).toBe(true);
  });

  it('descuento inválido invalida el formulario', () => {
    const { result } = renderHook(() => useEstimateForm('r1'));
    result.current.setTax('1.2.3');
    expect(result.current.invalid).toBe(true);
  });
});

describe('useRepairRunner', () => {
  it('ejecuta una acción a la vez, invalida reparaciones y avisa errores', async () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRepairRunner(), (c) => withQuery(c, client));
    let release!: () => void;
    const slow = vi.fn(() => new Promise<void>((r) => (release = r)));
    const first = result.current.run(slow);
    expect(result.current.busy).toBe(true);
    await result.current.run(slow);
    expect(slow).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reparaciones'] });
    expect(result.current.busy).toBe(false);

    await result.current.run(() => Promise.reject(new ApiError(409, 'Estado inválido')));
    expect(Alert.alert).toHaveBeenCalledWith('No se pudo completar', 'Estado inválido');
  });
});

describe('usePaymentForm con módulo caja', () => {
  it('en efectivo envía el recibido y muestra el cambio; sin módulo lo ignora', async () => {
    const { signInAs, makeUser } = await import('@/test-utils/fixtures');
    const metodos = [{ id: 'cash', nombre: 'Efectivo', esEfectivo: true }, { id: 'nequi', nombre: 'Nequi', esEfectivo: false }];
    signInAs(makeUser(['pagos:crear'], ['reparaciones', 'caja']));
    const { result } = renderHook(() => usePaymentForm('r1', metodos));
    result.current.setMethod('cash');
    result.current.setAmount('30.000');
    result.current.setReceived('25.000');
    expect(result.current.invalid).toBe(true);
    result.current.setReceived('50.000');
    expect(result.current.cobro.cambio).toBe(20000);
    await result.current.pay();
    expect(postIdempotent).toHaveBeenLastCalledWith('reparaciones/r1/pagos', { monto: 30000, metodoPagoId: 'cash', montoRecibido: 50000 }, expect.any(String));

    signInAs(makeUser(['pagos:crear'], ['reparaciones']));
    const sin = renderHook(() => usePaymentForm('r1', metodos)).result;
    sin.current.setMethod('cash');
    sin.current.setAmount('30.000');
    sin.current.setReceived('50.000');
    expect(sin.current.cobro.esEfectivo).toBe(false);
    await sin.current.pay();
    expect(postIdempotent).toHaveBeenLastCalledWith('reparaciones/r1/pagos', { monto: 30000, metodoPagoId: 'cash' }, expect.any(String));
  });
});
