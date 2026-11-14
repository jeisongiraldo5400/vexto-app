import { ActionButton, Card, Field, Line } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { parseCantidad } from "@/core/utils/money";

import type { SeparadoForm } from "../use-separado-form";

/** Productos agregados al separado con cantidad editable. */
export function SeparadoLineas({ form }: { form: SeparadoForm }) {
  if (form.lineas.length === 0)
    return <Line tone="secondary">Aún no agregas productos.</Line>;
  return (
    <>
      {form.lineas.map((l) => (
        <Card key={l.productoId}>
          <Line bold>{l.nombre}</Line>
          <Line tone="secondary">
            {`${formatCurrency(l.precio)} c/u · ${formatCurrency(l.precio * (parseCantidad(l.cantidad) || 0))}`}
          </Line>
          <Field
            label={`Cantidad de ${l.nombre}`}
            kind="int"
            value={l.cantidad}
            onChange={(v) => form.setCantidad(l.productoId, v)}
          />
          <ActionButton
            label={`Quitar ${l.nombre}`}
            variant="danger"
            onPress={() => form.removeLinea(l.productoId)}
          />
        </Card>
      ))}
    </>
  );
}
