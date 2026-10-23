import type { RepairDetail, RepairResources } from "@/admin/repairs/adapters";
import type { RepairRun } from "@/admin/repairs/hooks";
import { MontoInput } from "@/components/ui/monto-input";
import { Colors } from "@/constants/theme";
import { createContext, useContext } from "react";
import { Alert, Pressable, Text, TextInput } from "react-native";

export type Can = (permission: string, module?: string) => boolean;
type Confirm = { title: string; message: string };

/** Estado compartido por las secciones del detalle de reparación. */
export type RepairDetailCtx = {
  id: string;
  c: (typeof Colors)[keyof typeof Colors];
  can: Can;
  busy: boolean;
  run: RepairRun;
};
const Ctx = createContext<RepairDetailCtx | null>(null);
export const RepairDetailProvider = Ctx.Provider;
export function useRepairDetailCtx() {
  const value = useContext(Ctx);
  if (!value) throw new Error("RepairDetailProvider ausente");
  return value;
}

/** Props comunes de las secciones que dependen de la orden cargada. */
export type SectionProps = {
  order: RepairDetail;
  closed: boolean;
  resources?: RepairResources;
};

export function RText({ children }: { children: string }) {
  const { c } = useRepairDetailCtx();
  return <Text style={{ color: c.text }}>{children}</Text>;
}

export function RHeading({ children }: { children: string }) {
  const { c } = useRepairDetailCtx();
  return (
    <Text
      style={{ color: c.text, fontSize: 20, fontWeight: "700", marginTop: 18 }}
    >
      {children}
    </Text>
  );
}

export function RField({
  label,
  value,
  onChange,
  kind = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind?: "text" | "money" | "int";
}) {
  const { c } = useRepairDetailCtx();
  const props = {
    accessibilityLabel: label,
    placeholder: label,
    placeholderTextColor: c.textSecondary,
    value,
    onChangeText: onChange,
    style: {
      color: c.text,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 8,
      padding: 12,
    },
  };
  return kind === "text" ? (
    <TextInput {...props} />
  ) : (
    <MontoInput {...props} integer={kind === "int"} />
  );
}

/** Botón de acción: pasa por `run` (bloqueo + invalidación) y confirma si se pide. */
export function RButton({
  label,
  action,
  disabled = false,
  confirm,
}: {
  label: string;
  action: () => Promise<unknown>;
  disabled?: boolean;
  confirm?: Confirm;
}) {
  const { c, busy, run } = useRepairDetailCtx();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={() =>
        confirm
          ? Alert.alert(confirm.title, confirm.message, [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Confirmar",
                style: "destructive",
                onPress: () => void run(action),
              },
            ])
          : void run(action)
      }
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: c.tint,
        borderRadius: 8,
        opacity: busy || disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: c.tint, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
