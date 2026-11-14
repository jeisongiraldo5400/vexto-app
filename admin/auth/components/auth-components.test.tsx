import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import type { EmpresaDelUsuario } from '@/core/types';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import LoginScreen from '../login-screen';
import SelectEmpresaScreen from '../select-empresa-screen';
import { LoginForm } from './login-form';
import { SelectEmpresaList } from './select-empresa-list';

const auth = vi.hoisted(() => ({ signIn: vi.fn(), completeCompanySelection: vi.fn() }));
vi.mock('@/admin/auth/hooks/use-auth', () => ({ useAuth: () => auth }));
vi.mock('@/core/config', () => ({ getApiBaseUrl: () => 'http://api.test/v1/api' }));
const { fetchEmpresas, loadSession } = vi.hoisted(() => ({ fetchEmpresas: vi.fn(), loadSession: vi.fn() }));
vi.mock('@/admin/auth/adapters', () => ({ fetchEmpresas }));
vi.mock('@/core/session/secure-session', () => ({ loadSession }));

/** El título de la tarjeta también dice "Iniciar sesión": el botón es el último. */
const submit = (view: ReturnType<typeof render>) => view.press(view.queryAllByText('Iniciar sesión').at(-1)!);
const EMAIL = { placeholder: 'correo@ejemplo.com' };
const PASSWORD = { placeholder: '••••••••' };

const empresa = (id: string, patch: Partial<EmpresaDelUsuario> = {}): EmpresaDelUsuario => ({
  id,
  nombre: `Empresa ${id}`,
  nit: null,
  activo: true,
  chatVentasHabilitado: false,
  ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
  loadSession.mockResolvedValue({ accessToken: 'tok' });
});

describe('LoginForm', () => {
  it('exige correo y contraseña sin llamar al API', () => {
    const view = render(<LoginForm />);
    view.changeText(EMAIL, '   ');
    view.changeText(PASSWORD, 'secreta');
    submit(view);
    view.getByText('Escribe correo y contraseña.');
    view.changeText(EMAIL, 'ana@vexto.co');
    view.changeText(PASSWORD, '');
    submit(view);
    view.getByText('Escribe correo y contraseña.');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('envía el correo recortado y la contraseña tal cual, con indicador de carga', async () => {
    let done!: () => void;
    auth.signIn.mockReturnValue(new Promise<void>((r) => (done = r)));
    const view = render(<LoginForm />);
    view.changeText(EMAIL, '  ana@vexto.co ');
    view.changeText(PASSWORD, ' clave ');
    submit(view);
    expect(auth.signIn).toHaveBeenCalledWith('ana@vexto.co', ' clave ');
    expect(view.queryAllByText('Iniciar sesión')).toHaveLength(1);
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    done();
    await waitFor(() => expect(view.queryAllByText('Iniciar sesión')).toHaveLength(2));
  });

  it('muestra el mensaje del ApiError y de errores comunes', async () => {
    auth.signIn.mockRejectedValueOnce(new ApiError(401, 'Credenciales inválidas'));
    const view = render(<LoginForm />);
    view.changeText(EMAIL, 'ana@vexto.co');
    view.changeText(PASSWORD, 'x');
    submit(view);
    await waitFor(() => view.getByText('Credenciales inválidas'));

    auth.signIn.mockRejectedValueOnce(new Error('Tu usuario no tiene empresa asignada. Contacta al administrador.'));
    submit(view);
    await waitFor(() => view.getByText(/no tiene empresa asignada/));

    auth.signIn.mockRejectedValueOnce('boom');
    submit(view);
    await waitFor(() => view.getByText('No se pudo entrar.'));
  });

  it('alterna la visibilidad de la contraseña y muestra el servidor', () => {
    const view = render(<LoginForm />);
    expect(view.getByProps(PASSWORD).props.secureTextEntry).toBe(true);
    view.press('Mostrar');
    expect(view.getByProps(PASSWORD).props.secureTextEntry).toBe(false);
    view.getByText('Ocultar');
    expect(view.text()).toContain('Servidor: http://api.test/v1/api');
  });
});

describe('LoginScreen', () => {
  it('redirige a "/" con sesión lista y muestra el formulario si falta elegir empresa', () => {
    signInAs(makeUser([], []));
    expect(render(<LoginScreen />).getByProps({ href: '/' }).type).toBe('Redirect');
    signInAs(makeUser([], []), { needsCompanyPick: true });
    render(<LoginScreen />).getByText('Iniciar sesión');
    signInAs(null);
    render(<LoginScreen />).getByText('Iniciar sesión');
  });
});

describe('SelectEmpresaList', () => {
  beforeEach(() => signInAs(makeUser([], []), { needsCompanyPick: true }));

  it('carga y lista solo empresas activas con NIT', async () => {
    let resolve!: (v: EmpresaDelUsuario[]) => void;
    fetchEmpresas.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = render(withQuery(<SelectEmpresaList />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    await waitFor(() => expect(fetchEmpresas).toHaveBeenCalledWith('tok'));
    resolve([empresa('a', { nit: '900.123' }), empresa('b', { activo: false })]);
    await waitFor(() => view.getByText('Empresa a'));
    view.getByText('NIT 900.123');
    expect(view.queryByText('Empresa b')).toBeNull();
  });

  it('muestra error de carga', async () => {
    fetchEmpresas.mockRejectedValue(new ApiError(500, 'x'));
    const view = render(withQuery(<SelectEmpresaList />));
    await waitFor(() => view.getByText('No pudimos cargar las empresas.'));
  });

  it('al elegir bloquea la lista, llama completeCompanySelection y reporta fallos', async () => {
    fetchEmpresas.mockResolvedValue([empresa('a'), empresa('b')]);
    let fail!: (e: Error) => void;
    auth.completeCompanySelection.mockReturnValue(new Promise((_, rej) => (fail = rej)));
    const view = render(withQuery(<SelectEmpresaList />));
    await waitFor(() => view.getByText('Empresa b'));
    view.press('Empresa b');
    expect(auth.completeCompanySelection).toHaveBeenCalledWith('b');
    expect(view.isDisabled('Empresa a')).toBe(true);
    fail(new Error('red'));
    await waitFor(() => view.getByText('No se pudo cambiar de empresa. Intenta de nuevo.'));
    expect(view.isDisabled('Empresa a')).toBe(false);
  });
});

describe('SelectEmpresaScreen', () => {
  it('redirige si no hay usuario o no falta elegir empresa', () => {
    fetchEmpresas.mockResolvedValue([]);
    signInAs(null);
    expect(render(withQuery(<SelectEmpresaScreen />)).getByProps({ href: '/' }).type).toBe('Redirect');
    signInAs(makeUser([], []));
    expect(render(withQuery(<SelectEmpresaScreen />)).getByProps({ href: '/' }).type).toBe('Redirect');
    signInAs(makeUser([], []), { needsCompanyPick: true });
    render(withQuery(<SelectEmpresaScreen />)).getByText('¿En cuál empresa vendes?');
  });
});
