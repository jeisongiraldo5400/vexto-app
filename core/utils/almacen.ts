export interface AlmacenSelectable {
  id: string;
  activo?: boolean;
  codigo?: string;
}

/** Prioriza almacén activo; estable por código cuando hay varios. */
export function getAlmacenPredeterminado<T extends AlmacenSelectable>(
  almacenes: T[] | undefined | null,
): T | null {
  if (!almacenes?.length) return null;

  const activos = almacenes.filter((a) => a.activo !== false);
  const pool = activos.length > 0 ? activos : almacenes;

  return [...pool].sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? ''))[0] ?? null;
}
