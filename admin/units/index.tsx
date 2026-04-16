import { useUnidadesMedidaQuery } from '@/admin/units/hooks/use-unidades-medida-query';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UnidadesScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const { data, isLoading, isError, error } = useUnidadesMedidaQuery();
  const rows = data ?? [];

  const errMsg = isError ? (error instanceof Error ? error.message : 'No pudimos cargar las unidades.') : null;

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40, backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.muted, { color: c.textSecondary }]}>Cargando unidades…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
      {errMsg ? <Text style={[styles.err, { color: c.error }]}>{errMsg}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.name, { color: c.text }]}>{item.nombre}</Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>Abreviatura: {item.abreviatura}</Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>Estado: {item.estado}</Text>
          </View>
        )}
        ListEmptyComponent={
          !errMsg ? <Text style={[styles.empty, { color: c.textMuted }]}>No hay unidades registradas.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { fontSize: 16 },
  err: { marginBottom: 12, fontSize: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  name: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 15, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 16 },
});
