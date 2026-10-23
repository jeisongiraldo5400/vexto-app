import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { router, useLocalSearchParams } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import {
  EMPTY_CLIENTE_FORM,
  actualizarCliente,
  crearCliente,
  fetchClientes,
  nombreCliente,
  validateClienteForm,
} from './adapters';
import { ClienteFormScreen } from './cliente-form-screen';
import { ClientesListScreen } from './clientes-list-screen';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));

const ana = {
  id: 'c1',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  nombre: 'Ana',
  apellido: 'Pérez',
  razonSocial: null,
  telefono: '300',
  email: 'ana@x.co',
  direccion: null,
  ciudad: 'Medellín',
};

const ALL = ['clientes:ver', 'clientes:crear', 'clientes:editar'];

beforeEach(() => {
  vi.clearAllMocks();
  useLocalSearchParams.mockReturnValue({});
  signInAs(makeUser(ALL, ['clientes']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('clientes?')) return { clientes: [ana], total: 1 };
    if (path === 'clientes/c1') return ana;
    return { id: 'nuevo' };
  });
});

describe('adapters de clientes', () => {
  it('nombreCliente prioriza razón social, luego nombre y documento', () => {
    expect(nombreCliente({ razonSocial: 'ACME SAS', nombre: 'x' })).toBe('ACME SAS');
    expect(nombreCliente({ nombre: 'Ana', apellido: 'Pérez' })).toBe('Ana Pérez');
    expect(nombreCliente({ numeroDocumento: '9' })).toBe('9');
  });

  it('lista activos con búsqueda y paginación', async () => {
    await fetchClientes('  ana ', 2);
    expect(apiFetch).toHaveBeenCalledWith('clientes?pagina=2&limite=20&activo=true&busqueda=ana');
  });

  it('valida documento, nombre/razón social, correo y teléfono', () => {
    expect(validateClienteForm(EMPTY_CLIENTE_FORM)).toMatch(/documento/);
    const base = { ...EMPTY_CLIENTE_FORM, numeroDocumento: '1' };
    expect(validateClienteForm(base)).toMatch(/nombre/);
    expect(validateClienteForm({ ...base, tipoDocumento: 'NIT' })).toMatch(/razón social/);
    expect(validateClienteForm({ ...base, nombre: 'A', email: 'malo' })).toBe('Correo inválido.');
    expect(validateClienteForm({ ...base, nombre: 'A', telefono: 'abc' })).toBe('Teléfono inválido.');
    expect(validateClienteForm({ ...base, nombre: 'A' })).toBeNull();
  });

  it('crear NIT usa la razón social como nombre y omite vacíos', async () => {
    await crearCliente({ ...EMPTY_CLIENTE_FORM, tipoDocumento: 'NIT', numeroDocumento: ' 900 ', razonSocial: ' ACME ' });
    expect(apiFetch).toHaveBeenCalledWith('clientes', {
      method: 'POST',
      body: {
        tipoDocumento: 'NIT',
        numeroDocumento: '900',
        nombre: 'ACME',
        apellido: undefined,
        razonSocial: 'ACME',
        telefono: undefined,
        email: undefined,
        direccion: undefined,
        ciudad: undefined,
      },
    });
  });

  it('editar envía null para limpiar opcionales y no envía documento', async () => {
    await actualizarCliente('c1', { ...EMPTY_CLIENTE_FORM, numeroDocumento: '1', nombre: 'Ana', ciudad: 'Cali' });
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe('clientes/c1');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({
      nombre: 'Ana',
      apellido: null,
      razonSocial: null,
      telefono: null,
      email: null,
      direccion: null,
      ciudad: 'Cali',
    });
  });
});

describe('ClientesListScreen', () => {
  it('lista clientes y navega a crear/editar con permisos', async () => {
    const view = render(withQuery(<ClientesListScreen />));
    await waitFor(() => view.getByText('Ana Pérez'));
    view.getByText('CC 123');
    view.press('Nuevo cliente');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/clientes/nuevo');
    view.press('Ana Pérez');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/clientes/c1');
  });

  it('solo ver: sin alta ni edición', async () => {
    signInAs(makeUser(['clientes:ver'], ['clientes']));
    const view = render(withQuery(<ClientesListScreen />));
    await waitFor(() => view.getByText('Ana Pérez'));
    expect(view.queryByText('Nuevo cliente')).toBeNull();
    expect(() => view.press('Ana Pérez')).toThrow(/Sin onPress/);
  });
});

describe('ClienteFormScreen', () => {
  it('crear: valida y luego guarda y vuelve', async () => {
    const view = render(withQuery(<ClienteFormScreen />));
    view.press('Guardar');
    await waitFor(() => view.getByText('Indica el número de documento.'));
    expect(apiFetch).not.toHaveBeenCalled();
    view.changeText({ placeholder: 'Número de documento' }, '555');
    view.changeText({ placeholder: 'Nombre' }, 'Luis');
    view.press('Guardar');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('clientes', expect.objectContaining({ method: 'POST' }));
  });

  it('editar: precarga el cliente y hace PUT', async () => {
    useLocalSearchParams.mockReturnValue({ id: 'c1' });
    const view = render(withQuery(<ClienteFormScreen />));
    await waitFor(() => expect(view.getByProps({ placeholder: 'Nombre' }).props.value).toBe('Ana'));
    view.getByText('CC 123');
    view.press('Guardar');
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('clientes/c1', expect.objectContaining({ method: 'PUT' })),
    );
  });

  it('error del servidor se muestra y no navega', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Documento duplicado'));
    const view = render(withQuery(<ClienteFormScreen />));
    view.changeText({ placeholder: 'Número de documento' }, '555');
    view.changeText({ placeholder: 'Nombre' }, 'Luis');
    view.press('Guardar');
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo completar', 'Documento duplicado'));
    expect(router.back).not.toHaveBeenCalled();
  });
});
