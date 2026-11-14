import type {
  ProductosMasVendidosData,
  VentasPorPeriodoData,
} from "@/admin/home/adapters/home.adapter";
import { cardElevationShadow, Colors } from "@/constants/theme";
import { formatCurrency, formatDateLabel, formatNumber } from "@/core/format";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StyleSheet, Text, View } from "react-native";

type StatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

export function StatCard({ label, value, accent = false }: StatCardProps) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <View
      style={[
        styles.statCard,
        cardElevationShadow(),
        {
          backgroundColor: accent ? c.tint : c.card,
          borderColor: c.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.statLabel,
          { color: accent ? c.onPrimary : c.textSecondary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[styles.statValue, { color: accent ? c.onPrimary : c.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

export function PeriodoRow({ item }: { item: VentasPorPeriodoData }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const date = formatDateLabel(item.fecha);
  return (
    <View
      style={[
        styles.listRow,
        { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder },
      ]}
    >
      <Text style={[styles.listRowLeft, { color: c.text }]}>{date}</Text>
      <View style={styles.listRowRight}>
        <Text style={[styles.listRowMuted, { color: c.textSecondary }]}>
          {formatNumber(item.totalVentas)} venta
          {item.totalVentas === 1 ? "" : "s"}
        </Text>
        <Text style={[styles.listRowValue, { color: c.tint }]}>
          {formatCurrency(item.montoTotal)}
        </Text>
      </View>
    </View>
  );
}

export function ProductoRow({
  item,
  rank,
}: {
  item: ProductosMasVendidosData;
  rank: number;
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <View
      style={[
        styles.listRow,
        { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder },
      ]}
    >
      <View style={[styles.rankBadge, { backgroundColor: c.tintMuted }]}>
        <Text style={[styles.rankText, { color: c.tint }]}>{rank}</Text>
      </View>
      <View style={styles.productoInfo}>
        <Text
          style={[styles.productoNombre, { color: c.text }]}
          numberOfLines={2}
        >
          {item.productoNombre}
        </Text>
        <Text style={[styles.productoCodigo, { color: c.textMuted }]}>
          {item.productoCodigo}
        </Text>
      </View>
      <View style={styles.listRowRight}>
        <Text style={[styles.listRowMuted, { color: c.textSecondary }]}>
          {formatNumber(item.cantidadVendida)} unid.
        </Text>
        <Text style={[styles.listRowValue, { color: c.tint }]}>
          {formatCurrency(item.montoTotal)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  listRowLeft: { flex: 1, fontSize: 15, fontWeight: "600" },
  listRowRight: { alignItems: "flex-end", gap: 2 },
  listRowMuted: { fontSize: 12 },
  listRowValue: { fontSize: 15, fontWeight: "800" },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 13, fontWeight: "800" },
  productoInfo: { flex: 1, gap: 2 },
  productoNombre: { fontSize: 14, fontWeight: "600" },
  productoCodigo: { fontSize: 12 },
});
