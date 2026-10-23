import { canAccess, canOpenPath } from "@/core/permissions";
import { useAuth } from "@/admin/auth/hooks/use-auth";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { Colors, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

type OptionProps = { title: string; description: string; onPress: () => void };

/** Módulos de gestión del menú; se muestran solo si la guarda de rutas los deja abrir. */
const GESTION: { title: string; description: string; href: string }[] = [
  {
    title: "Clientes",
    description: "Busca, crea y edita clientes.",
    href: "/(app)/clientes",
  },
  {
    title: "Separados",
    description: "Aparta productos, registra abonos y entregas.",
    href: "/(app)/separados",
  },
  {
    title: "Créditos",
    description: "Consulta saldos y registra abonos a crédito.",
    href: "/(app)/creditos",
  },
  {
    title: "Pagos",
    description: "Pagos recibidos y abonos a ventas.",
    href: "/(app)/pagos",
  },
  {
    title: "Devoluciones",
    description: "Devoluciones de clientes sobre una venta.",
    href: "/(app)/devoluciones",
  },
];

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
      {GESTION.filter((o) => canOpenPath(user, o.href)).map((o) => (
        <Option
          key={o.href}
          title={o.title}
          description={o.description}
          onPress={() => router.push(o.href as Href)}
        />
      ))}
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
        title="Mi perfil"
        description="Tus datos y cambio de contraseña."
        onPress={() => router.push("/(app)/perfil" as Href)}
      />
      <Option
        title="Cambiar empresa"
        description="Selecciona otra empresa asociada a tu usuario."
        onPress={() =>
          // select-empresa solo se muestra con needsCompanyPick; con la marca, las
          // guardas de (app) e index llevan allí (navegar directo rebotaba a "/").
          useAuthStore.setState({ needsCompanyPick: true })
        }
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
