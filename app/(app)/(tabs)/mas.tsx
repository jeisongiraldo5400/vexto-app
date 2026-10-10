import { canAccess } from "@/core/permissions";
import { useAuth } from "@/admin/auth/hooks/use-auth";
import { Colors, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

type OptionProps = { title: string; description: string; onPress: () => void };

export default function MasScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const router = useRouter();
  const { user, signOut } = useAuth();
  const chatActivo = canAccess(
    user,
    "chat_ventas",
    "ventas:crear",
    "pos:crear",
  );

  const Option = ({ title, description, onPress }: OptionProps) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TouchTarget,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: c.cardBorder,
        backgroundColor: pressed ? c.tintMuted : c.card,
      })}
    >
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>
        {title}
      </Text>
      <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 4 }}>
        {description}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingBottom: 110,
        gap: Spacing.md,
      }}
    >
      <View style={{ marginBottom: Spacing.sm }}>
        <Text
          style={{
            color: c.text,
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.7,
          }}
        >
          Más opciones
        </Text>
        <Text style={{ color: c.textSecondary, marginTop: 5 }}>
          Herramientas y configuración de tu sesión.
        </Text>
      </View>
      {canAccess(user, "inventario", "productos:ver") && (
        <Option
          title="Productos"
          description="Consulta catálogo, precios y disponibilidad."
          onPress={() => router.push("/(app)/(tabs)/productos" as Href)}
        />
      )}
      {chatActivo ? (
        <Option
          title="Venta por chat"
          description="Inicia una venta asistida por conversación."
          onPress={() => router.push("/(app)/(tabs)/chat-venta" as Href)}
        />
      ) : null}
      {canAccess(user, "finanzas", "gastos:ver") && (
        <Option
          title="Gastos"
          description="Consulta y registra gastos según tus permisos."
          onPress={() => router.push("/(app)/gastos" as Href)}
        />
      )}
      <Option
        title="Cambiar empresa"
        description="Selecciona otra empresa asociada a tu usuario."
        onPress={() => router.push("/(auth)/select-empresa" as Href)}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={{
          minHeight: TouchTarget,
          justifyContent: "center",
          padding: Spacing.lg,
        }}
      >
        <Text
          style={{
            color: c.error,
            fontSize: 16,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Cerrar sesión
        </Text>
      </Pressable>
    </ScrollView>
  );
}
