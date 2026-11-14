import { sanitizeCantidadInput, sanitizeMontoInput } from '@/core/utils/money';
import { TextInput, type TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  /** Texto crudo tal como lo escribe el usuario ("1.500,5", "1,", ""). */
  value: string;
  onChangeText: (text: string) => void;
  /** `integer`: solo dígitos (cantidades). Por defecto, monto es-CO. */
  integer?: boolean;
};

/**
 * Campo numérico que conserva el texto crudo mientras se escribe; el valor se
 * interpreta al enviar con `parseMonto` / `parseCantidad` de `@/core/utils/money`.
 */
export function MontoInput({ value, onChangeText, integer = false, ...rest }: Props) {
  return (
    <TextInput
      {...rest}
      value={value}
      inputMode={integer ? 'numeric' : 'decimal'}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      onChangeText={(text) =>
        onChangeText(integer ? sanitizeCantidadInput(text) : sanitizeMontoInput(text))
      }
    />
  );
}
