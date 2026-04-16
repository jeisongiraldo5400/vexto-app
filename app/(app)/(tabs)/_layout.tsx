import { useAuth } from '@/admin/auth/hooks/use-auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          backgroundColor: c.backgroundPaper,
          borderTopColor: c.border,
        },
        headerShown: true,
        headerStyle: { backgroundColor: c.backgroundPaper },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', color: c.text },
        headerRight: () => <HeaderRight />,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="venta"
        options={{
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
        }}
      />
      <Tabs.Screen
        name="unidades"
        options={{
          title: 'Unidades',
          headerTitle: 'Unidades',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="ruler.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
