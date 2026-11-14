import { NuevoClienteModal } from "@/admin/sales/components/nuevo-cliente-modal";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { ChoiceField } from "./choice-field";
import { useRepairResourcesQuery } from "./hooks";
import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";
import { canAccess } from "@/core/permissions";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from "react-native";

export function RepairIntakeScreen() {
  const c = Colors[useColorScheme() ?? "light"];
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const q = useRepairResourcesQuery(
    canAccess(user, "reparaciones", "reparaciones:crear"),
  );
  const [client, setClient] = useState("");
  const [device, setDevice] = useState("");
  const [type, setType] = useState("");
  const [serial, setSerial] = useState("");
  const [issue, setIssue] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [newClient, setNewClient] = useState(false);
  const [checklist, setChecklist] = useState(
    ["Carcasa", "Encendido", "Puertos", "Accesorios"].map((label) => ({
      label,
      result: "NOT_TESTED",
    })),
  );
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert(
        "No se pudo recibir",
        e instanceof Error ? e.message : "Reintenta",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (q.isLoading) return <ActivityIndicator />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "700" }}>
        Recibir equipo
      </Text>
      {q.isError && (
        <Pressable onPress={() => void q.refetch()}>
          <Text style={{ color: c.error }}>
            No se cargaron catálogos. Reintentar
          </Text>
        </Pressable>
      )}
      {canAccess(user, "clientes", "clientes:crear") && (
        <Pressable onPress={() => setNewClient(true)}>
          <Text style={{ color: c.tint }}>Nuevo cliente</Text>
        </Pressable>
      )}
      <ChoiceField
        label="Cliente"
        value={client}
        onChange={(v) => {
          setClient(v);
          setDevice("");
        }}
        options={q.data?.clientes ?? []}
      />
      <ChoiceField
        label="Equipo"
        value={device}
        onChange={setDevice}
        options={(q.data?.equipos ?? [])
          .filter((d) => d.customer_id === client)
          .map((d) => ({
            id: d.id,
            nombre: d.imei ?? d.serial_number ?? d.id,
          }))}
      />
      {canAccess(user, "reparaciones", "equipos:crear") && (
        <>
          <ChoiceField
            label="Tipo para equipo nuevo"
            value={type}
            onChange={setType}
            options={q.data?.tipos ?? []}
          />
          <TextInput
            placeholder="IMEI / serial"
            placeholderTextColor={c.textSecondary}
            value={serial}
            onChangeText={setSerial}
            style={{
              color: c.text,
              borderWidth: 1,
              borderColor: c.cardBorder,
              padding: 12,
            }}
          />
          <Pressable
            disabled={busy || !client || !type}
            onPress={() =>
              void run(async () => {
                const d = await apiFetch<{ id: string }>("equipos", {
                  method: "POST",
                  body: {
                    customerId: client,
                    deviceTypeId: type,
                    serialNumber: serial || undefined,
                  },
                });
                setDevice(d.id);
                await q.refetch();
              })
            }
          >
            <Text style={{ color: c.tint }}>Registrar equipo</Text>
          </Pressable>
        </>
      )}
      <ChoiceField
        label="Prioridad"
        value={priority}
        onChange={setPriority}
        options={["NORMAL", "HIGH", "URGENT"].map((id) => ({ id, nombre: id }))}
      />
      <TextInput
        placeholder="Problema reportado"
        placeholderTextColor={c.textSecondary}
        multiline
        value={issue}
        onChangeText={setIssue}
        style={{
          color: c.text,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: 12,
        }}
      />
      {checklist.map((item, index) => (
        <ChoiceField
          key={item.label}
          label={item.label}
          value={item.result}
          onChange={(value) =>
            setChecklist(
              checklist.map((c, i) =>
                i === index ? { ...c, result: value } : c,
              ),
            )
          }
          options={[
            { id: "OK", nombre: "Correcto" },
            { id: "DAMAGED", nombre: "Dañado" },
            { id: "NOT_TESTED", nombre: "No probado" },
            { id: "NOT_APPLICABLE", nombre: "No aplica" },
          ]}
        />
      ))}
      <Pressable
        disabled={busy || !client || !device || !issue.trim()}
        onPress={() =>
          void run(async () => {
            const order = await postIdempotent<{ id: string }>("reparaciones", {
              customerId: client,
              deviceId: device,
              reportedIssue: issue,
              priority,
              checklist,
            });
            await qc.invalidateQueries({ queryKey: ["reparaciones"] });
            router.replace(`/(app)/reparacion/${order.id}` as Href);
          })
        }
        style={{ padding: 16, backgroundColor: c.tint, borderRadius: 8 }}
      >
        <Text style={{ color: c.onPrimary }}>
          {busy ? "Guardando…" : "Recibir equipo"}
        </Text>
      </Pressable>
      <NuevoClienteModal
        visible={newClient}
        tint={c.tint}
        onPrimary={c.onPrimary}
        onClose={() => setNewClient(false)}
        onCreated={(client) => {
          setClient(client.id);
          setNewClient(false);
          void q.refetch();
        }}
      />
    </ScrollView>
  );
}
