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
  DEVOLUCIONES_PAGE_SIZE,
  ESTADO_DEVOLUCION_LABEL,
  TIPO_DEVOLUCION_FILTROS,
} from "./adapters";
import { useDevolucionesQuery } from "./hooks";

export function DevolucionesListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tipo, setTipo] = useState("");
  const [page, setPage] = useState(1);
  const q = useDevolucionesQuery(tipo, page);
  const items = q.data?.devoluciones ?? [];

  return (
    <Screen>
      <Title subtitle="Devoluciones de clientes y a proveedores.">
        Devoluciones
      </Title>
      {canAccess(user, "ventas", "devoluciones:crear") && (
        <ActionButton
          label="Nueva devolución"
          variant="primary"
          onPress={() => router.push("/(app)/devoluciones/nueva" as Href)}
        />
      )}
      <Chips
        options={TIPO_DEVOLUCION_FILTROS}
        value={tipo}
        onChange={(v) => {
          setTipo(v);
          setPage(1);
        }}
      />
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={!q.isLoading && items.length === 0 && "No hay devoluciones."}
      />
      {items.map((d) => (
        <Card
          key={d.id}
          label={`Devolución ${d.numeroDevolucion ?? ""}`.trim()}
          onPress={() => router.push(`/(app)/devoluciones/${d.id}` as Href)}
        >
          <Line bold>
            {`${d.numeroDevolucion ?? "Devolución"} · ${ESTADO_DEVOLUCION_LABEL[d.estado] ?? d.estado}`}
          </Line>
          <Line>
            {d.tipo === "proveedor"
              ? `Proveedor: ${d.proveedorNombre ?? "—"}`
              : `Cliente: ${d.clienteNombre ?? "Sin cliente"}`}
          </Line>
          <Line tone="secondary">
            {`${formatDateLabel(d.createdAt ?? "")} · ${formatCurrency(d.total)}`}
          </Line>
        </Card>
      ))}
      {(q.data?.total ?? 0) > DEVOLUCIONES_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={DEVOLUCIONES_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
