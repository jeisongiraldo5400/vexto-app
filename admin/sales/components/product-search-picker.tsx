import { Colors } from '@/constants/theme';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  busqueda: string;
  onBusquedaChange: (q: string) => void;
  resultados: Producto[];
  loading: boolean;
  onPick: (p: Producto) => void;
};

export function ProductSearchPicker({ busqueda, onBusquedaChange, resultados, loading, onPick }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.card }]}>
      <Text style={[styles.label, { color: c.text }]}>Búsqueda manual</Text>
      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: c.inputBackground,
            borderColor: c.inputBorder,
            color: c.text,
          },
        ]}
        placeholder="Nombre o código (2+ letras)"
        value={busqueda}
        onChangeText={onBusquedaChange}
        placeholderTextColor={c.textMuted}
      />
      {loading ? <ActivityIndicator color={c.tint} style={{ marginBottom: 8 }} /> : null}
      <View style={styles.results}>
        {resultados.map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.rowPick,
              { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder },
            ]}
            onPress={() => onPick(item)}>
            <Text style={[styles.rowPickTitle, { color: c.text }]}>{item.nombre}</Text>
            <Text style={[styles.rowPickSub, { color: c.textSecondary }]}>
              {item.codigo} · ${item.precioVenta.toFixed(0)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  search: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  results: {
    gap: 6,
  },
  rowPick: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowPickTitle: { fontSize: 15, fontWeight: '600' },
  rowPickSub: { fontSize: 13, marginTop: 2 },
});
