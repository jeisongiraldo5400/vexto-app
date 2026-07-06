import { esCreditoInterno } from '@/admin/sales/constants/metodos-pago';
import {
  PagosMultiSelectSection,
  createInitialPagosLineasMobile,
  lineasToPayload,
  validarPagosLineasMobile,
  type PagoLineaMobile,
} from '@/admin/sales/components/pagos-multi-select-section';
import { formatCurrency } from '@/core/format';
import type { MetodoPago } from '@/core/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { PagoLineaMobile };

type Props = {
  visible: boolean;
  metodos: MetodoPago[];
  totalVenta: number;
  almacenId: string | null;
  almacenes: { id: string; nombre: string }[];
  initialAlmacenId: string | null;
  onAlmacenChange: (id: string) => void;
  onConfirm: (lineas: PagoLineaMobile[]) => void;
  onClose: () => void;
  tint: string;
  onPrimary: string;
};

export function PagosVentaModal({
  visible,
  metodos,
  totalVenta,
  almacenId,
  almacenes,
  onAlmacenChange,
  onConfirm,
  onClose,
  tint,
  onPrimary,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const activos = useMemo(
    () => metodos.filter((m) => m.estado !== 'inactivo' && !esCreditoInterno(m.codigo)),
    [metodos],
  );

  const [lineas, setLineas] = useState<PagoLineaMobile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [almacenModal, setAlmacenModal] = useState(false);

  useEffect(() => {
    if (visible && activos.length > 0) {
      setLineas(createInitialPagosLineasMobile(activos, totalVenta));
      setError(null);
    }
  }, [visible, totalVenta, activos]);

  function handleConfirm() {
    if (!almacenId) {
      setError('Selecciona un almacén');
      return;
    }
    const err = validarPagosLineasMobile(lineas, totalVenta, activos);
    if (err) {
      setError(err);
      return;
    }
    onConfirm(lineas);
  }

  const almacenNombre = almacenes.find((a) => a.id === almacenId)?.nombre ?? 'Seleccionar';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Cobro</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: tint, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => setAlmacenModal(true)}
            style={[styles.row, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={{ color: c.textSecondary, fontSize: 13 }}>Almacén</Text>
            <Text style={{ color: c.text, fontWeight: '600' }}>{almacenNombre}</Text>
          </Pressable>

          <PagosMultiSelectSection
            metodos={activos}
            lineas={lineas}
            totalObjetivo={totalVenta}
            onLineasChange={setLineas}
            tint={tint}
            c={c}
            totalLabel="Total"
          />

          {error ? <Text style={{ color: c.error, marginTop: 8 }}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: c.border }]}>
          <Pressable onPress={handleConfirm} style={[styles.confirm, { backgroundColor: tint }]}>
            <Text style={{ color: onPrimary, fontWeight: '700', fontSize: 16 }}>Confirmar cobro</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={almacenModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAlmacenModal(false)}>
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            {almacenes.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => {
                  onAlmacenChange(a.id);
                  setAlmacenModal(false);
                }}
                style={styles.sheetItem}>
                <Text style={{ color: c.text }}>{a.nombre}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirm: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetItem: { paddingVertical: 14 },
});

export { lineasToPayload };

export function lineasTienenCredito(_lineas: PagoLineaMobile[], _metodos: MetodoPago[]): boolean {
  return false;
}
