import { apiFetch } from '@/core/http/api';
import type { Cliente, CrearClientePayload } from '@/core/types';

export type ClientesListResponse = {
  clientes: Cliente[];
  total: number;
};

export function fetchClientesBusqueda(busqueda: string, pagina = 1, limite = 20) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
    activo: 'true',
  });
  if (busqueda.trim()) q.set('busqueda', busqueda.trim());
  return apiFetch<ClientesListResponse>(`/clientes?${q.toString()}`);
}

export function crearCliente(body: CrearClientePayload) {
  return apiFetch<Cliente>('/clientes', { method: 'POST', body });
}
