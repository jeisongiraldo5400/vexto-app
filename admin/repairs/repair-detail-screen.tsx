import { useAuthStore } from "@/admin/auth/store/auth-store";
import {
  addRepairNote,
  addRepairPhoto,
  changeRepairStatus,
  estimateAction,
  fetchRepairResources,
  partAction,
  readRepairPhoto,
  repairAction,
} from "./adapters";
import { RepairPhotoModal } from "./repair-photo-modal";
import { ChoiceField } from "./choice-field";
import { useRepairDetailQuery } from "./hooks";
import { canAccess } from "@/core/permissions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "@/core/http/api";

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
const QA = [
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
export function RepairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = Colors[useColorScheme() ?? "light"];
  const user = useAuthStore((s) => s.user);
  const empresa = useAuthStore((s) => s.empresaId);
  const can = (p: string, module = "reparaciones") =>
    canAccess(user, module, p);
  const q = useRepairDetailQuery(id);
  const qc = useQueryClient();
  const resources = useQuery({
    queryKey: ["repair-resources", empresa],
    queryFn: fetchRepairResources,
    enabled: can("reparaciones:ver"),
  });
  const r = resources.data;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [camera, setCamera] = useState(false);
  const [image, setImage] = useState("");
  const [publicPhoto, setPublicPhoto] = useState(false);
  const [tech, setTech] = useState("");
  const [lines, setLines] = useState([
    { type: "LABOR", description: "Mano de obra", quantity: 1, unitPrice: 0 },
  ]);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [product, setProduct] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [qty, setQty] = useState("1");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [days, setDays] = useState("90");
  const [terms, setTerms] = useState("");
  const [reason, setReason] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["reparaciones"] });
    } catch (e) {
      Alert.alert(
        "No se pudo completar",
        e instanceof Error ? e.message : "Intenta nuevamente",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const text = (value: string) => (
    <Text style={{ color: c.text }}>{value}</Text>
  );
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    numeric = false,
  ) => (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={c.textSecondary}
      value={value}
      onChangeText={set}
      keyboardType={numeric ? "decimal-pad" : "default"}
      style={{
        color: c.text,
        borderWidth: 1,
        borderColor: c.cardBorder,
        borderRadius: 8,
        padding: 12,
      }}
    />
  );
  const button = (
    label: string,
    fn: () => Promise<unknown>,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={() => void run(fn)}
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: c.tint,
        borderRadius: 8,
        opacity: busy || disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: c.tint, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  const heading = (label: string) => (
    <Text
      style={{ color: c.text, fontSize: 20, fontWeight: "700", marginTop: 18 }}
    >
      {label}
    </Text>
  );
  if (q.isError)
    return (
      <View style={{ padding: 16 }}>
        {text(q.error.message)}
        {button("Reintentar", () => q.refetch())}
      </View>
    );
  if (q.isLoading || !q.data)
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  const o = q.data;
  const closed = ["CANCELLED", "DELIVERED", "NOT_REPAIRABLE"].includes(
    o.status,
  );
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 70 }}
    >
      {heading(o.orderNumber)}
      {text(`${o.status} · ${o.priority}`)}
      {text(o.reportedIssue ?? "")}
      {text(`Cliente: ${o.cliente?.nombre ?? o.customerId}`)}
      {text(
        `Equipo: ${o.equipo?.imei ?? o.equipo?.serial_number ?? o.deviceId}`,
      )}
      {(o.checklist ?? []).map((item, i) => (
        <View key={i}>{text(`${item.label}: ${item.result}`)}</View>
      ))}
      {(NEXT[o.status] ?? []).map((status) => {
        const permission =
          status === "CANCELLED"
            ? "reparaciones:cancelar"
            : status === "DELIVERED"
              ? "reparaciones:entregar"
              : "reparaciones:editar";
        return can(permission) ? (
          <View key={status}>
            {button(status, () => changeRepairStatus(id, status))}
          </View>
        ) : null;
      })}
      {resources.isError &&
        button("Reintentar catálogos", () => resources.refetch())}
      {can("reparaciones:asignar") && !closed && (
        <>
          <ChoiceField
            label="Técnico"
            value={tech}
            onChange={setTech}
            options={r?.tecnicos ?? []}
          />
          {button(
            "Asignar",
            () => repairAction(id, "tecnico", { technicianId: tech }, "PUT"),
            !tech,
          )}
        </>
      )}
      {heading("Diagnóstico")}
      {(o.diagnosticos ?? []).map((d) => (
        <View key={d.id}>{text(d.technical_diagnosis ?? "")}</View>
      ))}
      {can("reparaciones:diagnosticar") && !closed && (
        <>
          {field("Diagnóstico interno", note, setNote)}
          {field("Resumen para cliente", publicNote, setPublicNote)}
          {button(
            "Guardar diagnóstico",
            async () => {
              await addRepairNote(id, note, publicNote || undefined);
              setNote("");
              setPublicNote("");
            },
            !note.trim(),
          )}
        </>
      )}
      {can("cotizaciones:ver") && (
        <>
          {heading("Cotizaciones")}
          {(o.cotizaciones ?? []).map((e) => (
            <View key={e.id} style={{ gap: 8 }}>
              {text(`${e.status} · $${e.total}`)}
              {(e.items ?? []).map((line, i) => (
                <View key={i}>
                  {text(
                    `${line.description}: ${line.quantity} × ${line.unit_price}`,
                  )}
                </View>
              ))}
              {e.status === "DRAFT" &&
                can("cotizaciones:editar") &&
                !closed && (
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      setEditingEstimate(e.id);
                      setLines(
                        (e.items ?? []).map((l) => ({
                          type: l.type ?? "LABOR",
                          description: l.description,
                          quantity: Number(l.quantity),
                          unitPrice: Number(l.unit_price),
                        })),
                      );
                      setDiscount(String(e.discount ?? 0));
                      setTax(String(e.tax ?? 0));
                    }}
                  >
                    {text("Editar borrador")}
                  </Pressable>
                )}
              {e.status === "DRAFT" &&
                can("cotizaciones:enviar") &&
                button("Enviar", () => estimateAction(e.id, "enviar"))}
              {e.status === "SENT" &&
                can("cotizaciones:aprobar") &&
                button("Registrar aprobación", () =>
                  estimateAction(e.id, "aprobar"),
                )}
            </View>
          ))}
          {(editingEstimate
            ? can("cotizaciones:editar")
            : can("cotizaciones:crear")) &&
            !closed &&
            !o.cotizaciones?.some((e) => e.status === "APPROVED") && (
              <>
                {lines.map((line, i) => (
                  <View key={i} style={{ gap: 8 }}>
                    <ChoiceField
                      label="Tipo"
                      value={line.type}
                      onChange={(v) =>
                        setLines(
                          lines.map((l, n) =>
                            i === n ? { ...l, type: v } : l,
                          ),
                        )
                      }
                      options={["LABOR", "PART", "SERVICE", "OTHER"].map(
                        (id) => ({ id, nombre: id }),
                      )}
                    />
                    {field("Concepto", line.description, (v) =>
                      setLines(
                        lines.map((l, n) =>
                          i === n ? { ...l, description: v } : l,
                        ),
                      ),
                    )}
                    {field(
                      "Cantidad",
                      String(line.quantity),
                      (v) =>
                        setLines(
                          lines.map((l, n) =>
                            i === n ? { ...l, quantity: Number(v) } : l,
                          ),
                        ),
                      true,
                    )}
                    {field(
                      "Precio",
                      String(line.unitPrice),
                      (v) =>
                        setLines(
                          lines.map((l, n) =>
                            i === n ? { ...l, unitPrice: Number(v) } : l,
                          ),
                        ),
                      true,
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setLines([
                      ...lines,
                      {
                        type: "SERVICE",
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                      },
                    ])
                  }
                >
                  {text("Agregar concepto")}
                </Pressable>
                {field("Descuento", discount, setDiscount, true)}
                {field("Impuesto", tax, setTax, true)}
                {button(
                  "Guardar borrador",
                  () =>
                    editingEstimate
                      ? apiFetch(
                          `reparaciones/cotizaciones/${editingEstimate}`,
                          {
                            method: "PUT",
                            body: {
                              items: lines,
                              discount: Number(discount),
                              tax: Number(tax),
                            },
                          },
                        ).then((result) => {
                          setEditingEstimate(null);
                          return result;
                        })
                      : repairAction(id, "cotizaciones", {
                          items: lines,
                          discount: Number(discount),
                          tax: Number(tax),
                        }),
                  lines.some(
                    (l) =>
                      !l.description.trim() ||
                      l.quantity <= 0 ||
                      l.unitPrice < 0,
                  ),
                )}
              </>
            )}
        </>
      )}
      {can("inventario:editar", "inventario") && (
        <>
          {heading("Repuestos")}
          {can("reparaciones:editar") && !closed && (
            <>
              <ChoiceField
                label="Producto"
                value={product}
                onChange={setProduct}
                options={r?.productos ?? []}
              />
              <ChoiceField
                label="Almacén"
                value={warehouse}
                onChange={setWarehouse}
                options={r?.almacenes ?? []}
              />
              {field("Cantidad", qty, setQty, true)}
              {button(
                "Reservar",
                () =>
                  repairAction(id, "repuestos", {
                    productId: product,
                    almacenId: warehouse,
                    quantity: Number(qty),
                  }),
                !product || !warehouse || Number(qty) <= 0,
              )}
            </>
          )}
          {(o.partes ?? []).map((p) => (
            <View key={p.id} style={{ gap: 8 }}>
              {text(`${p.status} · ${p.quantity}`)}
              {can("reparaciones:editar") && (
                <>
                  {p.status === "RESERVED" &&
                    !closed &&
                    button("Consumir", () => partAction(p.id, "consumir"))}
                  {p.status !== "RETURNED" &&
                    button("Devolver", () => partAction(p.id, "devolver"))}
                </>
              )}
            </View>
          ))}
        </>
      )}
      {heading("QA")}
      {(o.qa ?? []).map((q) => (
        <View key={q.id}>{text(q.passed ? "Aprobado" : "Rechazado")}</View>
      ))}
      {can("reparaciones:completar") && o.status === "QUALITY_CONTROL" && (
        <>
          {QA.map((label) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {text(label)}
              <Switch
                value={checks[label] ?? false}
                onValueChange={(v) => setChecks({ ...checks, [label]: v })}
              />
            </View>
          ))}
          {button("Guardar QA", () =>
            repairAction(id, "qa", {
              passed: QA.every((l) => checks[l]),
              items: QA.map((label) => ({ label, passed: !!checks[label] })),
            }),
          )}
        </>
      )}
      {can("pagos:ver", "pagos") && (
        <>
          {heading("Cobros")}
          {text(
            `Total: ${o.saldo?.total ?? "Sin aprobar"} · Pagado: ${o.saldo?.pagado ?? 0} · Saldo: ${o.saldo?.pendiente ?? "—"}`,
          )}
          {(o.pagos ?? []).map((p) => (
            <View key={p.id}>
              {text(`$${p.monto} · ${p.estado}`)}
              {can("pagos:editar", "pagos") &&
                p.estado === "completado" &&
                button("Revertir pago", () =>
                  repairAction(id, `pagos/${p.id}/cancelar`),
                )}
            </View>
          ))}
          {can("pagos:crear", "pagos") && !closed && (
            <>
              <ChoiceField
                label="Método"
                value={method}
                onChange={setMethod}
                options={r?.metodos ?? []}
              />
              {field("Monto", amount, setAmount, true)}
              {button(
                "Registrar pago",
                () =>
                  repairAction(id, "pagos", {
                    monto: Number(amount),
                    metodoPagoId: method,
                  }),
                !method || Number(amount) <= 0,
              )}
            </>
          )}
        </>
      )}
      {can("garantias:ver") && (
        <>
          {heading("Garantías")}
          {can("garantias:crear") &&
            ["READY_FOR_PICKUP", "DELIVERED"].includes(o.status) && (
              <>
                {field("Días", days, setDays, true)}
                {field("Condiciones", terms, setTerms)}
                {button(
                  "Crear garantía",
                  () =>
                    repairAction(id, "garantias", {
                      startsAt: new Date().toISOString(),
                      expiresAt: new Date(
                        Date.now() + Number(days) * 86400000,
                      ).toISOString(),
                      terms,
                    }),
                  Number(days) <= 0,
                )}
              </>
            )}
          {(o.garantias ?? []).map((w) => (
            <View key={w.id} style={{ gap: 8 }}>
              {text(`${w.coverage} · ${w.expires_at}`)}
              {can("garantias:editar") && (
                <>
                  {field("Motivo de reclamo", reason, setReason)}
                  {button(
                    "Abrir reclamo",
                    () =>
                      apiFetch(`reparaciones/garantias/${w.id}/reclamos`, {
                        method: "POST",
                        body: { reason },
                      }),
                    !reason.trim(),
                  )}
                  {(w.reclamos ?? []).map((claim) => (
                    <View key={claim.id}>
                      {text(`${claim.reason} · ${claim.status}`)}
                      {claim.status === "OPEN" && (
                        <>
                          {button("Resolver", () =>
                            repairAction(
                              id,
                              `reclamos/${claim.id}`,
                              { status: "RESOLVED" },
                              "PUT",
                            ),
                          )}
                          {button("Rechazar", () =>
                            repairAction(
                              id,
                              `reclamos/${claim.id}`,
                              { status: "REJECTED" },
                              "PUT",
                            ),
                          )}
                        </>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          ))}
        </>
      )}
      {heading("Evidencias")}
      {can("reparaciones:editar") && !closed && (
        <>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {text("Publicar foto para cliente")}
            <Switch value={publicPhoto} onValueChange={setPublicPhoto} />
          </View>
          <Pressable disabled={busy} onPress={() => setCamera(true)}>
            {text("Tomar foto")}
          </Pressable>
        </>
      )}
      {(o.fotos ?? []).map((f) => (
        <View key={f.id}>
          {button("Ver foto · " + f.visibility, async () => {
            const photo = await readRepairPhoto(id, f.id);
            setImage(`data:${photo.mime};base64,${photo.base64}`);
          })}
        </View>
      ))}
      {image && (
        <Image
          source={{ uri: image }}
          style={{ height: 300, resizeMode: "contain" }}
        />
      )}
      {can("reparaciones:compartir") && (
        <>
          {heading("Portal")}
          {text(o.trackingToken ?? "")}
          {button("Revocar enlace anterior y renovar", () =>
            repairAction(id, "portal/renovar"),
          )}
        </>
      )}
      {heading("Historial")}
      {(o.timeline ?? []).map((e) => (
        <View key={e.id}>{text(`${e.created_at} · ${e.title}`)}</View>
      ))}
      <RepairPhotoModal
        visible={camera && can("reparaciones:editar")}
        tint={c.tint}
        onClose={() => setCamera(false)}
        onCapture={(p) =>
          void run(() =>
            addRepairPhoto(id, p.base64, publicPhoto ? "PUBLIC" : "INTERNAL"),
          )
        }
      />
    </ScrollView>
  );
}
