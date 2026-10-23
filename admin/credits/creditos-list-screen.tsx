import {
  Card,
  Chips,
  Line,
  Pager,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency, formatDateLabel } from "@/core/format";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";

import {
  CREDITOS_PAGE_SIZE,
  ESTADO_CREDITO_FILTROS,
  ESTADO_CREDITO_LABEL,
  saldoTotal,
} from "./adapters";
import { useCreditosQuery } from "./hooks";

export function CreditosListScreen() {
  const router = useRouter();
  const [estado, setEstado] = useState("pendiente");
  const [page, setPage] = useState(1);
  const q = useCreditosQuery(estado, page);
  const items = q.data?.creditos ?? [];

  return (
    <Screen>
      <Title subtitle="Ventas a crédito y saldos por cobrar.">Créditos</Title>
      <Chips
        options={ESTADO_CREDITO_FILTROS}
        value={estado}
        onChange={(v) => {
          setEstado(v);
          setPage(1);
        }}
      />
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={!q.isLoading && items.length === 0 && "No hay créditos."}
      />
      {items.map((c) => (
        <Card
          key={c.id}
          label={`Crédito ${c.numeroFactura}`}
          onPress={() => router.push(`/(app)/creditos/${c.id}` as Href)}
        >
          <Line bold>
            {`${c.numeroFactura} · ${ESTADO_CREDITO_LABEL[c.estado] ?? c.estado}`}
          </Line>
          <Line>{c.clienteNombre || "Cliente"}</Line>
          <Line tone="secondary">
            {`Total ${formatCurrency(c.montoTotal)} · Saldo ${formatCurrency(saldoTotal(c))}`}
          </Line>
          {c.fechaVencimiento ? (
            <Line tone="secondary">{`Vence ${formatDateLabel(c.fechaVencimiento)}`}</Line>
          ) : null}
        </Card>
      ))}
      {(q.data?.total ?? 0) > CREDITOS_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={CREDITOS_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
