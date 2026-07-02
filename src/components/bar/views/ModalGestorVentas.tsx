"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Minus, Plus, X, CreditCard, Gift, Presentation, ClipboardList, Wine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useBarContext } from "@/components/bar/context/BarContext";
import { useSession } from "next-auth/react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { useCart } from "@/hooks/use-cart";
import { useSaleProcessing } from "@/hooks/pos/useSaleProcessing";
import { restauranteApi } from "@/lib/restaurante-api";
import { useToast } from "@/hooks/use-toast";
import { etiquetaPrecio } from "@/lib/precio-dinamico";
import { EstacionPreparacionRestaurante } from "@/lib/prisma-types";
import { inferirEstacionPreparacion } from "@/lib/restaurante-shared";
import { TicketPrinter } from "@/components/ui/ticket-printer";
import type { ProductoCatalogo } from "@/components/bar/context/BarContext";

export type ModalGestorVentasModo = "DIRECTA" | "MESA" | "CUENTA_ABIERTA" | null;

interface Props {
  modo: ModalGestorVentasModo;
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function ModalGestorVentas({ modo, isOpen, onClose }: Props) {
  const { toast } = useToast();
  const {
    productos,
    categorias,
    mesaSeleccionada,
    pedidoActivo,
    recargarOperativo,
    modo: rolModulo,
  } = useBarContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [esCortesiaGlobal, setEsCortesiaGlobal] = useState(false);
  const [agregandoMesa, setAgregandoMesa] = useState(false);
  const [ventaExitosaData, setVentaExitosaData] = useState<any>(null);
  const [imprimirTicket, setImprimirTicket] = useState(false);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [nombreCuentaRapida, setNombreCuentaRapida] = useState("");
  // Contador de cortesías por productoId independiente del carrito
  const [cortesias, setCortesias] = useState<Record<string, number>>({});

  const cart = useCart();
  const { data: session } = useSession();
  const { configuracion } = useConfiguracionEmpresa();

  // ── Lector de código de barras (pistola) → agregar al carrito ────────────────
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || (modo !== "DIRECTA" && modo !== "CUENTA_ABIERTA" && modo !== "MESA")) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Ignorar si el foco está en un input de texto (para no interferir con búsqueda manual)
      if (tag === "TEXTAREA" || tag === "SELECT") return;
      // Para INPUT, solo ignorar si el usuario está escribiendo lento (no es pistola)
      // La pistola llena el buffer antes del Enter; lo procesamos en Enter igualmente
      if (e.key === "Enter") {
        const codigo = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        // Sin código acumulado → no es la pistola, dejar pasar el evento normal
        if (!codigo || codigo.length < 3) return;

        // Es la pistola: bloquear el Enter para que el Dialog no se cierre
        e.preventDefault();
        e.stopPropagation();

        const producto = productos.find(
          (p) => (p.codigoBarras && p.codigoBarras === codigo) || p.id === codigo
        );
        if (!producto || producto.enStock <= 0) return;

        const existente = cart.items.find((i) => i.producto.id === producto.id && !i.esCortesia);
        if (existente) {
          cart.actualizarCantidad(existente.id, existente.cantidad + 1);
        } else {
          cart.agregarItem({
            producto: {
              id: producto.id,
              nombre: producto.nombre,
              precio: Number(producto.precio) || 0,
              tipoVenta: "UNIDAD",
              empresaId: session?.user?.empresaId as string || "",
              categoria: producto.categoria ? { id: producto.categoria.id, nombre: producto.categoria.nombre } : undefined,
            },
            cantidad: 1,
            esCortesia: false,
          });
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 300);
      }
    };

    // useCapture=true: interceptar ANTES de que shadcn/Dialog procese el evento
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, modo, productos, cart, session]);

  // Items para procesarVenta: cantidad y subtotal ya descontando cortesías
  const cartItemsAdaptados = useMemo(() => {
    return cart.items
      .filter(item => !item.esCortesia)
      .map(item => {
        const cort = cortesias[item.producto.id] || 0;
        const cantCobrada = Math.max(0, item.cantidad - cort);
        return {
          ...item,
          cantidad: cantCobrada,
          subtotal: cantCobrada * item.producto.precio,
          precioLibre: item.precioLibre,
        };
      })
      .filter(item => item.cantidad > 0); // quitar items que quedaron en 0
  }, [cart.items, cortesias]);

  // Total descontando las unidades marcadas como cortesía
  const totalCalculado = useMemo(() => {
    return cart.items
      .filter(i => !i.esCortesia)
      .reduce((acc, item) => {
        const cort = cortesias[item.producto.id] || 0;
        const cantCobrada = Math.max(0, item.cantidad - cort);
        return acc + cantCobrada * item.producto.precio;
      }, 0);
  }, [cart.items, cortesias]);

  const { procesarVenta, procesandoVenta: procesando } = useSaleProcessing({
    items: cartItemsAdaptados,
    empresaId: session?.user?.empresaId as string || "",
    configuracion: configuracion || {},
    subtotal: totalCalculado,
    total: totalCalculado,
    vaciarCarrito: cart.vaciarCarrito,
  });

  const resetModal = () => {
    setSearchTerm("");
    setCategoriaSeleccionada("todas");
    setVentaExitosaData(null);
    setImprimirTicket(false);
    setCortesias({});
    setNombreCuentaRapida("");
    cart.vaciarCarrito(); // limpiar siempre al cerrar
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const inferirEstacion = (producto: ProductoCatalogo): EstacionPreparacionRestaurante => {
    let estacion = inferirEstacionPreparacion({
      categoria: producto.categoria?.nombre,
      nombreProducto: producto.nombre,
    }) as EstacionPreparacionRestaurante;
    if (rolModulo === "bar" && estacion === "COCINA") estacion = "BARRA";
    else if (rolModulo === "restaurante" && estacion === "BARRA") estacion = "COCINA";
    return estacion;
  };

  const handleCheckoutDirecta = async () => {
    if (cart.items.filter(i => !i.esCortesia).length === 0) return;

    if (modo === "MESA") {
      if (!mesaSeleccionada) return;
      try {
        setAgregandoMesa(true);
        const pedido = pedidoActivo || (await restauranteApi.abrirPedido({
          mesaId: mesaSeleccionada.id,
          nombreCuenta: mesaSeleccionada.nombre,
          comensales: 1,
        }));
        for (const item of cart.items.filter(i => !i.esCortesia)) {
          const cort = cortesias[item.producto.id] || 0;
          const cantNormal = Math.max(0, item.cantidad - cort);
          const estacion = inferirEstacion({ id: item.producto.id, nombre: item.producto.nombre, precio: item.producto.precio, enStock: 0, categoria: item.producto.categoria as any });
          if (cantNormal > 0) {
            await restauranteApi.agregarItem(pedido.id, { productoId: item.producto.id, cantidad: cantNormal, estacion, esCortesia: false, estadoPreparacion: "ENTREGADO" });
          }
          if (cort > 0) {
            await restauranteApi.agregarItem(pedido.id, { productoId: item.producto.id, cantidad: cort, estacion, esCortesia: true, estadoPreparacion: "ENTREGADO" });
          }
        }
        toast({ title: "Productos agregados", description: `${cart.items.length} producto(s) sumados a ${mesaSeleccionada.nombre}.` });
        await recargarOperativo(mesaSeleccionada.id);
        handleClose();
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron agregar los productos.", variant: "destructive" });
      } finally {
        setAgregandoMesa(false);
      }
      return;
    }

    if (modo === "CUENTA_ABIERTA") {
      try {
        setAgregandoMesa(true);
        const pedido = await restauranteApi.abrirPedido({
          mesaId: null as any,
          nombreCuenta: nombreCuentaRapida.trim() || "Cuenta Abierta",
          comensales: 1,
        });

        for (const item of cart.items.filter(i => !i.esCortesia)) {
          const cort = cortesias[item.producto.id] || 0;
          const cantNormal = Math.max(0, item.cantidad - cort);
          const estacion = inferirEstacion({ id: item.producto.id, nombre: item.producto.nombre, precio: item.producto.precio, enStock: 0, categoria: item.producto.categoria as any });

          if (cantNormal > 0) {
            await restauranteApi.agregarItem(pedido.id, {
              productoId: item.producto.id,
              cantidad: cantNormal,
              estacion,
              esCortesia: false,
              estadoPreparacion: "ENTREGADO",
            });
          }
          if (cort > 0) {
            await restauranteApi.agregarItem(pedido.id, {
              productoId: item.producto.id,
              cantidad: cort,
              estacion,
              esCortesia: true,
              estadoPreparacion: "ENTREGADO",
            });
          }
        }

        toast({
          title: "Cuenta Abierta Creada",
          description: `Cuenta '${nombreCuentaRapida.trim() || "Cuenta Abierta"}' creada exitosamente.`,
        });
        await recargarOperativo(pedido.id);
        handleClose();
      } catch (error) {
        toast({ title: "Error", description: "No se pudo abrir la cuenta.", variant: "destructive" });
      } finally {
        setAgregandoMesa(false);
      }
      return;
    }

    const resultado = await procesarVenta("sin-cliente", metodoPago, "Venta rápida mostrador", session);
    if (resultado && resultado.ticketData) {
      setVentaExitosaData(resultado.ticketData);
      recargarOperativo();
    } else if (resultado) {
      handleClose();
      recargarOperativo();
    }
  };

  const handleAddToMesa = async (producto: ProductoCatalogo) => {
    if (modo !== "MESA" || !mesaSeleccionada) return;
    try {
      setAgregandoMesa(true);
      const pedido =
        pedidoActivo ||
        (await restauranteApi.abrirPedido({
          mesaId: mesaSeleccionada.id,
          nombreCuenta: mesaSeleccionada.nombre,
          comensales: 1,
        }));
      await restauranteApi.agregarItem(pedido.id, {
        productoId: producto.id,
        cantidad: 1,
        estacion: inferirEstacion(producto),
        esCortesia: esCortesiaGlobal,
        estadoPreparacion: "ENTREGADO",
      });
      await recargarOperativo(mesaSeleccionada.id);
      toast({
        title: "Producto agregado",
        description: `${producto.nombre} (${esCortesiaGlobal ? "Cortesía" : "Normal"}) sumado a la mesa.`,
      });
    } catch (error) {
      toast({ title: "No se pudo agregar", description: error instanceof Error ? error.message : "Error del servidor", variant: "destructive" });
    } finally {
      setAgregandoMesa(false);
    }
  };

  const adaptarProductoParaCarrito = (prod: ProductoCatalogo): import("@/types").ProductoCarrito => ({
    id: prod.id,
    nombre: prod.nombre,
    precio: Number(prod.precio) || 0,
    tipoVenta: "UNIDAD",
    empresaId: session?.user?.empresaId as string || "",
    categoria: prod.categoria ? { id: prod.categoria.id, nombre: prod.categoria.nombre } : undefined,
  });

  const handleClickProducto = (producto: ProductoCatalogo) => {
    if (producto.enStock <= 0) return;
    // Todos los modos usan carrito; MESA confirma al final con "Agregar a Mesa"
    const existente = cart.items.find(i => i.producto.id === producto.id && !i.esCortesia);
    if (existente) {
      cart.actualizarCantidad(existente.id, existente.cantidad + 1);
    } else {
      cart.agregarItem({ producto: adaptarProductoParaCarrito(producto), cantidad: 1, esCortesia: false });
    }
  };

  const setCortesia = (productoId: string, valor: number) => {
    const item = cart.items.find(i => i.producto.id === productoId && !i.esCortesia);
    const max = item?.cantidad ?? 0;
    setCortesias(prev => ({ ...prev, [productoId]: Math.min(max, Math.max(0, valor)) }));
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch = !searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoriaSeleccionada === "todas" || p.categoria?.id === categoriaSeleccionada;
      return matchSearch && matchCat;
    });
  }, [productos, searchTerm, categoriaSeleccionada]);

  if (!modo) return null;
  const isDirecta = modo === "DIRECTA";
  const usaCarrito = modo === "DIRECTA" || modo === "CUENTA_ABIERTA" || modo === "MESA";
  const itemsCarrito = cart.items.filter(i => !i.esCortesia);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[7xl] w-[100vw] h-[100dvh] sm:w-[95vw] sm:h-[90vh] sm:rounded-xl p-0 flex flex-col overflow-hidden bg-muted/50 dark:bg-background"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-card dark:bg-background dark:bg-background shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDirecta ? "bg-emerald-500/15 text-emerald-600" : modo === "CUENTA_ABIERTA" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"}`}>
              {isDirecta ? <ShoppingCart className="h-6 w-6" /> : modo === "CUENTA_ABIERTA" ? <ClipboardList className="h-6 w-6" /> : <Presentation className="h-6 w-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isDirecta ? "Venta Directa de Mostrador" : modo === "CUENTA_ABIERTA" ? "Nueva Cuenta Rápida" : `Agregando a: ${mesaSeleccionada?.nombre}`}
              </DialogTitle>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {isDirecta ? "Venta sin mesa asignada con pago inmediato." : modo === "CUENTA_ABIERTA" ? "Abrir cuenta sin mesa para agregar consumo." : "Facturando consumo abierto en la mesa."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {ventaExitosaData ? (
          <div className="flex flex-1 items-center justify-center bg-emerald-500/10">
            <div className="bg-card dark:bg-background p-10 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full border border-emerald-100 text-center animate-in zoom-in-95 duration-300">
              <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg mb-6 shadow-emerald-500/30">
                <Gift className="h-10 w-10 text-primary-foreground" />
              </div>
              <h3 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">¡Venta Exitosa!</h3>
              <p className="text-muted-foreground mb-8 font-medium">La orden ha sido registrada en el sistema con éxito.</p>
              <div className="bg-muted/50 rounded-2xl w-full p-4 mb-6 border border-border divide-y divide-border">
                <div className="flex justify-between py-2 items-center">
                  <span className="text-sm text-muted-foreground font-semibold">Total</span>
                  <span className="text-xl font-black text-emerald-600">{formatCurrency(ventaExitosaData.total || 0)}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-sm text-muted-foreground font-semibold">Cajero</span>
                  <span className="text-sm font-bold text-foreground">{ventaExitosaData.usuario?.nombre}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <Button className="w-full text-lg h-14 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold text-primary-foreground border-0" onClick={() => setImprimirTicket(true)}>
                  🎫 Imprimir Ticket POS
                </Button>
                <Button variant="outline" className="w-full text-base h-12 rounded-xl font-bold text-muted-foreground border-border" onClick={handleClose}>
                  Cerrar y Continuar
                </Button>
              </div>
            </div>
            {imprimirTicket && <TicketPrinter open={imprimirTicket} onOpenChange={setImprimirTicket} ticketData={ventaExitosaData} />}
          </div>
        ) : (
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
            {/* Col 1: Catálogo */}
            <div className={`flex flex-col bg-muted/50/50 ${usaCarrito ? "md:border-r border-border md:w-[calc(100%-380px)]" : "w-full"} flex-1 overflow-hidden`}>
              <div className="p-4 border-b bg-card dark:bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-card dark:bg-background rounded-xl h-10"
                  />
                </div>
                <Select value={categoriaSeleccionada} onValueChange={setCategoriaSeleccionada}>
                  <SelectTrigger className="w-full sm:w-44 bg-card dark:bg-background rounded-xl h-10">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {productosFiltrados.map((prod) => {
                    const sinStock = prod.enStock <= 0;
                    const precio = etiquetaPrecio(prod).precio;
                    return (
                      <button
                        key={prod.id}
                        disabled={sinStock && modo !== "CUENTA_ABIERTA"}
                        onClick={() => handleClickProducto(prod)}
                        className={`relative flex flex-col items-start p-3 bg-card border rounded-2xl text-left transition-all ${sinStock ? "opacity-50 grayscale cursor-not-allowed" : "hover:border-border hover:shadow-md hover:-translate-y-1 active:scale-95"}`}
                      >
                        <div className="font-semibold text-foreground leading-tight pr-4">{prod.nombre}</div>
                        <div className="mt-1 text-sm text-muted-foreground font-medium">Stock: {prod.enStock}</div>
                        <div className="mt-2 text-[15px] font-bold text-emerald-600">{formatCurrency(precio)}</div>
                      </button>
                    );
                  })}
                  {productosFiltrados.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No hay productos en esta búsqueda
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Col 2: Carrito (DIRECTA, CUENTA_ABIERTA o MESA) */}
            {usaCarrito && (
              <div className="w-full md:w-[380px] bg-card dark:bg-background flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 shrink-0 border-t md:border-t-0 md:h-auto h-[45vh] md:max-h-full">
                <div className="p-3 sm:p-4 border-b bg-muted/50 shrink-0">
                  <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                    <span>Listado de {modo === "CUENTA_ABIERTA" ? "Cuenta" : "Venta"}</span>
                    <Badge variant="secondary" className="text-sm font-bold bg-border">
                      {itemsCarrito.reduce((a, i) => a + i.cantidad, 0)} ítems
                    </Badge>
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {itemsCarrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 space-y-3">
                      <ShoppingCart className="h-12 w-12 opacity-20" />
                      <p>Agrega productos del catálogo</p>
                    </div>
                  ) : (
                    itemsCarrito.map((item) => {
                      const cantCortesia = cortesias[item.producto.id] || 0;
                      const cantNormal = item.cantidad - cantCortesia;
                      const subtotalNormal = cantNormal * item.producto.precio;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border flex flex-col gap-2 ${cantCortesia > 0 ? "border-orange-500/30 bg-gradient-to-r from-white to-orange-50/50" : "border-border bg-card"}`}
                        >
                          {/* Nombre + eliminar */}
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm leading-tight text-foreground block">{item.producto.nombre}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">c/u {formatCurrency(item.producto.precio)}</span>
                                <span className="text-xs text-muted-foreground/70">·</span>
                                <span className="text-sm font-bold text-emerald-600">{formatCurrency(subtotalNormal)}</span>
                                {cantCortesia > 0 && (
                                  <span className="text-xs font-bold text-orange-500 bg-orange-500/15 px-1.5 py-0.5 rounded-full">
                                    +{cantCortesia} gratis
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => {
                                cart.eliminarItem(item.id);
                                setCortesias(prev => { const n = { ...prev }; delete n[item.producto.id]; return n; });
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:bg-destructive/15 rounded-full shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Controles cantidad + cortesía */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Cantidad */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase mr-1">Cant.</span>
                              <div className="flex items-center bg-muted rounded-lg border">
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-border rounded-l-lg transition disabled:opacity-40"
                                  disabled={item.cantidad <= 1}
                                  onClick={() => {
                                    const nueva = item.cantidad - 1;
                                    cart.actualizarCantidad(item.id, nueva);
                                    if (cantCortesia > nueva) setCortesia(item.producto.id, nueva);
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-7 text-center text-sm font-bold text-foreground">{item.cantidad}</span>
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-border rounded-r-lg transition"
                                  onClick={() => cart.actualizarCantidad(item.id, item.cantidad + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="w-px h-6 bg-border" />

                            {/* Cortesía por unidades */}
                            <div className="flex items-center gap-1">
                              <Gift className="h-3.5 w-3.5 text-orange-500" />
                              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase mr-1">Cortesía</span>
                              <div className="flex items-center bg-orange-500/10 rounded-lg border border-orange-500/30">
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 rounded-l-lg transition disabled:opacity-40"
                                  disabled={cantCortesia <= 0}
                                  onClick={() => setCortesia(item.producto.id, cantCortesia - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className={`w-7 text-center text-sm font-bold ${cantCortesia > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/70"}`}>
                                  {cantCortesia}
                                </span>
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 rounded-r-lg transition disabled:opacity-40"
                                  disabled={cantCortesia >= item.cantidad}
                                  onClick={() => setCortesia(item.producto.id, cantCortesia + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 sm:p-4 bg-muted/50 border-t flex flex-col gap-3 sm:gap-4 shrink-0">
                  {modo === "CUENTA_ABIERTA" ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Referencia de Cuenta</label>
                      <Input
                        placeholder="Ej: Cliente Barra Jhon"
                        className="bg-card dark:bg-background h-9"
                        value={nombreCuentaRapida}
                        onChange={e => setNombreCuentaRapida(e.target.value)}
                      />
                    </div>
                  ) : modo === "MESA" ? null : isDirecta ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Método de Pago</label>
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger className="bg-card dark:bg-background h-9">
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                          <SelectItem value="TARJETA_DEBITO">💳 Tarjeta Débito</SelectItem>
                          <SelectItem value="TARJETA_CREDITO">💳 Tarjeta Crédito</SelectItem>
                          <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-base sm:text-lg font-bold text-foreground pt-1 sm:pt-2 border-t border-border">
                    <span>{modo === "CUENTA_ABIERTA" ? "Monto a cobrar" : "Total a cobrar"}</span>
                    <span className={modo === "CUENTA_ABIERTA" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600"}>
                      {formatCurrency(totalCalculado)}
                    </span>
                  </div>

                  <Button
                    className={`w-full text-sm sm:text-base h-10 sm:h-12 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 ${
                      modo === "CUENTA_ABIERTA" ? "bg-indigo-600 hover:bg-indigo-700 text-white" :
                      modo === "MESA" ? "bg-blue-600 hover:bg-blue-700 text-white" :
                      "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                    disabled={itemsCarrito.length === 0 || procesando || agregandoMesa}
                    onClick={handleCheckoutDirecta}
                  >
                    {procesando || agregandoMesa ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-white" />
                    ) : (
                      <>
                        {modo === "CUENTA_ABIERTA" ? <ClipboardList className="h-5 w-5" /> : modo === "MESA" ? <Wine className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                        {modo === "CUENTA_ABIERTA" ? "Guardar Cuenta" : modo === "MESA" ? `Agregar a ${mesaSeleccionada?.nombre ?? "Mesa"}` : "Emitir Ticket"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}