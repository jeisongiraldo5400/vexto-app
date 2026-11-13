import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { ChoiceField } from "@/admin/repairs/choice-field";
import { apiFetch } from "@/core/http/api";
import { MontoInput } from "@/components/ui/monto-input";
import {
  newIdempotencyIntent,
  postIdempotent,
} from "@/core/http/idempotent";
import { formatCurrency } from "@/core/format";
import { canAccess } from "@/core/permissions";
import { toLocalYmd } from "@/core/utils/date";
import { formatMontoInput, parseMonto } from "@/core/utils/money";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";

type Expense = {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  categoriaId?: string;
  metodoPagoId?: string;
  observaciones?: string;
};
export function ExpensesScreen() {
  const c = Colors[useColorScheme() ?? "light"];
  const user = useAuthStore((s) => s.user);
  const empresa = useAuthStore((s) => s.empresaId);
  const can = (p: string) => canAccess(user, "finanzas", p);
  const sessionEnabled = useSessionQueryEnabled();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["gastos", empresa, page, search],
    queryFn: () =>
      apiFetch<{ gastos: Expense[]; total: number }>(
        `gastos?page=${page}&limit=20&busqueda=${encodeURIComponent(search)}`,
      ),
    enabled: sessionEnabled && can("gastos:ver"),
  });
  const categories = useQuery({
    queryKey: ["categorias-gasto", empresa],
    queryFn: () =>
      apiFetch<{ categorias: { id: string; nombre: string }[] }>(
        "categorias-gasto?page=1&limit=100",
      ),
    enabled: sessionEnabled && (can("gastos:crear") || can("gastos:editar")),
  });
  const methods = useQuery({
    queryKey: ["expense-methods", empresa],
    queryFn: () => apiFetch<{ id: string; nombre: string }[]>("metodos-pago"),
    enabled: sessionEnabled && (can("gastos:crear") || can("gastos:editar")),
  });
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const pending = useRef(false);
  const createIntent = useRef("");
  const scroll = useRef<ScrollViewInstance>(null);
  const [busy, setBusy] = useState(false);
  const open = (e: Expense | null) => {
    if (!e) createIntent.current = newIdempotencyIntent();
    setEditing(e);
    setConcept(e?.concepto ?? "");
    setAmount(e ? formatMontoInput(Number(e.monto)) : "");
    setDate(e?.fecha?.slice(0, 10) ?? toLocalYmd());
    setCategory(e?.categoriaId ?? "");
    setMethod(e?.metodoPagoId ?? "");
    setNotes(e?.observaciones ?? "");
    // El formulario se muestra arriba de la lista: llevarlo a la vista.
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const run = async (fn: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await fn();
      const { data } = await q.refetch();
      setEditing(undefined);
      // Si se borró el último ítem de la página, volver a la anterior.
      if (page > 1 && data && data.gastos.length === 0) setPage(page - 1);
    } catch (e) {
      Alert.alert(
        "No se pudo guardar",
        e instanceof Error ? e.message : "Reintenta",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const button = (label: string, fn: () => void) => (
    <Pressable
      disabled={busy}
      onPress={fn}
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: c.tint,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: c.tint }}>{label}</Text>
    </Pressable>
  );
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
  ) => (
    <TextInput
      placeholder={label}
      accessibilityLabel={label}
      placeholderTextColor={c.textSecondary}
      value={value}
      onChangeText={set}
      style={{
        color: c.text,
        borderWidth: 1,
        borderColor: c.cardBorder,
        padding: 12,
      }}
    />
  );
  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 70 }}
    >
      <Text style={{ color: c.text, fontSize: 24, fontWeight: "700" }}>
        Gastos
      </Text>
      {field("Buscar", search, (v) => {
        setSearch(v);
        setPage(1);
      })}
      {can("gastos:crear") && button("Nuevo gasto", () => open(null))}
      {editing !== undefined &&
        can(editing ? "gastos:editar" : "gastos:crear") && (
          <>
            <Text style={{ color: c.text, fontSize: 20 }}>
              {editing ? "Editar" : "Nuevo"} gasto
            </Text>
            {field("Concepto", concept, setConcept)}
            <MontoInput
              placeholder="Monto"
              accessibilityLabel="Monto"
              placeholderTextColor={c.textSecondary}
              value={amount}
              onChangeText={setAmount}
              style={{
                color: c.text,
                borderWidth: 1,
                borderColor: c.cardBorder,
                padding: 12,
              }}
            />
            {field("Fecha AAAA-MM-DD", date, setDate)}
            <ChoiceField
              label="Categoría"
              value={category}
              onChange={setCategory}
              options={categories.data?.categorias ?? []}
            />
            <ChoiceField
              label="Método de pago"
              value={method}
              onChange={setMethod}
              options={methods.data ?? []}
            />
            {field("Observaciones", notes, setNotes)}
            {button("Guardar", () => {
              const monto = parseMonto(amount);
              if (
                !concept.trim() ||
                !Number.isFinite(monto) ||
                monto <= 0 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(date)
              ) {
                Alert.alert("Revisa concepto, monto y fecha");
                return;
              }
              const body = {
                concepto: concept.trim(),
                monto,
                fecha: date,
                categoriaId: category || undefined,
                metodoPagoId: method || undefined,
                observaciones: notes || undefined,
              };
              void run(() =>
                editing
                  ? apiFetch(`gastos/${editing.id}`, { method: "PUT", body })
                  : postIdempotent("gastos", body, createIntent.current),
              );
            })}
            {button("Cancelar", () => setEditing(undefined))}
          </>
        )}
      {q.isLoading && <ActivityIndicator />}
      {q.isError &&
        button("Reintentar: " + q.error.message, () => void q.refetch())}
      {(q.data?.gastos ?? []).map((e) => (
        <View
          key={e.id}
          style={{
            padding: 14,
            gap: 10,
            borderWidth: 1,
            borderColor: c.cardBorder,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: c.text }}>
            {e.concepto} · {formatCurrency(Number(e.monto))} · {e.fecha?.slice(0, 10)}
          </Text>
          {can("gastos:editar") && button("Editar", () => open(e))}
          {can("gastos:eliminar") &&
            button("Eliminar", () =>
              Alert.alert("Eliminar gasto", e.concepto, [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: () =>
                    void run(() =>
                      apiFetch(`gastos/${e.id}`, { method: "DELETE" }),
                    ),
                },
              ]),
            )}
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {page > 1 && button("Anterior", () => setPage(page - 1))}
        <Text style={{ color: c.text }}>Página {page}</Text>
        {page * 20 < (q.data?.total ?? 0) &&
          button("Siguiente", () => setPage(page + 1))}
      </View>
    </ScrollView>
  );
}
