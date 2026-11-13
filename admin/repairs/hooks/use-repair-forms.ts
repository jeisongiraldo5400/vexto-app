import {
  addRepairNote,
  payRepair,
  readRepairPhoto,
  repairAction,
} from "@/admin/repairs/adapters";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { evaluarCobro, type MetodoCobro } from "@/admin/cash-register/cobro";
import { cajaHabilitada } from "@/core/caja/caja-guard";
import { apiFetch } from "@/core/http/api";
import { newIdempotencyIntent } from "@/core/http/idempotent";
import { parseCantidad, parseMonto } from "@/core/utils/money";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export const QA_ITEMS = [
  "Pantalla",
  "Carga",
  "Cámara",
  "Micrófono",
  "Parlante",
  "WiFi",
  "Bluetooth",
  "Biometría",
  "Batería",
];

/** Asignación de técnico. */
export function useAssignForm(id: string) {
  const [tech, setTech] = useState("");
  const assign = () =>
    repairAction(id, "tecnico", { technicianId: tech }, "PUT");
  return { tech, setTech, assign };
}
export type AssignForm = ReturnType<typeof useAssignForm>;

/** Diagnóstico interno + resumen para el cliente. */
export function useDiagnosisForm(id: string) {
  const [note, setNote] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const save = async () => {
    await addRepairNote(id, note, publicNote || undefined);
    setNote("");
    setPublicNote("");
  };
  return { note, setNote, publicNote, setPublicNote, save };
}
export type DiagnosisForm = ReturnType<typeof useDiagnosisForm>;

/** Reserva de repuestos. */
export function usePartForm(id: string) {
  const [product, setProduct] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [qty, setQty] = useState("1");
  const reserve = async () => {
    await repairAction(id, "repuestos", {
      productId: product,
      almacenId: warehouse,
      quantity: parseCantidad(qty),
    });
    setProduct("");
    setQty("1");
  };
  const invalid = !product || !warehouse || !(parseCantidad(qty) > 0);
  return {
    product,
    setProduct,
    warehouse,
    setWarehouse,
    qty,
    setQty,
    reserve,
    invalid,
  };
}
export type PartForm = ReturnType<typeof usePartForm>;

/** Checklist de control de calidad. */
export function useQaForm(id: string) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const toggle = (label: string, v: boolean) =>
    setChecks({ ...checks, [label]: v });
  const save = () =>
    repairAction(id, "qa", {
      passed: QA_ITEMS.every((l) => checks[l]),
      items: QA_ITEMS.map((label) => ({ label, passed: !!checks[label] })),
    });
  return { checks, toggle, save };
}
export type QaForm = ReturnType<typeof useQaForm>;

/**
 * Registro de abonos con intención idempotente. Con el módulo caja, un método en
 * efectivo (`metodos`) admite el monto recibido para calcular el cambio.
 */
export function usePaymentForm(id: string, metodos: MetodoCobro[] = []) {
  const conCaja = cajaHabilitada(useAuthStore((s) => s.user));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [received, setReceived] = useState("");
  /** Intención del abono en curso: igual en reintentos, nueva tras el éxito. */
  const payIntent = useRef<string | null>(null);
  const monto = parseMonto(amount);
  const cobro = evaluarCobro(
    conCaja ? metodos.find((m) => m.id === method) : undefined,
    monto,
    received,
  );
  const pay = async () => {
    payIntent.current ??= newIdempotencyIntent();
    await payRepair(
      id,
      {
        monto,
        metodoPagoId: method,
        ...(cobro.montoRecibido != null
          ? { montoRecibido: cobro.montoRecibido }
          : {}),
      },
      payIntent.current,
    );
    payIntent.current = null;
    setAmount("");
    setReceived("");
  };
  const revert = (pagoId: string) =>
    repairAction(id, `pagos/${pagoId}/cancelar`);
  const invalid = !method || !(monto > 0) || !!cobro.error;
  return {
    amount,
    setAmount,
    method,
    setMethod,
    received,
    setReceived,
    cobro,
    pay,
    revert,
    invalid,
  };
}
export type PaymentForm = ReturnType<typeof usePaymentForm>;

/** Creación de garantías y reclamos. */
export function useWarrantyForm(id: string) {
  const [days, setDays] = useState("90");
  const [terms, setTerms] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const create = async () => {
    await repairAction(id, "garantias", {
      startsAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + parseCantidad(days) * 86400000,
      ).toISOString(),
      terms,
    });
    setDays("90");
    setTerms("");
  };
  const setReason = (warrantyId: string, v: string) =>
    setReasons((prev) => ({ ...prev, [warrantyId]: v }));
  const openClaim = async (warrantyId: string) => {
    await apiFetch(`reparaciones/garantias/${warrantyId}/reclamos`, {
      method: "POST",
      body: { reason: reasons[warrantyId] },
    });
    setReasons((prev) => ({ ...prev, [warrantyId]: "" }));
  };
  const resolveClaim = (claimId: string, status: "RESOLVED" | "REJECTED") =>
    repairAction(id, `reclamos/${claimId}`, { status }, "PUT");
  const invalid = !(parseCantidad(days) > 0);
  return {
    days,
    setDays,
    terms,
    setTerms,
    reasons,
    setReason,
    create,
    openClaim,
    resolveClaim,
    invalid,
  };
}
export type WarrantyForm = ReturnType<typeof useWarrantyForm>;

/** Cámara, visibilidad y lectura de evidencias (la lectura no invalida queries). */
export function usePhotoState(id: string) {
  const [camera, setCamera] = useState(false);
  const [image, setImage] = useState("");
  const [publicPhoto, setPublicPhoto] = useState(false);
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const viewPhoto = async (photoId: string) => {
    setPhotoLoading(photoId);
    try {
      const photo = await readRepairPhoto(id, photoId);
      setImage(`data:${photo.mime};base64,${photo.base64}`);
    } catch (e) {
      Alert.alert(
        "No se pudo cargar la foto",
        e instanceof Error ? e.message : "Intenta nuevamente",
      );
    } finally {
      setPhotoLoading(null);
    }
  };
  return {
    camera,
    setCamera,
    image,
    publicPhoto,
    setPublicPhoto,
    photoLoading,
    viewPhoto,
  };
}
export type PhotoState = ReturnType<typeof usePhotoState>;
