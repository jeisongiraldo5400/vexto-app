import { Colors } from '@/constants/theme';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type CartLine = { producto: Producto; cantidad: number };

type Props = {
  cart: CartLine[];
  onChangeQty: (productoId: string, qty: number) => void;
};

export function CartLinesList({ cart, onChangeQty }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <>
      <Text style={[styles.sectionLabel, { color: c.text }]}>Ticket</Text>
      {cart.length === 0 ? (
        <Text style={[styles.muted, { color: c.textSecondary }]}>
          Aún no hay productos. Toca Escanear. Si la cámara no sirve o el producto no tiene código de barras en el
          sistema, usa la búsqueda de respaldo arriba.
        </Text>
      ) : (
        <View style={styles.list}>
          {cart.map((item) => (
            <View
              key={item.producto.id}
              style={[styles.lineRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineTitle, { color: c.text }]}>{item.producto.nombre}</Text>
                <Text style={[styles.lineSub, { color: c.textSecondary }]}>
                  ${item.producto.precioVenta.toFixed(0)} c/u · sub $
                  {(item.producto.precioVenta * item.cantidad).toFixed(0)}
                </Text>
              </View>
              <View style={styles.qtyRow}>
                <Pressable
                  style={[styles.qtyBtn, { backgroundColor: c.borderSubtle }]}
                  onPress={() => onChangeQty(item.producto.id, item.cantidad - 1)}>
                  <Text style={[styles.qtyBtnText, { color: c.text }]}>−</Text>
                </Pressable>
                <Text style={[styles.qtyVal, { color: c.text }]}>{item.cantidad}</Text>
                <Pressable
                  style={[styles.qtyBtn, { backgroundColor: c.borderSubtle }]}
                  onPress={() => onChangeQty(item.producto.id, item.cantidad + 1)}>
                  <Text style={[styles.qtyBtnText, { color: c.text }]}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 15, fontWeight: '600', marginTop: 4, marginBottom: 6 },
  muted: { fontSize: 16, paddingVertical: 8 },
  list: { gap: 8 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  lineTitle: { fontSize: 16, fontWeight: '600' },
  lineSub: { fontSize: 14, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 24, fontWeight: '700' },
  qtyVal: { fontSize: 20, fontWeight: '700', minWidth: 28, textAlign: 'center' },
});
