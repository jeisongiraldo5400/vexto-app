import { crearVenta, type CrearVentaPayload } from '@/admin/sales/adapters/sales.adapter';
import { useMutation } from '@tanstack/react-query';

export type { CrearVentaPayload };

export function useCreateVentaMutation() {
  return useMutation({
    mutationFn: (body: CrearVentaPayload) => crearVenta(body),
  });
}
