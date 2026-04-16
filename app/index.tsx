import { useAuthStore } from '@/admin/auth/store/auth-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
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

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsCompanyPick) {
    return <Redirect href="/(auth)/select-empresa" />;
  }

  return <Redirect href="/(app)/(tabs)/venta" />;
}
