import { canAccess } from "@/core/permissions";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { BarcodeScannerModal } from "@/admin/sales/components/barcode-scanner-modal";
import { fetchRepairs } from "@/admin/repairs/adapters";
import { useRepairsQuery } from "@/admin/repairs/hooks";
import {
  Colors,
  Radius,
  Spacing,
  TouchTarget,
  cardElevationShadow,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const LABEL: Record<string, string> = {
  RECEIVED: "Recibida",
  PENDING_DIAGNOSIS: "Pendiente diagnóstico",
  DIAGNOSING: "Diagnosticando",
  IN_REPAIR: "En reparación",
  WAITING_PART: "Esperando repuesto",
  QUALITY_CONTROL: "QA",
  READY_FOR_PICKUP: "Lista",
  DELIVERED: "Entregada",
  URGENT: "Urgente",
};

export function RepairsListScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mine, setMine] = useState(true);
  const [page, setPage] = useState(1);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const q = useRepairsQuery(mine, page, debouncedSearch);
  const [matches, setMatches] = useState<{ id: string; orderNumber: string }[]>(
    [],
  );
  const items = q.data?.items ?? [];
  const filtered = items;

  // Carga y error se muestran dentro de la lista: el buscador no se desmonta
  // y conserva el foco mientras se escribe.
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingBottom: 110,
        gap: Spacing.md,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.7,
            color: c.text,
          }}
        >
          Mis reparaciones
        </Text>
        <Text style={{ color: c.textSecondary, marginTop: 4 }}>
          Órdenes asignadas y pendientes de atención.
        </Text>
      </View>
      {canAccess(user, "reparaciones", "reparaciones:crear") && (
        <Pressable
          onPress={() => router.push("/(app)/reparacion/nueva" as Href)}
        >
          <Text style={{ color: c.tint }}>Recibir equipo</Text>
        </Pressable>
      )}
      {canAccess(user, "reparaciones", "reparaciones:ver-todas") && (
        <Pressable
          onPress={() => {
            setMine(!mine);
            setPage(1);
          }}
        >
          <Text style={{ color: c.tint }}>
            {mine ? "Ver todas las órdenes" : "Ver mis órdenes"}
          </Text>
        </Pressable>
      )}
      <TextInput
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por número"
        placeholderTextColor={c.textSecondary}
        style={{
          minHeight: TouchTarget,
          borderWidth: 1,
          borderColor: c.inputBorder,
          backgroundColor: c.inputBackground,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          color: c.text,
        }}
      />
      <Pressable
        onPress={() => setScannerOpen(true)}
        style={{
          minHeight: TouchTarget,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: c.tint,
          paddingHorizontal: 14,
          borderRadius: Radius.md,
        }}
      >
        <Text style={{ color: c.tint, textAlign: "center", fontWeight: "600" }}>
          Escanear IMEI / orden
        </Text>
      </Pressable>
      {q.isError ? (
        <View>
          <Text style={{ color: c.error }}>{q.error.message}</Text>
          <Pressable onPress={() => void q.refetch()}>
            <Text style={{ color: c.tint }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {q.isFetching ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}
      {!q.isLoading && !q.isError && filtered.length === 0 ? (
        <Text style={{ color: c.textSecondary }}>
          No tienes órdenes asignadas.
        </Text>
      ) : null}
      {filtered.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push(`/(app)/reparacion/${item.id}` as Href)}
          style={({ pressed }) => [
            cardElevationShadow(),
            {
              minHeight: TouchTarget,
              backgroundColor: pressed ? c.tintMuted : c.card,
              borderColor: c.cardBorder,
              borderWidth: 1,
              borderRadius: Radius.lg,
              padding: Spacing.lg,
            },
          ]}
        >
          <Text style={{ fontWeight: "700", color: c.text }}>
            {item.orderNumber}
          </Text>
          <Text style={{ color: c.textSecondary, marginTop: 4 }}>
            {LABEL[item.status] ?? item.status} · {item.priority}
          </Text>
          <Text style={{ color: c.text, marginTop: 6 }}>
            {item.reportedIssue ?? "Sin problema reportado"}
          </Text>
        </Pressable>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable disabled={page === 1} onPress={() => setPage(page - 1)}>
          <Text style={{ color: c.tint }}>Anterior</Text>
        </Pressable>
        <Text style={{ color: c.text }}>
          {page} · {q.data?.total ?? 0} órdenes
        </Text>
        <Pressable
          disabled={page * 50 >= (q.data?.total ?? 0)}
          onPress={() => setPage(page + 1)}
        >
          <Text style={{ color: c.tint }}>Siguiente</Text>
        </Pressable>
      </View>
      {matches.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => router.push(`/(app)/reparacion/${m.id}` as Href)}
        >
          <Text style={{ color: c.tint }}>Abrir {m.orderNumber}</Text>
        </Pressable>
      ))}
      <BarcodeScannerModal
        visible={scannerOpen}
        tint={c.tint}
        feedback={feedback}
        onClose={() => setScannerOpen(false)}
        onClearFeedback={() => setFeedback(null)}
        onCode={async (code) => {
          setSearch(code);
          const remote = await fetchRepairs(code, 1, mine).catch(() => {
            setFeedback("No se pudo consultar. Revisa la conexión o permisos.");
            return null;
          });
          // El error de red ya se informó: no lo tapes con "no encontrada".
          if (!remote) return;
          if (remote.items.length > 1) {
            setMatches(remote.items);
            setScannerOpen(false);
            return;
          }
          const match = remote?.items?.[0];
          if (match) {
            setScannerOpen(false);
            router.push(`/(app)/reparacion/${match.id}` as Href);
            return;
          }
          setFeedback("No se encontró una orden con ese código");
        }}
      />
    </ScrollView>
  );
}
