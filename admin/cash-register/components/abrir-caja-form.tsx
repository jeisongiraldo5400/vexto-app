import { ChoiceField } from "@/admin/repairs/choice-field";
import { useAlmacenesQuery } from "@/admin/sales/hooks/use-almacenes-query";
import { ActionButton, Field, Heading, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { useActionRunner } from "@/core/query/use-action-runner";
import { getAlmacenPredeterminado } from "@/core/utils/almacen";
import { useEffect } from "react";

import { CAJA_INVALIDATE, useAbrirCajaForm } from "../hooks";

/** Apertura de caja: base inicial, almacén desde el que se vende y observaciones. */
export function AbrirCajaForm() {
  const form = useAbrirCajaForm();
  const almacenes = useAlmacenesQuery();
  const { busy, run } = useActionRunner(CAJA_INVALIDATE);
  const { almacenId, setAlmacenId } = form;

  useEffect(() => {
    if (almacenId) return;
    const def = getAlmacenPredeterminado(almacenes.data);
    if (def) setAlmacenId(def.id);
  }, [almacenes.data, almacenId, setAlmacenId]);

  return (
    <>
      <Heading>Abrir caja</Heading>
      <Line tone="secondary">
        Cuenta el efectivo con el que empiezas el turno.
      </Line>
      <Field
        label="Base inicial"
        kind="money"
        value={form.base}
        onChange={form.setBase}
      />
      <ChoiceField
        label="Almacén"
        value={form.almacenId}
        onChange={form.setAlmacenId}
        options={(almacenes.data ?? []).filter((a) => a.activo !== false)}
      />
      <Field
        label="Observaciones (opcional)"
        value={form.observaciones}
        onChange={form.setObservaciones}
        multiline
      />
      {form.base !== "" && form.error ? (
        <Line tone="error">{form.error}</Line>
      ) : null}
      <ActionButton
        label="Abrir caja"
        variant="primary"
        busy={busy}
        disabled={!!form.error}
        confirm={{
          title: "Abrir caja",
          message: `¿Abrir tu caja con una base de ${formatCurrency(Number.isFinite(form.baseNum) ? form.baseNum : 0)}?`,
          confirmText: "Abrir",
        }}
        onPress={() => void run(form.submit)}
      />
    </>
  );
}
