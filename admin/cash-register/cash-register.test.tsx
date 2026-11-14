import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { saveSession } from '@/core/session/secure-session';
import { CAJA_TODOS, metodosPago, resumen, sesionAbierta, sesionCerrada } from '@/test-utils/caja-fixtures';
import { router, useLocalSearchParams } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import { fetchCajaActual, fetchCajaSesiones, revisarCaja, toCajaSesion, toCajaResumen } from './adapters';
import { CajaCerrarScreen } from './caja-cerrar-screen';
import { CajaDetailScreen } from './caja-detail-screen';
import { CajaHistorialScreen } from './caja-historial-screen';
import { CajaScreen } from './caja-screen';
import { buildTicketCajaHtml, compartirTicketCaja } from './ticket';

const { apiFetch, fetchEmpresas } = vi.hoisted(() => ({ apiFetch: vi.fn(), fetchEmpresas: vi.fn() }));
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch, fetchEmpresas }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;
const confirmLast = () => lastAlertButtons().at(-1)!.onPress!();
let actual: { sesion: unknown; resumen: unknown };

beforeEach(() => {
  vi.clearAllMocks();
  actual = { sesion: null, resumen: null };
  signInAs(makeUser(CAJA_TODOS, ['caja']));
  useLocalSearchParams.mockReturnValue({ id: 's1' });
  fetchEmpresas.mockResolvedValue([{ id: 'e1', nombre: 'Tecno Bray', nit: '900.1', activo: true, chatVentasHabilitado: false }]);
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === 'caja/sesion-actual') return actual;
    if (path === '/almacenes') return [{ id: 'a1', codigo: '01', nombre: 'Principal', activo: true }];
    if (path === '/metodos-pago') return metodosPago;
    if (path === 'caja/abrir') return { sesion: sesionAbierta, resumen };
    if (path === 'caja/movimientos') return { ...resumen.movimientos[0], id: 'm9' };
    if (path.startsWith('caja/movimientos/') && init?.method === 'DELETE') return { ...resumen.movimientos[0], anuladoAt: 'x' };
    if (path === 'caja/sesiones/s1/resumen') return { sesion: sesionAbierta, resumen };
    if (path === 'caja/sesiones/s9/resumen') return { sesion: sesionCerrada, resumen: { ...resumen, enVivo: false } };
    if (path === 'caja/sesiones/s1/cerrar') return { sesion: { ...sesionCerrada, id: 's1' }, resumen };
    if (path.startsWith('caja/sesiones/s9/revisar')) return { sesion: { ...sesionCerrada, estado: 'REVISADA' }, resumen };
    if (path.startsWith('caja/sesiones?')) return { sesiones: [sesionCerrada, sesionAbierta], total: 2 };
    return {};
  });
});

describe('adapters de caja', () => {
  it('sesión actual: null sin caja y normaliza montos decimales', async () => {
    expect(await fetchCajaActual()).toEqual({ sesion: null, resumen: null });
    actual = { sesion: sesionAbierta, resumen: { ...resumen, efectivo: { ...resumen.efectivo, esperado: '520000.00' } } };
    const r = await fetchCajaActual();
    expect(r.sesion?.baseInicial).toBe(100000);
    expect(r.resumen?.efectivo.esperado).toBe(520000);
  });

  it('nulos de una caja abierta se conservan; "Sin método" para cobros históricos', () => {
    const s = toCajaSesion(sesionAbierta as never);
    expect(s).toMatchObject({ efectivoEsperado: null, diferencia: null, denominaciones: null });
    const r = toCajaResumen({ ...resumen, porMetodo: [{ ...resumen.porMetodo[1], metodoPagoId: null, metodoPagoNombre: '' }] } as never);
    expect(r.porMetodo[0].metodoPagoNombre).toBe('Sin método');
  });

  it('listado con filtros solo envía los informados', async () => {
    await fetchCajaSesiones({ estado: 'CERRADA', conDiferencia: 'true', desde: '', hasta: '2026-11-30' }, 2);
    expect(apiFetch).toHaveBeenCalledWith('caja/sesiones?pagina=2&limite=20&estado=CERRADA&hasta=2026-11-30&conDiferencia=true');
  });

  it('revisar envía observaciones solo si hay texto', async () => {
    await revisarCaja('s9', '   ');
    expect(apiFetch).toHaveBeenLastCalledWith('caja/sesiones/s9/revisar', { method: 'POST', body: {} });
    await revisarCaja('s9', ' Ok ');
    expect(apiFetch).toHaveBeenLastCalledWith('caja/sesiones/s9/revisar', { method: 'POST', body: { observaciones: 'Ok' } });
  });
});

