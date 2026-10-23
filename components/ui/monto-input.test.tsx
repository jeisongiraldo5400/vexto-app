import { describe, expect, it, vi } from 'vitest';

import { render } from '@/test-utils/renderer';

import { MontoInput } from './monto-input';

describe('MontoInput', () => {
  it('monto: teclado decimal y conserva "." y "," mientras se escribe', () => {
    const onChange = vi.fn();
    const view = render(<MontoInput value="" onChangeText={onChange} placeholder="Monto" />);
    const input = view.getByProps({ placeholder: 'Monto' });
    expect(input.props).toMatchObject({ keyboardType: 'decimal-pad', inputMode: 'decimal', value: '' });
    view.changeText(input, '$ 1.500,');
    expect(onChange).toHaveBeenLastCalledWith('1.500,');
  });

  it('entero: teclado numérico y solo dígitos', () => {
    const onChange = vi.fn();
    const view = render(<MontoInput integer value="3" onChangeText={onChange} placeholder="Cantidad" />);
    const input = view.getByProps({ placeholder: 'Cantidad' });
    expect(input.props).toMatchObject({ keyboardType: 'number-pad', inputMode: 'numeric', value: '3' });
    view.changeText(input, '1.2a,5');
    expect(onChange).toHaveBeenLastCalledWith('125');
  });
});
