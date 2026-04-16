import { fetchProductoByCodigoBarras } from '@/admin/products/adapters/products.adapter';
import { useMutation } from '@tanstack/react-query';

export function useResolveProductoBarcodeMutation() {
  return useMutation({
    mutationFn: async (codigo: string) => {
      const trimmed = codigo.trim();
      if (!trimmed) throw new Error('Código vacío');
      return fetchProductoByCodigoBarras(trimmed);
    },
  });
}
