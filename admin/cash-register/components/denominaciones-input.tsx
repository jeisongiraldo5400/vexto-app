import { MontoInput } from "@/components/ui/monto-input";
import { Line, useThemeColors } from "@/components/ui/kit";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { formatCurrency } from "@/core/format";
import { parseCantidad } from "@/core/utils/money";
import { Text, View } from "react-native";

import {
  DENOMINACIONES_COP,
  totalDenominaciones,
  type ConteoDenominaciones,
} from "../cierre";

/** Conteo por billetes y monedas colombianos; el total se suma solo. */
export function DenominacionesInput({
  conteo,
  onCantidad,
}: {
  conteo: ConteoDenominaciones;
  onCantidad: (valor: number, cantidad: string) => void;
}) {
  const c = useThemeColors();
  const total = totalDenominaciones(conteo);
  return (
    <View style={{ gap: Spacing.sm }}>
      {DENOMINACIONES_COP.map(({ valor, tipo }) => {
        const cantidad = parseCantidad(conteo[valor]) || 0;
        const nombre = `${tipo === "billete" ? "billetes" : "monedas"} de ${formatCurrency(valor)}`;
        return (
          <View
            key={valor}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
            }}
          >
            <Text style={{ color: c.text, flex: 1, fontWeight: "600" }}>
              {`${tipo === "billete" ? "Billete" : "Moneda"} ${formatCurrency(valor)}`}
            </Text>
            <MontoInput
              integer
              accessibilityLabel={`Cantidad de ${nombre}`}
              placeholder="0"
              placeholderTextColor={c.textSecondary}
              value={conteo[valor] ?? ""}
              onChangeText={(t) => onCantidad(valor, t)}
              style={{
                width: 72,
                minHeight: TouchTarget,
                textAlign: "center",
                color: c.text,
                borderWidth: 1,
                borderColor: c.inputBorder,
                backgroundColor: c.inputBackground,
                borderRadius: Radius.md,
                paddingHorizontal: 8,
              }}
            />
            <Text
              style={{
                color: c.textSecondary,
                width: 96,
                textAlign: "right",
              }}
            >
              {formatCurrency(valor * cantidad)}
            </Text>
          </View>
        );
      })}
      <Line bold>
        {`Total contado: ${formatCurrency(Number.isFinite(total) ? total : 0)}`}
      </Line>
    </View>
  );
}
