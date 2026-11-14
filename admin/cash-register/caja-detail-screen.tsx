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
import { formatCurrency } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { useActionRunner } from "@/core/query/use-action-runner";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import {
  ESTADO_CAJA_LABEL,
  formatFechaHora,
  revisarCaja,
  type CajaSesionConResumen,
} from "./adapters";
import { etiquetaDiferencia, tipoDiferencia } from "./cierre";
import { MovimientosCaja } from "./components/movimientos-caja";
import { ResumenCaja } from "./components/resumen-caja";
import { TicketActions } from "./components/ticket-actions";
import { CAJA_INVALIDATE, useCajaResumenQuery } from "./hooks";

const TONO = { cuadrada: "success", sobrante: "warning", faltante: "error" } as const;

/** Detalle de una sesión: arqueo (en vivo o snapshot del cierre), revisión y comprobante. */
export function CajaDetailScreen() {
  const { id, cerrada } = useLocalSearchParams<{
    id: string;
    cerrada?: string;
  }>();
  const q = useCajaResumenQuery(id);
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
  return <CajaDetail data={q.data} recienCerrada={cerrada === "1"} />;
}

function CajaDetail({
  data: { sesion: s, resumen },
  recienCerrada,
}: {
  data: CajaSesionConResumen;
  recienCerrada: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((st) => st.user);
  const can = (p: string) => canAccess(user, "caja", p);
  const { busy, run } = useActionRunner(CAJA_INVALIDATE);
  const [observaciones, setObservaciones] = useState("");
  const propia = s.usuarioId === user?.id;
  const abierta = s.estado === "ABIERTA";
  const forzado = !!s.cerradaPor && s.cerradaPor !== s.usuarioId;
  // Cerrar la caja de otro cajero exige además `caja:ver` (cierre forzado).
  const puedeCerrar =
    abierta && can("caja:cerrar") && (propia || can("caja:ver"));

  return (
    <Screen>
      {recienCerrada && !abierta ? (
        <Card>
          <Line bold tone="success">
            Caja cerrada correctamente
          </Line>
          {s.diferencia != null ? (
            <Line bold tone={TONO[tipoDiferencia(s.diferencia)]}>
              {etiquetaDiferencia(s.diferencia)}
            </Line>
          ) : null}
          <Line tone="secondary">
            Comparte o imprime el comprobante para entregar el turno.
          </Line>
        </Card>
      ) : null}

      <Card>
        <Line bold>
          {`${s.usuarioNombre ?? "Cajero"} · ${ESTADO_CAJA_LABEL[s.estado] ?? s.estado}`}
        </Line>
        <Line>{`Apertura: ${formatFechaHora(s.abiertaAt)}`}</Line>
        {s.cerradaAt ? (
          <Line>{`Cierre: ${formatFechaHora(s.cerradaAt)}`}</Line>
        ) : null}
        {forzado ? (
          <Line tone="warning">
            {`Cierre forzado por ${s.cerradaPorNombre ?? "otro usuario"}`}
          </Line>
        ) : null}
        {s.sucursalNombre ? (
          <Line>{`Sucursal: ${s.sucursalNombre}`}</Line>
        ) : null}
        {s.almacenNombre ? <Line>{`Almacén: ${s.almacenNombre}`}</Line> : null}
        <Line>{`Base inicial: ${formatCurrency(s.baseInicial)}`}</Line>
        {s.observacionesApertura ? (
          <Line tone="secondary">{`Observaciones de apertura: ${s.observacionesApertura}`}</Line>
        ) : null}
      </Card>

      {!abierta ? (
        <>
          <Heading>Arqueo de cierre</Heading>
          <Card>
            <Line>
              {`Efectivo esperado: ${formatCurrency(s.efectivoEsperado ?? resumen.efectivo.esperado)}`}
            </Line>
            <Line>
              {`Efectivo contado: ${formatCurrency(s.efectivoContado ?? 0)}`}
            </Line>
            {s.diferencia != null ? (
              <Line bold tone={TONO[tipoDiferencia(s.diferencia)]}>
                {`Diferencia: ${etiquetaDiferencia(s.diferencia)}`}
              </Line>
            ) : null}
            {s.observacionesCierre ? (
              <Line tone="secondary">{`Observaciones: ${s.observacionesCierre}`}</Line>
            ) : null}
          </Card>
          {s.denominaciones?.length ? (
            <>
              <Heading>Denominaciones contadas</Heading>
              <Card>
                {s.denominaciones.map((d) => (
                  <Line key={d.valor}>
                    {`${formatCurrency(d.valor)} × ${d.cantidad} = ${formatCurrency(d.valor * d.cantidad)}`}
                  </Line>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <Line tone="secondary">
          Caja abierta: el arqueo se calcula en vivo.
        </Line>
      )}

      {s.estado === "REVISADA" ? (
        <Card>
          <Line bold tone="success">
            {`Revisada por ${s.revisadaPorNombre ?? "—"} · ${formatFechaHora(s.revisadaAt)}`}
          </Line>
          {s.observacionesRevision ? (
            <Line tone="secondary">{s.observacionesRevision}</Line>
          ) : null}
        </Card>
      ) : null}

      <ResumenCaja resumen={resumen} />
      <MovimientosCaja
        movimientos={resumen.movimientos}
        egresos={resumen.egresos}
      />

      {!abierta ? (
        <>
          <Heading>Comprobante</Heading>
          <TicketActions sesion={s} resumen={resumen} />
        </>
      ) : null}

      {s.estado === "CERRADA" && can("caja:aprobar") ? (
        <>
          <Heading>Revisión</Heading>
          <Field
            label="Observaciones de la revisión (opcional)"
            value={observaciones}
            onChange={setObservaciones}
            multiline
          />
          <ActionButton
            label="Marcar como revisada"
            variant="primary"
            busy={busy}
            disabled={observaciones.trim().length > 1000}
            confirm={{
              title: "Marcar como revisada",
              message: "Confirmas que revisaste este cierre de caja. ¿Continuar?",
              confirmText: "Marcar revisada",
            }}
            onPress={() => void run(() => revisarCaja(s.id, observaciones))}
          />
        </>
      ) : null}

      {puedeCerrar ? (
        <ActionButton
          label={propia ? "Cerrar caja" : "Forzar cierre de esta caja"}
          variant={propia ? "primary" : "danger"}
          onPress={() => router.push(`/(app)/caja/cerrar?id=${s.id}` as Href)}
        />
      ) : null}
    </Screen>
  );
}
