import { previewCuotas } from '@/admin/sales/adapters/credito.adapter';
import {
  ClienteVentaSection,
  type ModoClienteVenta,
} from '@/admin/sales/components/cliente-venta-section';
import type { CartLine } from '@/admin/sales/components/cart-lines-list';
import {
  PagosMultiSelectSection,
  createInitialPagosLineasMobile,
  lineasToPayload,
  validarPagosLineasMobile,
  type PagoLineaMobile,
} from '@/admin/sales/components/pagos-multi-select-section';
import { metodosCuotaInicial } from '@/admin/sales/constants/metodos-pago';
import type { CrearVentaCreditoPagoLinea } from '@/admin/sales/adapters/credito.adapter';
import { MontoInput } from '@/components/ui/monto-input';
import { formatCurrency } from '@/core/format';
import { parseMonto } from '@/core/utils/money';
import type { Cliente, MetodoPago } from '@/core/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useMemo, useState } from 'react';
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

export type CreditoVentaParams = {
  clienteId: string;
  cuotaInicial: number;
  numeroCuotas: number;
  frecuenciaDias: number;
  /** Cobro en contado de la cuota inicial; presente solo si `cuotaInicial > 0`. */
  pagosCuotaInicial?: CrearVentaCreditoPagoLinea[];
};

type Props = {
  visible: boolean;
  /** Métodos de pago de la empresa; la cuota inicial se cobra con ellos. */
  metodos?: MetodoPago[];
  cart: CartLine[];
  almacenId: string | null;
  totalVenta: number;
  onConfirm: (params: CreditoVentaParams) => void;
  onClose: () => void;
  tint: string;
  onPrimary: string;
  loading?: boolean;
};

const SIN_METODOS: MetodoPago[] = [];

export function CreditoVentaModal({
  visible,
  metodos = SIN_METODOS,
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

  // Cada apertura es una venta nueva: no arrastrar cliente ni cuota de la anterior.
  useEffect(() => {
    if (visible) {
      setModoCliente('existente');
      setCliente(null);
      setCuotaInicial('0');
      setNumeroCuotas('3');
      setFrecuenciaDias('30');
      setError(null);
    }
  }, [visible]);

  const cuotaInicialNum = parseMonto(cuotaInicial) || 0;
  const metodosCuota = useMemo(() => metodosCuotaInicial(metodos), [metodos]);
  /** Líneas de cobro de la cuota inicial (misma UX que el cobro de una venta). */
  const [lineasCuota, setLineasCuota] = useState<PagoLineaMobile[]>([]);

  // Cada cuota inicial nueva arranca con una línea del método por defecto por el total.
  useEffect(() => {
    setLineasCuota(
      cuotaInicialNum > 0 ? createInitialPagosLineasMobile(metodosCuota, cuotaInicialNum) : [],
    );
  }, [cuotaInicialNum, metodosCuota]);
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
    if (cuotaInicial.trim() && !Number.isFinite(parseMonto(cuotaInicial))) {
      setError('Cuota inicial inválida');
      return;
    }
    if (cuotaInicialNum > totalVenta) {
      setError('La cuota inicial no puede superar el total');
      return;
    }
    // La cuota inicial se cobra en contado: el backend exige método(s) que sumen la cuota
    // y monto recibido en las líneas de efectivo.
    if (cuotaInicialNum > 0) {
      const errPagos = validarPagosLineasMobile(lineasCuota, cuotaInicialNum, metodosCuota);
      if (errPagos) {
        setError(errPagos);
        return;
      }
    }
    setError(null);
    onConfirm({
      clienteId: cliente.id,
      cuotaInicial: cuotaInicialNum,
      numeroCuotas: saldoFinanciado > 0 ? numCuotas : 1,
      frecuenciaDias: freq,
      ...(cuotaInicialNum > 0 ? { pagosCuotaInicial: lineasToPayload(lineasCuota) } : {}),
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
            Método de pago: crédito propio. La cuota inicial forma parte del cronograma y se cobra en
            contado al registrar la venta.
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
          <MontoInput
            value={cuotaInicial}
            onChangeText={setCuotaInicial}
            placeholder="Primera cuota del cronograma (opcional)"
            style={[styles.input, { borderColor: c.border, color: c.text }]}
          />

          {cuotaInicialNum > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.label, { color: c.text }]}>Cobro de la cuota inicial</Text>
              <PagosMultiSelectSection
                metodos={metodosCuota}
                lineas={lineasCuota}
                totalObjetivo={cuotaInicialNum}
                onLineasChange={setLineasCuota}
                tint={tint}
                c={c}
                totalLabel="Cuota inicial"
              />
            </View>
          ) : null}

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
