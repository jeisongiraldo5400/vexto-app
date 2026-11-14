import { Card, Heading, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";

import type { CajaResumen } from "../adapters";

/** Arqueo: cuadre del efectivo, totales por método, cobros por origen y conteos. */
export function ResumenCaja({ resumen: r }: { resumen: CajaResumen }) {
  const e = r.efectivo;
  return (
    <>
      <Heading>Efectivo</Heading>
      <Card>
        <Line>{`Base inicial: ${formatCurrency(r.baseInicial)}`}</Line>
        <Line>{`+ Cobros en efectivo: ${formatCurrency(e.cobros)}`}</Line>
        <Line>{`+ Ingresos: ${formatCurrency(e.ingresos)}`}</Line>
        <Line>{`− Retiros: ${formatCurrency(e.retiros)}`}</Line>
        <Line>{`− Reembolsos: ${formatCurrency(e.reembolsos)}`}</Line>
        <Line>{`− Gastos: ${formatCurrency(e.gastos)}`}</Line>
        {e.compras > 0 ? (
          <Line>{`− Compras: ${formatCurrency(e.compras)}`}</Line>
        ) : null}
        <Line bold>{`Efectivo esperado: ${formatCurrency(e.esperado)}`}</Line>
      </Card>

      <Heading>Totales por método</Heading>
      {r.porMetodo.length === 0 ? (
        <Line tone="secondary">Aún no hay cobros ni movimientos.</Line>
      ) : null}
      {r.porMetodo.map((m) => (
        <Card key={m.metodoPagoId ?? "sin-metodo"}>
          <Line bold>
            {`${m.metodoPagoNombre}${m.esEfectivo ? " · efectivo" : ""}`}
          </Line>
          <Line>
            {`Cobros: ${formatCurrency(m.cobros)} (${m.cantidadCobros})`}
          </Line>
          {m.ingresos || m.retiros || m.reembolsos || m.egresos ? (
            <Line tone="secondary">
              {`Ingresos ${formatCurrency(m.ingresos)} · Retiros ${formatCurrency(m.retiros)} · Reembolsos ${formatCurrency(m.reembolsos)} · Egresos ${formatCurrency(m.egresos)}`}
            </Line>
          ) : null}
          <Line bold>{`Neto: ${formatCurrency(m.neto)}`}</Line>
        </Card>
      ))}

      <Heading>Cobros por origen</Heading>
      <Card>
        <Line>{`Ventas: ${formatCurrency(r.cobrosPorOrigen.ventas)}`}</Line>
        <Line>
          {`Abonos a crédito: ${formatCurrency(r.cobrosPorOrigen.creditos)}`}
        </Line>
        <Line>
          {`Reparaciones: ${formatCurrency(r.cobrosPorOrigen.reparaciones)}`}
        </Line>
        <Line>{`Separados: ${formatCurrency(r.cobrosPorOrigen.separados)}`}</Line>
        <Line bold>{`Total cobrado: ${formatCurrency(r.totales.cobros)}`}</Line>
      </Card>

      <Heading>Operaciones</Heading>
      <Card>
        <Line>
          {`Ventas: ${r.conteos.ventas} · Pagos: ${r.conteos.pagos} · Abonos de separado: ${r.conteos.abonosSeparado}`}
        </Line>
        <Line>
          {`Anulaciones: ${r.conteos.anulaciones} · Devoluciones: ${r.conteos.devoluciones} · Movimientos: ${r.conteos.movimientos}`}
        </Line>
      </Card>
    </>
  );
}
