/**
 * Piezas visuales compartidas por las pantallas de gestión (clientes, separados,
 * créditos, pagos, devoluciones, perfil). Mantienen el estilo de gastos/reparaciones.
 */
import { MontoInput } from "@/components/ui/monto-input";
import {
  Colors,
  Radius,
  Spacing,
  TouchTarget,
  cardElevationShadow,
  type ThemeColors,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputProps,
} from "react-native";

export function useThemeColors(): ThemeColors {
  return Colors[useColorScheme() ?? "light"];
}

export function Screen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: Ref<ScrollViewInstance>;
}) {
  const c = useThemeColors();
  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingBottom: 110,
        gap: Spacing.md,
      }}
    >
      {children}
    </ScrollView>
  );
}

export function Title({
  children,
  subtitle,
}: {
  children: string;
  subtitle?: string;
}) {
  const c = useThemeColors();
  return (
    <View>
      <Text
        style={{
          color: c.text,
          fontSize: 26,
          fontWeight: "800",
          letterSpacing: -0.7,
        }}
      >
        {children}
      </Text>
      {subtitle ? (
        <Text style={{ color: c.textSecondary, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function Heading({ children }: { children: string }) {
  const c = useThemeColors();
  return (
    <Text
      style={{ color: c.text, fontSize: 18, fontWeight: "700", marginTop: 8 }}
    >
      {children}
    </Text>
  );
}

export function Line({
  children,
  tone = "text",
  bold = false,
}: {
  children: string;
  tone?: "text" | "secondary" | "error" | "success" | "warning";
  bold?: boolean;
}) {
  const c = useThemeColors();
  const color = {
    text: c.text,
    secondary: c.textSecondary,
    error: c.error,
    success: c.success,
    warning: c.warning,
  }[tone];
  return (
    <Text style={{ color, fontWeight: bold ? "700" : "400" }}>{children}</Text>
  );
}

/** Tarjeta; si recibe `onPress` se comporta como fila navegable. */
export function Card({
  children,
  onPress,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  const c = useThemeColors();
  const base = {
    minHeight: TouchTarget,
    borderColor: c.cardBorder,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 4,
  };
  if (!onPress)
    return (
      <View style={[cardElevationShadow(), base, { backgroundColor: c.card }]}>
        {children}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        cardElevationShadow(),
        base,
        { backgroundColor: pressed ? c.tintMuted : c.card },
      ]}
    >
      {children}
    </Pressable>
  );
}

type Confirm = { title: string; message: string; confirmText?: string };

/**
 * Botón de acción. Con `confirm` pide confirmación (acciones destructivas o de
 * dinero) antes de ejecutar `onPress`.
 */
export function ActionButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  confirm,
  variant = "outline",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  confirm?: Confirm;
  variant?: "outline" | "primary" | "danger";
}) {
  const c = useThemeColors();
  const off = disabled || busy;
  const color =
    variant === "primary" ? c.onPrimary : variant === "danger" ? c.error : c.tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={off}
      onPress={() =>
        confirm
          ? Alert.alert(confirm.title, confirm.message, [
              { text: "Cancelar", style: "cancel" },
              {
                text: confirm.confirmText ?? "Confirmar",
                style: "destructive",
                onPress,
              },
            ])
          : onPress()
      }
      style={{
        minHeight: TouchTarget,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: Radius.md,
        borderColor: variant === "danger" ? c.error : c.tint,
        backgroundColor: variant === "primary" ? c.tint : "transparent",
        opacity: off ? 0.5 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontWeight: "700" }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  kind = "text",
  multiline = false,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind?: "text" | "money" | "int";
  multiline?: boolean;
} & Pick<
  TextInputProps,
  "keyboardType" | "autoCapitalize" | "secureTextEntry" | "editable"
>) {
  const c = useThemeColors();
  const props = {
    accessibilityLabel: label,
    placeholder: label,
    placeholderTextColor: c.textSecondary,
    value,
    onChangeText: onChange,
    style: {
      minHeight: TouchTarget,
      color: c.text,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
  };
  return kind === "text" ? (
    <TextInput {...props} {...rest} multiline={multiline} />
  ) : (
    <MontoInput {...props} integer={kind === "int"} />
  );
}

/** Fila de opciones exclusivas (filtros de estado, tipo de documento…). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value || "all"}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 36,
              justifyContent: "center",
              paddingHorizontal: 12,
              borderRadius: Radius.pill,
              borderWidth: 1,
              borderColor: active ? c.tint : c.cardBorder,
              backgroundColor: active ? c.tintMuted : c.card,
            }}
          >
            <Text style={{ color: c.text, fontWeight: active ? "700" : "500" }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Estado de carga/error/vacío de una consulta de lista o detalle. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  empty,
}: {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  empty?: string | false;
}) {
  const c = useThemeColors();
  if (error)
    return (
      <View style={{ gap: Spacing.sm }}>
        <Text style={{ color: c.error }}>{error.message}</Text>
        <ActionButton label="Reintentar" onPress={onRetry} />
      </View>
    );
  if (isLoading) return <ActivityIndicator style={{ marginVertical: 8 }} />;
  if (empty) return <Text style={{ color: c.textSecondary }}>{empty}</Text>;
  return null;
}

export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const c = useThemeColors();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Pressable
        accessibilityRole="button"
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        style={{ padding: 10, opacity: page <= 1 ? 0.4 : 1 }}
      >
        <Text style={{ color: c.tint }}>Anterior</Text>
      </Pressable>
      <Text style={{ color: c.text }}>{`Página ${page} de ${pages}`}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={page >= pages}
        onPress={() => onChange(page + 1)}
        style={{ padding: 10, opacity: page >= pages ? 0.4 : 1 }}
      >
        <Text style={{ color: c.tint }}>Siguiente</Text>
      </Pressable>
    </View>
  );
}
