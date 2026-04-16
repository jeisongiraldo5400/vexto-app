import { useDashboardQuery } from '@/admin/home/hooks/use-dashboard-query';
import type { ProductosMasVendidosData, VentasPorPeriodoData } from '@/admin/home/adapters/home.adapter';
import { cardElevationShadow, Colors } from '@/constants/theme';
import { formatCurrency, formatNumber } from '@/core/format';
import { ApiError } from '@/core/http/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

function StatCard({ label, value, accent = false }: StatCardProps) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  return (
    <View
      style={[
        styles.statCard,
        cardElevationShadow(),
        { backgroundColor: accent ? c.tint : c.card, borderColor: c.cardBorder },
      ]}>
      <Text style={[styles.statLabel, { color: accent ? c.onPrimary : c.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ? c.onPrimary : c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function PeriodoRow({ item }: { item: VentasPorPeriodoData }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const date = item.fecha.slice(0, 10);
  return (
    <View style={[styles.listRow, { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder }]}>
      <Text style={[styles.listRowLeft, { color: c.text }]}>{date}</Text>
      <View style={styles.listRowRight}>
        <Text style={[styles.listRowMuted, { color: c.textSecondary }]}>
          {formatNumber(item.totalVentas)} venta{item.totalVentas === 1 ? '' : 's'}
        </Text>
        <Text style={[styles.listRowValue, { color: c.tint }]}>{formatCurrency(item.montoTotal)}</Text>
      </View>
    </View>
  );
}

function ProductoRow({ item, rank }: { item: ProductosMasVendidosData; rank: number }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  return (
    <View style={[styles.listRow, { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder }]}>
      <View style={[styles.rankBadge, { backgroundColor: c.tintMuted }]}>
        <Text style={[styles.rankText, { color: c.tint }]}>{rank}</Text>
      </View>
      <View style={styles.productoInfo}>
        <Text style={[styles.productoNombre, { color: c.text }]} numberOfLines={2}>
          {item.productoNombre}
        </Text>
        <Text style={[styles.productoCodigo, { color: c.textMuted }]}>{item.productoCodigo}</Text>
      </View>
      <View style={styles.listRowRight}>
        <Text style={[styles.listRowMuted, { color: c.textSecondary }]}>
          {formatNumber(item.cantidadVendida)} unid.
        </Text>
        <Text style={[styles.listRowValue, { color: c.tint }]}>{formatCurrency(item.montoTotal)}</Text>
      </View>
    </View>
  );
}

export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardQuery();

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const errMsg = isError
    ? error instanceof ApiError && error.status === 403
      ? 'Sin permiso para ver el dashboard. Solicita el permiso "dashboard:ver" o "reportes:ver".'
      : error instanceof Error
        ? error.message
        : 'No se pudo cargar el resumen.'
    : null;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.loadingText, { color: c.textSecondary }]}>Cargando resumen…</Text>
      </View>
    );
  }

  if (errMsg) {
    return (
      <ScrollView
        contentContainerStyle={[styles.center, { paddingTop: insets.top + 40, backgroundColor: c.background }]}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={c.tint} />}>
        <Text style={[styles.errText, { color: c.error }]}>{errMsg}</Text>
        <Text style={[styles.errHint, { color: c.textSecondary }]}>Toca para reintentar</Text>
      </ScrollView>
    );
  }

  const d = data!;
  const periodoOrdenado = [...(d.ventasPorPeriodo ?? [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={c.tint} />}>

      {/* Stat cards — fila 1 */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Ventas</Text>
      <View style={styles.statRow}>
        <StatCard label="Hoy" value={formatCurrency(d.ventasHoy)} accent />
        <StatCard label="Este mes" value={formatCurrency(d.ventasMes)} />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Esta semana" value={formatCurrency(d.ventasSemana)} />
        <StatCard label="Pagos hoy" value={formatCurrency(d.pagosHoy)} />
      </View>

      {/* Stat cards — fila 2: indicadores */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Indicadores</Text>
      <View style={styles.statRow}>
        <StatCard label="Bajo stock" value={formatNumber(d.productosBajoStock)} />
        <StatCard label="Clientes" value={formatNumber(d.totalClientes)} />
      </View>

      {/* Top productos vendidos */}
      {d.productosMasVendidos.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Top productos (mes)</Text>
          {d.productosMasVendidos.map((p, i) => (
            <ProductoRow key={p.productoId} item={p} rank={i + 1} />
          ))}
        </>
      ) : null}

      {/* Ventas por período — últimos 7 días */}
      {periodoOrdenado.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Últimos 7 días</Text>
          {periodoOrdenado.map((p) => (
            <PeriodoRow key={p.fecha} item={p} />
          ))}
        </>
      ) : null}

      {d.productosMasVendidos.length === 0 && periodoOrdenado.length === 0 ? (
        <Text style={[styles.emptyHint, { color: c.textMuted }]}>
          Aún no hay ventas registradas para mostrar.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 16, marginTop: 8 },
  errText: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  errHint: { fontSize: 14, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  listRowLeft: { flex: 1, fontSize: 15, fontWeight: '600' },
  listRowRight: { alignItems: 'flex-end', gap: 2 },
  listRowMuted: { fontSize: 12 },
  listRowValue: { fontSize: 15, fontWeight: '800' },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '800' },
  productoInfo: { flex: 1, gap: 2 },
  productoNombre: { fontSize: 14, fontWeight: '600' },
  productoCodigo: { fontSize: 12 },
  emptyHint: { fontSize: 15, textAlign: 'center', marginTop: 40 },
});
