import { ChatInputBar } from '@/admin/chat-sales/components/chat-input-bar';
import { ChatMessageBubble } from '@/admin/chat-sales/components/chat-message-bubble';
import { useSendChatMessageMutation } from '@/admin/chat-sales/hooks/use-send-chat-message';
import { useChatStore } from '@/admin/chat-sales/store/chat-store';
import { Colors } from '@/constants/theme';
import { ApiError } from '@/core/http/api';
import type { ChatMessage } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatVentaScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const messages = useChatStore((s) => s.messages);
  const contexto = useChatStore((s) => s.contexto);
  const sessionId = useChatStore((s) => s.sessionId);
  const addMessage = useChatStore((s) => s.addMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const setContexto = useChatStore((s) => s.setContexto);
  const regenerateSessionId = useChatStore((s) => s.regenerateSessionId);
  const clearChat = useChatStore((s) => s.clearChat);

  const sendMutation = useSendChatMessageMutation();
  const listRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Escuchar altura del teclado para elevar la barra de entrada.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollToEnd(), 150);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToEnd]);

  const keyboardOpen = keyboardHeight > 0;
  const bottomSpacerHeight = keyboardOpen ? Math.max(keyboardHeight - insets.bottom + 4, 0) : insets.bottom;
  const listBottomPadding = keyboardOpen ? 16 : insets.bottom + 16;

  const handleResponse = useCallback(
    (res: { status: string; mensaje: string; venta?: any; opciones?: any[]; intencionPendiente?: any; precioSugerido?: number; precioRegistrado?: number; precioMinimoPermitido?: number }) => {
      let action: ChatMessage['action'] = undefined;

      if (res.status === 'ambiguous' && res.opciones && res.intencionPendiente) {
        action = {
          type: 'disambiguation',
          options: res.opciones,
          intencionPendiente: res.intencionPendiente,
        };
        setContexto({
          ultimaIntencion: res.intencionPendiente,
        });
      } else if (res.status === 'success' && res.venta) {
        action = {
          type: 'success',
          venta: res.venta,
        };
        setContexto(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Auto-reset: nueva sesión para próxima venta
        regenerateSessionId();
      } else if (res.status === 'needs_price_confirmation' && res.intencionPendiente) {
        const bloqueado = (res.precioSugerido ?? 0) < (res.precioMinimoPermitido ?? 0);
        action = {
          type: 'price_confirmation',
          precioSugerido: res.precioSugerido ?? 0,
          precioRegistrado: res.precioRegistrado ?? 0,
          precioMinimoPermitido: res.precioMinimoPermitido ?? 0,
          bloqueado,
          intencionPendiente: res.intencionPendiente,
        };
        setContexto({
          ultimaIntencion: res.intencionPendiente,
        });
      } else if (res.status === 'clarification' && res.intencionPendiente) {
        // Preservar intención pendiente para el siguiente mensaje
        setContexto({
          ultimaIntencion: res.intencionPendiente,
        });
      } else {
        setContexto(null);
      }

      return action;
    },
    [setContexto, regenerateSessionId],
  );

  const handleSend = useCallback(
    async (text: string) => {
      Keyboard.dismiss();

      const userMsgId = generateId();
      addMessage({
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: new Date(),
        status: 'sent',
      });

      const botMsgId = generateId();
      addMessage({
        id: botMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      });

      setLoading(true);
      scrollToEnd();

      try {
        const res = await sendMutation.mutateAsync({
          mensaje: text,
          sessionId,
          contexto: contexto ?? undefined,
        });

        const action = handleResponse(res);

        // Actualizar mensaje del bot con respuesta real
        const messagesInStore = useChatStore.getState().messages;
        const botIndex = messagesInStore.findIndex((m) => m.id === botMsgId);
        if (botIndex !== -1) {
          useChatStore.getState().updateMessage(botMsgId, {
            content: res.mensaje,
            status: 'sent',
            action,
          });
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'No se pudo procesar el mensaje. Revisa tu conexión.';
        useChatStore.getState().updateMessage(botMsgId, {
          content: msg,
          status: 'error',
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [addMessage, contexto, sessionId, sendMutation, setLoading, scrollToEnd, handleResponse],
  );

  const handleSelectOption = useCallback(
    async (optionId: string) => {
      const lastBotMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      const intencion = lastBotMsg?.action?.type === 'disambiguation'
        ? lastBotMsg.action.intencionPendiente
        : null;

      if (!intencion) return;

      const optionName = lastBotMsg?.action?.type === 'disambiguation'
        ? lastBotMsg.action.options.find((o) => o.id === optionId)?.nombre
        : '';

      const userMsgId = generateId();
      addMessage({
        id: userMsgId,
        role: 'user',
        content: optionName || 'Seleccionar opción',
        timestamp: new Date(),
        status: 'sent',
      });

      const botMsgId = generateId();
      addMessage({
        id: botMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      });

      setLoading(true);
      scrollToEnd();

      try {
        const res = await sendMutation.mutateAsync({
          mensaje: optionName || '',
          sessionId,
          contexto: {
            productoDisambiguar: optionId,
            ultimaIntencion: intencion,
          },
        });

        const action = handleResponse(res);

        useChatStore.getState().updateMessage(botMsgId, {
          content: res.mensaje,
          status: 'sent',
          action,
        });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'No se pudo procesar la selección.';
        useChatStore.getState().updateMessage(botMsgId, {
          content: msg,
          status: 'error',
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [messages, sessionId, addMessage, sendMutation, setLoading, scrollToEnd, handleResponse],
  );

  const handleConfirmPrice = useCallback(
    async (useSuggested: boolean) => {
      const lastBotMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      const intencion = lastBotMsg?.action?.type === 'price_confirmation'
        ? lastBotMsg.action.intencionPendiente
        : null;

      if (!intencion) return;

      const userMsgId = generateId();
      addMessage({
        id: userMsgId,
        role: 'user',
        content: useSuggested ? 'Confirmar precio sugerido' : 'Usar precio registrado',
        timestamp: new Date(),
        status: 'sent',
      });

      const botMsgId = generateId();
      addMessage({
        id: botMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      });

      setLoading(true);
      scrollToEnd();

      try {
        const res = await sendMutation.mutateAsync({
          mensaje: intencion.nombreProducto,
          sessionId,
          contexto: {
            confirmarPrecio: useSuggested,
            ultimaIntencion: intencion,
          },
        });

        const action = handleResponse(res);

        useChatStore.getState().updateMessage(botMsgId, {
          content: res.mensaje,
          status: 'sent',
          action,
        });
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'No se pudo confirmar el precio.';
        useChatStore.getState().updateMessage(botMsgId, {
          content: msg,
          status: 'error',
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [messages, sessionId, addMessage, sendMutation, setLoading, scrollToEnd, handleResponse],
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.backgroundPaper, borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Venta por Chat</Text>
          <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
            Escribe lo que vendiste en lenguaje natural
          </Text>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={clearChat}
            style={({ pressed }) => [
              styles.clearBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={{ color: c.error, fontSize: 13, fontWeight: '600' }}>
              Limpiar
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.chatBody}>
        {messages.length === 0 ? (
          <Pressable style={styles.listContainer} onPress={Keyboard.dismiss} accessible={false}>
            <View style={[styles.emptyState, keyboardOpen && styles.emptyStateKeyboardOpen]}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                ¡Hola! 👋
              </Text>
              <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
                Escribe algo como:
              </Text>
              <View style={styles.examples}>
                {[
                  'vendí 8 cervezas a 3500',
                  'se fueron 3 arroz',
                  'una gaseosa',
                  '5 papel higiénico',
                ].map((ex) => (
                  <Pressable
                    key={ex}
                    style={({ pressed }) => [
                      styles.exampleChip,
                      {
                        backgroundColor: c.card,
                        borderColor: c.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => handleSend(ex)}>
                    <Text style={[styles.exampleText, { color: c.text }]}>
                      {`"${ex}"`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.listContainer}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                onSelectOption={
                  item.role === 'assistant' && item.action?.type === 'disambiguation'
                    ? handleSelectOption
                    : undefined
                }
                onConfirmPrice={
                  item.role === 'assistant' && item.action?.type === 'price_confirmation'
                    ? handleConfirmPrice
                    : undefined
                }
              />
            )}
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: listBottomPadding,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {sendMutation.isPending && messages.length > 0 && messages[messages.length - 1]?.status === 'sending' && (
          <View style={[styles.loadingOverlay, { bottom: bottomSpacerHeight + 60 }]}>
            <ActivityIndicator size="small" color={c.tint} />
          </View>
        )}

        <ChatInputBar onSend={handleSend} disabled={sendMutation.isPending} />
        <View style={{ height: bottomSpacerHeight }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  chatBody: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 12,
  },
  emptyStateKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  examples: {
    marginTop: 8,
    gap: 8,
    width: '100%',
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
