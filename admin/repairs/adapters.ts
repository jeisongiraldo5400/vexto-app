import { apiFetch } from '@/core/http/api';

export type RepairOrder = {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  reportedIssue: string | null;
};

export async function fetchMyRepairs() {
  return apiFetch<{ items: RepairOrder[]; total: number }>('reparaciones/mias');
}

export async function fetchRepairs(busqueda?: string) {
  const q = busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : '';
  return apiFetch<{ items: RepairOrder[]; total: number }>(`reparaciones?limite=50${q}`);
}

export async function fetchRepairDetail(id: string) {
  return apiFetch<Record<string, unknown>>(`reparaciones/${id}`);
}

export async function changeRepairStatus(id: string, status: string) {
  return apiFetch(`reparaciones/${id}/estado`, { method: 'PUT', body: { status } });
}

export async function addRepairNote(id: string, technicalDiagnosis: string) {
  return apiFetch(`reparaciones/${id}/diagnosticos`, {
    method: 'POST',
    body: { technicalDiagnosis, foundIssue: technicalDiagnosis },
  });
}

export async function addRepairPhoto(id: string, storageKey: string, url?: string) {
  return apiFetch(`reparaciones/${id}/adjuntos`, {
    method: 'POST',
    body: { type: 'REPAIR_PHOTO', storageKey, url, visibility: 'INTERNAL' },
  });
}
