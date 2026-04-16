import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import type { Producto } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type CartLine = {
  producto: Producto;
  cantidad: number;
  stockDisponible: number | null;
};

type Props = {
  cart: CartLine[];
  onChangeQty: (productoId: string, qty: number) => void;
};

function lineCount(cart: CartLine[]) {
  return cart.reduce((n, l) => n + l.cantidad, 0);
}

export function CartLinesList({ cart, onChangeQty }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const count = lineCount(cart);
  const empty = cart.length === 0;

  return (
    <View style={[styles.panel, { borderColor: c.tint, backgroundColor: c.card }]}>
      <View style={styles.panelHeader}>
        <Text style={[styles.panelTitle, { color: c.text }]}>Carrito</Text>
        <View style={[styles.badge, { backgroundColor: c.tintMuted }]}>
          <Text style={[styles.badgeText, { color: c.tint }]}>{count}</Text>
        </View>
      </View>
      {empty ? (
        <Text style={[styles.panelHint, { color: c.textSecondary }]}>
          Aquí verás cada producto al escanear o al elegirlo en la búsqueda.
        </Text>
      ) : null}

      {empty ? (
        <View style={[styles.emptyBox, { borderColor: c.border }]}>
          <Text style={[styles.emptyTitle, { color: c.textMuted }]}>Sin productos aún</Text>
          <Text style={[styles.emptySub, { color: c.textMuted }]}>Escanear arriba · o buscar manualmente</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {cart.map((item) => {
            const atMax =
              item.stockDisponible !== null && item.cantidad >= item.stockDisponible;
            return (
              <View
                key={item.producto.id}
                style={[styles.lineRow, { backgroundColor: c.backgroundPaper, borderColor: c.cardBorder }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.lineTitle, { color: c.text }]} numberOfLines={2}>
                    {item.producto.nombre}
                  </Text>
                  <Text style={[styles.lineSub, { color: c.textSecondary }]}>
                    {formatCurrency(item.producto.precioVenta)} c/u ·{' '}
                    {formatCurrency(item.producto.precioVenta * item.cantidad)}
                  </Text>
                  {item.stockDisponible !== null ? (
                    <Text
                      style={[
                        styles.stockHint,
                        { color: atMax ? c.error : c.textMuted },
                      ]}>
                      {atMax
                        ? `Máx. disponible: ${item.stockDisponible}`
                        : `Disponible: ${item.stockDisponible}`}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: c.borderSubtle }]}
                    onPress={() => onChangeQty(item.producto.id, item.cantidad - 1)}>
                    <Text style={[styles.qtyBtnText, { color: c.text }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.qtyVal, { color: c.text }]}>{item.cantidad}</Text>
                  <Pressable
                    style={[
                      styles.qtyBtn,
                      {
                        backgroundColor: atMax ? c.borderSubtle : c.borderSubtle,
                        opacity: atMax ? 0.35 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (!atMax) onChangeQty(item.producto.id, item.cantidad + 1);
                    }}
                    disabled={atMax}
                    accessibilityLabel={atMax ? 'Stock máximo alcanzado' : 'Aumentar cantidad'}>
                    <Text style={[styles.qtyBtnText, { color: c.text }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  panelTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '800' },
  panelHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  emptyBox: {
    minHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  list: { gap: 8 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  lineTitle: { fontSize: 15, fontWeight: '600' },
  lineSub: { fontSize: 13, marginTop: 3 },
  stockHint: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 22, fontWeight: '700' },
  qtyVal: { fontSize: 17, fontWeight: '800', minWidth: 24, textAlign: 'center' },
});
