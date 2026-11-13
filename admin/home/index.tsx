import { canAccess } from "@/core/permissions";
import { useDashboardQuery } from "@/admin/home/hooks/use-dashboard-query";
import {
  PeriodoRow,
  ProductoRow,
  StatCard,
} from "@/admin/home/components/dashboard-rows";
import { OperatorHome } from "@/admin/home/components/operator-home";
import { Colors } from "@/constants/theme";
import { formatCurrency, formatNumber } from "@/core/format";
import { ApiError } from "@/core/http/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/admin/auth/hooks/use-auth";

export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const { user } = useAuth();
  const reportesHabilitado = canAccess(
    user,
    "reportes",
    "reportes:ver",
    "dashboard:ver",
  );
  const reparacionesHabilitado = canAccess(
    user,
    "reparaciones",
    "reparaciones:ver",
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboardQuery(reportesHabilitado);

  useFocusEffect(
    useCallback(() => {
      if (reportesHabilitado) void refetch();
    }, [refetch, reportesHabilitado]),
  );

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const errMsg = isError
    ? error instanceof ApiError && error.status === 403
      ? 'Sin permiso para ver el dashboard. Solicita el permiso "dashboard:ver" o "reportes:ver".'
      : error instanceof ApiError &&
          (error.status === 400 || error.status === 500)
        ? error.message && error.message !== "Error"
          ? `No se pudo cargar el resumen. ${error.message}`
          : "No se pudo cargar el resumen. Reintenta o contacta al administrador."
        : error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen."
    : null;

  if (!reportesHabilitado) {
    return (
      <OperatorHome
        c={c}
        user={user}
        reparacionesHabilitado={reparacionesHabilitado}
      />
    );
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: c.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.loadingText, { color: c.textSecondary }]}>
          Cargando resumen…
        </Text>
      </View>
    );
  }

  if (errMsg) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.center,
          { paddingTop: insets.top + 40, backgroundColor: c.background },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={c.tint}
          />
        }
      >
        <Text style={[styles.errText, { color: c.error }]}>{errMsg}</Text>
        <Text style={[styles.errHint, { color: c.textSecondary }]}>
          Toca para reintentar
        </Text>
      </ScrollView>
    );
  }

  const d = data!;
  const masVendidos = d.productosMasVendidos ?? [];
  const periodoOrdenado = [...(d.ventasPorPeriodo ?? [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={onRefresh}
          tintColor={c.tint}
        />
      }
    >
      <Text style={{ color: c.textSecondary, fontSize: 14 }}>
        {(() => {
          const hour = new Date().getHours();
          if (hour < 12) return "Buenos días";
          if (hour < 19) return "Buenas tardes";
          return "Buenas noches";
        })()}
      </Text>
      <Text
        style={{
          color: c.text,
          fontSize: 26,
          fontWeight: "800",
          letterSpacing: -0.6,
          marginBottom: 4,
        }}
      >
        {user?.fullName?.trim().split(/\s+/)[0] || "Vexto"}
      </Text>

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
        <StatCard
          label="Bajo stock"
          value={formatNumber(d.productosBajoStock)}
        />
        <StatCard label="Clientes" value={formatNumber(d.totalClientes)} />
      </View>

      {/* Top productos vendidos */}
      {masVendidos.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Top productos (mes)
          </Text>
          {masVendidos.map((p, i) => (
            <ProductoRow key={p.productoId} item={p} rank={i + 1} />
          ))}
        </>
      ) : null}

      {/* Ventas por período — últimos 7 días */}
      {periodoOrdenado.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Últimos 7 días
          </Text>
          {periodoOrdenado.map((p) => (
            <PeriodoRow key={p.fecha} item={p} />
          ))}
        </>
      ) : null}

      {masVendidos.length === 0 && periodoOrdenado.length === 0 ? (
        <Text style={[styles.emptyHint, { color: c.textMuted }]}>
          Aún no hay ventas registradas para mostrar.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 16, marginTop: 8 },
  errText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  errHint: { fontSize: 14, textAlign: "center" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  emptyHint: { fontSize: 15, textAlign: "center", marginTop: 40 },
});
