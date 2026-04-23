import { NuevoClienteModal } from '@/admin/sales/components/nuevo-cliente-modal';
import { esMetodoPagoCredito } from '@/admin/sales/constants/metodos-pago';
import { useClientesBusquedaQuery } from '@/admin/sales/hooks/use-clientes-busqueda-query';
import { Colors } from '@/constants/theme';
import type { Cliente, MetodoPago } from '@/core/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type ModoClienteVenta = 'ninguno' | 'existente' | 'nuevo';

function etiquetaCliente(c: Cliente): string {
  const nom =
    c.razonSocial?.trim() ||
    [c.nombre, c.apellido ?? ''].filter(Boolean).join(' ').trim();
  return `${nom} · ${c.tipoDocumento} ${c.numeroDocumento}`;
}

type Props = {
  modo: ModoClienteVenta;
  onModo: (m: ModoClienteVenta) => void;
  cliente: Cliente | null;
  onCliente: (c: Cliente | null) => void;
  metodoPago: MetodoPago | null;
  tint: string;
  tintMuted: string;
  onPrimary: string;
};

export function ClienteVentaSection({
  modo,
  onModo,
  cliente,
  onCliente,
  metodoPago,
  tint,
  tintMuted,
  onPrimary,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const credito = esMetodoPagoCredito(metodoPago?.codigo);

  const [busqueda, setBusqueda] = useState('');
  const debounced = useDebouncedValue(busqueda, 400);
  const clientesQ = useClientesBusquedaQuery(debounced, { minChars: 2 });
  const resultados = clientesQ.data?.clientes ?? [];

  const [nuevoOpen, setNuevoOpen] = useState(false);

  function setModo(next: ModoClienteVenta) {
    if (next === 'ninguno') onCliente(null);
    onModo(next);
    if (next !== 'existente') setBusqueda('');
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: c.text }]}>
        Cliente{credito ? ' (requerido para crédito)' : ''}
      </Text>

      <View style={styles.modoRow}>
        <Pressable
          disabled={credito}
          onPress={() => setModo('ninguno')}
          style={[
            styles.chip,
            { borderColor: c.border, backgroundColor: c.card },
            modo === 'ninguno' && { borderColor: tint, backgroundColor: tintMuted },
            credito && { opacity: 0.45 },
          ]}>
          <Text style={[styles.chipText, { color: c.text }]}>Sin cliente</Text>
        </Pressable>
        <Pressable
          onPress={() => setModo('existente')}
          style={[
            styles.chip,
            { borderColor: c.border, backgroundColor: c.card },
            modo === 'existente' && { borderColor: tint, backgroundColor: tintMuted },
          ]}>
          <Text style={[styles.chipText, { color: c.text }]}>Existente</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onCliente(null);
            setModo('nuevo');
            setNuevoOpen(true);
          }}
          style={[
            styles.chip,
            { borderColor: c.border, backgroundColor: c.card },
            modo === 'nuevo' && { borderColor: tint, backgroundColor: tintMuted },
          ]}>
          <Text style={[styles.chipText, { color: c.text }]}>Nuevo</Text>
        </Pressable>
      </View>

      {modo === 'existente' ? (
        <View style={[styles.searchWrap, { borderColor: c.border, backgroundColor: c.card }]}>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            Buscar por nombre o documento (2+ caracteres)
          </Text>
          <TextInput
            style={[
              styles.search,
              {
                backgroundColor: c.inputBackground,
                borderColor: c.inputBorder,
                color: c.text,
              },
            ]}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar cliente…"
            placeholderTextColor={c.textMuted}
          />
          {clientesQ.isFetching ? <ActivityIndicator color={tint} style={{ marginBottom: 8 }} /> : null}
          <View style={styles.results}>
            {resultados.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.rowPick,
                  { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder },
                ]}
                onPress={() => onCliente(item)}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{etiquetaCliente(item)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {modo === 'nuevo' ? (
        <Pressable
          style={[styles.linkNuevo, { borderColor: tint }]}
          onPress={() => setNuevoOpen(true)}>
          <Text style={[styles.linkNuevoText, { color: tint }]}>Abrir formulario de nuevo cliente</Text>
        </Pressable>
      ) : null}

      {cliente ? (
        <View style={[styles.resumen, { backgroundColor: tintMuted, borderColor: tint }]}>
          <Text style={[styles.resumenLabel, { color: c.textSecondary }]}>Cliente en la venta</Text>
          <Text style={[styles.resumenVal, { color: c.text }]}>{etiquetaCliente(cliente)}</Text>
          <Pressable onPress={() => onCliente(null)} style={styles.quitar}>
            <Text style={[styles.quitarText, { color: c.error }]}>Quitar cliente</Text>
          </Pressable>
        </View>
      ) : null}

      <NuevoClienteModal
        visible={nuevoOpen}
        tint={tint}
        onPrimary={onPrimary}
        onClose={() => setNuevoOpen(false)}
        onCreated={(cl) => {
          onCliente(cl);
          onModo('existente');
          setNuevoOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  modoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  searchWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  hint: { fontSize: 12, marginBottom: 8 },
  search: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  results: { gap: 6 },
  rowPick: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  linkNuevo: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  linkNuevoText: { fontSize: 16, fontWeight: '700' },
  resumen: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  resumenLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  resumenVal: { fontSize: 15, fontWeight: '600' },
  quitar: { marginTop: 10, alignSelf: 'flex-start' },
  quitarText: { fontSize: 15, fontWeight: '700' },
});
