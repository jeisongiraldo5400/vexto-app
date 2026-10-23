import { repairAction, type RepairDetail } from "@/admin/repairs/adapters";
import { apiFetch } from "@/core/http/api";
import {
  formatMontoInput,
  parseCantidad,
  parseMonto,
} from "@/core/utils/money";
import { useState } from "react";

export type EstimateLine = {
  type: string;
  description: string;
  /** Texto crudo del input; se interpreta al enviar. */
  quantity: string;
  unitPrice: string;
};
type Estimate = NonNullable<RepairDetail["cotizaciones"]>[number];

const DEFAULT_LINES: EstimateLine[] = [
  { type: "LABOR", description: "Mano de obra", quantity: "1", unitPrice: "0" },
];
/** Monto opcional: vacío cuenta como 0; texto inválido → NaN. */
const optionalMonto = (text: string) => (text.trim() ? parseMonto(text) : 0);

/** Borrador de cotización (crear o editar) y su guardado. */
export function useEstimateForm(id: string) {
  const [lines, setLines] = useState<EstimateLine[]>(DEFAULT_LINES);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");

  const resetEstimate = () => {
    setEditingEstimate(null);
    setLines(DEFAULT_LINES);
    setDiscount("0");
    setTax("0");
  };
  const startEdit = (e: Estimate) => {
    setEditingEstimate(e.id);
    setLines(
      (e.items ?? []).map((l) => ({
        type: l.type ?? "LABOR",
        description: l.description,
        quantity: String(Number(l.quantity)),
        unitPrice: formatMontoInput(Number(l.unit_price)),
      })),
    );
    setDiscount(formatMontoInput(Number(e.discount ?? 0)));
    setTax(formatMontoInput(Number(e.tax ?? 0)));
  };
  const updateLine = (i: number, patch: Partial<EstimateLine>) =>
    setLines(lines.map((l, n) => (i === n ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines([
      ...lines,
      { type: "SERVICE", description: "", quantity: "1", unitPrice: "0" },
    ]);
  const save = async () => {
    const body = {
      items: lines.map((l) => ({
        type: l.type,
        description: l.description,
        quantity: parseCantidad(l.quantity),
        unitPrice: parseMonto(l.unitPrice),
      })),
      discount: optionalMonto(discount),
      tax: optionalMonto(tax),
    };
    await (editingEstimate
      ? apiFetch(`reparaciones/cotizaciones/${editingEstimate}`, {
          method: "PUT",
          body,
        })
      : repairAction(id, "cotizaciones", body));
    resetEstimate();
  };
  const invalid =
    lines.some(
      (l) =>
        !l.description.trim() ||
        !(parseCantidad(l.quantity) > 0) ||
        !(parseMonto(l.unitPrice) >= 0),
    ) ||
    !(optionalMonto(discount) >= 0) ||
    !(optionalMonto(tax) >= 0);

  return {
    lines,
    editingEstimate,
    discount,
    setDiscount,
    tax,
    setTax,
    startEdit,
    updateLine,
    addLine,
    save,
    invalid,
  };
}
export type EstimateForm = ReturnType<typeof useEstimateForm>;
