import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Line,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { useActionRunner } from "@/core/query/use-action-runner";
import { type Href, useRouter } from "expo-router";

import { anularMovimientoCaja, formatFechaHora } from "./adapters";
import { AbrirCajaForm } from "./components/abrir-caja-form";
import { MovimientoForm } from "./components/movimiento-form";
import { MovimientosCaja } from "./components/movimientos-caja";
import { ResumenCaja } from "./components/resumen-caja";
import { CAJA_INVALIDATE, useCajaActualQuery } from "./hooks";

/** Caja del usuario: apertura si no tiene sesión; arqueo en vivo y movimientos si la tiene. */
export function CajaScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const can = (p: string) => canAccess(user, "caja", p);
  const q = useCajaActualQuery();
  const { busy, run } = useActionRunner(CAJA_INVALIDATE);
  const historial = (
    <ActionButton
      label="Historial de cajas"
      onPress={() => router.push("/(app)/caja/historial" as Href)}
    />
  );

  if (!q.data)
    return (
      <Screen>
        <Title subtitle="Apertura, arqueo y cierre de tu turno.">Caja</Title>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
        />
        {historial}
      </Screen>
    );

  const { sesion, resumen } = q.data;
  if (!sesion || !resumen)
    return (
      <Screen>
        <Title subtitle="No tienes una caja abierta.">Caja</Title>
        {can("caja:abrir") ? (
          <AbrirCajaForm />
        ) : (
          <Line tone="warning">
            Tu usuario no tiene permiso para abrir caja. Pide a un administrador
            que te lo asigne.
          </Line>
        )}
        {historial}
      </Screen>
    );

  return (
    <Screen>
      <Title subtitle="Arqueo en vivo de tu turno.">Caja</Title>
      <Card>
        <Line bold tone="success">
          {`Caja abierta · ${sesion.usuarioNombre ?? "Tu caja"}`}
        </Line>
        <Line>{`Apertura: ${formatFechaHora(sesion.abiertaAt)}`}</Line>
        {sesion.almacenNombre ? (
          <Line>{`Almacén: ${sesion.almacenNombre}`}</Line>
        ) : null}
        {sesion.sucursalNombre ? (
          <Line>{`Sucursal: ${sesion.sucursalNombre}`}</Line>
        ) : null}
        {sesion.observacionesApertura ? (
          <Line tone="secondary">{`Observaciones: ${sesion.observacionesApertura}`}</Line>
        ) : null}
        <Line bold>
          {`Efectivo esperado: ${formatCurrency(resumen.efectivo.esperado)}`}
        </Line>
      </Card>
      <ActionButton
        label="Actualizar arqueo"
        busy={q.isFetching}
        onPress={() => void q.refetch()}
      />
      <ResumenCaja resumen={resumen} />
      <MovimientosCaja
        movimientos={resumen.movimientos}
        egresos={resumen.egresos}
        usuarioId={user?.id}
        busy={busy}
        onAnular={
          can("caja:movimientos")
            ? (m) => void run(() => anularMovimientoCaja(m.id))
            : undefined
        }
      />
      {can("caja:movimientos") ? <MovimientoForm /> : null}
      {can("caja:cerrar") ? (
        <ActionButton
          label="Cerrar caja"
          variant="primary"
          onPress={() =>
            router.push(`/(app)/caja/cerrar?id=${sesion.id}` as Href)
          }
        />
      ) : null}
      {historial}
    </Screen>
  );
}
