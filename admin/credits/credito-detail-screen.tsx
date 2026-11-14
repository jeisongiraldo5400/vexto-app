import { useAuthStore } from "@/admin/auth/store/auth-store";
import { ChoiceField } from "@/admin/repairs/choice-field";
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
import { Alert } from "react-native";

import {
  ESTADO_CREDITO_LABEL,
  puedeAbonar,
  saldoTotal,
  type CreditoDetalle,
} from "./adapters";
import {
  CREDITOS_INVALIDATE,
  useAbonoCreditoForm,
  useAbonosCreditoQuery,
  useCreditoQuery,
  useMetodosAbono,
} from "./hooks";

export function CreditoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useCreditoQuery(id);
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
  return <CreditoDetail credito={q.data} />;
}

function CreditoDetail({ credito: c }: { credito: CreditoDetalle }) {
  const user = useAuthStore((s) => s.user);
  const verPagos = canAccess(user, "pagos", "pagos:ver", "pos:ver", "ventas:ver");
  // POST /pagos: licencia de pagos y cualquiera de estos permisos (como el backend).
  const abonar =
    canAccess(user, "pagos", "pagos:crear", "pos:crear", "ventas:crear", "ventas:editar") &&
    puedeAbonar(c);
  const abonos = useAbonosCreditoQuery(c, verPagos);

  return (
    <Screen>
      <Card>
        <Line bold>{`${c.numeroFactura} · ${ESTADO_CREDITO_LABEL[c.estado] ?? c.estado}`}</Line>
        <Line>{`Cliente: ${c.clienteNombre || "—"}`}</Line>
        <Line bold>{`Total: ${formatCurrency(c.montoTotal)}`}</Line>
        {c.cuotaInicial ? (
          <Line>{`Cuota inicial: ${formatCurrency(c.cuotaInicial)}`}</Line>
        ) : null}
        <Line bold tone={saldoTotal(c) > 0 ? "warning" : "success"}>
          {`Saldo pendiente: ${formatCurrency(saldoTotal(c))}`}
        </Line>
        {c.fechaVencimiento ? (
          <Line tone="secondary">{`Vence: ${formatDateLabel(c.fechaVencimiento)}`}</Line>
        ) : null}
      </Card>

      {(c.cuotas ?? []).length > 0 && <Heading>Cuotas</Heading>}
      {(c.cuotas ?? []).map((cu) => (
        <Line key={cu.id ?? cu.numero} tone={cu.estado === "vencida" ? "error" : "text"}>
          {`${cu.numero === 0 ? "Inicial" : `#${cu.numero}`} · ${formatDateLabel(cu.fechaVencimiento)} · ${formatCurrency(cu.monto)} · saldo ${formatCurrency(cu.saldoPendiente)} · ${cu.estado}`}
        </Line>
      ))}

      {(c.items ?? []).length > 0 && <Heading>Productos</Heading>}
      {(c.items ?? []).map((i, idx) => (
        <Line key={`${i.productoId}-${idx}`}>
          {`${i.productoNombre} × ${i.cantidad} · ${formatCurrency(Number(i.precioUnitario) * Number(i.cantidad))}`}
        </Line>
      ))}

      {verPagos && (
        <>
          <Heading>Abonos</Heading>
          <QueryState
            isLoading={abonos.isLoading}
            error={abonos.error}
            onRetry={() => void abonos.refetch()}
            empty={
              !abonos.isLoading &&
              (abonos.data ?? []).length === 0 &&
              "Sin abonos registrados."
            }
          />
          {(abonos.data ?? []).map((p) => (
            <Line key={p.id}>
              {`${formatDateLabel(p.fechaPago ?? p.createdAt ?? "")} · ${formatCurrency(p.monto)} · ${p.metodoPagoNombre ?? ""} · ${p.estado}`}
            </Line>
          ))}
        </>
      )}

      {abonar && <AbonoCreditoSection credito={c} />}
    </Screen>
  );
}

function AbonoCreditoSection({ credito }: { credito: CreditoDetalle }) {
  const form = useAbonoCreditoForm(credito);
  const metodos = useMetodosAbono();
  const { busy, run } = useActionRunner(CREDITOS_INVALIDATE);
  return (
    <>
      <Heading>Registrar abono</Heading>
      <ChoiceField
        label="Método de pago"
        value={form.method}
        onChange={form.setMethod}
        options={metodos.options}
      />
      <Field
        label="Monto del abono"
        kind="money"
        value={form.amount}
        onChange={form.setAmount}
      />
      <Field label="Observaciones" value={form.notes} onChange={form.setNotes} />
      {form.error ? <Line tone="error">{form.error}</Line> : null}
      <ActionButton
        label="Registrar abono"
        variant="primary"
        busy={busy}
        disabled={form.invalid}
        confirm={{
          title: "Registrar abono",
          message: `¿Abonar ${formatCurrency(form.monto)} al crédito ${credito.numeroFactura}?`,
        }}
        onPress={() =>
          void run(async () => {
            const res = await form.pay();
            if (res?.creditoLiquidado)
              Alert.alert("Crédito liquidado", "El crédito quedó pagado.");
          })
        }
      />
    </>
  );
}
