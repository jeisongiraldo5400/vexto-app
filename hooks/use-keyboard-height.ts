import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura actual del teclado (0 si está cerrado), con animación de layout.
 * `onShow` (opcional) se ejecuta 150 ms después de abrirse (p. ej. scroll al final).
 */
export function useKeyboardHeight (onShow?: () => void) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(e.endCoordinates.height);
      if (onShow) setTimeout(() => onShow(), 150);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [onShow]);

  return keyboardHeight;
}
