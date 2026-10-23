import { Colors, primaryGlowShadow } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  c: (typeof Colors)[keyof typeof Colors];
  bottomInset: number;
  footerLift: number;
  total: number;
  submitErr: string | null;
  ventaPending: boolean;
  creditoPending: boolean;
  onCobrar: () => void;
  onCredito: () => void;
};

/** Pie fijo del POS: total, error de envío y botones de cobro/crédito. */
export function VentaFooter({
  c,
  bottomInset,
  footerLift,
  total,
  submitErr,
  ventaPending,
  creditoPending,
  onCobrar,
  onCredito,
}: Props) {
  return (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: c.border,
          backgroundColor: c.background,
          paddingBottom: bottomInset + 8,
          marginBottom: footerLift,
        },
      ]}>
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Total aprox.</Text>
        <Text style={[styles.totalValue, { color: c.text }]}>{formatCurrency(total)}</Text>
      </View>

      {submitErr ? <Text style={[styles.warn, { color: c.error }]}>{submitErr}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.confirm,
          {
            backgroundColor: c.tint,
            opacity: ventaPending ? 0.7 : pressed ? 0.92 : 1,
          },
          primaryGlowShadow(),
        ]}
        onPress={() => void onCobrar()}
        disabled={ventaPending || creditoPending}>
        {ventaPending ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={[styles.confirmText, { color: c.onPrimary }]}>Cobrar venta</Text>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.creditoBtn,
          {
            borderColor: c.tint,
            opacity: creditoPending ? 0.7 : pressed ? 0.92 : 1,
          },
        ]}
        onPress={() => void onCredito()}
        disabled={ventaPending || creditoPending}>
        <Text style={[styles.creditoBtnText, { color: c.tint }]}>Vender a crédito</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  warn: { marginTop: 8, fontSize: 14 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  confirm: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  confirmText: { fontSize: 17, fontWeight: '700' },
  creditoBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
  },
  creditoBtnText: { fontSize: 16, fontWeight: '700' },
});
