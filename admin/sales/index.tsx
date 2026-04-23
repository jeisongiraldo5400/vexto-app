import { useProductosQuery } from '@/admin/products/hooks/use-productos-query';
import { BarcodeScannerModal } from '@/admin/sales/components/barcode-scanner-modal';
import {
  ClienteVentaSection,
  type ModoClienteVenta,
} from '@/admin/sales/components/cliente-venta-section';
import { CartLinesList, type CartLine } from '@/admin/sales/components/cart-lines-list';
import { ProductSearchPicker } from '@/admin/sales/components/product-search-picker';
import { QuantityNumpadModal } from '@/admin/sales/components/quantity-numpad-modal';
import { VentaSuccessModal } from '@/admin/sales/components/venta-success-modal';
import { WarehousePaymentPicker } from '@/admin/sales/components/warehouse-payment-picker';
import { esMetodoPagoCredito } from '@/admin/sales/constants/metodos-pago';
import { useAlmacenesQuery } from '@/admin/sales/hooks/use-almacenes-query';
import { useCreateVentaMutation } from '@/admin/sales/hooks/use-create-venta-mutation';
import { useMetodosPagoQuery } from '@/admin/sales/hooks/use-metodos-pago-query';
import { useResolveProductoBarcodeMutation } from '@/admin/sales/hooks/use-resolve-producto-barcode-mutation';
import { useStockProductoQuery } from '@/admin/sales/hooks/use-stock-producto-query';
import { primaryGlowShadow, Colors } from '@/constants/theme';
import { formatCurrency } from '@/core/format';
import { ApiError } from '@/core/http/api';
import type { Cliente, Producto, VentaResponse } from '@/core/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VentaScreen() {
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

  const [modoCliente, setModoCliente] = useState<ModoClienteVenta>('ninguno');
  const [clienteVenta, setClienteVenta] = useState<Cliente | null>(null);

  const metodoSeleccionado = useMemo(
    () => metodos.find((m) => m.id === metodoPagoId) ?? null,
    [metodos, metodoPagoId],
  );

  useEffect(() => {
    if (esMetodoPagoCredito(metodoSeleccionado?.codigo) && modoCliente === 'ninguno') {
      setModoCliente('existente');
    }
  }, [metodoSeleccionado?.codigo, modoCliente]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebouncedValue(busqueda, 350);
  const productosQ = useProductosQuery(debouncedBusqueda, { minChars: 2 });
  const resultados = productosQ.data?.productos ?? [];

  const [success, setSuccess] = useState<VentaResponse | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [qtyModalProduct, setQtyModalProduct] = useState<Producto | null>(null);

  // Stock del producto seleccionado en el almacén elegido
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

  async function confirmarVenta() {
    setSubmitErr(null);
    if (!almacenId || !metodoPagoId) {
      setSubmitErr('Elige almacén y método de pago.');
      return;
    }
    if (cart.length === 0) {
      setSubmitErr('Agrega al menos un producto al carrito.');
      return;
    }
    if (esMetodoPagoCredito(metodoSeleccionado?.codigo) && !clienteVenta) {
      setSubmitErr('Selecciona o crea un cliente para ventas a crédito.');
      return;
    }
    try {
      const v = await createVenta.mutateAsync({
        almacenId,
        metodoPagoId,
        items: cart.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        ...(clienteVenta ? { clienteId: clienteVenta.id } : {}),
      });
      setSuccess(v);
      setCart([]);
      setClienteVenta(null);
      setModoCliente('ninguno');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo registrar la venta.';
      setSubmitErr(msg);
    }
  }

  function openScanner() {
    setScanFeedback(null);
    if (Platform.OS === 'web') {
      setScanFeedback('En web no hay cámara. Usa la búsqueda abajo.');
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
        {metaErr ? <Text style={[styles.warn, { color: c.warning }]}>{metaErr}</Text> : null}

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
          onPick={openQuantityModal}
        />

        <CartLinesList cart={cart} onChangeQty={setQty} />

        <ClienteVentaSection
          modo={modoCliente}
          onModo={setModoCliente}
          cliente={clienteVenta}
          onCliente={setClienteVenta}
          metodoPago={metodoSeleccionado}
          tint={c.tint}
          tintMuted={c.tintMuted}
          onPrimary={c.onPrimary}
        />

        <Text style={[styles.sectionMeta, { color: c.text }]}>Almacén y pago</Text>
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

        <View style={[styles.totalRow, { borderTopColor: c.border }]}>
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

      <QuantityNumpadModal
        visible={qtyModalProduct !== null}
        product={qtyModalProduct}
        stockDisponible={stockDisponible}
        onConfirm={(qty) => {
          if (qtyModalProduct) confirmQuantity(qtyModalProduct, qty);
        }}
        onCancel={() => setQtyModalProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 16, paddingVertical: 8 },
  warn: { marginBottom: 8, fontSize: 14 },
  sectionMeta: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  scanBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  scanBtnText: { fontSize: 17, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontSize: 15, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  confirm: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  confirmText: { fontSize: 17, fontWeight: '700' },
});
