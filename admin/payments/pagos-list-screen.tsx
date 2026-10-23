import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Chips,
  Line,
  Pager,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency, formatDateLabel } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";

import {
  ESTADO_PAGO_FILTROS,
  ESTADO_PAGO_LABEL,
  PAGOS_PAGE_SIZE,
} from "./adapters";
import { usePagosQuery } from "./hooks";

export function PagosListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const q = usePagosQuery(estado, page);
  const items = q.data?.pagos ?? [];

  return (
    <Screen>
      <Title subtitle="Pagos y abonos registrados a ventas.">Pagos</Title>
      {canAccess(user, "pagos", "pagos:crear") && (
        <ActionButton
          label="Registrar pago"
          variant="primary"
          onPress={() => router.push("/(app)/pagos/nuevo" as Href)}
        />
      )}
      <Chips
        options={ESTADO_PAGO_FILTROS}
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
        empty={!q.isLoading && items.length === 0 && "No hay pagos."}
      />
      {items.map((p) => (
        <Card key={p.id}>
          <Line bold>{`${formatCurrency(p.monto)} · ${ESTADO_PAGO_LABEL[p.estado] ?? p.estado}`}</Line>
          <Line>{`${p.numeroFactura} · ${p.clienteNombre ?? "Sin cliente"}`}</Line>
          <Line tone="secondary">
            {[
              formatDateLabel(p.fechaPago ?? p.createdAt ?? ""),
              p.metodoPagoNombre,
              p.creditoId ? "Abono a crédito" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Line>
        </Card>
      ))}
      {(q.data?.total ?? 0) > PAGOS_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={PAGOS_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
