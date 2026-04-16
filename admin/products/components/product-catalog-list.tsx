import { Colors } from '@/constants/theme';
import { formatCurrency, formatNumber } from '@/core/format';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FlatList, StyleSheet, Text, View } from 'react-native';

type Props = {
  data: Producto[];
  emptyLabel?: string;
  /** productoId → cantidadDisponible. Undefined = sin almacén seleccionado (no mostrar stock). */
  stockMap?: Record<string, number>;
};

export function ProductCatalogList({ data, emptyLabel = 'No hay resultados.', stockMap }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
      renderItem={({ item }) => {
        const disponible = stockMap !== undefined ? (stockMap[item.id] ?? 0) : null;
        const sinStock = disponible !== null && disponible === 0;

        return (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: c.text, flex: 1 }]} numberOfLines={2}>
                {item.nombre}
              </Text>
              {disponible !== null ? (
                <View
                  style={[
                    styles.stockBadge,
                    { backgroundColor: sinStock ? '#fee2e2' : c.tintMuted },
                  ]}>
                  <Text style={[styles.stockBadgeText, { color: sinStock ? c.error : c.tint }]}>
                    {sinStock ? 'Sin stock' : `${formatNumber(disponible)} unid.`}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Código {item.codigo}
              {item.codigoBarras ? ` · Barras ${item.codigoBarras}` : ''}
            </Text>
            <Text style={[styles.price, { color: c.tint }]}>{formatCurrency(item.precioVenta)}</Text>
            {item.unidadMedida ? (
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Unidad: {item.unidadMedida.abreviatura}
              </Text>
            ) : null}
          </View>
        );
      }}
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  name: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 15, marginTop: 4 },
  price: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 16 },
  stockBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  stockBadgeText: { fontSize: 13, fontWeight: '700' },
});
