import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { crearVentaCredito, type CrearVentaCreditoPayload } from '@/admin/sales/adapters/credito.adapter';
import { newIdempotencyIntent } from '@/core/http/idempotent';

export function useCreateCreditoVentaMutation() {
  /** Una intención por venta: se conserva en reintentos y se renueva tras el éxito. */
  const intent = useRef<string | null>(null);
  return useMutation({
    mutationFn: (body: CrearVentaCreditoPayload) => {
      intent.current ??= newIdempotencyIntent();
      return crearVentaCredito(body, intent.current);
    },
    onSuccess: () => {
      intent.current = null;
    },
  });
}
