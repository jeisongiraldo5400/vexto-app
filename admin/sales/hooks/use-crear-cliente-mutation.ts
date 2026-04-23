import { crearCliente } from '@/admin/sales/adapters/clientes.adapter';
import type { CrearClientePayload } from '@/core/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCrearClienteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CrearClientePayload) => crearCliente(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}
