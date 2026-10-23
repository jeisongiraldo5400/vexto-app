import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import UnidadesScreen from './index';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch }));

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser([], []));
});

describe('UnidadesScreen', () => {
  it('carga y lista unidades', async () => {
    let resolve!: (v: unknown) => void;
    apiFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = render(withQuery(<UnidadesScreen />));
    view.getByText('Cargando unidades…');
    expect(apiFetch).toHaveBeenCalledWith('/unidades-medida');
    resolve([{ id: 'u1', nombre: 'Kilogramo', abreviatura: 'kg', estado: 'activo' }]);
    await waitFor(() => view.getByText('Kilogramo'));
    expect(view.text()).toContain('Abreviatura: kg');
  });

  it('muestra vacío', async () => {
    apiFetch.mockResolvedValue([]);
    const view = render(withQuery(<UnidadesScreen />));
    await waitFor(() => view.getByText('No hay unidades registradas.'));
  });

  it('muestra el error sin el texto de vacío', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'Sin conexión al API'));
    const view = render(withQuery(<UnidadesScreen />));
    await waitFor(() => view.getByText('Sin conexión al API'));
    expect(view.queryByText('No hay unidades registradas.')).toBeNull();
  });

  it('no consulta sin sesión lista', () => {
    signInAs(makeUser([], []), { needsCompanyPick: true });
    render(withQuery(<UnidadesScreen />));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
