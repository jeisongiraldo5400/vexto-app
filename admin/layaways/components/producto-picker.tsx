import { useProductosQuery } from "@/admin/products/hooks/use-productos-query";
import { Card, Field, Line, QueryState } from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import type { Producto } from "@/core/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState } from "react";

/** Búsqueda de productos activos (mínimo 2 caracteres); cada toque agrega uno. */
export function ProductoPicker({ onPick }: { onPick: (p: Producto) => void }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const q = useProductosQuery(debounced, { minChars: 2 });
  const active = debounced.trim().length >= 2;
  const results = active ? (q.data?.productos ?? []) : [];
  return (
    <>
      <Field
        label="Buscar producto (nombre o código)"
        value={search}
        onChange={setSearch}
      />
      {active && (
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
          empty={!q.isLoading && results.length === 0 && "Sin resultados."}
        />
      )}
      {results.slice(0, 8).map((p) => (
        <Card key={p.id} label={`Agregar ${p.nombre}`} onPress={() => onPick(p)}>
          <Line bold>{p.nombre}</Line>
          <Line tone="secondary">{`${p.codigo} · ${formatCurrency(Number(p.precioVenta) || 0)}`}</Line>
        </Card>
      ))}
    </>
  );
}