describe('pantalla de caja', () => {
  it('sin caja abierta: abre con base, almacén predeterminado y observaciones', async () => {
    const view = render(withQuery(<CajaScreen />));
    await waitFor(() => view.getByText('Almacén: Principal'));
    expect(view.isDisabled(view.queryAllByText('Abrir caja').at(-1)!)).toBe(true);
    view.changeText({ placeholder: 'Base inicial' }, '100.000');
    view.changeText({ placeholder: 'Observaciones (opcional)' }, ' Turno mañana ');
    view.press(view.queryAllByText('Abrir caja').at(-1)!);
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toBe('¿Abrir tu caja con una base de $100.000?');
    confirmLast();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('caja/abrir', {
        method: 'POST',
        body: { baseInicial: 100000, almacenId: 'a1', observaciones: 'Turno mañana' },
      }),
    );
  });

  it('sin permiso caja:abrir explica cómo conseguirlo', async () => {
    signInAs(makeUser(['caja:ver'], ['caja']));
    const view = render(withQuery(<CajaScreen />));
    await waitFor(() => view.getByText(/no tiene permiso para abrir caja/));
    expect(view.queryByText('Abrir caja')).toBeNull();
  });

  it('con caja abierta: arqueo en vivo, movimientos y acciones', async () => {
    actual = { sesion: sesionAbierta, resumen };
    const view = render(withQuery(<CajaScreen />));
    await waitFor(() => view.getByText('Caja abierta · Ana Pérez'));
    view.getByText('Base inicial: $100.000');
    view.getByText('+ Cobros en efectivo: $440.000');
    view.getByText('− Retiros: $30.000');
    expect(view.queryAllByText('Efectivo esperado: $520.000')).toHaveLength(2);
    view.getByText('Nequi');
    view.getByText('Cobros: $80.000 (1)');
    view.getByText('Gasto · $15.000');
    view.getByText('Ingreso · $7.000 · Anulado');
    // Solo el ingreso propio vigente es anulable (no el retiro ajeno, el reembolso ni el anulado).
    expect(view.queryAllByText(/^Anular /)).toHaveLength(1);
    view.press('Anular ingreso de $10.000');
    confirmLast();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('caja/movimientos/m1', { method: 'DELETE' }));
    view.press(view.queryAllByText('Cerrar caja').at(-1)!);
    expect(router.push).toHaveBeenLastCalledWith('/(app)/caja/cerrar?id=s1');
  });

  it('registra un retiro con método, monto y motivo (sin crédito ni separado)', async () => {
    actual = { sesion: sesionAbierta, resumen };
    const view = render(withQuery(<CajaScreen />));
    await waitFor(() => view.getByText('Registrar ingreso'));
    view.press('Retiro');
    view.press('Método de pago: Seleccionar');
    await waitFor(() => view.getByText('Nequi'));
    expect(view.queryByText('Crédito')).toBeNull();
    expect(view.queryByText('Separado')).toBeNull();
    expect(view.queryByText('Cheque')).toBeNull();
    view.press(view.queryAllByText('Efectivo').at(-1)!);
    view.changeText({ placeholder: 'Monto del movimiento' }, '50.000');
    view.changeText({ placeholder: 'Motivo del movimiento' }, 'ab');
    view.getByText('El motivo debe tener al menos 3 caracteres.');
    expect(view.isDisabled('Registrar retiro')).toBe(true);
    view.changeText({ placeholder: 'Motivo del movimiento' }, ' Consignación banco ');
    view.press('Registrar retiro');
    confirmLast();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('caja/movimientos', {
        method: 'POST',
        body: { tipo: 'RETIRO', metodoPagoId: 'cash', monto: 50000, motivo: 'Consignación banco' },
      }),
    );
  });
});

