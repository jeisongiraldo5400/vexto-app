import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Heading,
  Line,
  QueryState,
  Screen,
} from "@/components/ui/kit";
import { formatCurrency, formatDateLabel } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { useActionRunner } from "@/core/query/use-action-runner";
import { useLocalSearchParams } from "expo-router";

import { ESTADO_DEVOLUCION_LABEL, anularDevolucion } from "./adapters";
import { DEVOLUCIONES_INVALIDATE, useDevolucionQuery } from "./hooks";

export function DevolucionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const q = useDevolucionQuery(id);
  const { busy, run } = useActionRunner(DEVOLUCIONES_INVALIDATE);
  const d = q.data;
  if (!d)
    return (
      <Screen>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );

  return (
    <Screen>
      <Card>
        <Line bold>
          {`${d.numeroDevolucion ?? "Devolución"} · ${ESTADO_DEVOLUCION_LABEL[d.estado] ?? d.estado}`}
        </Line>
        <Line>
          {d.tipo === "proveedor"
            ? `Proveedor: ${d.proveedorNombre ?? "—"}`
            : `Cliente: ${d.clienteNombre ?? "Sin cliente"}`}
        </Line>
        <Line>{`Almacén: ${d.almacenNombre ?? "—"}`}</Line>
        <Line>{`Fecha: ${formatDateLabel(d.createdAt ?? "")}`}</Line>
        <Line bold>{`Total: ${formatCurrency(d.total)}`}</Line>
        {d.motivo ? <Line tone="secondary">{`Motivo: ${d.motivo}`}</Line> : null}
      </Card>
      <Heading>Productos</Heading>
      {d.items.map((i, idx) => (
        <Line key={`${i.productoId}-${idx}`}>
          {`${i.productoNombre ?? i.productoId} × ${i.cantidad}` +
            (i.precioUnitario != null
              ? ` · ${formatCurrency(i.precioUnitario * i.cantidad)}`
              : "")}
        </Line>
      ))}
      {d.estado === "registrada" &&
        canAccess(user, "ventas", "devoluciones:eliminar") && (
          <ActionButton
            label="Anular devolución"
            variant="danger"
            busy={busy}
            confirm={{
              title: "Anular devolución",
              message:
                "Se revertirá el movimiento de inventario de esta devolución. ¿Continuar?",
            }}
            onPress={() => void run(() => anularDevolucion(d.id))}
          />
        )}
    </Screen>
  );
}
