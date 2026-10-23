import { crearVenta, type CrearVentaPayload } from '@/admin/sales/adapters/sales.adapter';
import { newIdempotencyIntent } from '@/core/http/idempotent';
import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

export type { CrearVentaPayload };

export function useCreateVentaMutation() {
  /** Una intención por venta: se conserva en reintentos y se renueva tras el éxito. */
  const intent = useRef<string | null>(null);
  return useMutation({
    mutationFn: (body: CrearVentaPayload) => {
      intent.current ??= newIdempotencyIntent();
      return crearVenta(body, intent.current);
    },
    onSuccess: () => {
      intent.current = null;
    },
  });
}
