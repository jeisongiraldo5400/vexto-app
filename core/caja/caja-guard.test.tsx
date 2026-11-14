import { AxiosError, type AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRepairRunner } from '@/admin/repairs/hooks/use-repair-runner';
import { ApiError } from '@/core/http/api-error';
import { parseErrorCode, parseErrorMessage, toApiError } from '@/core/http/parse-error';
import { useActionRunner } from '@/core/query/use-action-runner';
import { router } from '@/test-utils/expo-router';
import { createTestQueryClient, makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { renderHook } from '@/test-utils/renderer';

import {
  CAJA_NO_ABIERTA,
  cajaHabilitada,
  handleCajaNoAbierta,
  isCajaNoAbierta,
  promptAbrirCaja,
  puedeUsarCaja,
} from './caja-guard';

/** Cuerpo real del filtro global del backend (docs/CAJA-API.md). */
const body409 = {
  statusCode: 409,
  timestamp: '2026-11-12T15:00:00.000Z',
  path: '/v1/api/ventas',
  requestId: 'r1',
  message: { statusCode: 409, error: 'Conflict', code: 'CAJA_NO_ABIERTA', message: 'Debes abrir tu caja antes de registrar cobros o reembolsos' },
};
const axiosError = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, { status, data } as AxiosResponse);
const cajaNoAbierta = () => new ApiError(409, 'Debes abrir tu caja', { code: CAJA_NO_ABIERTA });
const lastAlert = () => vi.mocked(Alert.alert).mock.calls.at(-1)!;

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos', 'caja']));
});

describe('errores con código del backend', () => {
  it('lee code, texto y extras de body.message', () => {
    expect(parseErrorMessage(body409)).toBe('Debes abrir tu caja antes de registrar cobros o reembolsos');
    expect(parseErrorCode(body409).code).toBe('CAJA_NO_ABIERTA');
    const err = toApiError(axiosError(409, body409));
    expect(err).toMatchObject({ status: 409, code: 'CAJA_NO_ABIERTA', message: 'Debes abrir tu caja antes de registrar cobros o reembolsos' });
    expect(isCajaNoAbierta(err)).toBe(true);
  });

  it('conserva los extras del cierre y del reembolso', () => {
    const err = toApiError(
      axiosError(400, { statusCode: 400, message: { code: 'CAJA_REEMBOLSO_EXCEDE', message: 'El reembolso excede', maximo: 50 } }),
    );
    expect(err.code).toBe('CAJA_REEMBOLSO_EXCEDE');
    expect(err.details).toMatchObject({ maximo: 50 });
  });

  it('validaciones de DTO anidadas: une los mensajes y no inventa código', () => {
    const data = { statusCode: 400, message: { message: ['monto debe ser positivo', 'motivo requerido'], error: 'Bad Request', statusCode: 400 } };
    expect(parseErrorMessage(data)).toBe('monto debe ser positivo, motivo requerido');
    expect(toApiError(axiosError(400, data)).code).toBeUndefined();
  });

  it('errores sin código no son CAJA_NO_ABIERTA', () => {
    expect(isCajaNoAbierta(new ApiError(409, 'Conflicto'))).toBe(false);
    expect(isCajaNoAbierta(new Error('CAJA_NO_ABIERTA'))).toBe(false);
    expect(isCajaNoAbierta(null)).toBe(false);
    expect(parseErrorCode('texto')).toEqual({});
    expect(parseErrorCode({ message: 'plano' })).toEqual({});
  });
});

describe('módulo y permisos de caja', () => {
  it('distingue módulo habilitado de poder consultar la caja', () => {
    const soloPos = makeUser(['pos:crear'], ['pos', 'caja']);
    expect(cajaHabilitada(soloPos)).toBe(true);
    expect(puedeUsarCaja(soloPos)).toBe(false);
    expect(puedeUsarCaja(makeUser(['caja:movimientos'], ['caja']))).toBe(true);
    expect(puedeUsarCaja(makeUser(['caja:abrir'], ['pos']))).toBe(false);
    expect(cajaHabilitada(null)).toBe(false);
  });
});

describe('handleCajaNoAbierta (manejo único de CAJA_NO_ABIERTA)', () => {
  it('ignora cualquier otro error', () => {
    expect(handleCajaNoAbierta(new ApiError(409, 'Stock insuficiente'))).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('con caja:abrir ofrece ir a abrir la caja y refresca su estado', () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    expect(handleCajaNoAbierta(cajaNoAbierta(), client)).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['caja'] });
    const [title, message, buttons] = lastAlert();
    expect(title).toBe('Caja cerrada');
    expect(message).toMatch(/caja abierta para registrar cobros o reembolsos.*abrir tu caja ahora/);
    expect(buttons!.map((b) => b.text)).toEqual(['Ahora no', 'Abrir caja']);
    expect(router.push).not.toHaveBeenCalled();
    buttons![1].onPress!();
    expect(router.push).toHaveBeenCalledWith('/(app)/caja');
  });

  it('sin caja:abrir explica a quién acudir y no navega', () => {
    signInAs(makeUser(['pos:crear'], ['pos', 'caja']));
    promptAbrirCaja();
    const [, message, buttons] = lastAlert();
    expect(message).toMatch(/no tiene permiso para abrir caja/);
    expect(buttons!.map((b) => b.text)).toEqual(['Entendido']);
  });
});

describe('ejecutores de acciones', () => {
  it('useActionRunner: CAJA_NO_ABIERTA muestra el aviso de caja, no el genérico', async () => {
    const { result } = renderHook(() => useActionRunner([['separados']]), withQuery);
    expect(await result.current.run(() => Promise.reject(cajaNoAbierta()))).toBe(false);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(lastAlert()[0]).toBe('Caja cerrada');
    expect(result.current.busy).toBe(false);
  });

  it('useActionRunner: los demás errores siguen igual', async () => {
    const { result } = renderHook(() => useActionRunner([]), withQuery);
    await result.current.run(() => Promise.reject(new ApiError(400, 'Monto inválido')));
    expect(lastAlert().slice(0, 2)).toEqual(['No se pudo completar', 'Monto inválido']);
  });

  it('useRepairRunner: el pago de reparación sin caja usa el mismo aviso', async () => {
    const { result } = renderHook(() => useRepairRunner(), withQuery);
    await result.current.run(() => Promise.reject(cajaNoAbierta()));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(lastAlert()[0]).toBe('Caja cerrada');
  });
});
