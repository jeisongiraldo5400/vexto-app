import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import type { ChatVentaResponse } from '@/core/types';
import { createTestQueryClient, makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import ChatVentaScreen from './index';
import { useChatStore } from './store/chat-store';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch }));

const intencion = { nombreProducto: 'cerveza', cantidad: 3, precioUnitario: 3500 };
const lastBody = () => apiFetch.mock.calls.at(-1)?.[1].body;

beforeEach(() => {
  vi.clearAllMocks();
  useChatStore.getState().clearChat();
  signInAs(makeUser(['pos:crear'], ['chat_ventas']));
});

describe('chat store', () => {
  it('agrega, actualiza y limpia mensajes renovando la sesión', () => {
    const s = useChatStore.getState();
    const before = s.sessionId;
    s.addMessage({ id: 'm1', role: 'user', content: 'hola', timestamp: new Date() });
    s.addMessage({ id: 'm2', role: 'assistant', content: '', timestamp: new Date(), status: 'sending' });
    s.updateMessage('m2', { content: 'listo', status: 'sent' });
    s.setContexto({ productoDisambiguar: 'p1' });
    s.setLoading(true);
    expect(useChatStore.getState().messages.map((m) => [m.id, m.content])).toEqual([
      ['m1', 'hola'],
      ['m2', 'listo'],
    ]);
    s.clearChat();
    const after = useChatStore.getState();
    expect(after.messages).toEqual([]);
    expect(after.contexto).toBeNull();
    expect(after.isLoading).toBe(false);
    expect(after.sessionId).not.toBe(before);
  });

  it('regenerateSessionId cambia solo la sesión', () => {
    const s = useChatStore.getState();
    s.addMessage({ id: 'm1', role: 'user', content: 'x', timestamp: new Date() });
    const before = s.sessionId;
    s.regenerateSessionId();
    expect(useChatStore.getState().sessionId).not.toBe(before);
    expect(useChatStore.getState().messages).toHaveLength(1);
  });
});

