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
      <Stack.Screen
        name="clientes/index"
        options={{ headerShown: true, title: "Clientes" }}
      />
      <Stack.Screen
        name="clientes/nuevo"
        options={{ headerShown: true, title: "Nuevo cliente" }}
      />
      <Stack.Screen
        name="clientes/[id]"
        options={{ headerShown: true, title: "Editar cliente" }}
      />
      <Stack.Screen
        name="separados/index"
        options={{ headerShown: true, title: "Separados" }}
      />
      <Stack.Screen
        name="separados/nuevo"
        options={{ headerShown: true, title: "Nuevo separado" }}
      />
      <Stack.Screen
        name="separados/[id]"
        options={{ headerShown: true, title: "Separado" }}
      />
      <Stack.Screen
        name="creditos/index"
        options={{ headerShown: true, title: "Créditos" }}
      />
      <Stack.Screen
        name="creditos/[id]"
        options={{ headerShown: true, title: "Crédito" }}
      />
      <Stack.Screen
        name="pagos/index"
        options={{ headerShown: true, title: "Pagos" }}
      />
      <Stack.Screen
        name="pagos/nuevo"
        options={{ headerShown: true, title: "Registrar pago" }}
      />
      <Stack.Screen
        name="devoluciones/index"
        options={{ headerShown: true, title: "Devoluciones" }}
      />
      <Stack.Screen
        name="devoluciones/nueva"
        options={{ headerShown: true, title: "Nueva devolución" }}
      />
      <Stack.Screen
        name="devoluciones/[id]"
        options={{ headerShown: true, title: "Devolución" }}
      />
      <Stack.Screen
        name="caja/index"
        options={{ headerShown: true, title: "Caja" }}
      />
      <Stack.Screen
        name="caja/cerrar"
        options={{ headerShown: true, title: "Cerrar caja" }}
      />
      <Stack.Screen
        name="caja/historial"
        options={{ headerShown: true, title: "Historial de cajas" }}
      />
      <Stack.Screen
        name="caja/[id]"
        options={{ headerShown: true, title: "Detalle de caja" }}
      />
      <Stack.Screen
        name="perfil"
        options={{ headerShown: true, title: "Mi perfil" }}
      />
    </Stack>
  );
}
