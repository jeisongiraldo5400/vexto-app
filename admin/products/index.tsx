import { ProductCatalogList } from '@/admin/products/components/product-catalog-list';
import { useProductosQuery } from '@/admin/products/hooks/use-productos-query';
import { useStockAlmacenQuery } from '@/admin/products/hooks/use-stock-almacen-query';
import { useAlmacenesQuery } from '@/admin/sales/hooks/use-almacenes-query';
import { Colors } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Almacen } from '@/core/types';

export default function ProductosScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 300);

  const { data, isLoading, isError, error } = useProductosQuery(debounced, { minChars: 0 });
  const almacenesQ = useAlmacenesQuery();
  const almacenes: Almacen[] = useMemo(
    () => (almacenesQ.data ?? []).filter((a) => a.activo),
    [almacenesQ.data],
  );

  const [almacenId, setAlmacenId] = useState<string | null>(null);

  useEffect(() => {
    if (almacenes.length === 1 && !almacenId) {
      setAlmacenId(almacenes[0].id);
    }
  }, [almacenes, almacenId]);

  const stockQ = useStockAlmacenQuery(almacenId, debounced);

  const stockMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const s of stockQ.data?.stocks ?? []) {
      map[s.productoId] = s.cantidadDisponible;
    }
    return map;
  }, [stockQ.data]);

  const rows = data?.productos ?? [];
  const total = data?.total ?? 0;
  const errMsg = isError ? (error instanceof Error ? error.message : 'No pudimos cargar los productos.') : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
      <TextInput
        style={[styles.search, { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text }]}
        placeholder="Buscar por nombre o código"
        value={q}
        onChangeText={setQ}
        placeholderTextColor={c.textMuted}
      />

      {/* Selector de almacén — chips horizontales */}
      {almacenes.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.almacenRow}
          style={styles.almacenScroll}>
          {almacenes.map((a) => {
            const active = a.id === almacenId;
            return (
              <Pressable
                key={a.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.tint : c.card,
                    borderColor: active ? c.tint : c.border,
                  },
                ]}
                onPress={() => setAlmacenId(a.id)}>
                <Text style={[styles.chipText, { color: active ? c.onPrimary : c.text }]}>
                  {a.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Almacén único: solo etiqueta */}
      {almacenes.length === 1 && almacenId ? (
        <Text style={[styles.almacenLabel, { color: c.textSecondary }]}>
          Almacén: <Text style={{ fontWeight: '700', color: c.text }}>{almacenes[0].nombre}</Text>
        </Text>
      ) : null}

      {isLoading ? <ActivityIndicator style={{ marginVertical: 12 }} color={c.tint} /> : null}
      {errMsg ? <Text style={[styles.err, { color: c.error }]}>{errMsg}</Text> : null}

      {!isLoading && !errMsg ? (
        <Text style={[styles.meta, { color: c.textSecondary }]}>
          {total} producto{total === 1 ? '' : 's'}
          {!almacenId ? '  ·  Selecciona un almacén para ver stock' : ''}
        </Text>
      ) : null}

      <ProductCatalogList
        data={rows}
        stockMap={almacenId ? stockMap : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  search: { borderRadius: 10, padding: 14, fontSize: 17, borderWidth: 1 },
  almacenScroll: { marginTop: 10 },
  almacenRow: { gap: 8, paddingBottom: 4 },
  chip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  almacenLabel: { marginTop: 8, fontSize: 14 },
  err: { marginTop: 8, fontSize: 16 },
  meta: { marginTop: 8, marginBottom: 4, fontSize: 14, color: '#64748b' },
});
