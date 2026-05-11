import type { ChatMessage } from '@/core/types';
import { create } from 'zustand';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type ChatContexto = {
  productoDisambiguar?: string;
  ultimaIntencion?: {
    nombreProducto?: string;
    cantidad?: number;
    precioUnitario?: number;
  };
};

type ChatStore = {
  messages: ChatMessage[];
  isLoading: boolean;
  contexto: ChatContexto | null;
  sessionId: string;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setLoading: (v: boolean) => void;
  setContexto: (ctx: ChatContexto | null) => void;
  regenerateSessionId: () => void;
  clearChat: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  contexto: null,
  sessionId: generateSessionId(),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),

  setContexto: (ctx) => set({ contexto: ctx }),

  regenerateSessionId: () => set({ sessionId: generateSessionId() }),

  clearChat: () =>
    set({
      messages: [],
      contexto: null,
      isLoading: false,
      sessionId: generateSessionId(),
    }),
}));
