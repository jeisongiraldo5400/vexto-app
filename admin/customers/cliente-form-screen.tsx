import {
  ActionButton,
  Line,
  QueryState,
  Screen,
  Title,
} from "@/components/ui/kit";
import { useActionRunner } from "@/core/query/use-action-runner";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  EMPTY_CLIENTE_FORM,
  actualizarCliente,
  crearCliente,
  toClienteForm,
  validateClienteForm,
  type ClienteFormValues,
} from "./adapters";
import { ClienteForm } from "./components/cliente-form";
import { useClienteQuery } from "./hooks";

/** Crear (`/clientes/nuevo`) o editar (`/clientes/[id]`) un cliente. */
export function ClienteFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id && id !== "nuevo" ? id : undefined;
  const q = useClienteQuery(editId);
  const [values, setValues] = useState<ClienteFormValues>(EMPTY_CLIENTE_FORM);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useActionRunner([["clientes"]]);

  useEffect(() => {
    if (q.data) setValues(toClienteForm(q.data));
  }, [q.data]);

  if (editId && (q.isLoading || q.error))
    return (
      <Screen>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );

  const save = async () => {
    const invalid = validateClienteForm(values);
    setError(invalid);
    if (invalid) return;
    const ok = await run(() =>
      editId ? actualizarCliente(editId, values) : crearCliente(values),
    );
    if (ok) router.back();
  };

  return (
    <Screen>
      <Title>{editId ? "Editar cliente" : "Nuevo cliente"}</Title>
      <ClienteForm
        values={values}
        editing={!!editId}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      />
      {error ? <Line tone="error">{error}</Line> : null}
      <ActionButton
        label="Guardar"
        variant="primary"
        busy={busy}
        onPress={() => void save()}
      />
    </Screen>
  );
}
