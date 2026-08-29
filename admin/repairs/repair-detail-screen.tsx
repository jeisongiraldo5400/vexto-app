import { addRepairNote, addRepairPhoto, changeRepairStatus } from '@/admin/repairs/adapters';
import { RepairPhotoModal } from '@/admin/repairs/repair-photo-modal';
import { useRepairDetailQuery } from '@/admin/repairs/hooks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

const NEXT: Record<string, string[]> = {
  RECEIVED: ['PENDING_DIAGNOSIS'],
  PENDING_DIAGNOSIS: ['DIAGNOSING'],
  DIAGNOSING: ['WAITING_CUSTOMER_APPROVAL'],
  APPROVED: ['READY_FOR_REPAIR', 'WAITING_PART'],
  WAITING_PART: ['READY_FOR_REPAIR'],
  READY_FOR_REPAIR: ['IN_REPAIR'],
  IN_REPAIR: ['QUALITY_CONTROL'],
  QUALITY_CONTROL: ['READY_FOR_PICKUP', 'IN_REPAIR'],
};

export function RepairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const q = useRepairDetailQuery(id);
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const order = q.data;

  if (q.isLoading || !order) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const run = async (fn: () => Promise<unknown>) => {
    await fn();
    await qc.invalidateQueries({ queryKey: ['reparaciones'] });
  };

  const next = NEXT[String(order.status)] ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{String(order.orderNumber)}</Text>
      <Text style={{ color: c.textSecondary }}>{String(order.status)} · {String(order.priority)}</Text>
      <Text style={{ color: c.text }}>{String(order.reportedIssue ?? '')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota / diagnóstico"
        placeholderTextColor={c.textSecondary}
        style={{ borderWidth: 1, borderColor: c.cardBorder, borderRadius: 8, padding: 10, color: c.text }}
      />
      <Pressable
        onPress={() => run(() => addRepairNote(id, note))}
        style={{ backgroundColor: c.tint, padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: c.onPrimary, textAlign: 'center', fontWeight: '600' }}>Agregar nota</Text>
      </Pressable>
      <Pressable
        onPress={() => setCameraOpen(true)}
        style={{ borderWidth: 1, borderColor: c.tint, padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: c.tint, textAlign: 'center', fontWeight: '600' }}>Foto de evidencia</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {next.map((s) => (
          <Pressable
            key={s}
            onPress={() => run(() => changeRepairStatus(id, s))}
            style={{ borderWidth: 1, borderColor: c.tint, padding: 8, borderRadius: 8 }}
          >
            <Text style={{ color: c.tint }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <RepairPhotoModal
        visible={cameraOpen}
        tint={c.tint}
        onClose={() => setCameraOpen(false)}
        onCapture={(photo) => {
          void run(() => addRepairPhoto(id, photo.storageKey, photo.uri));
        }}
      />
    </ScrollView>
  );
}
