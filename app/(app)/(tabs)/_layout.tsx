import { useAuth } from '@/admin/auth/hooks/use-auth';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

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
        headerTitle: user?.fullName ?? user?.email ?? 'Vexto',
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
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="barcode.viewfinder" color={color} />,
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cube.box.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="unidades"
        options={{
          title: 'Unidades',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="ruler.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
