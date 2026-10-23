import { useClientesBusquedaQuery } from "@/admin/sales/hooks/use-clientes-busqueda-query";
import { ActionButton, Card, Field, Line, QueryState } from "@/components/ui/kit";
import type { Cliente } from "@/core/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState } from "react";

import { nombreCliente } from "../adapters";

/** Selección de cliente por búsqueda (mínimo 2 caracteres). */
export function ClientePicker({
  value,
  onChange,
}: {
  value: Cliente | null;
  onChange: (c: Cliente | null) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const q = useClientesBusquedaQuery(debounced);

  if (value)
    return (
      <Card>
        <Line bold>{`Cliente: ${nombreCliente(value)}`}</Line>
        <Line tone="secondary">{`${value.tipoDocumento} ${value.numeroDocumento}`}</Line>
        <ActionButton label="Cambiar cliente" onPress={() => onChange(null)} />
      </Card>
    );

  const results = q.data?.clientes ?? [];
  return (
    <>
      <Field
        label="Buscar cliente (nombre o documento)"
        value={search}
        onChange={setSearch}
      />
      {debounced.trim().length >= 2 && (
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
          empty={!q.isLoading && results.length === 0 && "Sin resultados."}
        />
      )}
      {results.slice(0, 8).map((cl) => (
        <Card
          key={cl.id}
          label={nombreCliente(cl)}
          onPress={() => {
            onChange(cl);
            setSearch("");
          }}
        >
          <Line bold>{nombreCliente(cl)}</Line>
          <Line tone="secondary">{`${cl.tipoDocumento} ${cl.numeroDocumento}`}</Line>
        </Card>
      ))}
    </>
  );
}
