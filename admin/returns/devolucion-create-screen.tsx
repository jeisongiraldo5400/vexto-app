import {
  ActionButton,
  Card,
  Field,
  Heading,
  Line,
  Screen,
  Title,
} from "@/components/ui/kit";
import { useActionRunner } from "@/core/query/use-action-runner";
import { type Href, useRouter } from "expo-router";

import { DEVOLUCIONES_INVALIDATE, useDevolucionForm } from "./hooks";

/** Devolución de cliente: se busca la venta por factura y se indican cantidades. */
export function DevolucionCreateScreen() {
  const router = useRouter();
  const form = useDevolucionForm();
  const { busy, run } = useActionRunner(DEVOLUCIONES_INVALIDATE);
  const v = form.venta;

  const save = async () => {
    let createdId: string | undefined;
    const ok = await run(async () => {
      createdId = (await form.submit()).id;
    });
    if (ok && createdId)
      router.replace(`/(app)/devoluciones/${createdId}` as Href);
  };

  return (
    <Screen>
      <Title subtitle="El cliente devuelve productos de una venta.">
        Nueva devolución
      </Title>
      <Field
        label="Número de factura"
        value={form.factura}
        onChange={form.setFactura}
        autoCapitalize="characters"
      />
      <ActionButton
        label="Cargar venta"
        busy={form.searching}
        disabled={!form.factura.trim()}
        onPress={() => void form.buscar()}
      />
      {form.lookupError ? <Line tone="error">{form.lookupError}</Line> : null}
      {v && (
        <>
          <Card>
            <Line bold>{v.numeroFactura}</Line>
            <Line>{`Cliente: ${v.clienteNombre || "Sin cliente"}`}</Line>
            <Line>{`Almacén: ${v.almacenNombre || "—"}`}</Line>
          </Card>
          <Heading>Cantidades a devolver</Heading>
          {v.items.map((i) => (
            <Card key={i.productoId}>
              <Line bold>{i.productoNombre}</Line>
              <Line tone="secondary">
                {`Vendidas ${i.cantidad} · devueltas ${i.cantidadYaDevuelta} · pendientes ${i.cantidadPendienteDevolver}`}
              </Line>
              {i.cantidadPendienteDevolver > 0 ? (
                <Field
                  label={`Devolver de ${i.productoNombre}`}
                  kind="int"
                  value={form.cantidades[i.productoId] ?? ""}
                  onChange={(t) => form.setCantidad(i.productoId, t)}
                />
              ) : (
                <Line tone="secondary">Ya se devolvió todo.</Line>
              )}
            </Card>
          ))}
          <Field
            label="Motivo (opcional)"
            value={form.motivo}
            onChange={form.setMotivo}
            multiline
          />
          {form.error ? <Line tone="error">{form.error}</Line> : null}
          <ActionButton
            label="Registrar devolución"
            variant="primary"
            busy={busy}
            disabled={!!form.error}
            confirm={{
              title: "Registrar devolución",
              message: `Se devolverán ${form.unidades} unidad(es) al inventario de ${v.almacenNombre || "la venta"}. ¿Continuar?`,
            }}
            onPress={() => void save()}
          />
        </>
      )}
    </Screen>
  );
}
