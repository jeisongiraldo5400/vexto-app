import { useCrearClienteMutation } from '@/admin/sales/hooks/use-crear-cliente-mutation';
import { Colors } from '@/constants/theme';
import { ApiError } from '@/core/http/api';
import type { Cliente, TipoDocumentoCliente } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TIPOS_DOC: { value: TipoDocumentoCliente; label: string }[] = [
  { value: 'CC', label: 'CC' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'CE' },
  { value: 'TI', label: 'TI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

type Props = {
  visible: boolean;
  tint: string;
  onPrimary: string;
  onClose: () => void;
  onCreated: (c: Cliente) => void;
};

export function NuevoClienteModal({ visible, tint, onPrimary, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const crear = useCrearClienteMutation();

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCliente>('CC');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTipoDocumento('CC');
      setNumeroDocumento('');
      setNombre('');
      setApellido('');
      setRazonSocial('');
      setTelefono('');
      setFormErr(null);
    }
  }, [visible]);

  const isNit = tipoDocumento === 'NIT';

  async function submit() {
    setFormErr(null);
    const doc = numeroDocumento.trim();
    if (!doc) {
      setFormErr('Indica el número de documento.');
      return;
    }
    if (isNit) {
      const rs = razonSocial.trim();
      if (!rs) {
        setFormErr('La razón social es obligatoria para NIT.');
        return;
      }
    } else {
      if (!nombre.trim()) {
        setFormErr('El nombre es obligatorio.');
        return;
      }
    }

    try {
      const payload = {
        tipoDocumento,
        numeroDocumento: doc,
        nombre: isNit ? razonSocial.trim() : nombre.trim(),
        ...(isNit ? { razonSocial: razonSocial.trim() } : {}),
        ...(!isNit && apellido.trim() ? { apellido: apellido.trim() } : {}),
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      };
      const cliente = await crear.mutateAsync(payload);
      onCreated(cliente);
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo crear el cliente.';
      setFormErr(msg);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={[styles.backdrop, { paddingTop: insets.top + 12 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: c.backgroundPaper }]}>
          <Text style={[styles.title, { color: c.text }]}>Nuevo cliente</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Tipo de documento</Text>
            <View style={styles.tipoRow}>
              {TIPOS_DOC.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTipoDocumento(t.value)}
                  style={[
                    styles.tipoChip,
                    {
                      borderColor: c.border,
                      backgroundColor: c.card,
                    },
                    tipoDocumento === t.value && { borderColor: tint, backgroundColor: c.tintMuted },
                  ]}>
                  <Text style={[styles.tipoChipText, { color: c.text }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textSecondary }]}>Número de documento</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text },
              ]}
              value={numeroDocumento}
              onChangeText={setNumeroDocumento}
              placeholder="Requerido"
              placeholderTextColor={c.textMuted}
            />

            {isNit ? (
              <>
                <Text style={[styles.label, { color: c.textSecondary }]}>Razón social</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text },
                  ]}
                  value={razonSocial}
                  onChangeText={setRazonSocial}
                  placeholder="Requerido"
                  placeholderTextColor={c.textMuted}
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: c.textSecondary }]}>Nombre</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text },
                  ]}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Requerido"
                  placeholderTextColor={c.textMuted}
                />
                <Text style={[styles.label, { color: c.textSecondary }]}>Apellido</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text },
                  ]}
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Opcional"
                  placeholderTextColor={c.textMuted}
                />
              </>
            )}

            <Text style={[styles.label, { color: c.textSecondary }]}>Teléfono</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.inputBackground, borderColor: c.inputBorder, color: c.text },
              ]}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Opcional"
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
            />

            {formErr ? <Text style={[styles.err, { color: c.error }]}>{formErr}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btnGhost, { borderColor: c.border }]}
              onPress={onClose}
              disabled={crear.isPending}>
              <Text style={[styles.btnGhostText, { color: c.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, { backgroundColor: tint, opacity: crear.isPending ? 0.7 : 1 }]}
              onPress={() => void submit()}
              disabled={crear.isPending}>
              {crear.isPending ? (
                <ActivityIndicator color={onPrimary} />
              ) : (
                <Text style={[styles.btnPrimaryText, { color: onPrimary }]}>Guardar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  scroll: { paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoChip: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tipoChipText: { fontSize: 14, fontWeight: '600' },
  err: { marginTop: 12, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnGhost: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 16, fontWeight: '700' },
  btnPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700' },
});
