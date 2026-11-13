import { useAuthStore } from "@/admin/auth/store/auth-store";
import { addRepairPhoto } from "./adapters";
import { RepairPhotoModal } from "./repair-photo-modal";
import {
  useAssignForm,
  useDiagnosisForm,
  useEstimateForm,
  usePartForm,
  usePaymentForm,
  usePhotoState,
  useQaForm,
  useRepairDetailQuery,
  useRepairResourcesQuery,
  useRepairRunner,
  useWarrantyForm,
} from "./hooks";
import { DiagnosisSection } from "./components/diagnosis-section";
import { EstimateSection } from "./components/estimate-section";
import { PartsSection } from "./components/parts-section";
import { PaymentsSection } from "./components/payments-section";
import { PhotosSection } from "./components/photos-section";
import { PortalSection, TimelineSection } from "./components/portal-section";
import { QaSection } from "./components/qa-section";
import {
  RButton,
  RepairDetailProvider,
  RText,
} from "./components/repair-ui";
import { RepairSummary, StatusSection } from "./components/status-section";
import { WarrantiesSection } from "./components/warranties-section";
import { canAccess } from "@/core/permissions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";

export function RepairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = Colors[useColorScheme() ?? "light"];
  const user = useAuthStore((s) => s.user);
  const can = (p: string, module = "reparaciones") =>
    canAccess(user, module, p);
  const q = useRepairDetailQuery(id);
  const resources = useRepairResourcesQuery(can("reparaciones:ver"));
  const { busy, run } = useRepairRunner();
  // El estado de los formularios vive aquí para sobrevivir a cambios de sección.
  const assign = useAssignForm(id);
  const diagnosis = useDiagnosisForm(id);
  const estimate = useEstimateForm(id);
  const part = usePartForm(id);
  const qa = useQaForm(id);
  const payment = usePaymentForm(id, resources.data?.metodos);
  const warranty = useWarrantyForm(id);
  const photos = usePhotoState(id);
  const ctx = { id, c, can, busy, run };

  if (q.isError)
    return (
      <RepairDetailProvider value={ctx}>
        <View style={{ padding: 16 }}>
          <RText>{q.error.message}</RText>
          <RButton label="Reintentar" action={() => q.refetch()} />
        </View>
      </RepairDetailProvider>
    );
  if (q.isLoading || !q.data)
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  const o = q.data;
  const closed = ["CANCELLED", "DELIVERED", "NOT_REPAIRABLE"].includes(
    o.status,
  );
  const section = { order: o, closed, resources: resources.data };
  return (
    <RepairDetailProvider value={ctx}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 70 }}
      >
        <RepairSummary order={o} />
        <StatusSection
          {...section}
          resourcesError={resources.isError}
          onRetryResources={() => resources.refetch()}
          assign={assign}
        />
        <DiagnosisSection {...section} form={diagnosis} />
        <EstimateSection {...section} form={estimate} />
        <PartsSection {...section} form={part} />
        <QaSection order={o} form={qa} />
        <PaymentsSection {...section} form={payment} />
        <WarrantiesSection order={o} form={warranty} />
        <PhotosSection order={o} closed={closed} photos={photos} />
        <PortalSection order={o} />
        <TimelineSection order={o} />
        <RepairPhotoModal
          visible={photos.camera && can("reparaciones:editar")}
          tint={c.tint}
          onClose={() => photos.setCamera(false)}
          onCapture={(p) =>
            void run(() =>
              addRepairPhoto(
                id,
                p.base64,
                photos.publicPhoto ? "PUBLIC" : "INTERNAL",
              ),
            )
          }
        />
      </ScrollView>
    </RepairDetailProvider>
  );
}
