import { ChoiceField } from "@/admin/repairs/choice-field";
import { ActionButton, Chips, Field, Heading, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { useActionRunner } from "@/core/query/use-action-runner";

import type { TipoMovimientoManual } from "../adapters";
import {
  CAJA_INVALIDATE,
  useMetodosCaja,
  useMovimientoCajaForm,
} from "../hooks";

const TIPOS: { value: TipoMovimientoManual; label: string }[] = [
  { value: "INGRESO", label: "Ingreso" },
  { value: "RETIRO", label: "Retiro" },
];

/** Entrada o salida manual de dinero de la caja abierta. */
export function MovimientoForm() {
  const form = useMovimientoCajaForm();
  const metodos = useMetodosCaja();
  const { busy, run } = useActionRunner(CAJA_INVALIDATE);
  const nombre = form.tipo === "INGRESO" ? "ingreso" : "retiro";

  return (
    <>
      <Heading>Registrar ingreso o retiro</Heading>
      <Chips options={TIPOS} value={form.tipo} onChange={form.setTipo} />
      <ChoiceField
        label="Método de pago"
        value={form.metodoId}
        onChange={form.setMetodoId}
        options={metodos.options}
      />
      <Field
        label="Monto del movimiento"
        kind="money"
        value={form.amount}
        onChange={form.setAmount}
      />
      <Field
        label="Motivo del movimiento"
        value={form.motivo}
        onChange={form.setMotivo}
        multiline
      />
      {form.error ? <Line tone="error">{form.error}</Line> : null}
      <ActionButton
        label={`Registrar ${nombre}`}
        variant="primary"
        busy={busy}
        disabled={form.invalid}
        confirm={{
          title: `Registrar ${nombre}`,
          message: `¿Registrar un ${nombre} de ${formatCurrency(form.monto)}?`,
          confirmText: "Registrar",
        }}
        onPress={() => void run(form.submit)}
      />
    </>
  );
}
