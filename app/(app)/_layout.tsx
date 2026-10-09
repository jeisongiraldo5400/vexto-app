import { useAuthStore } from '@/admin/auth/store/auth-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppGroupLayout() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const path = usePathname();
  const empresaId = useAuthStore(s => s.empresaId);
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const needsCompanyPick = useAuthStore((s) => s.needsCompanyPick);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  if (!user || needsCompanyPick) {
    return <Redirect href="/" />;
  }

  const permisos = user.permisos ?? [];
  const modules = user.modulosHabilitados ?? [];
  const denied = (path.includes('productos') && (!modules.includes('inventario') || !permisos.includes('productos:ver')))
    || (path.includes('reparaci') && (!modules.includes('reparaciones') || !permisos.includes('reparaciones:ver')))
    || (path.endsWith('/venta') && (!modules.includes('pos') || !permisos.includes('ventas:crear') && !permisos.includes('pos:crear')))
    || (path.includes('chat-venta') && (!modules.includes('chat_ventas') || !permisos.includes('ventas:crear') && !permisos.includes('pos:crear')));
  if (denied) return <Redirect href="/(app)/(tabs)/inicio" />;

  return (
    <Stack key={empresaId} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reparacion/[id]" options={{ headerShown: true, title: 'Reparación' }} />
    </Stack>
  );
}
