import type { AuthUser } from "@/core/types";
import { canAccess } from "@/core/permissions";
import { Colors, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  c: (typeof Colors)[keyof typeof Colors];
  user: AuthUser | null;
  reparacionesHabilitado: boolean;
};

/** Inicio sin permiso de reportes: accesos rápidos a las herramientas habilitadas. */
export function OperatorHome({ c, user, reparacionesHabilitado }: Props) {
  const router = useRouter();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingBottom: 110,
        gap: Spacing.md,
      }}
    >
      <Text style={{ color: c.textSecondary, fontSize: 14 }}>
        Bienvenido de nuevo
      </Text>
      <Text
        style={{
          color: c.text,
          fontSize: 28,
          fontWeight: "800",
          letterSpacing: -0.8,
        }}
      >
        {user?.fullName || "Vexto"}
      </Text>
      <View
        style={{
          backgroundColor: c.tint,
          borderRadius: Radius.xl,
          padding: Spacing.xl,
          marginTop: Spacing.sm,
        }}
      >
        <Text
          style={{
            color: c.onPrimary,
            fontSize: 13,
            fontWeight: "700",
            textTransform: "uppercase",
          }}
        >
          Acción rápida
        </Text>
        <Text
          style={{
            color: c.onPrimary,
            fontSize: 22,
            fontWeight: "800",
            marginTop: 6,
          }}
        >
          Continúa con tu operación
        </Text>
        <Text style={{ color: c.onPrimary, opacity: 0.8, marginTop: 6 }}>
          Accede a las herramientas habilitadas para tu empresa.
        </Text>
      </View>
      {reparacionesHabilitado ? (
        <Pressable
          onPress={() => router.push("/(app)/(tabs)/reparaciones" as Href)}
          style={({ pressed }) => ({
            minHeight: TouchTarget,
            padding: Spacing.lg,
            borderRadius: Radius.lg,
            backgroundColor: pressed ? c.tintMuted : c.card,
            borderColor: c.cardBorder,
            borderWidth: 1,
          })}
        >
          <Text style={{ color: c.text, fontSize: 17, fontWeight: "700" }}>
            Mis reparaciones
          </Text>
          <Text style={{ color: c.textSecondary, marginTop: 4 }}>
            Consulta órdenes asignadas y actualiza su progreso.
          </Text>
        </Pressable>
      ) : null}
      {canAccess(user, "pos", "ventas:crear", "pos:crear") && (
        <Pressable
          onPress={() => router.push("/(app)/(tabs)/venta" as Href)}
          style={({ pressed }) => ({
            minHeight: TouchTarget,
            padding: Spacing.lg,
            borderRadius: Radius.lg,
            backgroundColor: pressed ? c.tintMuted : c.card,
            borderColor: c.cardBorder,
            borderWidth: 1,
          })}
        >
          <Text style={{ color: c.text, fontSize: 17, fontWeight: "700" }}>
            Nueva venta
          </Text>
          <Text style={{ color: c.textSecondary, marginTop: 4 }}>
            Escanea productos y registra una venta rápidamente.
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
