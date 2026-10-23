import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/admin/auth/store/auth-store';
import { saveSession } from '@/core/session/secure-session';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import { actualizarPerfil, validatePasswordForm, validatePerfil } from './adapters';
import { PerfilScreen } from './perfil-screen';

const { apiFetch, signOut } = vi.hoisted(() => ({ apiFetch: vi.fn(), signOut: vi.fn(async () => {}) }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/admin/auth/hooks/use-auth', async () => {
  const { useAuthStore: store } = await import('@/admin/auth/store/auth-store');
  return { useAuth: () => ({ user: store((s) => s.user), signOut }) };
});

const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

beforeEach(async () => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
  const user = makeUser(['usuarios:editar'], [], { rol: { id: 'r1', codigo: 'admin', nombre: 'Administrador' } });
  signInAs(user);
  await saveSession({ accessToken: 'a', refreshToken: 'r', empresaId: 'e1', user, needsCompanyPick: false });
});

describe('validaciones de perfil', () => {
  it('contraseña: actual, mínimo 8, coincidencia y distinta', () => {
    const v = { passwordActual: 'actual123', nuevaPassword: 'nueva1234', confirmarPassword: 'nueva1234' };
    expect(validatePasswordForm({ ...v, passwordActual: '' })).toMatch(/actual/);
    expect(validatePasswordForm({ ...v, nuevaPassword: 'corta', confirmarPassword: 'corta' })).toMatch(/8/);
    expect(validatePasswordForm({ ...v, confirmarPassword: 'otra12345' })).toBe('Las contraseñas no coinciden.');
    expect(validatePasswordForm({ ...v, nuevaPassword: 'actual123', confirmarPassword: 'actual123' })).toMatch(/distinta/);
    expect(validatePasswordForm(v)).toBeNull();
  });

  it('perfil: nombre mínimo 3 y teléfono válido', () => {
    expect(validatePerfil('Al', '')).toMatch(/3/);
    expect(validatePerfil('Ana', 'abc')).toBe('Teléfono inválido.');
    expect(validatePerfil('Ana', '+57 300')).toBeNull();
  });

  it('actualizar perfil envía PUT y refleja el nombre en la sesión', async () => {
    await actualizarPerfil('u1', ' Ana María ', '');
    expect(apiFetch).toHaveBeenCalledWith('usuarios/u1', { method: 'PUT', body: { fullName: 'Ana María' } });
    expect(useAuthStore.getState().user?.fullName).toBe('Ana María');
    expect(JSON.parse((await SecureStore.getItemAsync('vexto_user_json'))!).fullName).toBe('Ana María');
  });
});

describe('PerfilScreen', () => {
  it('muestra datos de sesión y oculta edición sin usuarios:editar', () => {
    signInAs(makeUser([], []));
    const view = render(withQuery(<PerfilScreen />));
    view.getByText('Ana Pérez');
    view.getByText('ana@vexto.co');
    expect(view.queryByText('Guardar datos')).toBeNull();
    view.getByText('Cambiar contraseña');
  });

  it('cambio de contraseña: valida, confirma y cierra sesión solo en el dispositivo', async () => {
    const view = render(withQuery(<PerfilScreen />));
    const pressChange = () => view.press(view.queryAllByText('Cambiar contraseña').at(-1)!);
    pressChange();
    view.getByText('La contraseña actual es obligatoria.');
    expect(Alert.alert).not.toHaveBeenCalled();
    view.changeText({ placeholder: 'Contraseña actual' }, 'actual123');
    view.changeText({ placeholder: 'Nueva contraseña' }, 'nueva1234');
    view.changeText({ placeholder: 'Confirmar contraseña' }, 'nueva1234');
    pressChange();
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ revoke: false }));
    expect(apiFetch).toHaveBeenCalledWith('usuarios/me/password', {
      method: 'PATCH',
      body: { passwordActual: 'actual123', nuevaPassword: 'nueva1234', confirmarPassword: 'nueva1234' },
    });
  });

  it('contraseña actual incorrecta: muestra el error y no cierra sesión', async () => {
    apiFetch.mockRejectedValueOnce(new Error('La contraseña actual no es válida'));
    const view = render(withQuery(<PerfilScreen />));
    view.changeText({ placeholder: 'Contraseña actual' }, 'mala12345');
    view.changeText({ placeholder: 'Nueva contraseña' }, 'nueva1234');
    view.changeText({ placeholder: 'Confirmar contraseña' }, 'nueva1234');
    view.press(view.queryAllByText('Cambiar contraseña').at(-1)!);
    lastAlertButtons()[1].onPress!();
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenLastCalledWith('No se pudo completar', 'La contraseña actual no es válida'),
    );
    expect(signOut).not.toHaveBeenCalled();
  });
});
