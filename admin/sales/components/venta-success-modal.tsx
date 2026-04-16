import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  numeroFactura: string;
  tint: string;
  onPrimary: string;
  onClose: () => void;
};

export function VentaSuccessModal({ visible, numeroFactura, tint, onPrimary, onClose }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.wrap}>
        <View style={[styles.card, { backgroundColor: c.backgroundPaper }]}>
          <Text style={[styles.title, { color: c.text }]}>Venta registrada</Text>
          <Text style={[styles.factura, { color: c.textSecondary }]}>Factura {numeroFactura}</Text>
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
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  factura: { fontSize: 20, marginTop: 12, textAlign: 'center' },
  btn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  btnText: { fontSize: 20, fontWeight: '700' },
});
