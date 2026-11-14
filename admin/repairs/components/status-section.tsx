import { changeRepairStatus } from "@/admin/repairs/adapters";
import { ChoiceField } from "@/admin/repairs/choice-field";
import type { AssignForm } from "@/admin/repairs/hooks";
import { View } from "react-native";
import {
  RButton,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

const NEXT: Record<string, string[]> = {
  RECEIVED: ["PENDING_DIAGNOSIS", "CANCELLED"],
  PENDING_DIAGNOSIS: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_CUSTOMER_APPROVAL", "NOT_REPAIRABLE", "CANCELLED"],
  WAITING_CUSTOMER_APPROVAL: ["CANCELLED", "NOT_REPAIRABLE"],
  APPROVED: ["READY_FOR_REPAIR", "WAITING_PART", "CANCELLED"],
  WAITING_PART: ["READY_FOR_REPAIR", "CANCELLED"],
  READY_FOR_REPAIR: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["QUALITY_CONTROL", "WAITING_PART", "CANCELLED"],
  QUALITY_CONTROL: ["READY_FOR_PICKUP", "IN_REPAIR"],
  READY_FOR_PICKUP: ["DELIVERED"],
  DELIVERED: ["WARRANTY_RETURN"],
  WARRANTY_RETURN: ["PENDING_DIAGNOSIS", "DIAGNOSING"],
};

const statusPermission = (status: string) =>
  status === "CANCELLED"
    ? "reparaciones:cancelar"
    : status === "DELIVERED"
      ? "reparaciones:entregar"
      : "reparaciones:editar";

/** Encabezado de la orden y checklist de recepción. */
export function RepairSummary({ order: o }: Pick<SectionProps, "order">) {
  return (
    <>
      <RHeading>{o.orderNumber}</RHeading>
      <RText>{`${o.status} · ${o.priority}`}</RText>
      <RText>{o.reportedIssue ?? ""}</RText>
      <RText>{`Cliente: ${o.cliente?.nombre ?? o.customerId}`}</RText>
      <RText>
        {`Equipo: ${o.equipo?.imei ?? o.equipo?.serial_number ?? o.deviceId}`}
      </RText>
      {(o.checklist ?? []).map((item, i) => (
        <View key={i}>
          <RText>{`${item.label}: ${item.result}`}</RText>
        </View>
      ))}
    </>
  );
}

/** Transiciones de estado permitidas y asignación de técnico. */
export function StatusSection({
  order: o,
  closed,
  resources,
  resourcesError,
  onRetryResources,
  assign,
}: SectionProps & {
  resourcesError: boolean;
  onRetryResources: () => Promise<unknown>;
  assign: AssignForm;
}) {
  const { id, can } = useRepairDetailCtx();
  return (
    <>
      {(NEXT[o.status] ?? []).map((status) =>
        can(statusPermission(status)) ? (
          <View key={status}>
            <RButton
              label={status}
              action={() => changeRepairStatus(id, status)}
              confirm={
                status === "CANCELLED" || status === "DELIVERED"
                  ? {
                      title:
                        status === "CANCELLED"
                          ? "Cancelar orden"
                          : "Entregar equipo",
                      message: `¿Cambiar la orden ${o.orderNumber} a ${status}? Esta acción cierra la orden.`,
                    }
                  : undefined
              }
            />
          </View>
        ) : null,
      )}
      {resourcesError && (
        <RButton label="Reintentar catálogos" action={onRetryResources} />
      )}
      {can("reparaciones:asignar") && !closed && (
        <>
          <ChoiceField
            label="Técnico"
            value={assign.tech}
            onChange={assign.setTech}
            options={resources?.tecnicos ?? []}
          />
          <RButton
            label="Asignar"
            action={assign.assign}
            disabled={!assign.tech}
          />
        </>
      )}
    </>
  );
}
