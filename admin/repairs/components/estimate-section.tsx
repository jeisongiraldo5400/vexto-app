import { estimateAction } from "@/admin/repairs/adapters";
import { ChoiceField } from "@/admin/repairs/choice-field";
import type { EstimateForm } from "@/admin/repairs/hooks";
import { formatCurrency } from "@/core/format";
import { Pressable, View } from "react-native";
import {
  RButton,
  RField,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

const LINE_TYPES = ["LABOR", "PART", "SERVICE", "OTHER"].map((id) => ({
  id,
  nombre: id,
}));

/** Cotizaciones existentes y editor del borrador. */
export function EstimateSection({
  order: o,
  closed,
  form,
}: SectionProps & { form: EstimateForm }) {
  const { can, busy } = useRepairDetailCtx();
  if (!can("cotizaciones:ver")) return null;
  const canEditDraft =
    (form.editingEstimate
      ? can("cotizaciones:editar")
      : can("cotizaciones:crear")) &&
    !closed &&
    !o.cotizaciones?.some((e) => e.status === "APPROVED");
  return (
    <>
      <RHeading>Cotizaciones</RHeading>
      {(o.cotizaciones ?? []).map((e) => (
        <View key={e.id} style={{ gap: 8 }}>
          <RText>{`${e.status} · ${formatCurrency(Number(e.total))}`}</RText>
          {(e.items ?? []).map((line, i) => (
            <View key={i}>
              <RText>
                {`${line.description}: ${Number(line.quantity)} × ${formatCurrency(Number(line.unit_price))}`}
              </RText>
            </View>
          ))}
          {e.status === "DRAFT" && can("cotizaciones:editar") && !closed && (
            <Pressable disabled={busy} onPress={() => form.startEdit(e)}>
              <RText>Editar borrador</RText>
            </Pressable>
          )}
          {e.status === "DRAFT" && can("cotizaciones:enviar") && (
            <RButton
              label="Enviar"
              action={() => estimateAction(e.id, "enviar")}
            />
          )}
          {e.status === "SENT" && can("cotizaciones:aprobar") && (
            <RButton
              label="Registrar aprobación"
              action={() => estimateAction(e.id, "aprobar")}
            />
          )}
        </View>
      ))}
      {canEditDraft && (
        <>
          {form.lines.map((line, i) => (
            <View key={i} style={{ gap: 8 }}>
              <ChoiceField
                label="Tipo"
                value={line.type}
                onChange={(v) => form.updateLine(i, { type: v })}
                options={LINE_TYPES}
              />
              <RField
                label="Concepto"
                value={line.description}
                onChange={(v) => form.updateLine(i, { description: v })}
              />
              <RField
                label="Cantidad"
                value={String(line.quantity)}
                onChange={(v) => form.updateLine(i, { quantity: v })}
                kind="int"
              />
              <RField
                label="Precio"
                value={String(line.unitPrice)}
                onChange={(v) => form.updateLine(i, { unitPrice: v })}
                kind="money"
              />
            </View>
          ))}
          <Pressable onPress={form.addLine}>
            <RText>Agregar concepto</RText>
          </Pressable>
          <RField
            label="Descuento"
            value={form.discount}
            onChange={form.setDiscount}
            kind="money"
          />
          <RField
            label="Impuesto"
            value={form.tax}
            onChange={form.setTax}
            kind="money"
          />
          <RButton
            label="Guardar borrador"
            action={form.save}
            disabled={form.invalid}
          />
        </>
      )}
    </>
  );
}
