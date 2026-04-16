import { useAuth } from '@/admin/auth/hooks/use-auth';
import { useProductosQuery } from '@/admin/products/hooks/use-productos-query';
import { BarcodeScannerModal } from '@/admin/sales/components/barcode-scanner-modal';
import { CartLinesList, type CartLine } from '@/admin/sales/components/cart-lines-list';
import { ProductSearchPicker } from '@/admin/sales/components/product-search-picker';
import { VentaSuccessModal } from '@/admin/sales/components/venta-success-modal';
import { WarehousePaymentPicker } from '@/admin/sales/components/warehouse-payment-picker';
import { useAlmacenesQuery } from '@/admin/sales/hooks/use-almacenes-query';
import { useCreateVentaMutation } from '@/admin/sales/hooks/use-create-venta-mutation';
import { useMetodosPagoQuery } from '@/admin/sales/hooks/use-metodos-pago-query';
import { useResolveProductoBarcodeMutation } from '@/admin/sales/hooks/use-resolve-producto-barcode-mutation';
import { primaryGlowShadow, Colors } from '@/constants/theme';
import { ApiError } from '@/core/http/api';
import type { Producto, VentaResponse } from '@/core/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VentaScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const almacenesQ = useAlmacenesQuery();
  const metodosQ = useMetodosPagoQuery();
  const resolveBarcode = useResolveProductoBarcodeMutation();
  const createVenta = useCreateVentaMutation();

  const almacenes = useMemo(() => (almacenesQ.data ?? []).filter((x) => x.activo), [almacenesQ.data]);
  const metodos = useMemo(() => {
    const m = metodosQ.data ?? [];
    const activos = m.filter((x) => x.estado !== 'inactivo');
    return activos.length ? activos : m;
  }, [metodosQ.data]);

  const [almacenId, setAlmacenId] = useState<string | null>(null);
  const [metodoPagoId, setMetodoPagoId] = useState<string | null>(null);

  useEffect(() => {
    if (almacenes.length === 1) setAlmacenId(almacenes[0].id);
    if (metodos.length >= 1) setMetodoPagoId(metodos[0].id);
  }, [almacenes, metodos]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebouncedValue(busqueda, 350);
  const productosQ = useProductosQuery(debouncedBusqueda, { minChars: 2 });
  const resultados = productosQ.data?.productos ?? [];

  const [success, setSuccess] = useState<VentaResponse | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const loadMeta = almacenesQ.isLoading || metodosQ.isLoading;
  const metaErr =
    almacenesQ.isError || metodosQ.isError
      ? 'No se pudieron cargar almacén o métodos de pago. Revisa la conexión.'
      : null;

  const addOrIncrement = useCallback((producto: Producto) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.producto.id === producto.id);
      if (i === -1) return [...prev, { producto, cantidad: 1 }];
      const next = [...prev];
      next[i] = { ...next[i], cantidad: next[i].cantidad + 1 };
      return next;
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const setQty = (productoId: string, qty: number) => {
    if (qty < 1) {
      setCart((p) => p.filter((l) => l.producto.id !== productoId));
      return;
    }
    setCart((p) => p.map((l) => (l.producto.id === productoId ? { ...l, cantidad: qty } : l)));
  };

  const onBarcodeFromScanner = useCallback(
    (code: string) => {
      void (async () => {
        setScanFeedback(null);
        try {
          const p = await resolveBarcode.mutateAsync(code);
          addOrIncrement(p);
          setScanFeedback(`${p.nombre} agregado`);
        } catch {
          setScanFeedback('Producto no encontrado. Revisa el código o el catálogo.');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      })();
    },
    [addOrIncrement, resolveBarcode],
  );

  const totalEstimado = useMemo(
    () => cart.reduce((s, l) => s + l.producto.precioVenta * l.cantidad, 0),
    [cart],
  );

  async function confirmarVenta() {
    setSubmitErr(null);
    if (!almacenId || !metodoPagoId) {
      setSubmitErr('Elige almacén y método de pago.');
      return;
    }
    if (cart.length === 0) {
      setSubmitErr('Agrega productos escaneando. Si la cámara falla, usa la búsqueda de respaldo.');
      return;
    }
    try {
      const v = await createVenta.mutateAsync({
        almacenId,
        metodoPagoId,
        items: cart.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
      });
      setSuccess(v);
      setCart([]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo registrar la venta.';
      setSubmitErr(msg);
    }
  }

  function openScanner() {
    setScanFeedback(null);
    if (Platform.OS === 'web') {
      setScanFeedback('En web no hay cámara para escanear. Cierra y usa la búsqueda de respaldo arriba.');
      setScannerOpen(true);
      return;
    }
    setScannerOpen(true);
  }

  if (loadMeta) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.muted, { color: c.textSecondary }]}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.welcome, { color: c.text }]}>
          Hola{user?.fullName ? `, ${user.fullName}` : ''}
        </Text>

        {metaErr ? <Text style={[styles.warn, { color: c.warning }]}>{metaErr}</Text> : null}

        <Text style={[styles.flowHint, { color: c.textSecondary }]}>
          Para vender: escanea cada producto con la cámara.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.scanBtn,
            { backgroundColor: c.tint, opacity: pressed ? 0.92 : 1 },
            primaryGlowShadow(),
          ]}
          onPress={openScanner}>
          <Text style={[styles.scanBtnText, { color: c.onPrimary }]}>Escanear código de barras</Text>
        </Pressable>

        <ProductSearchPicker
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          resultados={resultados}
          loading={productosQ.isFetching}
          onPick={addOrIncrement}
        />

        <CartLinesList cart={cart} onChangeQty={setQty} />

        <Text style={[styles.sectionMeta, { color: c.text }]}>Antes de confirmar</Text>
        <WarehousePaymentPicker
          almacenes={almacenes}
          metodos={metodos}
          almacenId={almacenId}
          metodoPagoId={metodoPagoId}
          tint={c.tint}
          tintMuted={c.tintMuted}
          onAlmacen={setAlmacenId}
          onMetodo={setMetodoPagoId}
        />

        <Text style={[styles.total, { color: c.text }]}>
          Total aprox: ${totalEstimado.toFixed(0)}
        </Text>

        {submitErr ? <Text style={[styles.warn, { color: c.error }]}>{submitErr}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.confirm,
            {
              backgroundColor: c.tint,
              opacity: createVenta.isPending ? 0.7 : pressed ? 0.92 : 1,
            },
            primaryGlowShadow(),
          ]}
          onPress={() => void confirmarVenta()}
          disabled={createVenta.isPending}>
          {createVenta.isPending ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={[styles.confirmText, { color: c.onPrimary }]}>Confirmar venta</Text>
          )}
        </Pressable>
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        tint={c.tint}
        feedback={scanFeedback}
        onClose={() => setScannerOpen(false)}
        onClearFeedback={() => setScanFeedback(null)}
        onCode={onBarcodeFromScanner}
      />

      <VentaSuccessModal
        visible={!!success}
        numeroFactura={success?.numeroFactura ?? ''}
        tint={c.tint}
        onPrimary={c.onPrimary}
        onClose={() => setSuccess(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  welcome: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  muted: { fontSize: 16, paddingVertical: 8 },
  warn: { marginBottom: 8, fontSize: 15 },
  flowHint: { fontSize: 16, marginBottom: 10, lineHeight: 22 },
  sectionMeta: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  scanBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 8 },
  scanBtnText: { fontSize: 19, fontWeight: '700' },
  total: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  confirm: { borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  confirmText: { fontSize: 19, fontWeight: '700' },
});
