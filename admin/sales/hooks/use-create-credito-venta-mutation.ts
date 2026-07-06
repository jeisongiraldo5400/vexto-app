import { useMutation } from '@tanstack/react-query';
import { crearVentaCredito, type CrearVentaCreditoPayload } from '@/admin/sales/adapters/credito.adapter';

export function useCreateCreditoVentaMutation() {
  return useMutation({
    mutationFn: (body: CrearVentaCreditoPayload) => crearVentaCredito(body),
  });
}
