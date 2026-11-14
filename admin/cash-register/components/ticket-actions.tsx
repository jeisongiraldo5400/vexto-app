import { ActionButton } from "@/components/ui/kit";
import { useActionRunner } from "@/core/query/use-action-runner";

import {
  compartirTicketCaja,
  imprimirTicketCaja,
  type TicketCajaData,
} from "../ticket";

/** Compartir (PDF) o imprimir el comprobante de una sesión de caja. */
export function TicketActions(data: TicketCajaData) {
  const { busy, run } = useActionRunner([]);
  return (
    <>
      <ActionButton
        label="Compartir comprobante"
        busy={busy}
        onPress={() => void run(() => compartirTicketCaja(data))}
      />
      <ActionButton
        label="Imprimir comprobante"
        busy={busy}
        onPress={() => void run(() => imprimirTicketCaja(data))}
      />
    </>
  );
}
