import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'codabar',
  'itf14',
  'qr',
] as const;

type Props = {
  visible: boolean;
  tint: string;
  feedback: string | null;
  onClose: () => void;
  onClearFeedback: () => void;
  onCode: (data: string) => void;
};

export function BarcodeScannerModal({
  visible,
  tint,
  feedback,
  onClose,
  onClearFeedback,
  onCode,
}: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockUntil = useRef(0);

  const handleBarcode = useCallback(
    (data: string) => {
      const code = data.trim();
      if (!code) return;
      if (Date.now() < scanLockUntil.current) return;
      scanLockUntil.current = Date.now() + 900;
      onCode(code);
    },
    [onCode],
  );

  const onBarcodeScanned = useCallback(
    (ev: BarcodeScanningResult) => {
      handleBarcode(ev.data);
    },
    [handleBarcode],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {Platform.OS !== 'web' && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={onBarcodeScanned}
          />
        ) : Platform.OS !== 'web' ? (
          <View style={[styles.center, { flex: 1 }]}>
            <Text style={styles.permText}>
              Necesitamos permiso para usar la cámara y leer el código de barras.
            </Text>
            <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={() => void requestPermission()}>
              <Text style={styles.btnText}>Permitir cámara</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.center, { flex: 1 }]}>
            <Text style={styles.permText}>El escáner no está disponible en web.</Text>
          </View>
        )}
        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.hint}>Apunta al código de barras del producto</Text>
          {feedback ? <Text style={styles.msg}>{feedback}</Text> : null}
          <View style={styles.frame} />
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
          <Pressable
            style={[styles.again, { borderColor: '#fff' }]}
            onPress={() => {
              scanLockUntil.current = 0;
              onClearFeedback();
            }}>
            <Text style={styles.closeText}>Listo para otro</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  permText: { color: '#fff', textAlign: 'center' },
  btn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, marginTop: 20 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  hint: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  msg: {
    color: '#ffeb3b',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  frame: {
    marginTop: 40,
    width: '78%',
    height: 160,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  close: {
    marginTop: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  again: {
    marginTop: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
