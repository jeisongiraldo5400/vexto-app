export const homeQueryKeys = {
  /** Prefijo para invalidar el dashboard de cualquier empresa. */
  all: ['dashboard'] as const,
  dashboard: (empresaId: string | null) => ['dashboard', empresaId] as const,
} as const;
