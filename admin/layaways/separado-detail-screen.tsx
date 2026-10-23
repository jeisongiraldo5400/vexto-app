import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Field,
  Heading,
  Line,
  QueryState,
  Screen,
} from "@/components/ui/kit";
import { formatCurrency, formatDateLabel } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { useActionRunner } from "@/core/query/use-action-runner";
import { useLocalSearchParams } from "expo-router";

import {
  ESTADO_SEPARADO_LABEL,
  MIN_OBSERVACIONES_CANCELACION,
  retirarSeparado,
  type Separado,
} from "./adapters";
import {
  SEPARADOS_INVALIDATE,
  useAbonoSeparadoForm,
  useCancelarSeparadoForm,
  useSeparadoQuery,
} from "./hooks";

export function SeparadoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSeparadoQuery(id);
  if (!q.data)
    return (
      <Screen>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );
  return <SeparadoDetail separado={q.data} />;
}

function SeparadoDetail({ separado: s }: { separado: Separado }) {
  const user = useAuthStore((st) => st.user);
  const can = (p: string) => canAccess(user, "ventas", p);
  const { busy, run } = useActionRunner(SEPARADOS_INVALIDATE);
  const abono = useAbonoSeparadoForm(s.id, s.saldoPendiente);
  const cancelar = useCancelarSeparadoForm(s.id);
  const activo = s.estado === "pendiente";
  const abonado = Math.max(0, s.total - s.saldoPendiente);

  return (
    <Screen>
      <Card>
        <Line bold>
          {`${s.numeroSeparado ?? "Separado"} · ${ESTADO_SEPARADO_LABEL[s.estado] ?? s.estado}`}
        </Line>
        <Line>{`Cliente: ${s.clienteNombre ?? "—"}`}</Line>
        <Line>{`Almacén: ${s.almacenNombre ?? "—"}`}</Line>
        <Line>{`Retiro hasta: ${formatDateLabel(s.fechaLimiteRetiro ?? "")}`}</Line>
        <Line bold>{`Total: ${formatCurrency(s.total)}`}</Line>
        <Line>{`Anticipo: ${formatCurrency(s.anticipo)}`}</Line>
        <Line>{`Abonado: ${formatCurrency(abonado)}`}</Line>
        <Line bold tone={s.saldoPendiente > 0 ? "warning" : "success"}>
          {`Saldo: ${formatCurrency(s.saldoPendiente)}`}
        </Line>
        {s.estado === "cancelado" && s.observacionesCancelacion ? (
          <Line tone="error">{`Motivo de cancelación: ${s.observacionesCancelacion}`}</Line>
        ) : null}
      </Card>

      <Heading>Productos</Heading>
      {s.items.map((i, idx) => (
        <Line key={`${i.productoId}-${idx}`}>
          {`${i.productoNombre ?? i.productoId} × ${i.cantidad}` +
            (i.precioUnitario != null
              ? ` · ${formatCurrency(i.precioUnitario * i.cantidad)}`
              : "")}
        </Line>
      ))}

      {activo && can("separados:editar") && s.saldoPendiente > 0 && (
        <>
          <Heading>Registrar abono</Heading>
          <Field
            label="Monto del abono"
            kind="money"
            value={abono.amount}
            onChange={abono.setAmount}
          />
          {abono.error ? <Line tone="error">{abono.error}</Line> : null}
          <ActionButton
            label="Registrar abono"
            variant="primary"
            busy={busy}
            disabled={abono.invalid}
            confirm={{
              title: "Registrar abono",
              message: `¿Abonar ${formatCurrency(abono.monto)} al separado?`,
            }}
            onPress={() => void run(abono.pay)}
          />
        </>
      )}

      {activo && can("separados:editar") && s.saldoPendiente <= 0 && (
        <ActionButton
          label="Entregar al cliente"
          variant="primary"
          busy={busy}
          confirm={{
            title: "Entregar separado",
            message: "¿Confirmas que el cliente retira los productos?",
          }}
          onPress={() => void run(() => retirarSeparado(s.id))}
        />
      )}

      {activo && can("separados:eliminar") && (
        <>
          <Heading>Cancelar separado</Heading>
          <Field
            label="Motivo de la cancelación"
            value={cancelar.observaciones}
            onChange={cancelar.setObservaciones}
            multiline
          />
          {cancelar.observaciones !== "" && cancelar.invalid ? (
            <Line tone="error">
              {`El motivo debe tener al menos ${MIN_OBSERVACIONES_CANCELACION} caracteres.`}
            </Line>
          ) : null}
          <ActionButton
            label="Cancelar separado"
            variant="danger"
            busy={busy}
            disabled={cancelar.invalid}
            confirm={{
              title: "Cancelar separado",
              message:
                "Se liberará el stock reservado y se anularán el anticipo y los abonos. ¿Continuar?",
            }}
            onPress={() => void run(cancelar.cancel)}
          />
        </>
      )}
    </Screen>
  );
}
