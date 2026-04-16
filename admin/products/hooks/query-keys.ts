export const productsQueryKeys = {
  productos: (busqueda: string) => ['productos', { busqueda }] as const,
} as const;
