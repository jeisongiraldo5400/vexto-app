import { enviarMensajeChat } from '@/admin/chat-sales/adapters/chat-sales.adapter';
import type { ChatVentaRequest, ChatVentaResponse } from '@/core/types';
import { useMutation } from '@tanstack/react-query';

export function useSendChatMessageMutation() {
  return useMutation<ChatVentaResponse, Error, ChatVentaRequest>({
    mutationFn: (body) => enviarMensajeChat(body),
  });
}
