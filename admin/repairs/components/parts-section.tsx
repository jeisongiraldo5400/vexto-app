import { partAction } from "@/admin/repairs/adapters";
import { ChoiceField } from "@/admin/repairs/choice-field";
import type { PartForm } from "@/admin/repairs/hooks";
import { View } from "react-native";
import {
  RButton,
  RField,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Reserva, consumo y devolución de repuestos. */
export function PartsSection({
  order: o,
  closed,
  resources,
  form,
}: SectionProps & { form: PartForm }) {
  const { can } = useRepairDetailCtx();
  if (!can("inventario:editar", "inventario")) return null;
  return (
    <>
      <RHeading>Repuestos</RHeading>
      {can("reparaciones:editar") && !closed && (
        <>
          <ChoiceField
            label="Producto"
            value={form.product}
            onChange={form.setProduct}
            options={resources?.productos ?? []}
          />
          <ChoiceField
            label="Almacén"
            value={form.warehouse}
            onChange={form.setWarehouse}
            options={resources?.almacenes ?? []}
          />
          <RField
            label="Cantidad"
            value={form.qty}
            onChange={form.setQty}
            kind="int"
          />
          <RButton
            label="Reservar"
            action={form.reserve}
            disabled={form.invalid}
          />
        </>
      )}
      {(o.partes ?? []).map((p) => (
        <View key={p.id} style={{ gap: 8 }}>
          <RText>{`${p.status} · ${p.quantity}`}</RText>
          {can("reparaciones:editar") && (
            <>
              {p.status === "RESERVED" && !closed && (
                <RButton
                  label="Consumir"
                  action={() => partAction(p.id, "consumir")}
                />
              )}
              {p.status !== "RETURNED" && (
                <RButton
                  label="Devolver"
                  action={() => partAction(p.id, "devolver")}
                  confirm={{
                    title: "Devolver repuesto",
                    message: `¿Devolver ${p.quantity} unidad(es) al inventario?`,
                  }}
                />
              )}
            </>
          )}
        </View>
      ))}
    </>
  );
}
