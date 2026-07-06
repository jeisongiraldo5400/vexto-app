import { formatCurrency } from '@/core/format';
import type { MetodoPago } from '@/core/types';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export type PagoLineaMobile = {
  id: string;
  metodoPagoId: string;
  monto: string;
  montoRecibido: string;
};

type ThemeColors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  background: string;
  success: string;
  error: string;
  warning: string;
};

type Props = {
  metodos: MetodoPago[];
  lineas: PagoLineaMobile[];
  totalObjetivo: number;
  onLineasChange: (lineas: PagoLineaMobile[]) => void;
  tint: string;
  c: ThemeColors;
  totalLabel?: string;
};

export function createPagoLinea(metodoPagoId: string, monto = ''): PagoLineaMobile {
  return {
    id: `${Date.now()}-${Math.random()}`,
    metodoPagoId,
    monto,
    montoRecibido: '',
  };
}

export function findDefaultMetodoId(metodos: MetodoPago[]): string {
  const efectivo = metodos.find((m) => m.nombre.toLowerCase().includes('efectivo'));
  return efectivo?.id ?? metodos[0]?.id ?? '';
}

export function createInitialPagosLineasMobile(
  metodos: MetodoPago[],
  total: number,
): PagoLineaMobile[] {
  const defaultId = findDefaultMetodoId(metodos);
  if (!defaultId) return [];
  return [createPagoLinea(defaultId, String(total))];
}

export function validarPagosLineasMobile(
  lineas: PagoLineaMobile[],
  totalObjetivo: number,
  metodos: MetodoPago[],
): string | null {
  if (lineas.length === 0) return 'Selecciona al menos un método de pago';

  const suma = lineas.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0);
  if (Math.abs(suma - totalObjetivo) > 0.01) {
    return `La suma (${formatCurrency(suma)}) debe ser ${formatCurrency(totalObjetivo)}`;
  }

  for (const l of lineas) {
    const m = metodos.find((mp) => mp.id === l.metodoPagoId);
    const monto = parseFloat(l.monto) || 0;
    if (monto <= 0) return 'Cada línea debe tener un monto mayor a 0';
    if (m?.codigo === 'efectivo') {
      const rec = parseFloat(l.montoRecibido);
      if (Number.isNaN(rec) || rec < monto) {
        return 'Indica el monto recibido en efectivo (≥ monto aplicado)';
      }
    }
  }

  return null;
}

export function lineasToPayload(
  lineas: PagoLineaMobile[],
): Array<{ metodoPagoId: string; monto: number; montoRecibido?: number }> {
  return lineas.map((l) => {
    const monto = parseFloat(l.monto) || 0;
    const rec = parseFloat(l.montoRecibido);
    return {
      metodoPagoId: l.metodoPagoId,
      monto,
      ...(rec > 0 ? { montoRecibido: rec } : {}),
    };
  });
}

export function PagosMultiSelectSection({
  metodos,
  lineas,
  totalObjetivo,
  onLineasChange,
  tint,
  c,
  totalLabel = 'Total',
}: Props) {
  const lineasCacheRef = useRef<Map<string, PagoLineaMobile>>(new Map());

  const suma = lineas.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0);
  const restante = Math.max(0, totalObjetivo - suma);
  const selectedIds = new Set(lineas.map((l) => l.metodoPagoId));

  function updateLinea(id: string, patch: Partial<PagoLineaMobile>) {
    onLineasChange(lineas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function toggleMetodo(metodo: MetodoPago) {
    if (selectedIds.has(metodo.id)) {
      const linea = lineas.find((l) => l.metodoPagoId === metodo.id);
      if (linea) lineasCacheRef.current.set(metodo.id, linea);
      onLineasChange(lineas.filter((l) => l.metodoPagoId !== metodo.id));
      return;
    }

    const cached = lineasCacheRef.current.get(metodo.id);
    if (cached) {
      lineasCacheRef.current.delete(metodo.id);
      onLineasChange([...lineas, { ...cached, id: `${Date.now()}-${Math.random()}` }]);
      return;
    }

    const esPrimero = lineas.length === 0;
    onLineasChange([
      ...lineas,
      createPagoLinea(
        metodo.id,
        esPrimero ? String(totalObjetivo) : restante > 0 ? String(restante) : '',
      ),
    ]);
  }

  return (
    <View>
      <View style={styles.summaryRow}>
        <Text style={{ color: c.textSecondary }}>
          {totalLabel}: {formatCurrency(totalObjetivo)}
        </Text>
        <Text style={{ color: restante > 0.01 ? c.warning : c.success, fontWeight: '700' }}>
          Restante: {formatCurrency(restante)}
        </Text>
      </View>

      <Text style={[styles.label, { color: c.text }]}>Métodos de pago</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {metodos.map((m) => {
          const selected = selectedIds.has(m.id);
          return (
            <Pressable
              key={m.id}
              onPress={() => toggleMetodo(m)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? tint : c.border,
                  backgroundColor: selected ? `${tint}22` : c.background,
                },
              ]}>
              <Text style={{ color: c.text, fontSize: 12 }}>{m.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {lineas.length === 0 ? (
        <Text style={{ color: c.textSecondary, marginBottom: 12 }}>
          Selecciona al menos un método de pago.
        </Text>
      ) : null}

      {lineas.map((linea) => {
        const metodo = metodos.find((m) => m.id === linea.metodoPagoId);
        const esCash = metodo?.codigo === 'efectivo';
        const monto = parseFloat(linea.monto) || 0;
        const recibido = parseFloat(linea.montoRecibido) || 0;
        const vuelto = esCash && recibido >= monto ? recibido - monto : null;

        return (
          <View
            key={linea.id}
            style={[styles.linea, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={{ color: c.text, fontWeight: '700', marginBottom: 8 }}>
              {metodo?.nombre ?? 'Método'}
            </Text>

            <Text style={[styles.label, { color: c.textSecondary }]}>Monto</Text>
            <TextInput
              value={linea.monto}
              onChangeText={(v) => updateLinea(linea.id, { monto: v })}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: c.border, color: c.text }]}
              placeholder="0"
              placeholderTextColor={c.textSecondary}
            />

            {esCash ? (
              <>
                <Text style={[styles.label, { color: c.textSecondary }]}>Recibido</Text>
                <TextInput
                  value={linea.montoRecibido}
                  onChangeText={(v) => updateLinea(linea.id, { montoRecibido: v })}
                  keyboardType="decimal-pad"
                  style={[styles.input, { borderColor: c.border, color: c.text }]}
                  placeholder="0"
                  placeholderTextColor={c.textSecondary}
                />
                {vuelto != null ? (
                  <Text style={{ color: c.success, fontWeight: '600', marginTop: 4 }}>
                    Vuelto: {formatCurrency(vuelto)}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  chipScroll: { marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  linea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
});
