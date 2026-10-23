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
  ESTADO_SEPARADO_FILTROS,
  ESTADO_SEPARADO_LABEL,
  SEPARADOS_PAGE_SIZE,
} from "./adapters";
import { useSeparadosQuery } from "./hooks";

export function SeparadosListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [estado, setEstado] = useState("pendiente");
  const [page, setPage] = useState(1);
  const q = useSeparadosQuery(estado, page);
  const items = q.data?.separados ?? [];

  return (
    <Screen>
      <Title subtitle="Productos apartados con anticipo y abonos.">
        Separados
      </Title>
      {canAccess(user, "ventas", "separados:crear") && (
        <ActionButton
          label="Nuevo separado"
          variant="primary"
          onPress={() => router.push("/(app)/separados/nuevo" as Href)}
        />
      )}
      <Chips
        options={ESTADO_SEPARADO_FILTROS}
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
        empty={!q.isLoading && items.length === 0 && "No hay separados."}
      />
      {items.map((s) => (
        <Card
          key={s.id}
          label={`Separado ${s.numeroSeparado ?? ""}`.trim()}
          onPress={() => router.push(`/(app)/separados/${s.id}` as Href)}
        >
          <Line bold>
            {`${s.numeroSeparado ?? "Separado"} · ${ESTADO_SEPARADO_LABEL[s.estado] ?? s.estado}`}
          </Line>
          <Line>{s.clienteNombre ?? "Cliente"}</Line>
          <Line tone="secondary">
            {`Total ${formatCurrency(s.total)} · Saldo ${formatCurrency(s.saldoPendiente)}`}
          </Line>
          <Line tone="secondary">
            {`Retiro hasta ${formatDateLabel(s.fechaLimiteRetiro ?? "")}`}
          </Line>
        </Card>
      ))}
      {(q.data?.total ?? 0) > SEPARADOS_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={SEPARADOS_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
