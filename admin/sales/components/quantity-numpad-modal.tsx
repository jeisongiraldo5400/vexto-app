import { Brand, Colors } from '@/constants/theme';
import { formatCurrency, formatNumber } from '@/core/format';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ABSOLUTE_MAX_QTY = 9999;
const MAX_DIGITS = 4;
const GAP = 10;
const KEY_MIN = 68;

type Props = {
  visible: boolean;
  product: Producto | null;
  stockDisponible: number | null;
  onConfirm: (cantidad: number) => void;
  onCancel: () => void;
};

function parseQtyFromDigits(digits: string): number {
  if (!digits || digits === '0') return 1;
  const n = parseInt(digits, 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(ABSOLUTE_MAX_QTY, n);
}

export function QuantityNumpadModal({ visible, product, stockDisponible, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const [digits, setDigits] = useState('1');

  const maxQty =
    stockDisponible !== null
      ? Math.min(stockDisponible, ABSOLUTE_MAX_QTY)
      : ABSOLUTE_MAX_QTY;

  useEffect(() => {
    if (visible && product) {
      setDigits('1');
      if (Platform.OS === 'ios') {
        void AccessibilityInfo.announceForAccessibility(
          'Producto encontrado. Elija cuántas unidades con los números grandes y pulse agregar al carrito.',
        );
      }
    }
  }, [visible, product?.id]);

  const pushDigit = useCallback(
    (d: string) => {
      setDigits((prev) => {
        if (prev.length >= MAX_DIGITS) return prev;
        let next: string;
        if (prev === '1') {
          if (d === '0') next = '10';
          else if (d === '1') next = '11';
          else next = d;
        } else {
          next = prev + d;
        }
        const n = parseInt(next, 10);
        if (!Number.isNaN(n) && n > maxQty) return prev;
        return next;
      });
      void Haptics.selectionAsync();
    },
    [maxQty],
  );

  const backspace = useCallback(() => {
    setDigits((prev) => {
      if (prev.length <= 1) return '1';
      return prev.slice(0, -1);
    });
    void Haptics.selectionAsync();
  }, []);

  const clearAll = useCallback(() => {
    setDigits('1');
    void Haptics.selectionAsync();
  }, []);

  const handleConfirm = useCallback(() => {
    if (!product) return;
    const qty = parseQtyFromDigits(digits);
    onConfirm(qty);
  }, [digits, onConfirm, product]);

  if (!product) return null;

  const previewQty = parseQtyFromDigits(digits);
  const exceedsStock = stockDisponible !== null && previewQty > stockDisponible;
  const noStock = stockDisponible !== null && stockDisponible <= 0;
  const confirmDisabled = exceedsStock || noStock;

  const keyStyle = (pressed: boolean) => [
    styles.key,
    { backgroundColor: pressed ? c.tintMuted : c.card, borderColor: c.border },
  ];

  const row = (nums: string[]) => (
    <View style={styles.keyRow}>
      {nums.map((d) => (
        <Pressable
          key={d}
          style={({ pressed }) => keyStyle(pressed)}
          onPress={() => pushDigit(d)}
          accessibilityLabel={`Número ${d}`}
          accessibilityRole="button">
          <Text style={[styles.keyText, { color: c.text }]}>{d}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.backgroundPaper,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              borderColor: c.cardBorder,
            },
          ]}>
          <Text style={[styles.kicker, { color: c.tint }]}>✓ Producto encontrado</Text>
          <Text style={[styles.productName, { color: c.text }]} numberOfLines={3}>
            {product.nombre}
          </Text>
          <Text style={[styles.priceLine, { color: c.textSecondary }]}>
            Precio: {formatCurrency(product.precioVenta)} · Código {product.codigo}
          </Text>

          {stockDisponible !== null ? (
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: noStock ? '#fee2e2' : c.tintMuted,
                },
              ]}>
              <Text
                style={[
                  styles.stockBadgeText,
                  { color: noStock ? c.error : c.tint },
                ]}>
                {noStock
                  ? '⚠ Sin stock disponible'
                  : `Disponible: ${formatNumber(stockDisponible)} unid.`}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.question, { color: c.text }]}>¿Cuántas unidades lleva?</Text>
          {stockDisponible !== null && !noStock ? (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              Máximo permitido: {formatNumber(maxQty)} unid. Toque los números grandes y pulse el
              botón verde.
            </Text>
          ) : (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              Toque los números grandes. Cuando termine, pulse el botón verde abajo.
            </Text>
          )}

          <View
            style={[
              styles.displayWrap,
              {
                backgroundColor: c.background,
                borderColor: exceedsStock ? c.error : c.border,
              },
            ]}>
            <Text style={[styles.displayLabel, { color: c.textSecondary }]}>Cantidad</Text>
            <Text
              style={[styles.displayValue, { color: exceedsStock ? c.error : c.text }]}
              accessibilityRole="header">
              {digits}
            </Text>
            <Text style={[styles.preview, { color: c.textMuted }]}>
              Subtotal aprox.: {formatCurrency(product.precioVenta * previewQty)}
            </Text>
            {exceedsStock ? (
              <Text style={[styles.stockError, { color: c.error }]}>
                Supera el stock disponible ({formatNumber(stockDisponible!)})
              </Text>
            ) : null}
          </View>

          {row(['1', '2', '3'])}
          {row(['4', '5', '6'])}
          {row(['7', '8', '9'])}

          <View style={styles.keyRow}>
            <Pressable
              style={({ pressed }) => keyStyle(pressed)}
              onPress={clearAll}
              accessibilityLabel="Limpiar cantidad"
              accessibilityHint="Deja la cantidad en 1">
              <Text style={[styles.keySmall, { color: c.text }]}>Limpiar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => keyStyle(pressed)}
              onPress={() => pushDigit('0')}
              accessibilityLabel="Número cero">
              <Text style={[styles.keyText, { color: c.text }]}>0</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => keyStyle(pressed)}
              onPress={backspace}
              accessibilityLabel="Borrar último número">
              <Text style={[styles.keySmall, { color: c.text }]}>Borrar{'\n'}último</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: confirmDisabled ? c.borderSubtle : Brand.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={handleConfirm}
            disabled={confirmDisabled}
            accessibilityLabel={
              noStock
                ? 'Sin stock disponible'
                : exceedsStock
                  ? 'Cantidad supera el stock'
                  : 'Agregar al carrito'
            }>
            <Text style={[styles.confirmBtnText, { color: confirmDisabled ? c.textMuted : '#ffffff' }]}>
              {noStock ? 'Sin stock disponible' : 'Agregar al carrito'}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={onCancel} accessibilityLabel="Cerrar sin agregar">
            <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cerrar sin agregar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  kicker: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  productName: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  priceLine: { fontSize: 16, marginTop: 8, marginBottom: 10 },
  stockBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  stockBadgeText: { fontSize: 14, fontWeight: '700' },
  question: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  hint: { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  displayWrap: {
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  displayLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  displayValue: { fontSize: 48, fontWeight: '900', letterSpacing: 2 },
  preview: { fontSize: 15, marginTop: 6 },
  stockError: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  keyRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  key: {
    flex: 1,
    minHeight: KEY_MIN,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  keyText: { fontSize: 34, fontWeight: '800' },
  keySmall: { fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  confirmBtnText: { fontSize: 20, fontWeight: '800' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 17, fontWeight: '600' },
});
