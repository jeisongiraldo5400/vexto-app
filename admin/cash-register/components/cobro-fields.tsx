import { ChoiceField } from "@/admin/repairs/choice-field";
import { Field, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";

import type { CobroEvaluado, MetodoCobro, ReembolsoEvaluado } from "../cobro";

/**
 * Método de pago de un cobro y, si es efectivo, el monto recibido con su cambio.
 * Lo comparten separados (anticipo y abonos) y pagos de reparación.
 */
export function MetodoCobroFields({
  metodos,
  metodoId,
  onMetodo,
  recibido,
  onRecibido,
  cobro,
}: {
  metodos: MetodoCobro[];
  metodoId: string;
  onMetodo: (id: string) => void;
  recibido: string;
  onRecibido: (v: string) => void;
  cobro: CobroEvaluado;
}) {
  return (
    <>
      <ChoiceField
        label="Método de pago"
        value={metodoId}
        onChange={onMetodo}
        options={metodos}
      />
      {cobro.esEfectivo ? (
        <>
          <Field
            label="Monto recibido (opcional)"
            kind="money"
            value={recibido}
            onChange={onRecibido}
          />
          {cobro.error ? <Line tone="error">{cobro.error}</Line> : null}
          {cobro.cambio != null ? (
            <Line tone="success" bold>
              {`Cambio: ${formatCurrency(cobro.cambio)}`}
            </Line>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** Reembolso opcional al cliente (sale de la caja abierta de quien lo registra). */
export function ReembolsoFields({
  metodos,
  metodoId,
  onMetodo,
  monto,
  onMonto,
  evaluado,
  maximo,
}: {
  metodos: MetodoCobro[];
  metodoId: string;
  onMetodo: (id: string) => void;
  monto: string;
  onMonto: (v: string) => void;
  evaluado: ReembolsoEvaluado;
  maximo?: number;
}) {
  return (
    <>
      <Line tone="secondary">
        {maximo != null
          ? `Reembolso opcional: hasta ${formatCurrency(maximo)}. Sale de tu caja abierta.`
          : "Reembolso opcional: el dinero sale de tu caja abierta."}
      </Line>
      <Field
        label="Monto a reembolsar (opcional)"
        kind="money"
        value={monto}
        onChange={onMonto}
      />
      {monto.trim() !== "" ? (
        <ChoiceField
          label="Método del reembolso"
          value={metodoId}
          onChange={onMetodo}
          options={metodos}
        />
      ) : null}
      {evaluado.error ? <Line tone="error">{evaluado.error}</Line> : null}
    </>
  );
}
