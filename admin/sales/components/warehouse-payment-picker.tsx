import { Colors } from '@/constants/theme';
import type { Almacen, MetodoPago } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  almacenes: Almacen[];
  metodos: MetodoPago[];
  almacenId: string | null;
  metodoPagoId: string | null;
  tint: string;
  tintMuted: string;
  onAlmacen: (id: string) => void;
  onMetodo: (id: string) => void;
};

export function WarehousePaymentPicker({
  almacenes,
  metodos,
  almacenId,
  metodoPagoId,
  tint,
  tintMuted,
  onAlmacen,
  onMetodo,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <>
      {almacenes.length > 1 ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: c.text }]}>Almacén</Text>
          {almacenes.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => onAlmacen(a.id)}
              style={[
                styles.chip,
                {
                  borderColor: c.border,
                  backgroundColor: c.card,
                },
                almacenId === a.id && { borderColor: tint, backgroundColor: tintMuted },
              ]}>
              <Text style={[styles.chipText, { color: c.text }]}>{a.nombre}</Text>
            </Pressable>
          ))}
        </View>
      ) : almacenes.length === 1 ? (
        <Text style={[styles.line, { color: c.textSecondary }]}>
          Vendiendo desde: {almacenes[0].nombre}
        </Text>
      ) : null}

      {metodos.length > 1 ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: c.text }]}>Pago</Text>
          {metodos.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onMetodo(m.id)}
              style={[
                styles.chip,
                {
                  borderColor: c.border,
                  backgroundColor: c.card,
                },
                metodoPagoId === m.id && { borderColor: tint, backgroundColor: tintMuted },
              ]}>
              <Text style={[styles.chipText, { color: c.text }]}>{m.nombre}</Text>
            </Pressable>
          ))}
        </View>
      ) : metodos.length === 1 ? (
        <Text style={[styles.line, { color: c.textSecondary }]}>Pago: {metodos[0].nombre}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 16, marginBottom: 10 },
  block: { marginBottom: 12 },
  blockTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  chip: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  chipText: { fontSize: 17 },
});
