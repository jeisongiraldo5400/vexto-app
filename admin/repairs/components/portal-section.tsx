import { repairAction } from "@/admin/repairs/adapters";
import { View } from "react-native";
import {
  RButton,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Enlace del portal del cliente y su renovación. */
export function PortalSection({ order: o }: Pick<SectionProps, "order">) {
  const { id, can } = useRepairDetailCtx();
  if (!can("reparaciones:compartir")) return null;
  return (
    <>
      <RHeading>Portal</RHeading>
      <RText>{o.trackingToken ?? ""}</RText>
      <RButton
        label="Revocar enlace anterior y renovar"
        action={() => repairAction(id, "portal/renovar")}
        confirm={{
          title: "Revocar enlace",
          message:
            "El enlace actual dejará de funcionar para el cliente. ¿Generar uno nuevo?",
        }}
      />
    </>
  );
}

/** Historial de eventos de la orden. */
export function TimelineSection({ order: o }: Pick<SectionProps, "order">) {
  return (
    <>
      <RHeading>Historial</RHeading>
      {(o.timeline ?? []).map((e) => (
        <View key={e.id}>
          <RText>{`${e.created_at} · ${e.title}`}</RText>
        </View>
      ))}
    </>
  );
}
