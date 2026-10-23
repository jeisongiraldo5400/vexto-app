import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  ActionButton,
  Card,
  Field,
  Line,
  Pager,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { canAccess } from "@/core/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";

import { CLIENTES_PAGE_SIZE, nombreCliente } from "./adapters";
import { useClientesQuery } from "./hooks";

export function ClientesListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const can = (p: string) => canAccess(user, "clientes", p);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);
  const q = useClientesQuery(debounced, page);
  const items = q.data?.clientes ?? [];

  return (
    <Screen>
      <Title subtitle="Directorio de clientes de la empresa.">Clientes</Title>
      <Field
        label="Buscar por nombre o documento"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      {can("clientes:crear") && (
        <ActionButton
          label="Nuevo cliente"
          variant="primary"
          onPress={() => router.push("/(app)/clientes/nuevo" as Href)}
        />
      )}
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => void q.refetch()}
        empty={!q.isLoading && items.length === 0 && "No hay clientes."}
      />
      {items.map((cl) => (
        <Card
          key={cl.id}
          label={nombreCliente(cl)}
          onPress={
            can("clientes:editar")
              ? () => router.push(`/(app)/clientes/${cl.id}` as Href)
              : undefined
          }
        >
          <Line bold>{nombreCliente(cl)}</Line>
          <Line tone="secondary">{`${cl.tipoDocumento} ${cl.numeroDocumento}`}</Line>
          {cl.telefono || cl.email ? (
            <Line tone="secondary">
              {[cl.telefono, cl.email].filter(Boolean).join(" · ")}
            </Line>
          ) : null}
        </Card>
      ))}
      {(q.data?.total ?? 0) > CLIENTES_PAGE_SIZE && (
        <Pager
          page={page}
          pageSize={CLIENTES_PAGE_SIZE}
          total={q.data?.total ?? 0}
          onChange={setPage}
        />
      )}
    </Screen>
  );
}
