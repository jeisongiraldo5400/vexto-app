import { previewCuotas } from '@/admin/sales/adapters/credito.adapter';
import {
  ClienteVentaSection,
  type ModoClienteVenta,
} from '@/admin/sales/components/cliente-venta-section';
import type { CartLine } from '@/admin/sales/components/cart-lines-list';
import { formatCurrency } from '@/core/format';
import type { Cliente } from '@/core/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  cart: CartLine[];
  almacenId: string | null;
  totalVenta: number;
  onConfirm: (params: {
    clienteId: string;
    cuotaInicial: number;
    numeroCuotas: number;
    frecuenciaDias: number;
  }) => void;
  onClose: () => void;
  tint: string;
  onPrimary: string;
  loading?: boolean;
};

export function CreditoVentaModal({
  visible,
  cart,
  almacenId,
  totalVenta,
  onConfirm,
  onClose,
  tint,
  onPrimary,
  loading,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const [modoCliente, setModoCliente] = useState<ModoClienteVenta>('existente');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cuotaInicial, setCuotaInicial] = useState('0');
  const [numeroCuotas, setNumeroCuotas] = useState('3');
  const [frecuenciaDias, setFrecuenciaDias] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const cuotaInicialNum = parseFloat(cuotaInicial) || 0;
  const numCuotas = Math.max(1, parseInt(numeroCuotas, 10) || 1);
  const freq = Math.max(1, parseInt(frecuenciaDias, 10) || 30);
  const saldoFinanciado = Math.max(0, totalVenta - cuotaInicialNum);

  const preview = useMemo(
    () => previewCuotas(totalVenta, cuotaInicialNum, saldoFinanciado > 0 ? numCuotas : 1, freq),
    [totalVenta, cuotaInicialNum, numCuotas, freq, saldoFinanciado],
  );

  function handleConfirm() {
    if (!almacenId) {
      setError('Selecciona un almacén');
      return;
    }
    if (!cliente) {
      setError('Selecciona un cliente');
      return;
    }
    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }
    if (cuotaInicialNum > totalVenta) {
      setError('La cuota inicial no puede superar el total');
      return;
    }
    setError(null);
    onConfirm({
      clienteId: cliente.id,
      cuotaInicial: cuotaInicialNum,
      numeroCuotas: saldoFinanciado > 0 ? numCuotas : 1,
      frecuenciaDias: freq,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Venta a crédito</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: tint, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.textSecondary, marginBottom: 8 }}>
            Total: {formatCurrency(totalVenta)} · {cart.length} producto(s)
          </Text>

          <Text style={{ color: c.textSecondary, marginBottom: 8 }}>
            Método de pago: crédito propio. La cuota inicial forma parte del cronograma.
          </Text>

          <ClienteVentaSection
            modo={modoCliente}
            onModo={setModoCliente}
            cliente={cliente}
            onCliente={setCliente}
            metodoPago={{ id: 'credito', nombre: 'Crédito', codigo: 'credito', estado: 'activo' }}
            tint={tint}
            tintMuted={c.tintMuted}
            onPrimary={onPrimary}
          />

          <Text style={[styles.label, { color: c.text }]}>Cuota inicial</Text>
          <TextInput
            value={cuotaInicial}
            onChangeText={setCuotaInicial}
            keyboardType="decimal-pad"
            placeholder="Primera cuota del cronograma (opcional)"
            style={[styles.input, { borderColor: c.border, color: c.text }]}
          />

          <Text style={[styles.label, { color: c.text }]}>Número de cuotas</Text>
          <TextInput
            value={numeroCuotas}
            onChangeText={setNumeroCuotas}
            keyboardType="number-pad"
            editable={saldoFinanciado > 0}
            style={[styles.input, { borderColor: c.border, color: c.text }]}
          />

          <Text style={[styles.label, { color: c.text }]}>Frecuencia (días)</Text>
          <TextInput
            value={frecuenciaDias}
            onChangeText={setFrecuenciaDias}
            keyboardType="number-pad"
            editable={saldoFinanciado > 0}
            style={[styles.input, { borderColor: c.border, color: c.text }]}
          />

          <Text style={[styles.label, { color: c.text, marginTop: 12 }]}>Cronograma</Text>
          {preview.map((cu) => (
            <View key={cu.numero} style={[styles.previewRow, { borderColor: c.border }]}>
              <Text style={{ color: c.text }}>
                {cu.numero === 0 ? 'Inicial' : `Cuota ${cu.numero}`}
              </Text>
              <Text style={{ color: c.textSecondary }}>
                {formatCurrency(cu.monto)} · {cu.fecha}
              </Text>
            </View>
          ))}

          {error ? <Text style={{ color: c.error, marginTop: 8 }}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: c.border }]}>
          <Pressable
            onPress={handleConfirm}
            disabled={loading}
            style={[styles.confirm, { backgroundColor: tint, opacity: loading ? 0.7 : 1 }]}>
            <Text style={{ color: onPrimary, fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Procesando…' : 'Confirmar crédito'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirm: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
