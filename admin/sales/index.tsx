import { BarcodeScannerModal } from '@/admin/sales/components/barcode-scanner-modal';
import {
  ClienteVentaSection,
  type ModoClienteVenta,
} from '@/admin/sales/components/cliente-venta-section';
import { CartLinesList, type CartLine } from '@/admin/sales/components/cart-lines-list';
import { QuantityNumpadModal } from '@/admin/sales/components/quantity-numpad-modal';
import { VentaSuccessModal } from '@/admin/sales/components/venta-success-modal';
import { WarehousePaymentPicker } from '@/admin/sales/components/warehouse-payment-picker';
import {
  PagosVentaModal,
  lineasToPayload,
  type PagoLineaMobile,
} from '@/admin/sales/components/pagos-venta-modal';
import { CreditoVentaModal } from '@/admin/sales/components/credito-venta-modal';
import { useCreateCreditoVentaMutation } from '@/admin/sales/hooks/use-create-credito-venta-mutation';
import { useAlmacenesQuery } from '@/admin/sales/hooks/use-almacenes-query';
import { useCreateVentaMutation } from '@/admin/sales/hooks/use-create-venta-mutation';
import { useMetodosPagoQuery } from '@/admin/sales/hooks/use-metodos-pago-query';
import { useResolveProductoBarcodeMutation } from '@/admin/sales/hooks/use-resolve-producto-barcode-mutation';
import { useStockProductoQuery } from '@/admin/sales/hooks/use-stock-producto-query';
import { primaryGlowShadow, Colors } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import { invalidateAfterVenta } from '@/core/query/invalidate-after-venta';
import { ApiError } from '@/core/http/api';
import type { Cliente, Producto, VentaResponse } from '@/core/types';
import { getAlmacenPredeterminado } from '@/core/utils/almacen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VentaScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const queryClient = useQueryClient();

  const almacenesQ = useAlmacenesQuery();
  const metodosQ = useMetodosPagoQuery();
  const resolveBarcode = useResolveProductoBarcodeMutation();
  const createVenta = useCreateVentaMutation();
  const createCreditoVenta = useCreateCreditoVentaMutation();

  const almacenes = useMemo(() => (almacenesQ.data ?? []).filter((x) => x.activo), [almacenesQ.data]);
  const metodos = useMemo(() => {
    const m = metodosQ.data ?? [];
    const activos = m.filter((x) => x.estado !== 'inactivo');
    return activos.length ? activos : m;
  }, [metodosQ.data]);

  const [almacenId, setAlmacenId] = useState<string | null>(null);
  const [pagosModalOpen, setPagosModalOpen] = useState(false);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const hasInitializedMeta = useRef(false);

  useLayoutEffect(() => {
    if (hasInitializedMeta.current) return;
    if (almacenes.length >= 1 && !almacenId) {
      const predeterminado = getAlmacenPredeterminado(almacenes);
      if (predeterminado) setAlmacenId(predeterminado.id);
    }
    if (almacenes.length > 0 && almacenId) {
      hasInitializedMeta.current = true;
    }
  }, [almacenes, almacenId]);

  const [modoCliente, setModoCliente] = useState<ModoClienteVenta>('ninguno');
  const [clienteVenta, setClienteVenta] = useState<Cliente | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [success, setSuccess] = useState<VentaResponse | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [qtyModalProduct, setQtyModalProduct] = useState<Producto | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Keyboard.scheduleLayoutAnimation(e);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const stockQ = useStockProductoQuery(qtyModalProduct?.id ?? null, almacenId);
  const stockDisponible: number | null = stockQ.isSuccess
    ? stockQ.data.cantidadDisponible
    : stockQ.isError
      ? 0
      : null;

  const loadMeta = almacenesQ.isLoading || metodosQ.isLoading;
  const metaErr =
    almacenesQ.isError || metodosQ.isError
      ? 'No se pudieron cargar almacén o métodos de pago. Revisa la conexión.'
      : null;

  const openQuantityModal = useCallback((producto: Producto) => {
    setScannerOpen(false);
    setQtyModalProduct(producto);
  }, []);

  const confirmQuantity = useCallback(
    (producto: Producto, qty: number) => {
      setCart((prev) => {
        const i = prev.findIndex((l) => l.producto.id === producto.id);
        const stock = stockQ.isSuccess ? stockQ.data.cantidadDisponible : null;
        if (i === -1) return [...prev, { producto, cantidad: qty, stockDisponible: stock }];
        const next = [...prev];
        next[i] = { ...next[i], cantidad: qty, stockDisponible: stock };
        return next;
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setQtyModalProduct(null);
    },
    [stockQ],
  );

  const setQty = (productoId: string, qty: number) => {
    if (qty < 1) {
      setCart((p) => p.filter((l) => l.producto.id !== productoId));
      return;
    }
    setCart((p) =>
      p.map((l) => {
        if (l.producto.id !== productoId) return l;
        const capped =
          l.stockDisponible !== null ? Math.min(qty, l.stockDisponible) : qty;
        return { ...l, cantidad: capped };
      }),
    );
  };

  const onBarcodeFromScanner = useCallback(
    (code: string) => {
      void (async () => {
        setScanFeedback(null);
        try {
          const p = await resolveBarcode.mutateAsync(code);
          openQuantityModal(p);
        } catch {
          setScanFeedback('Producto no encontrado. Revisa el código o el catálogo.');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      })();
    },
    [openQuantityModal, resolveBarcode],
  );

  const totalEstimado = useMemo(
    () => cart.reduce((s, l) => s + l.producto.precioVenta * l.cantidad, 0),
    [cart],
  );

  const keyboardOpen = keyboardHeight > 0;
  const footerLift = keyboardOpen ? Math.max(keyboardHeight - insets.bottom, 0) : 0;

  function abrirCobro() {
    setSubmitErr(null);
    if (!almacenId) {
      setSubmitErr('Elige un almacén.');
      return;
    }
    if (cart.length === 0) {
      setSubmitErr('Agrega al menos un producto al carrito.');
      return;
    }
    setPagosModalOpen(true);
  }

  function abrirCredito() {
    setSubmitErr(null);
    if (!almacenId) {
      setSubmitErr('Elige un almacén.');
      return;
    }
    if (cart.length === 0) {
      setSubmitErr('Agrega al menos un producto al carrito.');
      return;
    }
    setCreditoModalOpen(true);
  }

  async function confirmarVentaConPagos(lineas: PagoLineaMobile[]) {
    setSubmitErr(null);
    if (!almacenId) return;

    const pagos = lineasToPayload(lineas);

    try {
      const v = await createVenta.mutateAsync({
        almacenId,
        pagos,
        metodoPagoId: pagos[0]?.metodoPagoId,
        items: cart.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        ...(clienteVenta ? { clienteId: clienteVenta.id } : {}),
      });
      invalidateAfterVenta(queryClient);
      setSuccess(v);
      setCart([]);
      setClienteVenta(null);
      setModoCliente('ninguno');
      setPagosModalOpen(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo registrar la venta.';
      setSubmitErr(msg);
    }
  }

  async function confirmarVentaCredito(params: {
    clienteId: string;
    cuotaInicial: number;
    numeroCuotas: number;
    frecuenciaDias: number;
  }) {
    setSubmitErr(null);
    if (!almacenId) return;

    try {
      const result = await createCreditoVenta.mutateAsync({
        almacenId,
        clienteId: params.clienteId,
        items: cart.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        cuotaInicial: params.cuotaInicial,
        numeroCuotas: params.numeroCuotas,
        frecuenciaDias: params.frecuenciaDias,
      });
      invalidateAfterVenta(queryClient);
      setSuccess({
        id: result.ventaId,
        numeroFactura: result.numeroFactura,
        items: [],
        total: result.total,
      });
      setCart([]);
      setClienteVenta(null);
      setModoCliente('ninguno');
      setCreditoModalOpen(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo registrar la venta a crédito.';
      setSubmitErr(msg);
    }
  }

  function openScanner() {
    setScanFeedback(null);
    if (Platform.OS === 'web') {
      setScanFeedback('En web no hay cámara disponible.');
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
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {metaErr ? <Text style={[styles.warn, { color: c.warning }]}>{metaErr}</Text> : null}

          <CartLinesList cart={cart} onChangeQty={setQty} onScanPress={openScanner} />

          <ClienteVentaSection
            modo={modoCliente}
            onModo={setModoCliente}
            cliente={clienteVenta}
            onCliente={setClienteVenta}
            metodoPago={null}
            tint={c.tint}
            tintMuted={c.tintMuted}
            onPrimary={c.onPrimary}
          />

          <Text style={[styles.sectionMeta, { color: c.text }]}>Almacén</Text>
          <WarehousePaymentPicker
            almacenes={almacenes}
            almacenId={almacenId}
            hideMetodo
            tint={c.tint}
            tintMuted={c.tintMuted}
            onAlmacen={setAlmacenId}
          />
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: c.border,
              backgroundColor: c.background,
              paddingBottom: insets.bottom + 8,
              marginBottom: footerLift,
            },
          ]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Total aprox.</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>{formatCurrency(totalEstimado)}</Text>
          </View>

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
            onPress={() => void abrirCobro()}
            disabled={createVenta.isPending || createCreditoVenta.isPending}>
            {createVenta.isPending ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={[styles.confirmText, { color: c.onPrimary }]}>Cobrar venta</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.creditoBtn,
              {
                borderColor: c.tint,
                opacity: createCreditoVenta.isPending ? 0.7 : pressed ? 0.92 : 1,
              },
            ]}
            onPress={() => void abrirCredito()}
            disabled={createVenta.isPending || createCreditoVenta.isPending}>
            <Text style={[styles.creditoBtnText, { color: c.tint }]}>Vender a crédito</Text>
          </Pressable>
        </View>
      </View>

      <PagosVentaModal
        visible={pagosModalOpen}
        metodos={metodos}
        totalVenta={totalEstimado}
        almacenId={almacenId}
        almacenes={almacenes}
        initialAlmacenId={almacenId}
        onAlmacenChange={setAlmacenId}
        onConfirm={(lineas) => void confirmarVentaConPagos(lineas)}
        onClose={() => setPagosModalOpen(false)}
        tint={c.tint}
        onPrimary={c.onPrimary}
      />

      <CreditoVentaModal
        visible={creditoModalOpen}
        cart={cart}
        almacenId={almacenId}
        totalVenta={totalEstimado}
        onConfirm={(p) => void confirmarVentaCredito(p)}
        onClose={() => setCreditoModalOpen(false)}
        tint={c.tint}
        onPrimary={c.onPrimary}
        loading={createCreditoVenta.isPending}
      />

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
        venta={success}
        tint={c.tint}
        onPrimary={c.onPrimary}
        onClose={() => setSuccess(null)}
      />

      <QuantityNumpadModal
        visible={qtyModalProduct !== null}
        product={qtyModalProduct}
        stockDisponible={stockDisponible}
        onConfirm={(qty) => {
          if (qtyModalProduct) confirmQuantity(qtyModalProduct, qty);
        }}
        onCancel={() => setQtyModalProduct(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 16, paddingVertical: 8 },
  warn: { marginTop: 8, fontSize: 14 },
  sectionMeta: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  confirm: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  confirmText: { fontSize: 17, fontWeight: '700' },
  creditoBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
  },
  creditoBtnText: { fontSize: 16, fontWeight: '700' },
});
