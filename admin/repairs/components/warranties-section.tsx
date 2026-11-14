import type { WarrantyForm } from "@/admin/repairs/hooks";
import { View } from "react-native";
import {
  RButton,
  RField,
  RHeading,
  RText,
  useRepairDetailCtx,
  type SectionProps,
} from "./repair-ui";

/** Creación de garantías y gestión de reclamos. */
export function WarrantiesSection({
  order: o,
  form,
}: Pick<SectionProps, "order"> & { form: WarrantyForm }) {
  const { can } = useRepairDetailCtx();
  if (!can("garantias:ver")) return null;
  return (
    <>
      <RHeading>Garantías</RHeading>
      {can("garantias:crear") &&
        ["READY_FOR_PICKUP", "DELIVERED"].includes(o.status) && (
          <>
            <RField
              label="Días"
              value={form.days}
              onChange={form.setDays}
              kind="int"
            />
            <RField
              label="Condiciones"
              value={form.terms}
              onChange={form.setTerms}
            />
            <RButton
              label="Crear garantía"
              action={form.create}
              disabled={form.invalid}
            />
          </>
        )}
      {(o.garantias ?? []).map((w) => (
        <View key={w.id} style={{ gap: 8 }}>
          <RText>{`${w.coverage} · ${w.expires_at}`}</RText>
          {can("garantias:editar") && (
            <>
              <RField
                label="Motivo de reclamo"
                value={form.reasons[w.id] ?? ""}
                onChange={(v) => form.setReason(w.id, v)}
              />
              <RButton
                label="Abrir reclamo"
                action={() => form.openClaim(w.id)}
                disabled={!form.reasons[w.id]?.trim()}
              />
              {(w.reclamos ?? []).map((claim) => (
                <View key={claim.id}>
                  <RText>{`${claim.reason} · ${claim.status}`}</RText>
                  {claim.status === "OPEN" && (
                    <>
                      <RButton
                        label="Resolver"
                        action={() => form.resolveClaim(claim.id, "RESOLVED")}
                      />
                      <RButton
                        label="Rechazar"
                        action={() => form.resolveClaim(claim.id, "REJECTED")}
                      />
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      ))}
    </>
  );
}