describe('cierre de caja', () => {
  it('diferencia en vivo; con faltante exige observaciones y luego cierra', async () => {
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Efectivo esperado: $520.000'));
    view.changeText({ placeholder: 'Efectivo contado' }, '520.000');
    view.getByText('Diferencia: Caja cuadrada');
    view.changeText({ placeholder: 'Efectivo contado' }, '500.000');
    view.getByText('Diferencia: Faltante $20.000');
    view.getByText('Explica la diferencia en las observaciones.');
    expect(view.isDisabled(view.queryAllByText('Cerrar caja').at(-1)!)).toBe(true);
    view.changeText({ placeholder: 'Observaciones del cierre' }, 'Faltó un billete');
    view.press(view.queryAllByText('Cerrar caja').at(-1)!);
    confirmLast();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(app)/caja/s1?cerrada=1'));
    expect(apiFetch).toHaveBeenCalledWith('caja/sesiones/s1/cerrar', {
      method: 'POST',
      body: { efectivoContado: 500000, observaciones: 'Faltó un billete' },
    });
  });

  it('por denominaciones suma solo y envía el desglose', async () => {
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Por denominaciones'));
    view.press('Por denominaciones');
    view.changeText({ accessibilityLabel: 'Cantidad de billetes de $100.000' }, '5');
    view.changeText({ accessibilityLabel: 'Cantidad de billetes de $20.000' }, '1');
    view.getByText('Total contado: $520.000');
    view.getByText('Diferencia: Caja cuadrada');
    view.press(view.queryAllByText('Cerrar caja').at(-1)!);
    confirmLast();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('caja/sesiones/s1/cerrar', {
        method: 'POST',
        body: { efectivoContado: 520000, denominaciones: [{ valor: 100000, cantidad: 5 }, { valor: 20000, cantidad: 1 }] },
      }),
    );
  });

  it('CAJA_OBSERVACIONES_REQUERIDAS del backend se muestra en el formulario, sin navegar', async () => {
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Efectivo esperado: $520.000'));
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'Hay diferencia', { code: 'CAJA_OBSERVACIONES_REQUERIDAS' }));
    view.changeText({ placeholder: 'Efectivo contado' }, '520.000');
    view.press(view.queryAllByText('Cerrar caja').at(-1)!);
    confirmLast();
    await waitFor(() => view.getByText(/El efectivo esperado cambió mientras contabas/));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('CAJA_DENOMINACIONES_NO_COINCIDEN también se explica en el formulario', async () => {
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Efectivo esperado: $520.000'));
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'No coincide', { code: 'CAJA_DENOMINACIONES_NO_COINCIDEN' }));
    view.changeText({ placeholder: 'Efectivo contado' }, '520.000');
    view.press(view.queryAllByText('Cerrar caja').at(-1)!);
    confirmLast();
    await waitFor(() => view.getByText(/La suma de las denominaciones no coincide/));
  });

  it('cierre forzado de la caja de otro cajero lo advierte', async () => {
    signInAs(makeUser(CAJA_TODOS, ['caja'], { id: 'admin' }));
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Cierre forzado: vas a cerrar la caja de Ana Pérez.'));
  });

  it('una caja ya cerrada no admite otro arqueo', async () => {
    useLocalSearchParams.mockReturnValue({ id: 's9' });
    const view = render(withQuery(<CajaCerrarScreen />));
    await waitFor(() => view.getByText('Caja ya cerrada'));
    view.press('Ver el cierre');
    expect(router.replace).toHaveBeenCalledWith('/(app)/caja/s9');
  });
});

