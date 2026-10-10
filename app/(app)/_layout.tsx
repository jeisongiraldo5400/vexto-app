import { canOpenPath } from "@/core/permissions";
import { useCapabilitiesSync } from "@/core/session/use-capabilities-sync";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AppGroupLayout() {
  useCapabilitiesSync();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const path = usePathname();
  const empresaId = useAuthStore((s) => s.empresaId);
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const needsCompanyPick = useAuthStore((s) => s.needsCompanyPick);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  if (!user || needsCompanyPick) {
    return <Redirect href="/" />;
  }

  const denied = !canOpenPath(user, path);
  if (denied) return <Redirect href="/(app)/(tabs)/inicio" />;

  return (
    <Stack key={empresaId} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="reparacion/nueva"
        options={{ headerShown: true, title: "Recibir equipo" }}
      />
      <Stack.Screen
        name="gastos"
        options={{ headerShown: true, title: "Gastos" }}
      />
      <Stack.Screen
        name="reparacion/[id]"
        options={{ headerShown: true, title: "Reparación" }}
      />
    </Stack>
  );
}
