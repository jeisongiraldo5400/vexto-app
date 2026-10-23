import { beforeEach, describe, expect, it, vi } from 'vitest';

import MasScreen from '@/app/(app)/(tabs)/mas';
import ChatRoute from '@/app/(app)/(tabs)/chat-venta';
import InicioRoute from '@/app/(app)/(tabs)/inicio';
import ProductosRoute from '@/app/(app)/(tabs)/productos';
import SelectEmpresaRoute from '@/app/(auth)/select-empresa';
import ChatVentaScreen from '@/admin/chat-sales';
import InicioScreen from '@/admin/home';
import ProductosScreen from '@/admin/products';
import SelectEmpresaScreen from '@/admin/auth/select-empresa-screen';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import { canOpenPath } from '@/core/permissions';
import { router } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render } from '@/test-utils/renderer';

const signOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/admin/auth/hooks/use-auth', async () => {
  const { useAuthStore: store } = await import('@/admin/auth/store/auth-store');
  return { useAuth: () => ({ user: store((s) => s.user), signOut, completeCompanySelection: vi.fn() }) };
});
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch: vi.fn(() => new Promise(() => {})) }));

const OPTIONS: [string, string][] = [
  ['Productos', '/(app)/(tabs)/productos'],
  ['Venta por chat', '/(app)/(tabs)/chat-venta'],
  ['Gastos', '/(app)/gastos'],
  ['Clientes', '/(app)/clientes'],
  ['Separados', '/(app)/separados'],
  ['Créditos', '/(app)/creditos'],
  ['Pagos', '/(app)/pagos'],
  ['Devoluciones', '/(app)/devoluciones'],
];

beforeEach(() => vi.clearAllMocks());

describe('rutas de pestañas', () => {
  it('reexportan las pantallas de admin', () => {
    expect(InicioRoute).toBe(InicioScreen);
    expect(ProductosRoute).toBe(ProductosScreen);
    expect(ChatRoute).toBe(ChatVentaScreen);
    expect(SelectEmpresaRoute).toBe(SelectEmpresaScreen);
  });
});

describe('MasScreen', () => {
  it.each([
    [[], []],
    [['productos:ver'], ['inventario']],
    [['productos:ver'], []],
    [['pos:crear'], ['chat_ventas']],
    [['ventas:crear', 'gastos:ver'], ['chat_ventas', 'finanzas']],
    [['gastos:ver'], []],
    [['clientes:ver', 'separados:ver', 'ventas:ver', 'pagos:ver', 'devoluciones:ver'], ['clientes', 'ventas', 'pagos']],
    [['clientes:ver', 'separados:ver', 'ventas:ver', 'pagos:ver', 'devoluciones:ver'], []],
    [['separados:crear', 'pagos:crear'], ['ventas', 'pagos']],
  ])('con permisos %j y módulos %j muestra solo opciones abribles', (permisos, modulos) => {
    signInAs(makeUser(permisos, modulos));
    const user = useAuthStore.getState().user;
    const view = render(<MasScreen />);
    for (const [title, href] of OPTIONS) {
      // Coherente con la guarda del layout (canOpenPath): nada visible que luego se rechace.
      expect(!!view.queryByText(title), title).toBe(canOpenPath(user, href));
      if (view.queryByText(title)) {
        view.press(title);
        expect(router.push).toHaveBeenLastCalledWith(href);
      }
    }
    view.getByText('Cambiar empresa');
    view.press('Mi perfil');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/perfil');
  });

  it('"Cerrar sesión" llama signOut', () => {
    signInAs(makeUser([], []));
    render(<MasScreen />).press('Cerrar sesión');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('"Cambiar empresa" lleva a una pantalla de selección que no se redirige de vuelta', () => {
    signInAs(makeUser([], []));
    render(<MasScreen />).press('Cambiar empresa');
    // SelectEmpresaScreen redirige a "/" si no falta elegir empresa.
    const select = render(withQuery(<SelectEmpresaScreen />));
    expect(select.queryAll((n) => n.type === 'Redirect')).toHaveLength(0);
    select.getByText('¿En cuál empresa vendes?');
  });
});
