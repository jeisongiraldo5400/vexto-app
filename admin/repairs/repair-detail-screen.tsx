import { useAuthStore } from '@/admin/auth/store/auth-store';
import { addRepairNote, addRepairPhoto, changeRepairStatus } from '@/admin/repairs/adapters';
import { RepairPhotoModal } from '@/admin/repairs/repair-photo-modal';
import { useRepairDetailQuery } from '@/admin/repairs/hooks';
import { Brand, Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

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
  const user = useAuthStore(s => s.user);
  const permisos = user?.permisos ?? [];
  const canEdit = permisos.includes('reparaciones:editar');
  const canDiagnose = permisos.includes('reparaciones:diagnosticar');
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const order = q.data;

  if (q.isError) return <View style={{padding:16}}><Text style={{color:c.error}}>{q.error.message}</Text><Pressable onPress={() => void q.refetch()}><Text style={{color:c.tint}}>Reintentar</Text></Pressable></View>;
  if (q.isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!order) return <Text style={{padding:16,color:c.text}}>Orden no encontrada</Text>;

  const run = async (fn: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { await fn(); await qc.invalidateQueries({ queryKey: ['reparaciones'] }); }
    catch(error) { Alert.alert('No se pudo completar la operación', error instanceof Error ? error.message : 'Intenta nuevamente'); }
    finally { pending.current = false; setBusy(false); }
  };

  const next = NEXT[String(order.status)] ?? [];
  const status = String(order.status);
  const steps = [
    { key: 'RECEIVED', label: 'Recibido' },
    { key: 'DIAGNOSING', label: 'Diagnóstico' },
    { key: 'IN_REPAIR', label: 'Reparación' },
    { key: 'READY_FOR_PICKUP', label: 'Listo' },
  ] as const;
  const stepRank: Record<string, number> = {
    RECEIVED: 0,
    PENDING_DIAGNOSIS: 1,
    DIAGNOSING: 1,
    WAITING_CUSTOMER_APPROVAL: 1,
    APPROVED: 2,
    WAITING_PART: 2,
    READY_FOR_REPAIR: 2,
    IN_REPAIR: 2,
    QUALITY_CONTROL: 3,
    READY_FOR_PICKUP: 3,
    DELIVERED: 3,
  };
  const currentRank = stepRank[status] ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{String(order.orderNumber)}</Text>
      <Text style={{ color: c.textSecondary }}>{status} · {String(order.priority)}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {steps.map((step, index) => {
          const done = currentRank >= index;
          return (
            <View
              key={step.key}
              style={{
                backgroundColor: done ? Brand.primary : c.card,
                borderColor: done ? Brand.primary : c.cardBorder,
                borderWidth: 1,
                borderRadius: Radius.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: done ? '#ffffff' : c.textSecondary, fontWeight: '700', fontSize: 12 }}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={{ color: c.text }}>{String(order.reportedIssue ?? '')}</Text>
      {canDiagnose && <><TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota / diagnóstico"
        placeholderTextColor={c.textSecondary}
        style={{ borderWidth: 1, borderColor: c.cardBorder, borderRadius: 8, padding: 10, color: c.text }}
      />
      <Pressable
        disabled={busy || !note.trim()}
        onPress={() => void run(() => addRepairNote(id, note))}
        style={{ backgroundColor: c.tint, padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: c.onPrimary, textAlign: 'center', fontWeight: '600' }}>Agregar nota</Text>
      </Pressable></>}
      {canEdit && <Pressable
        disabled={busy}
        onPress={() => setCameraOpen(true)}
        style={{ borderWidth: 1, borderColor: c.tint, padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: c.tint, textAlign: 'center', fontWeight: '600' }}>Foto de evidencia</Text>
      </Pressable>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {canEdit && next.map((s) => (
          <Pressable
            key={s}
            disabled={busy}
            onPress={() => void run(() => changeRepairStatus(id, s))}
            style={{ borderWidth: 1, borderColor: c.tint, padding: 8, borderRadius: 8 }}
          >
            <Text style={{ color: c.tint }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <RepairPhotoModal
        visible={cameraOpen && canEdit}
        tint={c.tint}
        onClose={() => setCameraOpen(false)}
        onCapture={(photo) => {
          void run(() => addRepairPhoto(id, photo.storageKey, photo.uri));
        }}
      />
    </ScrollView>
  );
}
