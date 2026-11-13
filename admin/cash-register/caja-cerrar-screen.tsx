import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Chips,
  Field,
  Heading,
  Line,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { useActionRunner } from "@/core/query/use-action-runner";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";

import {
  formatFechaHora,
  type CajaResumen,
  type CajaSesion,
} from "./adapters";
import { etiquetaDiferencia } from "./cierre";
import { DenominacionesInput } from "./components/denominaciones-input";
import {
  CAJA_INVALIDATE,
  useCajaResumenQuery,
  useCerrarCajaForm,
} from "./hooks";

const MODOS = [
  { value: "total", label: "Total contado" },
  { value: "denominaciones", label: "Por denominaciones" },
];

const TONO = { cuadrada: "success", sobrante: "warning", faltante: "error" } as const;

/** Cierre con arqueo de la caja `id` (la propia o, con `caja:ver`, la de otro cajero). */
export function CajaCerrarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useCajaResumenQuery(id);
  if (!q.data)
    return (
      <Screen>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
          empty={!id && "No se indicó la caja a cerrar."}
        />
      </Screen>
    );
  if (q.data.sesion.estado !== "ABIERTA")
    return (
      <Screen>
        <Title subtitle="No admite un nuevo arqueo.">Caja ya cerrada</Title>
        <ActionButton
          label="Ver el cierre"
          variant="primary"
          onPress={() => router.replace(`/(app)/caja/${id}` as Href)}
        />
      </Screen>
    );
  return <CerrarCaja sesion={q.data.sesion} resumen={q.data.resumen} />;
}

function CerrarCaja({
  sesion,
  resumen,
}: {
  sesion: CajaSesion;
  resumen: CajaResumen;
}) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const esperado = resumen.efectivo.esperado;
  const form = useCerrarCajaForm(sesion.id, esperado);
  const { busy, run } = useActionRunner(CAJA_INVALIDATE);
  const ev = form.evaluacion;
  const forzado = sesion.usuarioId !== userId;

  const cerrar = async () => {
    let cerrada = false;
    const ok = await run(async () => {
      cerrada = (await form.submit()) !== null;
    });
    if (ok && cerrada)
      router.replace(`/(app)/caja/${sesion.id}?cerrada=1` as Href);
  };

  return (
    <Screen>
      <Title subtitle="Cuenta el efectivo y compáralo con lo esperado.">
        Cerrar caja
      </Title>
      {forzado ? (
        <Line tone="warning" bold>
          {`Cierre forzado: vas a cerrar la caja de ${sesion.usuarioNombre ?? "otro usuario"}.`}
        </Line>
      ) : null}
      <Card>
        <Line>{`Cajero: ${sesion.usuarioNombre ?? "—"}`}</Line>
        <Line>{`Apertura: ${formatFechaHora(sesion.abiertaAt)}`}</Line>
        <Line>{`Base inicial: ${formatCurrency(resumen.baseInicial)}`}</Line>
        <Line bold>{`Efectivo esperado: ${formatCurrency(esperado)}`}</Line>
      </Card>

      <Heading>Efectivo contado</Heading>
      <Chips
        options={MODOS}
        value={form.usarDenominaciones ? "denominaciones" : "total"}
        onChange={(v) => form.setUsarDenominaciones(v === "denominaciones")}
      />
      {form.usarDenominaciones ? (
        <DenominacionesInput
          conteo={form.conteo}
          onCantidad={form.setCantidad}
        />
      ) : (
        <Field
          label="Efectivo contado"
          kind="money"
          value={form.contado}
          onChange={form.setContado}
        />
      )}

      {ev.diferencia != null && ev.tipo ? (
        <Card>
          <Line>{`Esperado: ${formatCurrency(esperado)}`}</Line>
          <Line>{`Contado: ${formatCurrency(ev.contado)}`}</Line>
          <Line bold tone={TONO[ev.tipo]}>
            {`Diferencia: ${etiquetaDiferencia(ev.diferencia)}`}
          </Line>
        </Card>
      ) : null}

      <Field
        label="Observaciones del cierre"
        value={form.observaciones}
        onChange={form.setObservaciones}
        multiline
      />
      {ev.requiereObservaciones ? (
        <Line tone="secondary">
          Hay diferencia: las observaciones son obligatorias.
        </Line>
      ) : null}
      {ev.error ? <Line tone="error">{ev.error}</Line> : null}
      {form.serverError ? <Line tone="error">{form.serverError}</Line> : null}
      <ActionButton
        label="Cerrar caja"
        variant="primary"
        busy={busy}
        disabled={!ev.payload}
        confirm={{
          title: "Cerrar caja",
          message: `Contado ${formatCurrency(Number.isFinite(ev.contado) ? ev.contado : 0)} · ${ev.diferencia != null ? etiquetaDiferencia(ev.diferencia) : ""}. No se podrán registrar más cobros en esta caja. ¿Continuar?`,
          confirmText: "Cerrar caja",
        }}
        onPress={() => void cerrar()}
      />
    </Screen>
  );
}
