import { Colors } from '@/constants/theme';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fragment } from 'react';
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
    <Fragment>
      <Text style={[styles.sectionLabel, { color: c.text }]}>Respaldo: sin cámara o sin código en el sistema</Text>
      <Text style={[styles.sectionSub, { color: c.textSecondary }]}>
        Busca por nombre o código y toca un producto para agregarlo.
      </Text>
      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: c.inputBackground,
            borderColor: c.inputBorder,
            color: c.text,
          },
        ]}
        placeholder="Nombre o código"
        value={busqueda}
        onChangeText={onBusquedaChange}
        placeholderTextColor={c.textMuted}
      />
      {loading ? <ActivityIndicator color={c.tint} /> : null}
      <View style={styles.results}>
        {resultados.map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.rowPick,
              { backgroundColor: c.card, borderColor: c.cardBorder },
            ]}
            onPress={() => onPick(item)}>
            <Text style={[styles.rowPickTitle, { color: c.text }]}>{item.nombre}</Text>
            <Text style={[styles.rowPickSub, { color: c.textSecondary }]}>
              {item.codigo} · ${item.precioVenta.toFixed(0)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  sectionSub: { fontSize: 14, marginBottom: 8 },
  search: {
    borderRadius: 10,
    padding: 14,
    fontSize: 17,
    borderWidth: 1,
    marginBottom: 8,
  },
  results: {
    gap: 6,
  },
  rowPick: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  rowPickTitle: { fontSize: 16, fontWeight: '600' },
  rowPickSub: { fontSize: 14, marginTop: 2 },
});
