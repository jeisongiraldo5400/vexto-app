import { apiFetch } from '@/core/http/api';
import type { ChatVentaRequest, ChatVentaResponse } from '@/core/types';

export function enviarMensajeChat(body: ChatVentaRequest) {
  return apiFetch<ChatVentaResponse>('/chat-ventas', { method: 'POST', body });
}
