import { useAuth } from '@/admin/auth/hooks/use-auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, TouchTarget } from '@/constants/theme';
import { canOpenPath } from '@/core/permissions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

function HeaderRight() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const { signOut } = useAuth();
  return (
    <Pressable
      onPress={() => void signOut()}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión">
      <Text style={{ fontSize: 16, color: c.error, fontWeight: '600' }}>Salir</Text>
    </Pressable>
  );
}

function HeaderTitleVenta() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const { user } = useAuth();
  const name = user?.fullName?.trim() || user?.email?.split('@')[0] || '';
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Venta</Text>
      {name ? (
        <Text style={{ fontSize: 12, fontWeight: '500', color: c.textSecondary, marginTop: 2 }} numberOfLines={1}>
          {name}
        </Text>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const ventaHabilitada = canOpenPath(user, '/venta');
  const reparacionesHabilitado = canOpenPath(user, '/reparaciones');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          backgroundColor: c.backgroundPaper,
          borderTopColor: c.borderSubtle,
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          marginHorizontal: 12,
          marginBottom: 8,
          borderRadius: Radius.xl,
          position: 'absolute',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarItemStyle: { minHeight: TouchTarget, borderRadius: Radius.lg },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: true,
        headerStyle: { backgroundColor: c.backgroundPaper },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', color: c.text },
        headerRight: () => <HeaderRight />,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Inicio',
          headerTitle: 'Inicio',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="venta"
        options={{
          href: ventaHabilitada ? undefined : null,
          title: 'Venta',
          tabBarLabel: 'Venta',
          headerTitle: () => <HeaderTitleVenta />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="barcode.viewfinder" color={color} />,
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Productos',
          headerTitle: 'Productos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cube.box.fill" color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="reparaciones"
        options={{
          title: 'Reparaciones',
          headerTitle: 'Mis reparaciones',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
          href: reparacionesHabilitado ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="chat-venta"
        options={{
          title: 'Chat',
          headerTitle: 'Venta por Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.and.bubble.right" color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          headerTitle: 'Más opciones',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="square.grid.2x2.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
