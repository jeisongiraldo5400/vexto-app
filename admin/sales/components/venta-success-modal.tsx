import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import type { VentaResponse } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  venta: VentaResponse | null;
  tint: string;
  onPrimary: string;
  onClose: () => void;
};

export function VentaSuccessModal({ visible, venta, tint, onPrimary, onClose }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  if (!venta) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.wrap}>
        <View style={[styles.card, { backgroundColor: c.backgroundPaper }]}>
          <Text style={[styles.title, { color: c.text }]}>Venta registrada</Text>
          <Text style={[styles.factura, { color: c.textSecondary }]}>
            Factura {venta.numeroFactura}
          </Text>

          <ScrollView
            style={styles.itemsScroll}
            contentContainerStyle={styles.itemsContent}
            showsVerticalScrollIndicator={false}>
            {venta.items.map((item) => (
              <View
                key={item.productoId}
                style={[styles.itemRow, { borderBottomColor: c.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: c.text }]} numberOfLines={2}>
                    {item.productoNombre}
                  </Text>
                  <Text style={[styles.itemMeta, { color: c.textSecondary }]}>
                    {item.cantidad} × {formatCurrency(item.precioUnitario)}
                  </Text>
                </View>
                <Text style={[styles.itemSubtotal, { color: c.text }]}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.totalRow, { borderTopColor: c.border }]}>
            <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>
              {formatCurrency(venta.total)}
            </Text>
          </View>

          <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: onPrimary }]}>Nueva venta</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  factura: { fontSize: 18, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  itemsScroll: { marginTop: 16, maxHeight: 220 },
  itemsContent: { gap: 0 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: { flex: 1, minWidth: 0, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemSubtotal: { fontSize: 15, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnText: { fontSize: 18, fontWeight: '700' },
});
