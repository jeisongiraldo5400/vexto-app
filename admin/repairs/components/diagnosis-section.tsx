import type { DiagnosisForm } from "@/admin/repairs/hooks";
import { View } from "react-native";
import {
  RButton,
  RField,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

export function DiagnosisSection({
  order: o,
  closed,
  form,
}: SectionProps & { form: DiagnosisForm }) {
  const { can } = useRepairDetailCtx();
  return (
    <>
      <RHeading>Diagnóstico</RHeading>
      {(o.diagnosticos ?? []).map((d) => (
        <View key={d.id}>
          <RText>{d.technical_diagnosis ?? ""}</RText>
        </View>
      ))}
      {can("reparaciones:diagnosticar") && !closed && (
        <>
          <RField
            label="Diagnóstico interno"
            value={form.note}
            onChange={form.setNote}
          />
          <RField
            label="Resumen para cliente"
            value={form.publicNote}
            onChange={form.setPublicNote}
          />
          <RButton
            label="Guardar diagnóstico"
            action={form.save}
            disabled={!form.note.trim()}
          />
        </>
      )}
    </>
  );
}
