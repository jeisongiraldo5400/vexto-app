import { Colors } from '@/constants/theme';
import type { Almacen, MetodoPago } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme ?? 'light'];
}

type Props = {
  almacenes: Almacen[];
  metodos: MetodoPago[];
  almacenId: string | null;
  metodoPagoId: string | null;
  tint: string;
  tintMuted: string;
  onAlmacen: (id: string) => void;
  onMetodo: (id: string) => void;
};

function SelectorRow({
  label,
  value,
  onPress,
  tint,
}: {
  label: string;
  value: string;
  onPress: () => void;
  tint: string;
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectorRow, { borderColor: c.border, backgroundColor: c.card }]}>
      <Text style={[styles.selectorLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.selectorValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.selectorArrow, { color: tint }]}>›</Text>
    </Pressable>
  );
}

function OptionListModal({
  visible,
  title,
  options,
  selectedId,
  tint,
  tintMuted,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  tint: string;
  tintMuted: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.modalCard, { backgroundColor: c.backgroundPaper }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={[styles.modalCloseText, { color: c.textSecondary }]}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
            <View style={styles.optionsList}>
              {options.map((opt) => {
                const active = selectedId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      onSelect(opt.id);
                      onClose();
                    }}
                    style={[
                      styles.optionChip,
                      {
                        borderColor: active ? tint : c.border,
                        backgroundColor: active ? tintMuted : c.card,
                      },
                    ]}>
                    <Text style={[styles.optionChipText, { color: c.text }]}>
                      {opt.label}
                    </Text>
                    {active ? (
                      <Text style={[styles.optionCheck, { color: tint }]}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function WarehousePaymentPicker({
  almacenes,
  metodos,
  almacenId,
  metodoPagoId,
  tint,
  tintMuted,
  onAlmacen,
  onMetodo,
}: Props) {
  const c = useThemeColors();
  const [showAlmacen, setShowAlmacen] = useState(false);
  const [showMetodo, setShowMetodo] = useState(false);

  const almacenSeleccionado = almacenes.find((a) => a.id === almacenId);
  const metodoSeleccionado = metodos.find((m) => m.id === metodoPagoId);

  return (
    <>
      <View style={styles.container}>
        {almacenes.length > 1 ? (
          <SelectorRow
            label="Almacén"
            value={almacenSeleccionado?.nombre ?? 'Seleccionar…'}
            tint={tint}
            onPress={() => setShowAlmacen(true)}
          />
        ) : almacenes.length === 1 ? (
          <Text style={[styles.singleLine, { color: c.textSecondary }]}>
            Almacén: {almacenes[0].nombre}
          </Text>
        ) : null}

        {metodos.length > 1 ? (
          <SelectorRow
            label="Método de pago"
            value={metodoSeleccionado?.nombre ?? 'Seleccionar…'}
            tint={tint}
            onPress={() => setShowMetodo(true)}
          />
        ) : metodos.length === 1 ? (
          <Text style={[styles.singleLine, { color: c.textSecondary }]}>
            Pago: {metodos[0].nombre}
          </Text>
        ) : null}
      </View>

      <OptionListModal
        visible={showAlmacen}
        title="Seleccionar almacén"
        options={almacenes.map((a) => ({ id: a.id, label: a.nombre }))}
        selectedId={almacenId}
        tint={tint}
        tintMuted={tintMuted}
        onSelect={onAlmacen}
        onClose={() => setShowAlmacen(false)}
      />

      <OptionListModal
        visible={showMetodo}
        title="Seleccionar método de pago"
        options={metodos.map((m) => ({ id: m.id, label: m.nombre }))}
        selectedId={metodoPagoId}
        tint={tint}
        tintMuted={tintMuted}
        onSelect={onMetodo}
        onClose={() => setShowMetodo(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 4 },
  singleLine: { fontSize: 14, marginBottom: 4 },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  selectorLabel: { fontSize: 13, fontWeight: '600', width: 110 },
  selectorValue: { flex: 1, fontSize: 15, fontWeight: '600' },
  selectorArrow: { fontSize: 20, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '80%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalCloseBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  modalCloseText: { fontSize: 15, fontWeight: '600' },
  optionsList: { gap: 8, paddingBottom: 16 },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionChipText: { fontSize: 16, fontWeight: '600' },
  optionCheck: { fontSize: 18, fontWeight: '800' },
});
