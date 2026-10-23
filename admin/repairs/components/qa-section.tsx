import { QA_ITEMS, type QaForm } from "@/admin/repairs/hooks";
import { Switch, View } from "react-native";
import {
  RButton,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Resultados de QA y checklist de control de calidad. */
export function QaSection({
  order: o,
  form,
}: Pick<SectionProps, "order"> & { form: QaForm }) {
  const { can } = useRepairDetailCtx();
  return (
    <>
      <RHeading>QA</RHeading>
      {(o.qa ?? []).map((q) => (
        <View key={q.id}>
          <RText>{q.passed ? "Aprobado" : "Rechazado"}</RText>
        </View>
      ))}
      {can("reparaciones:completar") && o.status === "QUALITY_CONTROL" && (
        <>
          {QA_ITEMS.map((label) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <RText>{label}</RText>
              <Switch
                value={form.checks[label] ?? false}
                onValueChange={(v) => form.toggle(label, v)}
              />
            </View>
          ))}
          <RButton label="Guardar QA" action={form.save} />
        </>
      )}
    </>
  );
}
