import { ClientePicker } from "@/admin/customers/components/cliente-picker";
import { ChoiceField } from "@/admin/repairs/choice-field";
import { useAlmacenesQuery } from "@/admin/sales/hooks/use-almacenes-query";
import {
  ActionButton,
  Card,
  Field,
  Heading,
  Line,
  Screen,
  Title,
} from "@/components/ui/kit";
import { formatCurrency } from "@/core/format";
import { useActionRunner } from "@/core/query/use-action-runner";
import { getAlmacenPredeterminado } from "@/core/utils/almacen";
import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";

import { ProductoPicker } from "./components/producto-picker";
import { SeparadoLineas } from "./components/separado-lineas";
import { SEPARADOS_INVALIDATE } from "./hooks";
import { useSeparadoForm } from "./use-separado-form";

export function SeparadoCreateScreen() {
  const router = useRouter();
  const form = useSeparadoForm();
  const almacenes = useAlmacenesQuery();
  const { busy, run } = useActionRunner(SEPARADOS_INVALIDATE);
  const { almacenId, setAlmacenId } = form;

  useEffect(() => {
    if (almacenId) return;
    const def = getAlmacenPredeterminado(almacenes.data);
    if (def) setAlmacenId(def.id);
  }, [almacenes.data, almacenId, setAlmacenId]);

  const save = async () => {
    let createdId: string | undefined;
    const ok = await run(async () => {
      createdId = (await form.submit()).id;
    });
    if (ok && createdId)
      router.replace(`/(app)/separados/${createdId}` as Href);
  };

  return (
    <Screen>
      <Title subtitle="Aparta productos con un anticipo.">Nuevo separado</Title>
      <Heading>Cliente</Heading>
      <ClientePicker value={form.cliente} onChange={form.setCliente} />
      <Heading>Almacén</Heading>
      <ChoiceField
        label="Almacén"
        value={form.almacenId}
        onChange={form.setAlmacenId}
        options={(almacenes.data ?? []).filter((a) => a.activo !== false)}
      />
      <Heading>Productos</Heading>
      <ProductoPicker onPick={form.addProducto} />
      <SeparadoLineas form={form} />
      <Heading>Condiciones</Heading>
      <Field
        label="Anticipo"
        kind="money"
        value={form.anticipo}
        onChange={form.setAnticipo}
      />
      <Field
        label="Fecha límite de retiro (AAAA-MM-DD)"
        value={form.fecha}
        onChange={form.setFecha}
      />
      <Card>
        <Line bold>{`Total: ${formatCurrency(form.total)}`}</Line>
        <Line>{`Anticipo: ${formatCurrency(Number.isFinite(form.anticipoNum) ? form.anticipoNum : 0)}`}</Line>
        <Line>
          {`Saldo: ${formatCurrency(Math.max(0, form.total - (Number.isFinite(form.anticipoNum) ? form.anticipoNum : 0)))}`}
        </Line>
      </Card>
      {form.error ? <Line tone="error">{form.error}</Line> : null}
      <ActionButton
        label="Crear separado"
        variant="primary"
        busy={busy}
        disabled={!!form.error}
        confirm={{
          title: "Crear separado",
          message: `Total ${formatCurrency(form.total)} con anticipo de ${formatCurrency(Number.isFinite(form.anticipoNum) ? form.anticipoNum : 0)}. ¿Continuar?`,
        }}
        onPress={() => void save()}
      />
    </Screen>
  );
}