describe('ChatVentaScreen', () => {
  const send = (view: ReturnType<typeof render>, text: string) => {
    view.changeText({ placeholder: 'Ej: vendí 3 cervezas a 3500' }, text);
    const input = view.getByProps({ placeholder: 'Ej: vendí 3 cervezas a 3500' });
    // El botón de envío es el Pressable hermano del campo.
    const sendBtn = view.queryAll((n) => n.type === 'Pressable' && n.parent === input.parent?.parent)[0];
    view.press(sendBtn);
  };

  it('estado vacío con ejemplos; un ejemplo se envía con la sesión actual', async () => {
    apiFetch.mockResolvedValue({ status: 'not_found', mensaje: 'No encontré ese producto' } satisfies ChatVentaResponse);
    const view = render(withQuery(<ChatVentaScreen />));
    const sessionId = useChatStore.getState().sessionId;
    view.press('"se fueron 3 arroz"');
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/chat-ventas', {
        method: 'POST',
        body: { mensaje: 'se fueron 3 arroz', sessionId, contexto: undefined },
      }),
    );
    await waitFor(() => view.getByText('No encontré ese producto'));
    expect(view.text()).toContain('se fueron 3 arroz');
  });

  it('venta exitosa: muestra la factura, invalida dashboard/stock y renueva la sesión', async () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    apiFetch.mockResolvedValue({
      status: 'success',
      mensaje: 'Venta registrada',
      venta: { id: 'v1', numeroFactura: 'F-0099', items: [], total: 10500 },
    } satisfies ChatVentaResponse);
    const view = render(withQuery(<ChatVentaScreen />, client));
    const sessionId = useChatStore.getState().sessionId;
    send(view, '  vendí 3 cervezas a 3500  ');
    await waitFor(() => expect(lastBody().mensaje).toBe('vendí 3 cervezas a 3500'));
    await waitFor(() => view.getByText('Factura F-0099'));
    expect(useChatStore.getState().sessionId).not.toBe(sessionId);
    expect(useChatStore.getState().contexto).toBeNull();
    expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['dashboard'], ['stock'], ['productos']]);
  });

  it('desambiguación: elegir opción envía el producto y la intención pendiente', async () => {
    apiFetch.mockResolvedValueOnce({
      status: 'ambiguous',
      mensaje: '¿Cuál cerveza?',
      opciones: [
        { id: 'p1', nombre: 'Cerveza Águila', precioVenta: 3500, stockDisponible: 20 },
        { id: 'p2', nombre: 'Cerveza Poker', precioVenta: 3200, stockDisponible: 5 },
      ],
      intencionPendiente: intencion,
    } satisfies ChatVentaResponse);
    const view = render(withQuery(<ChatVentaScreen />));
    send(view, 'vendí 3 cervezas');
    await waitFor(() => view.getByText('Cerveza Poker'));
    expect(view.text()).toContain('$3.200 — 5 disp.');
    expect(useChatStore.getState().contexto).toEqual({ ultimaIntencion: intencion });

    apiFetch.mockResolvedValueOnce({ status: 'clarification', mensaje: '¿A qué precio?', intencionPendiente: intencion });
    view.press('Cerveza Poker');
    await waitFor(() =>
      expect(lastBody()).toEqual({
        mensaje: 'Cerveza Poker',
        sessionId: useChatStore.getState().sessionId,
        contexto: { productoDisambiguar: 'p2', ultimaIntencion: intencion },
      }),
    );
    await waitFor(() => view.getByText('¿A qué precio?'));
    // Una aclaración conserva la intención para el siguiente mensaje.
    apiFetch.mockResolvedValueOnce({ status: 'invalid_input', mensaje: 'No entendí' });
    send(view, 'a 3000');
    await waitFor(() => expect(lastBody()).toMatchObject({ mensaje: 'a 3000', contexto: { ultimaIntencion: intencion } }));
    await waitFor(() => view.getByText('No entendí'));
    expect(useChatStore.getState().contexto).toBeNull();
  });

  it('confirmación de precio: bloqueado solo ofrece el precio registrado', async () => {
    apiFetch.mockResolvedValueOnce({
      status: 'needs_price_confirmation',
      mensaje: 'Precio bajo',
      intencionPendiente: intencion,
      precioSugerido: 1000,
      precioRegistrado: 3500,
      precioMinimoPermitido: 3000,
    } satisfies ChatVentaResponse);
    const view = render(withQuery(<ChatVentaScreen />));
    send(view, 'vendí 3 cervezas a 1000');
    await waitFor(() => view.getByText('Vender a precio registrado $3.500'));
    expect(view.queryByText(/^Confirmar \$/)).toBeNull();

    apiFetch.mockResolvedValueOnce({ status: 'not_found', mensaje: 'ok' });
    view.press('Vender a precio registrado $3.500');
    await waitFor(() =>
      expect(lastBody()).toMatchObject({
        mensaje: 'cerveza',
        contexto: { confirmarPrecio: false, ultimaIntencion: intencion },
      }),
    );
  });

  it('confirmación de precio no bloqueada permite usar el sugerido', async () => {
    apiFetch.mockResolvedValueOnce({
      status: 'needs_price_confirmation',
      mensaje: 'Precio distinto',
      intencionPendiente: intencion,
      precioSugerido: 4000,
      precioRegistrado: 3500,
      precioMinimoPermitido: 3000,
    } satisfies ChatVentaResponse);
    const view = render(withQuery(<ChatVentaScreen />));
    send(view, 'vendí 3 cervezas a 4000');
    await waitFor(() => view.getByText('Confirmar $4.000'));
    apiFetch.mockResolvedValueOnce({ status: 'not_found', mensaje: 'ok' });
    view.press('Confirmar $4.000');
    await waitFor(() => expect(lastBody().contexto?.confirmarPrecio).toBe(true));
  });

  it('errores: ApiError muestra su mensaje; otros, un mensaje de conexión', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'Producto inactivo'));
    const view = render(withQuery(<ChatVentaScreen />));
    send(view, 'vendí 1 pan');
    await waitFor(() => view.getByText('Producto inactivo'));
    apiFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    send(view, 'vendí 2 pan');
    await waitFor(() => view.getByText('No se pudo procesar el mensaje. Revisa tu conexión.'));
    expect(useChatStore.getState().messages.filter((m) => m.status === 'error')).toHaveLength(2);
  });

  it('"Limpiar" vacía la conversación', async () => {
    apiFetch.mockResolvedValue({ status: 'not_found', mensaje: 'No encontré' });
    const view = render(withQuery(<ChatVentaScreen />));
    send(view, 'hola');
    await waitFor(() => view.getByText('No encontré'));
    view.press('Limpiar');
    expect(useChatStore.getState().messages).toEqual([]);
    expect(view.queryByText('No encontré')).toBeNull();
  });
});
