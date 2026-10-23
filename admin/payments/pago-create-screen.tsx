import { useMetodosAbono } from "@/admin/credits/hooks";
import { ChoiceField } from "@/admin/repairs/choice-field";
import {
  ActionButton,
  Card,
  Field,
  Heading,
  Line,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { useActionRunner } from "@/core/query/use-action-runner";
import { useRouter } from "expo-router";

import { PAGOS_INVALIDATE, usePagoForm } from "./hooks";

export function PagoCreateScreen() {
  const router = useRouter();
  const form = usePagoForm();
  const metodos = useMetodosAbono();
  const { busy, run } = useActionRunner(PAGOS_INVALIDATE);
  const v = form.venta;

  return (
    <Screen>
      <Title subtitle="Abona a una venta buscándola por su factura.">
        Registrar pago
      </Title>
      <Field
        label="Número de factura"
        value={form.factura}
        onChange={form.setFactura}
        autoCapitalize="characters"
      />
      <ActionButton
        label="Buscar venta"
        busy={form.searching}
        disabled={!form.factura.trim()}
        onPress={() => void form.buscar()}
      />
      {form.lookupError ? <Line tone="error">{form.lookupError}</Line> : null}
      {v && (
        <>
          <Card>
            <Line bold>{v.numeroFactura}</Line>
            <Line>{`Cliente: ${v.clienteNombre ?? "Sin cliente"}`}</Line>
            <Line>{`Total: ${formatCurrency(v.total)}`}</Line>
            <Line bold tone={form.saldo > 0 ? "warning" : "success"}>
              {`Saldo pendiente: ${formatCurrency(form.saldo)}`}
            </Line>
          </Card>
          {form.saldo <= 0 ? (
            <Line tone="success">La venta no tiene saldo pendiente.</Line>
          ) : (
            <>
              <Heading>Pago</Heading>
              <ChoiceField
                label="Método de pago"
                value={form.method}
                onChange={form.setMethod}
                options={metodos.options}
              />
              <Field
                label="Monto"
                kind="money"
                value={form.amount}
                onChange={form.setAmount}
              />
              <Field
                label="Referencia"
                value={form.reference}
                onChange={form.setReference}
              />
              <Field
                label="Observaciones"
                value={form.notes}
                onChange={form.setNotes}
              />
              {form.error ? <Line tone="error">{form.error}</Line> : null}
              <ActionButton
                label="Registrar pago"
                variant="primary"
                busy={busy}
                disabled={form.invalid}
                confirm={{
                  title: "Registrar pago",
                  message: `¿Registrar ${formatCurrency(form.monto)} a la factura ${v.numeroFactura}?`,
                }}
                onPress={() =>
                  void run(form.pay).then((ok) => {
                    if (ok) router.back();
                  })
                }
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
