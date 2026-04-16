export const salesQueryKeys = {
  almacenes: ['almacenes'] as const,
  metodosPago: ['metodos-pago'] as const,
  stockProductoAlmacen: (productoId: string, almacenId: string) =>
    ['stock', 'producto', productoId, 'almacen', almacenId] as const,
} as const;
