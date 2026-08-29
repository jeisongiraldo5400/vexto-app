import { BarcodeScannerModal } from '@/admin/sales/components/barcode-scanner-modal';
import { fetchRepairs } from '@/admin/repairs/adapters';
import { useRepairsQuery } from '@/admin/repairs/hooks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

const LABEL: Record<string, string> = {
  RECEIVED: 'Recibida',
  PENDING_DIAGNOSIS: 'Pendiente diagnóstico',
  DIAGNOSING: 'Diagnosticando',
  IN_REPAIR: 'En reparación',
  WAITING_PART: 'Esperando repuesto',
  QUALITY_CONTROL: 'QA',
  READY_FOR_PICKUP: 'Lista',
  DELIVERED: 'Entregada',
  URGENT: 'Urgente',
};

export function RepairsListScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const router = useRouter();
  const q = useRepairsQuery(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const items = q.data?.items ?? [];
  const filtered = search
    ? items.filter((item) =>
        `${item.orderNumber} ${item.reportedIssue ?? ''}`.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  if (q.isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>Mis reparaciones</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por número"
        placeholderTextColor={c.textSecondary}
        style={{ borderWidth: 1, borderColor: c.cardBorder, borderRadius: 8, padding: 10, color: c.text }}
      />
      <Pressable
        onPress={() => setScannerOpen(true)}
        style={{ borderWidth: 1, borderColor: c.tint, padding: 10, borderRadius: 8 }}
      >
        <Text style={{ color: c.tint, textAlign: 'center', fontWeight: '600' }}>Escanear IMEI / orden</Text>
      </Pressable>
      {filtered.length === 0 ? (
        <Text style={{ color: c.textSecondary }}>No tienes órdenes asignadas.</Text>
      ) : null}
      {filtered.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push(`/(app)/reparacion/${item.id}` as Href)}
          style={{ backgroundColor: c.card, borderColor: c.cardBorder, borderWidth: 1, borderRadius: 12, padding: 14 }}
        >
          <Text style={{ fontWeight: '700', color: c.text }}>{item.orderNumber}</Text>
          <Text style={{ color: c.textSecondary, marginTop: 4 }}>{LABEL[item.status] ?? item.status} · {item.priority}</Text>
          <Text style={{ color: c.text, marginTop: 6 }}>{item.reportedIssue ?? 'Sin problema reportado'}</Text>
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
          const remote = await fetchRepairs(code).catch(() => null);
          const match = remote?.items?.[0];
          if (match) {
            setScannerOpen(false);
            router.push(`/(app)/reparacion/${match.id}` as Href);
            return;
          }
          setFeedback('No se encontró una orden con ese código');
        }}
      />
    </ScrollView>
  );
}