describe('historial y detalle', () => {
  it('lista con diferencia, filtra y abre el detalle', async () => {
    const view = render(withQuery(<CajaHistorialScreen />));
    await waitFor(() => view.getByText('Ana Pérez · Cerrada'));
    view.getByText('Todas las cajas de la empresa.');
    view.getByText('Faltante $20.000');
    view.press('Con diferencia');
    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith('caja/sesiones?pagina=1&limite=20&conDiferencia=true'));
    view.changeText({ placeholder: 'Desde (AAAA-MM-DD)' }, '2026-11');
    view.getByText('Escribe las fechas completas con el formato AAAA-MM-DD.');
    view.changeText({ placeholder: 'Desde (AAAA-MM-DD)' }, '2026-11-01');
    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith('caja/sesiones?pagina=1&limite=20&desde=2026-11-01&conDiferencia=true'));
    view.press('Ana Pérez · Cerrada');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/caja/s9');
  });

  it('sin caja:ver indica que son las sesiones propias', async () => {
    signInAs(makeUser(['caja:abrir'], ['caja']));
    const view = render(withQuery(<CajaHistorialScreen />));
    await waitFor(() => view.getByText('Tus sesiones de caja.'));
  });

  it('detalle de un cierre: snapshot, denominaciones, revisión y comprobante', async () => {
    useLocalSearchParams.mockReturnValue({ id: 's9', cerrada: '1' });
    await saveSession({ accessToken: 't', refreshToken: 'r', empresaId: 'e1', user: makeUser(CAJA_TODOS, ['caja']), needsCompanyPick: false });
    const view = render(withQuery(<CajaDetailScreen />));
    await waitFor(() => view.getByText('Caja cerrada correctamente'));
    view.getByText('Diferencia: Faltante $20.000');
    view.getByText('$100.000 × 4 = $400.000');
    view.press('Marcar como revisada');
    confirmLast();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('caja/sesiones/s9/revisar', { method: 'POST', body: {} }));
    view.press('Compartir comprobante');
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/cierre.pdf', expect.objectContaining({ mimeType: 'application/pdf' })));
    const html = vi.mocked(Print.printToFileAsync).mock.calls[0][0]!.html!;
    expect(html).toContain('Tecno Bray');
    expect(html).toContain('NIT 900.1');
  });

  it('sin caja:aprobar no se revisa; una caja ajena abierta permite forzar el cierre con caja:ver', async () => {
    signInAs(makeUser(['caja:ver', 'caja:cerrar'], ['caja'], { id: 'admin' }));
    const view = render(withQuery(<CajaDetailScreen />));
    await waitFor(() => view.getByText('Forzar cierre de esta caja'));
    expect(view.queryByText('Marcar como revisada')).toBeNull();
    expect(view.queryByText('Compartir comprobante')).toBeNull();
    view.press('Forzar cierre de esta caja');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/caja/cerrar?id=s1');
  });

  it('sin caja:ver no se ofrece cerrar la caja de otro', async () => {
    signInAs(makeUser(['caja:cerrar'], ['caja'], { id: 'otro' }));
    const view = render(withQuery(<CajaDetailScreen />));
    await waitFor(() => view.getByText('Ana Pérez · Abierta'));
    expect(view.queryByText(/cierre/i)).toBeNull();
  });
});

describe('comprobante de cierre', () => {
  it('incluye empresa, cajero, cuadre, métodos, denominaciones y escapa el HTML', () => {
    const html = buildTicketCajaHtml({
      empresa: { nombre: 'Tecno <Bray>', nit: '900' },
      sesion: toCajaSesion(sesionCerrada as never),
      resumen: toCajaResumen(resumen as never),
    });
    for (const t of [
      'Tecno &lt;Bray&gt;',
      'Comprobante de cierre de caja',
      'Ana Pérez',
      'Base inicial',
      '$100.000',
      'Efectivo esperado',
      '$520.000',
      'Efectivo contado',
      '$500.000',
      'Faltante $20.000',
      'Nequi (1)',
      '$100.000 × 4',
      'Faltó un billete &lt;de 20&gt;',
      'Turno mañana',
    ])
      expect(html, t).toContain(t);
  });

  it('sin hoja de compartir imprime directamente', async () => {
    vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await compartirTicketCaja({ empresa: null, sesion: toCajaSesion(sesionCerrada as never), resumen: toCajaResumen(resumen as never) });
    expect(Print.printAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
