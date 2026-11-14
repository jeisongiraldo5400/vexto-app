import type { CajaStatus } from '@/admin/cash-register/hooks';
import { formatFechaHora } from '@/admin/cash-register/adapters';
import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { CAJA_ROUTE } from '@/core/caja/caja-guard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type Href, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

/**
 * Estado de la caja en el POS. No se muestra si la empresa no usa el módulo `caja`
 * o si el usuario no puede consultarla.
 */
export function CajaStatusBanner({ status }: { status: CajaStatus }) {
  const c = Colors[useColorScheme() ?? 'light'];
  const router = useRouter();
  if (!status.habilitada || !status.consultable || status.isLoading) return null;

  const abierta = status.abierta;
  const color = abierta ? c.success : c.warning;
  const texto = abierta
    ? `Caja abierta · desde ${formatFechaHora(status.sesion?.abiertaAt)}`
    : 'Caja cerrada · ábrela para poder cobrar';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${texto}. Ir a caja`}
      onPress={() => router.push(CAJA_ROUTE as Href)}
      style={({ pressed }) => ({
        minHeight: TouchTarget,
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: pressed ? c.tintMuted : c.card,
      })}>
      <Text style={{ color, fontWeight: '700' }}>{texto}</Text>
    </Pressable>
  );
}
