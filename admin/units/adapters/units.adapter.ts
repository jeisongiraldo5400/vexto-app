import { apiFetch } from '@/core/http/api';
import type { UnidadMedida } from '@/core/types';

export function fetchUnidadesMedida() {
  return apiFetch<UnidadMedida[]>('/unidades-medida');
}
