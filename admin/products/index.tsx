import { ProductCatalogList } from '@/admin/products/components/product-catalog-list';
import { useProductosQuery } from '@/admin/products/hooks/use-productos-query';
import { Colors } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductosScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 300);
  const { data, isLoading, isError, error } = useProductosQuery(debounced, { minChars: 0 });

  const rows = data?.productos ?? [];
  const total = data?.total ?? 0;
  const errMsg = isError ? (error instanceof Error ? error.message : 'No pudimos cargar los productos.') : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: c.inputBackground,
            borderColor: c.inputBorder,
            color: c.text,
          },
        ]}
        placeholder="Buscar por nombre o código"
        value={q}
        onChangeText={setQ}
        placeholderTextColor={c.textMuted}
      />
      {isLoading ? <ActivityIndicator style={{ marginVertical: 12 }} color={c.tint} /> : null}
      {errMsg ? <Text style={[styles.err, { color: c.error }]}>{errMsg}</Text> : null}
      {!isLoading && !errMsg ? (
        <Text style={[styles.meta, { color: c.textSecondary }]}>
          {total} producto{total === 1 ? '' : 's'}
        </Text>
      ) : null}
      <ProductCatalogList data={rows} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  search: {
    borderRadius: 10,
    padding: 14,
    fontSize: 17,
    borderWidth: 1,
  },
  err: { marginTop: 8, fontSize: 16 },
  meta: { marginTop: 8, fontSize: 15 },
});
