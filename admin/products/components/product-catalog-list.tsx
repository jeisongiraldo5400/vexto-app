import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FlatList, StyleSheet, Text, View } from 'react-native';

type Props = {
  data: Producto[];
  emptyLabel?: string;
};

export function ProductCatalogList({ data, emptyLabel = 'No hay resultados.' }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.name, { color: c.text }]}>{item.nombre}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Código {item.codigo}
            {item.codigoBarras ? ` · Barras ${item.codigoBarras}` : ''}
          </Text>
          <Text style={[styles.price, { color: c.tint }]}>{formatCurrency(item.precioVenta)}</Text>
          {item.unidadMedida ? (
            <Text style={[styles.sub, { color: c.textSecondary }]}>Unidad: {item.unidadMedida.abreviatura}</Text>
          ) : null}
        </View>
      )}
      ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>{emptyLabel}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  name: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 15, marginTop: 4 },
  price: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 16 },
});
