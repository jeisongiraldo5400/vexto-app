import { ActionButton, Card, Heading, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";

import {
  TIPO_MOVIMIENTO_LABEL,
  formatFechaHora,
  type CajaEgreso,
  type CajaMovimiento,
} from "../adapters";

/** Solo ingresos y retiros manuales, vigentes y sin documento asociado. */
export function esMovimientoAnulable(m: CajaMovimiento, usuarioId?: string) {
  return (
    m.tipo !== "REEMBOLSO" &&
    !m.referenciaTipo &&
    !m.anuladoAt &&
    m.usuarioId === usuarioId
  );
}

/**
 * Movimientos de la sesión (incluye anulados, que no suman) y egresos sellados.
 * `onAnular` se ofrece solo en los movimientos propios anulables.
 */
export function MovimientosCaja({
  movimientos,
  egresos = [],
  usuarioId,
  busy = false,
  onAnular,
}: {
  movimientos: CajaMovimiento[];
  egresos?: CajaEgreso[];
  usuarioId?: string;
  busy?: boolean;
  onAnular?: (m: CajaMovimiento) => void;
}) {
  return (
    <>
      <Heading>Movimientos</Heading>
      {movimientos.length === 0 ? (
        <Line tone="secondary">Sin ingresos, retiros ni reembolsos.</Line>
      ) : null}
      {movimientos.map((m) => {
        const tipo = TIPO_MOVIMIENTO_LABEL[m.tipo] ?? m.tipo;
        return (
          <Card key={m.id}>
            <Line bold tone={m.anuladoAt ? "secondary" : "text"}>
              {`${tipo} · ${formatCurrency(m.monto)}${m.anuladoAt ? " · Anulado" : ""}`}
            </Line>
            <Line>{m.motivo}</Line>
            <Line tone="secondary">
              {`${m.metodoPagoNombre ?? "Método"} · ${formatFechaHora(m.createdAt)}`}
            </Line>
            {onAnular && esMovimientoAnulable(m, usuarioId) ? (
              <ActionButton
                label={`Anular ${tipo.toLowerCase()} de ${formatCurrency(m.monto)}`}
                variant="danger"
                busy={busy}
                confirm={{
                  title: "Anular movimiento",
                  message: `¿Anular el ${tipo.toLowerCase()} de ${formatCurrency(m.monto)}? Dejará de contar en el arqueo.`,
                  confirmText: "Anular",
                }}
                onPress={() => onAnular(m)}
              />
            ) : null}
          </Card>
        );
      })}
      {egresos.length > 0 ? (
        <>
          <Heading>Gastos y compras</Heading>
          {egresos.map((g) => (
            <Card key={`${g.tipo}-${g.id}`}>
              <Line bold>
                {`${g.tipo === "COMPRA" ? "Compra" : "Gasto"} · ${formatCurrency(g.monto)}`}
              </Line>
              <Line>{g.concepto}</Line>
              <Line tone="secondary">
                {`${g.metodoPagoNombre ?? "Sin método"} · ${formatFechaHora(g.createdAt)}`}
              </Line>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}
