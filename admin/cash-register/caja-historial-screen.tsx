import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  Card,
  Chips,
  Field,
  Line,
  Pager,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";

import {
  CAJA_PAGE_SIZE,
  DIFERENCIA_FILTROS,
  ESTADO_CAJA_FILTROS,
  ESTADO_CAJA_LABEL,
  formatFechaHora,
} from "./adapters";
import { etiquetaDiferencia, tipoDiferencia } from "./cierre";
import { useCajaSesionesQuery } from "./hooks";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** Solo se filtra por una fecha completa; mientras se escribe se ignora. */
const fechaValida = (v: string) => (YMD.test(v.trim()) ? v.trim() : "");
const TONO = { cuadrada: "success", sobrante: "warning", faltante: "error" } as const;

/** Sesiones de caja: las propias o, con `caja:ver`, las de toda la empresa. */
export function CajaHistorialScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const verTodas = canAccess(user, "caja", "caja:ver");
  const [estado, setEstado] = useState("");
  const [conDiferencia, setConDiferencia] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const fechas = useDebouncedValue(
    `${fechaValida(desde)}|${fechaValida(hasta)}`,
    400,
  );
  const [desdeOk, hastaOk] = fechas.split("|");
  const q = useCajaSesionesQuery(
    { estado, conDiferencia, desde: desdeOk, hasta: hastaOk },
    page,
  );
  const items = q.data?.sesiones ?? [];
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const fechaInvalida = [desde, hasta].some(
    (v) => v.trim() !== "" && !YMD.test(v.trim()),
  );

  return (
    <Screen>
      <Title
        subtitle={
          verTodas
            ? "Todas las cajas de la empresa."
            : "Tus sesiones de caja."
        }
      >
        Historial de cajas
      </Title>
      <Chips
        options={ESTADO_CAJA_FILTROS}
        value={estado}
        onChange={reset(setEstado)}
      />
      <Chips
        options={DIFERENCIA_FILTROS}
        value={conDiferencia}
        onChange={reset(setConDiferencia)}
      />
      <Field
        label="Desde (AAAA-MM-DD)"
        value={desde}
        onChange={reset(setDesde)}
      />
      <Field
        label="Hasta (AAAA-MM-DD)"
        value={hasta}
        onChange={reset(setHasta)}
      />
      {fechaInvalida ? (
        <Line tone="secondary">
          Escribe las fechas completas con el formato AAAA-MM-DD.
        </Line>
      ) : null}
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={!q.isLoading && items.length === 0 && "No hay cajas."}
      />
      {items.map((s) => (
        <Card
          key={s.id}
          label={`Caja de ${s.usuarioNombre ?? "cajero"} del ${formatFechaHora(s.abiertaAt)}`}
          onPress={() => router.push(`/(app)/caja/${s.id}` as Href)}
        >
          <Line bold>
            {`${s.usuarioNombre ?? "Cajero"} · ${ESTADO_CAJA_LABEL[s.estado] ?? s.estado}`}
          </Line>
          <Line tone="secondary">
            {`Apertura ${formatFechaHora(s.abiertaAt)}` +
              (s.cerradaAt ? ` · Cierre ${formatFechaHora(s.cerradaAt)}` : "")}
          </Line>
          <Line tone="secondary">
            {`Base ${formatCurrency(s.baseInicial)}` +
              (s.efectivoContado != null
                ? ` · Contado ${formatCurrency(s.efectivoContado)}`
                : "")}
          </Line>
          {s.diferencia != null ? (
            <Line bold tone={TONO[tipoDiferencia(s.diferencia)]}>
              {etiquetaDiferencia(s.diferencia)}
            </Line>
          ) : null}
        </Card>
      ))}
      {(q.data?.total ?? 0) > CAJA_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={CAJA_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
