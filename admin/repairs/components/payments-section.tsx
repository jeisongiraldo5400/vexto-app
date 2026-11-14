import { ChoiceField } from "@/admin/repairs/choice-field";
import type { PaymentForm } from "@/admin/repairs/hooks";
import { formatCurrency } from "@/core/format";
import { View } from "react-native";
import {
  RButton,
  RField,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Saldo, pagos registrados (con reversión) y nuevo abono. */
export function PaymentsSection({
  order: o,
  closed,
  resources,
  form,
}: SectionProps & { form: PaymentForm }) {
  const { can } = useRepairDetailCtx();
  if (!can("pagos:ver", "pagos")) return null;
  return (
    <>
      <RHeading>Cobros</RHeading>
      <RText>
        {`Total: ${o.saldo?.total != null ? formatCurrency(o.saldo.total) : "Sin aprobar"} · Pagado: ${formatCurrency(o.saldo?.pagado ?? 0)} · Saldo: ${o.saldo?.pendiente != null ? formatCurrency(o.saldo.pendiente) : "—"}`}
      </RText>
      {(o.pagos ?? []).map((p) => (
        <View key={p.id}>
          <RText>{`${formatCurrency(Number(p.monto))} · ${p.estado}`}</RText>
          {can("pagos:editar", "pagos") && p.estado === "completado" && (
            <RButton
              label="Revertir pago"
              action={() => form.revert(p.id)}
              confirm={{
                title: "Revertir pago",
                message: `¿Revertir el pago de ${formatCurrency(Number(p.monto))}?`,
              }}
            />
          )}
        </View>
      ))}
      {can("pagos:crear", "pagos") && !closed && (
        <>
          <ChoiceField
            label="Método"
            value={form.method}
            onChange={form.setMethod}
            options={resources?.metodos ?? []}
          />
          <RField
            label="Monto"
            value={form.amount}
            onChange={form.setAmount}
            kind="money"
          />
          {form.cobro.esEfectivo ? (
            <>
              <RField
                label="Monto recibido (opcional)"
                value={form.received}
                onChange={form.setReceived}
                kind="money"
              />
              {form.cobro.error ? <RText>{form.cobro.error}</RText> : null}
              {form.cobro.cambio != null ? (
                <RText>{`Cambio: ${formatCurrency(form.cobro.cambio)}`}</RText>
              ) : null}
            </>
          ) : null}
          <RButton
            label="Registrar pago"
            action={form.pay}
            disabled={form.invalid}
          />
        </>
      )}
    </>
  );
}
