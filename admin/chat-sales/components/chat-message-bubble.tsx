import type { ChatMessage } from '@/core/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message: ChatMessage;
  onSelectOption?: (optionId: string) => void;
  onConfirmPrice?: (useSuggested: boolean) => void;
};

export function ChatMessageBubble({ message, onSelectOption, onConfirmPrice }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
      ]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? c.tint : c.card,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
          },
        ]}>
        {message.status === 'sending' && !isUser ? (
          <View style={styles.typingRow}>
            <Text style={[styles.typing, { color: c.textSecondary }]}>
              Pensando
            </Text>
            <MaterialIcons
              name="more-horiz"
              size={20}
              color={c.textSecondary}
            />
          </View>
        ) : (
          <Text
            style={[
              styles.text,
              { color: isUser ? c.onPrimary : c.text },
            ]}>
            {message.content}
          </Text>
        )}

        {message.action?.type === 'disambiguation' && onSelectOption && (
          <View style={styles.optionsContainer}>
            {message.action.options.map((opt) => (
              <Pressable
                key={opt.id}
                style={({ pressed }) => [
                  styles.optionChip,
                  {
                    backgroundColor: c.backgroundPaper,
                    borderColor: c.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => onSelectOption(opt.id)}>
                <Text
                  style={[styles.optionName, { color: c.text }]}
                  numberOfLines={1}>
                  {opt.nombre}
                </Text>
                <Text style={[styles.optionMeta, { color: c.textSecondary }]}>
                  ${opt.precioVenta.toLocaleString('es-CO')} — {opt.stockDisponible} disp.
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {message.action?.type === 'success' && (
          <View style={[styles.successBadge, { backgroundColor: c.tint + '22' }]}>
            <MaterialIcons name="check-circle" size={16} color={c.tint} />
            <Text style={[styles.successText, { color: c.tint }]}>
              Factura {message.action.venta.numeroFactura}
            </Text>
          </View>
        )}

        {message.action?.type === 'price_confirmation' && onConfirmPrice && (
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: c.textSecondary }]}>Sugerido:</Text>
              <Text style={[styles.priceValue, { color: c.text }]}>
                ${message.action.precioSugerido.toLocaleString('es-CO')}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: c.textSecondary }]}>Registrado:</Text>
              <Text style={[styles.priceValue, { color: c.text }]}>
                ${message.action.precioRegistrado.toLocaleString('es-CO')}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: c.textSecondary }]}>Mínimo:</Text>
              <Text style={[styles.priceValue, { color: c.text }]}>
                ${message.action.precioMinimoPermitido.toLocaleString('es-CO')}
              </Text>
            </View>

            {message.action.bloqueado ? (
              <Pressable
                style={({ pressed }) => [
                  styles.priceBtn,
                  { backgroundColor: c.tint, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => onConfirmPrice(false)}>
                <Text style={[styles.priceBtnText, { color: c.onPrimary }]}>
                  Vender a precio registrado ${message.action.precioRegistrado.toLocaleString('es-CO')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.priceBtnRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.priceBtnSmall,
                    { backgroundColor: c.tint, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => onConfirmPrice(true)}>
                  <Text style={[styles.priceBtnText, { color: c.onPrimary }]}>
                    Confirmar ${message.action.precioSugerido.toLocaleString('es-CO')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.priceBtnSmall,
                    { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => onConfirmPrice(false)}>
                  <Text style={[styles.priceBtnTextSecondary, { color: c.text }]}>
                    Usar ${message.action.precioRegistrado.toLocaleString('es-CO')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typing: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginTop: 10,
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: 10,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  priceBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  priceBtnSmall: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  priceBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
});
