export const salesQueryKeys = {
  almacenes: ['almacenes'] as const,
  metodosPago: ['metodos-pago'] as const,
  clientesBusqueda: (q: string) => ['clientes', 'busqueda', q] as const,
  stockProductoAlmacen: (productoId: string, almacenId: string) =>
    ['stock', 'producto', productoId, 'almacen', almacenId] as const,
} as const;
