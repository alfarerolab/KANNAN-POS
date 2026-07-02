"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Scissors } from "lucide-react";

// Hooks
import { useAutorizacion } from "@/hooks/use-autorizacion";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useProductLoader } from "@/hooks/pos/useProductLoader";
import { useServiceLoader } from "@/hooks/pos/useServiceLoader";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

// Componentes existentes
import { ProtectorAutorizacion } from "@/components/authorization-guard";
import { TicketPrinter } from "@/components/ui/ticket-printer";
import { UnifiedSearchBar } from "@/components/pos/BarraDeBusqueda";
import { ProductGrid, ServiceGrid } from "@/components/pos";

// Componentes refactorizados - Importar desde sus archivos
import { POSHeaderSection } from "@/components/pos/POSHeaderSection";
import { ClientSelectionDialog } from "@/components/pos/ClientSelectionDialog";
import { CheckoutDialog, PagoDetalle } from "@/components/pos/CheckoutDialog";
import { SaleCompletionDialog } from "@/components/pos/SaleCompletionDialog";
import { ShoppingCartPanel } from "@/components/pos/ShoppingCartPanel";
import { LoadingScreen } from "@/components/pos/LoadingScreen";
import { ErrorScreen } from "@/components/pos/ErrorScreen";
import { ServiceActionDialog } from "@/components/pos/ServiceActionDialog";
import { EmployeeAssignmentDialog, type AsignacionItem } from "@/components/pos/EmployeeAssignmentDialog";
import { SelectEmployeeDialog } from "@/components/pos/SelectEmployeeDialog";

// Hooks personalizados
import { useSaleProcessing } from "@/hooks/pos/useSaleProcessing";

// Tipos
import type { ProductoCarrito, AgregarProductoCarrito } from "@/types";

// Función utilitaria para verificar duplicados de servicios
const verificarDuplicadoServicio = (nuevoServicio: any, itemsActuales: any[]): boolean => {
  const duplicado = itemsActuales.find(item => {
    if (!item.producto.esServicio) return false;

    if (nuevoServicio.citaId && item.producto.citaId === nuevoServicio.citaId) {
      return true;
    }

    const servicioIdNuevo = nuevoServicio.servicioId || nuevoServicio.id;
    const servicioIdExistente = item.producto.servicioId || item.producto.id;

    if (servicioIdNuevo && servicioIdExistente && servicioIdNuevo === servicioIdExistente) {
      return true;
    }

    return false;
  });

  return !!duplicado;
};

export default function POSPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { tienePermiso, estaCargando } = useAutorizacion();

  useEffect(() => {
    if (status === "loading" || estaCargando) return;

    if (!session) {
      router.push("/iniciar-sesion");
      return;
    }

    if (!tienePermiso("crearVenta")) {
      router.push("/dashboard");
    }
  }, [session, status, router, tienePermiso, estaCargando]);

  if (estaCargando || status === "loading") {
    return <LoadingScreen />;
  }

  return (
    <ProtectorAutorizacion permiso="crearVenta" redirigirA="/dashboard">
      <PuntoDeVenta />
    </ProtectorAutorizacion>
  );
}

function PuntoDeVenta() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const lastScanTime = useRef(0);

  const {
    configuracion,
    obtenerConfiguracionPOS,
    tieneServicios,
    tieneVariantes,
    tieneLotes,
    tieneVencimientos,
    esVeterinaria,
    estaCargando: configCargando
  } = useConfiguracionEmpresa();

  const configPOS = obtenerConfiguracionPOS();
  const empresaId = session?.user?.empresaId;

  // Estados principales
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vistaActual, setVistaActual] = useState<"productos" | "servicios">("productos");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<string>("todos");
  const [servicioAutoCargado, setServicioAutoCargado] = useState(false);

  // Estados para diálogos
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [completadoDialogOpen, setCompletadoDialogOpen] = useState(false);
  const [ticketPrinterOpen, setTicketPrinterOpen] = useState(false);
  const [ticketAutoImprimir, setTicketAutoImprimir] = useState(false);
  const [mascotaDialogOpen, setMascotaDialogOpen] = useState(false);
  const [esCortesiaActiva, setEsCortesiaActiva] = useState(false);
  // Dialogs peluquería
  const [serviceActionOpen, setServiceActionOpen] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null);
  const [employeeAssignmentOpen, setEmployeeAssignmentOpen] = useState(false);
  const [consumosInternosPorItem, setConsumosInternosPorItem] = useState<Record<string, { productoId: string; cantidad: number }[]>>({});

  // Nuevo Dialog para seleccionar empleado al agregar al carrito
  const [selectEmployeeOpen, setSelectEmployeeOpen] = useState(false);
  const [servicioToAddToCart, setServicioToAddToCart] = useState<any>(null);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<any[]>([]);

  // Estados de datos
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("EFECTIVO");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [notas, setNotas] = useState("");
  const [ventaCompletada, setVentaCompletada] = useState<any>(null);
  const [ticketData, setTicketData] = useState<any>(null);

  // 🆕 NUEVO: Estado para guardar los pagos múltiples
  const [pagosRealizados, setPagosRealizados] = useState<PagoDetalle[]>([]);

  // Estados específicos para diferentes tipos de negocio
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<any>(null);
  const [loteSeleccionado, setLoteSeleccionado] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [proximaCita, setProximaCita] = useState("");

  // Hook del carrito
  const {
    items,
    subtotal,
    total,
    agregarItem,
    eliminarItem,
    actualizarCantidad,
    actualizarPeso,
    vaciarCarrito,
    totalItems
  } = useCart();

  // Hooks especializados para cargar datos
  const { productos, categorias, isLoading: productosLoading } = useProductLoader({
    searchTerm,
    categoriaSeleccionada,
    empresaId,
    configuracion,
    configPOS,
    filtroDisponibilidad
  });

  const { servicios, isLoading: serviciosLoading } = useServiceLoader({
    empresaId,
    mostrarServicios: configPOS?.mostrarServicios,
    searchTerm: vistaActual === "servicios" ? searchTerm : "",
    categoriaSeleccionada: vistaActual === "servicios" ? categoriaSeleccionada : null
  });

  // Hook para procesamiento de ventas
  const { procesarVenta, procesandoVenta } = useSaleProcessing({
    items,
    empresaId: empresaId!,
    configuracion,
    subtotal,
    total,
    vaciarCarrito
  });

  // Funciones utilitarias
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(valor);
  };

  // Función para reproducir sonido de éxito
  const playBeepSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
    }
  }, []);

  // Función para reproducir sonido de error
  const playErrorSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 300;
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
    }
  }, []);

  // Handlers - DEFINIR ANTES DEL HOOK DE BARCODE SCANNER
  const handleAddToCart = useCallback((producto: any, data?: any) => {
    if (producto.empresaId !== empresaId) {
      toast({
        title: "Error",
        description: "No tienes permisos para vender este producto",
        variant: "destructive"
      });
      return;
    }

    const variante = data?.variante;
    const cantidad = data?.cantidad || 1;

    const productoCarrito: ProductoCarrito = {
      id: variante ? `${producto.id}-${variante.id}` : producto.id,
      nombre: variante ? `${producto.nombre} - ${variante.nombre}` : producto.nombre,
      precio: variante?.precio || producto.precio,
      tipoVenta: producto.tipoVenta || "UNIDAD",
      imagen: producto.imagen,
      enStock: variante?.enStock || producto.enStock,
      empresaId: producto.empresaId,
      categoria: producto.categoria,
      variante: variante,
      lote: loteSeleccionado || undefined,
      fechaVencimiento: fechaVencimiento || undefined,
      mascota: esVeterinaria() ? mascotaSeleccionada : undefined,
      diagnostico: esVeterinaria() ? diagnostico : undefined,
      tratamiento: esVeterinaria() ? tratamiento : undefined,
      proximaCita: esVeterinaria() && proximaCita ? proximaCita : undefined
    };

    agregarItem({
      producto: productoCarrito,
      cantidad,
      peso: data?.peso,
      medida: data?.medida,
      unidadMedida: data?.unidadMedida,
      precioLibre: data?.precioLibre,
      esCortesia: esCortesiaActiva
    });

    toast({
      title: "Producto agregado",
      description: `${productoCarrito.nombre} agregado al carrito`
    });

    // Limpiar selecciones
    setVarianteSeleccionada(null);
    setLoteSeleccionado("");
    setFechaVencimiento("");
    if (esVeterinaria()) {
      setDiagnostico("");
      setTratamiento("");
      setProximaCita("");
    }
  }, [empresaId, loteSeleccionado, fechaVencimiento, mascotaSeleccionada, diagnostico, tratamiento, proximaCita, esVeterinaria, agregarItem, toast]);

  const handleSelectServicio = useCallback((servicio: any) => {
    // Para peluquerías: mostrar dialog de elección (walk-in vs cita)
    const esPeluqueriaActiva = configuracion?.empresa?.tipoNegocio === 'PELUQUERIA' ||
      configuracion?.empresa?.tipoNegocio === 'SALON_BELLEZA';

    if (esPeluqueriaActiva) {
      setServicioSeleccionado(servicio);
      setServiceActionOpen(true);
      return;
    }

    // Otros negocios: redirigir directo a citas (comportamiento original)
    _redirigirACitas(servicio);
  }, [configuracion, empresaId, clienteSeleccionado, toast, router]);

  // Cargar empleados para el dialog de selección rápida
  useEffect(() => {
    if (empleadosDisponibles.length === 0) {
      fetch("/api/pos/empleados")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setEmpleadosDisponibles(data); })
        .catch(console.error);
    }
  }, []);

  // Agregar servicio directo al carrito (walk-in peluquería)
  const handleServicioAlCarrito = useCallback((servicio: any) => {
    if (verificarDuplicadoServicio(servicio, items)) {
      toast({ title: "Servicio ya en el carrito", description: `${servicio.nombre} ya está agregado` });
      return;
    }
    setServicioToAddToCart(servicio);
    setSelectEmployeeOpen(true);
  }, [items, toast]);

  // Confirmar selección de empleado y agregar servicio al carrito
  const handleConfirmarEmpleadoYAgregarAlCarrito = useCallback((empleadoId: string) => {
    const servicio = servicioToAddToCart;
    if (!servicio) return;

    const empleadoIdFinal = empleadoId === "ninguno" ? undefined : empleadoId;
    const servicioCarrito: ProductoCarrito = {
      id: servicio.id,
      nombre: servicio.nombre,
      precio: Number(servicio.precio) || 0,
      imagen: servicio.imagen || undefined,
      enStock: 999,
      empresaId: servicio.empresaId || empresaId!,
      categoria: servicio.categoria || 'Servicios',
      tipoVenta: 'SERVICIO',
      esServicio: true,
      duracion: servicio.duracion || 60,
      servicioId: servicio.id,
      requiereEmpleado: servicio.requiereEmpleado,
      color: servicio.color,
      descripcion: servicio.descripcion,
    };
    agregarItem({ producto: servicioCarrito, cantidad: 1, empleadoId: empleadoIdFinal });
    const empleadoNombre = empleadoIdFinal
      ? (empleadosDisponibles.find(e => e.id === empleadoIdFinal)?.nombre || 'Empleado asignado')
      : 'Sin empleado';
    toast({ title: "✔️ Servicio agregado", description: `${servicio.nombre} → ${empleadoNombre}` });
    setServicioToAddToCart(null);
  }, [servicioToAddToCart, empresaId, agregarItem, toast, empleadosDisponibles]);

  // Redirigir a citas (flujo original)
  const _redirigirACitas = useCallback((servicio: any) => {
    const servicioParaAgendamiento = {
      id: servicio.id,
      nombre: servicio.nombre,
      precio: servicio.precio,
      duracion: servicio.duracion,
      categoria: servicio.categoria,
      descripcion: servicio.descripcion,
      color: servicio.color,
      requiereEmpleado: servicio.requiereEmpleado,
      empresaId: servicio.empresaId || empresaId,
      cliente: clienteSeleccionado
    };
    localStorage.setItem('servicioParaAgendamiento', JSON.stringify(servicioParaAgendamiento));
    toast({ title: "Redirigiendo a agendar cita", description: `Seleccionaste: ${servicio.nombre}`, duration: 2000 });
    const params = new URLSearchParams({
      nuevaCita: 'true',
      servicioId: servicio.id,
      ...(clienteSeleccionado && { clienteId: clienteSeleccionado.id.toString() })
    });
    router.push(`/dashboard/citas?${params.toString()}`);
  }, [empresaId, clienteSeleccionado, toast, router]);

  // Función para manejar escaneo de códigos de barras
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const now = Date.now();
    if (now - lastScanTime.current < 500) {
      return;
    }
    lastScanTime.current = now;

    try {
      toast({
        title: "🔍 Buscando producto...",
        description: `Código: ${barcode}`,
        duration: 2000
      });

      const response = await fetch(
        `/api/pos/productos/buscar-por-codigo?codigo=${encodeURIComponent(barcode)}&empresaId=${empresaId}`
      );

      if (!response.ok) {
        const error = await response.json();
        playErrorSound();
        toast({
          title: "❌ Producto no encontrado",
          description: error.mensaje || `No se encontró producto con código: ${barcode}`,
          variant: "destructive",
          duration: 4000
        });
        return;
      }

      const producto = await response.json();
      if (producto.esServicio) {
        playBeepSound();
        handleSelectServicio(producto);
        return;
      }

      const datosCarrito: any = {
        cantidad: 1
      };

      if (producto.variantePreseleccionada) {
        datosCarrito.variante = producto.variantePreseleccionada;
      }

      handleAddToCart(producto, datosCarrito);

      const nombreCompleto = producto.variantePreseleccionada
        ? `${producto.nombre} - ${producto.variantePreseleccionada.nombre}`
        : producto.nombre;

      toast({
        title: "✅ Producto agregado",
        description: `${nombreCompleto} - ${formatearMoneda(producto.precio)}`,
        duration: 2000
      });

      playBeepSound();

    } catch (error) {
      console.error('Error al buscar producto:', error);
      playErrorSound();
      toast({
        title: "Error",
        description: "No se pudo procesar el código escaneado",
        variant: "destructive"
      });
    }
  }, [empresaId, toast, playBeepSound, playErrorSound, handleAddToCart, handleSelectServicio, formatearMoneda]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 8,
    timeThreshold: 100,
    enabled: !checkoutDialogOpen && !clienteDialogOpen && !completadoDialogOpen && !serviceActionOpen && !employeeAssignmentOpen
  });

  // Handler para confirmar asignación de empleados (peluquería)
  const handleConfirmarAsignaciones = useCallback((asignaciones: AsignacionItem[]) => {
    // Actualizar empleadoId en los items del carrito
    asignaciones.forEach(({ itemId, empleadoId, consumos }) => {
      if (empleadoId) {
        // Actualizar el item en el carrito con el empleadoId
        const item = items.find(i => i.id === itemId);
        if (item) {
          // Mutamos el item directo en el array (el hook use-cart lo expondra)
          item.empleadoId = empleadoId;
        }
      }
    });

    // Guardar consumos internos por item
    const consumosPorItem: Record<string, { productoId: string; cantidad: number }[]> = {};
    asignaciones.forEach(({ itemId, consumos }) => {
      if (consumos.length > 0) {
        consumosPorItem[itemId] = consumos.map(c => ({ productoId: c.productoId, cantidad: c.cantidad }));
      }
    });
    setConsumosInternosPorItem(consumosPorItem);

    // Abrir checkout
    setCheckoutDialogOpen(true);
  }, [items]);

  const [comandaActivaId, setComandaActivaId] = useState<string | undefined>(undefined);

  // Auto-carga de Comanda Completa
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoAddComanda = params.get('autoAddComanda');

    if (autoAddComanda === 'true' && empresaId && items.length === 0) {
      const comandaParaCobro = localStorage.getItem('comandaParaCobro');

      if (comandaParaCobro) {
        try {
          const comanda = JSON.parse(comandaParaCobro);

          if (comanda.empresaId === empresaId) {
            // Guardar ID de la comanda para cerrarla al cobrar
            setComandaActivaId(comanda.id);

            // Cargar cliente si tiene
            if (comanda.cliente) {
              setClienteSeleccionado({
                id: comanda.cliente.id,
                nombre: comanda.cliente.nombre,
                empresaId: empresaId
              });
            }

            if (comanda.items && comanda.items.length > 0) {
              let consumosAAsignar: Record<string, any[]> = {};

              comanda.items.forEach((item: any) => {
                const esServicio = !!item.servicio;
                const srcItem = esServicio ? item.servicio : item.producto;

                const productoCarrito: ProductoCarrito = {
                  id: srcItem.id,
                  nombre: srcItem.nombre,
                  precio: Number(item.precio) || 0,
                  imagen: srcItem.imagen || undefined,
                  enStock: srcItem.enStock ?? 999,
                  empresaId: empresaId,
                  categoria: srcItem.categoria || (esServicio ? 'Servicios' : 'Productos'),
                  tipoVenta: srcItem.tipoVenta || (esServicio ? "SERVICIO" : "UNIDAD"),
                  esServicio: esServicio,
                  duracion: srcItem.duracion || 60,
                  servicioId: esServicio ? srcItem.id : undefined,
                };

                agregarItem({ 
                  id: item.id, // NUEVO: Usar el mismo ID para poder asignarle los consumos
                  producto: productoCarrito, 
                  cantidad: 1,
                  empleadoId: item.empleadoId || undefined
                });

                // NUEVO: Extraer consumos internos para este item
                if (item.consumosInternos && Array.isArray(item.consumosInternos) && item.consumosInternos.length > 0) {
                  consumosAAsignar[item.id] = item.consumosInternos.map((c: any) => ({
                    productoId: c.producto?.id || c.productoId,
                    nombreProducto: c.producto?.nombre || 'Producto',
                    cantidad: c.cantidad
                  }));
                }
              });

              if (Object.keys(consumosAAsignar).length > 0) {
                setConsumosInternosPorItem(consumosAAsignar);
              }

              toast({
                title: "Cuenta cargada",
                description: `Se agregaron ${comanda.items.length} servicios de la cuenta abierta`
              });
            }

            localStorage.removeItem('comandaParaCobro');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error al procesar comanda para cobro:', error);
          localStorage.removeItem('comandaParaCobro');
        }
      }
    }
  }, [empresaId, agregarItem, toast, items]);

  // Auto-carga de servicio desde cita
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoAddService = params.get('autoAddService');

    if (autoAddService === 'true' && empresaId && !servicioAutoCargado && items.length === 0) {
      const servicioParaCobro = localStorage.getItem('servicioParaCobro');

      if (servicioParaCobro) {
        try {
          const servicio = JSON.parse(servicioParaCobro);

          if (servicio.empresaId === empresaId || servicio.cliente?.empresaId === empresaId) {
            if (verificarDuplicadoServicio(servicio, items)) {
              toast({
                title: "Servicio ya en el carrito",
                description: `${servicio.nombre} ya está agregado`
              });
            } else {
              const servicioCarrito: ProductoCarrito = {
                id: servicio.servicioId || servicio.id,
                nombre: servicio.nombre,
                precio: Number(servicio.precio) || 0,
                imagen: servicio.imagen || undefined,
                enStock: 999,
                empresaId: empresaId,
                categoria: servicio.categoria || 'Servicios',
                tipoVenta: "SERVICIO",
                esServicio: true,
                duracion: servicio.duracion || 60,
                servicioId: servicio.servicioId || servicio.id,
                citaId: servicio.citaId,
                clienteAsociado: servicio.cliente
              };

              agregarItem({ producto: servicioCarrito, cantidad: 1 });

              if (servicio.cliente?.id) {
                setClienteSeleccionado({
                  id: servicio.cliente.id,
                  nombre: servicio.cliente.nombre,
                  empresaId: empresaId
                });
              }

              if (tieneServicios()) {
                setVistaActual("servicios");
              }

              toast({
                title: "Servicio agregado desde cita",
                description: `${servicio.nombre} agregado al carrito para cobro`
              });
            }

            setServicioAutoCargado(true);
            localStorage.removeItem('servicioParaCobro');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error al procesar servicio desde cita:', error);
          localStorage.removeItem('servicioParaCobro');
        }
      }
    }
  }, [empresaId, tieneServicios, agregarItem, toast, servicioAutoCargado, items]);

  if (configCargando) {
    return <LoadingScreen message="Configurando sistema..." />;
  }

  if (!empresaId || !configuracion) {
    return (
      <ErrorScreen
        title="Error de Configuración"
        message={
          !empresaId
            ? "No se pudo identificar la empresa asociada a tu cuenta."
            : "No se pudo cargar la configuración de la empresa."
        }
      />
    );
  }



  // FUNCIÓN PARA PROCESAR VENTA CON PAGO ÚNICO
  const handleProcesarVenta = async (referencia?: string) => {
    setPagosRealizados([]); // Limpiar pagos múltiples

    // Si hay referencia (transferencia / tarjeta), la empaquetamos como un pago único
    // con referencia para que quede guardada en la venta
    const pagosConReferencia = referencia
      ? [{ id: crypto.randomUUID(), metodoPago: metodoPagoSeleccionado, monto: total, referencia }]
      : undefined;

    const resultado = await procesarVenta(
      clienteSeleccionado,
      metodoPagoSeleccionado,
      notas,
      session,
      pagosConReferencia, // undefined cuando no hay referencia (comportamiento original)
      Object.keys(consumosInternosPorItem).length > 0 ? consumosInternosPorItem : undefined,
      comandaActivaId
    );

    if (resultado) {
      setVentaCompletada(resultado.venta);
      setTicketData(resultado.ticketData);
      setCheckoutDialogOpen(false);
      vaciarCarrito();
      setCompletadoDialogOpen(true);

      toast({
        title: "Venta procesada exitosamente",
        description: `Total: ${formatearMoneda(total)}${resultado.citasActualizadas > 0 ? ` - ${resultado.citasActualizadas} cita(s) completada(s)` : ''}`
      });
    }
  };

  // FUNCIÓN PARA PROCESAR VENTA CON PAGOS MÚLTIPLES
  const handleProcesarVentaMultiple = async (pagos: PagoDetalle[]) => {
    setPagosRealizados(pagos); // Guardar pagos

    const resultado = await procesarVenta(
      clienteSeleccionado,
      pagos[0].metodoPago,
      notas,
      session,
      pagos, // Pasar los pagos múltiples
      Object.keys(consumosInternosPorItem).length > 0 ? consumosInternosPorItem : undefined,
      comandaActivaId
    );

    if (resultado) {
      setVentaCompletada(resultado.venta);
      setTicketData(resultado.ticketData);
      setCheckoutDialogOpen(false);
      vaciarCarrito();
      setCompletadoDialogOpen(true);

      toast({
        title: "Venta procesada exitosamente",
        description: `Total: ${formatearMoneda(total)} - Pago Mixto${resultado.citasActualizadas > 0 ? ` - ${resultado.citasActualizadas} cita(s) completada(s)` : ''}`
      });
    }
  };

  const handleCompletadoCierre = () => {
    setCompletadoDialogOpen(false);
    vaciarCarrito();
    setClienteSeleccionado(null);
    setNotas("");
    setVentaCompletada(null);
    setPagosRealizados([]);
    setServicioAutoCargado(false);
    setConsumosInternosPorItem({}); // Limpiar consumos

    localStorage.removeItem('servicioParaCobro');
    localStorage.removeItem('servicioParaAgendamiento');

    if (esVeterinaria()) {
      setMascotaSeleccionada(null);
      setDiagnostico("");
      setTratamiento("");
      setProximaCita("");
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="h-[calc(100vh-112px)] lg:h-[calc(100vh-128px)] w-full flex flex-col overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <POSHeaderSection
          nombreEmpresa={configuracion?.empresa?.nombre || "Mi Empresa"}
          clienteSeleccionado={clienteSeleccionado}
          mascotaSeleccionada={mascotaSeleccionada}
          esVeterinaria={esVeterinaria()}
          onOpenClientDialog={() => setClienteDialogOpen(true)}
          onOpenMascotaDialog={() => setMascotaDialogOpen(true)}
        />
      </div>

      {/* Cuerpo: productos (scroll) + carrito (fijo altura completa) */}
      <div className="flex flex-1 overflow-hidden gap-4 px-4 pb-4 min-h-0">
        {/* Panel Izquierdo - scroll interno */}
        <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
          {/* Barra de búsqueda */}
          <UnifiedSearchBar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            categoriaSeleccionada={categoriaSeleccionada}
            onCategoriaChange={setCategoriaSeleccionada}
            categorias={categorias}
            filtroDisponibilidad={filtroDisponibilidad}
            onFiltroDisponibilidadChange={setFiltroDisponibilidad}
            mostrarFiltroDisponibilidad={vistaActual === "productos"}
            productos={vistaActual === "productos" ? productos : servicios}
            empresaId={empresaId}
            onAddToCart={vistaActual === "productos" ? handleAddToCart : handleSelectServicio}
            placeholder={vistaActual === "productos" ? "Buscar productos o escanear código..." : "Buscar servicios..."}
            vistaActual={vistaActual}
          />

          {/* Toggle de Cortesía para Escaneos Inmediatos */}
          <div className="flex justify-end p-2 px-4 -mt-4 bg-muted/30 border-x border-b border-muted rounded-b-xl items-center gap-2">
            <Checkbox
              id="cortesia-pos"
              checked={esCortesiaActiva}
              onCheckedChange={(checked) => setEsCortesiaActiva(checked as boolean)}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 w-5 h-5"
            />
            <Label htmlFor="cortesia-pos" className="text-sm font-medium cursor-pointer text-foreground/80">
              Próximo artículo es Cortesía ($0)
            </Label>
          </div>

          {/* Tabs para productos y servicios */}
          {tieneServicios() ? (
            <Card className="border-0 shadow-md bg-card/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <Tabs value={vistaActual} onValueChange={(value) => setVistaActual(value as "productos" | "servicios")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6 p-1 rounded-xl">
                    <TabsTrigger value="productos" className="flex items-center gap-2 rounded-lg">
                      <Package className="h-5 w-5" />
                      Productos
                      {productos.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {productos.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="servicios" className="flex items-center gap-2 rounded-lg">
                      <Scissors className="h-5 w-5" />
                      Servicios
                      {servicios.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {servicios.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="productos" className="space-y-4">
                    <ProductGrid
                      productos={productos}
                      categorias={categorias}
                      categoriaSeleccionada={categoriaSeleccionada}
                      isLoading={productosLoading}
                      searchTerm={searchTerm}
                      configuracion={configuracion}
                      formatearMoneda={formatearMoneda}
                      tieneVariantes={tieneVariantes()}
                      tieneLotes={tieneLotes()}
                      tieneVencimientos={tieneVencimientos()}
                      varianteSeleccionada={varianteSeleccionada}
                      setVarianteSeleccionada={setVarianteSeleccionada}
                      loteSeleccionado={loteSeleccionado}
                      setLoteSeleccionado={setLoteSeleccionado}
                      fechaVencimiento={fechaVencimiento}
                      setFechaVencimiento={setFechaVencimiento}
                      onCategoriaChange={setCategoriaSeleccionada}
                      onAddToCart={handleAddToCart}
                    />
                  </TabsContent>

                  <TabsContent value="servicios" className="space-y-4">
                    <ServiceGrid
                      servicios={servicios}
                      categorias={categorias}
                      categoriaSeleccionada={categoriaSeleccionada}
                      isLoading={serviciosLoading}
                      searchTerm={vistaActual === "servicios" ? searchTerm : ""}
                      formatearMoneda={formatearMoneda}
                      onCategoriaChange={setCategoriaSeleccionada}
                      onSelectService={handleSelectServicio}
                      onAddToCart={handleServicioAlCarrito}
                      redirectToCitas={true}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md bg-card/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <ProductGrid
                  productos={productos}
                  categorias={categorias}
                  categoriaSeleccionada={categoriaSeleccionada}
                  isLoading={productosLoading}
                  searchTerm={searchTerm}
                  configuracion={configuracion}
                  formatearMoneda={formatearMoneda}
                  tieneVariantes={tieneVariantes()}
                  tieneLotes={tieneLotes()}
                  tieneVencimientos={tieneVencimientos()}
                  varianteSeleccionada={varianteSeleccionada}
                  setVarianteSeleccionada={setVarianteSeleccionada}
                  loteSeleccionado={loteSeleccionado}
                  setLoteSeleccionado={setLoteSeleccionado}
                  fechaVencimiento={fechaVencimiento}
                  setFechaVencimiento={setFechaVencimiento}
                  onCategoriaChange={setCategoriaSeleccionada}
                  onAddToCart={handleAddToCart}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Carrito (Maneja su propia visibilidad mobile/desktop) */}
        <ShoppingCartPanel
          items={items}
          totalItems={totalItems}
          subtotal={subtotal}
          total={total}
          formatearMoneda={formatearMoneda}
          onUpdateQuantity={actualizarCantidad}
          onUpdateWeight={actualizarPeso}
          onRemoveItem={eliminarItem}
          onConsumoChange={(itemId, consumos) => {
            setConsumosInternosPorItem(prev => ({
              ...prev,
              [itemId]: consumos.map(c => ({ productoId: c.productoId, cantidad: c.cantidad }))
            }));
          }}
          onOpenCheckout={() => {
            const esPeluqueriaActiva =
              configuracion?.empresa?.tipoNegocio === 'PELUQUERIA' ||
              configuracion?.empresa?.tipoNegocio === 'SALON_BELLEZA';
            const itemsServicio = items.filter(i => i.producto.esServicio);
            const tieneServicios = itemsServicio.length > 0;

            if (esPeluqueriaActiva && tieneServicios) {
              // Si todos los servicios ya tienen empleado asignado, ir directo al cobro
              const todosConEmpleado = itemsServicio.every(i => i.empleadoId);
              if (todosConEmpleado) {
                setCheckoutDialogOpen(true);
              } else {
                setEmployeeAssignmentOpen(true);
              }
            } else {
              setCheckoutDialogOpen(true);
            }
          }}
          onClearCart={vaciarCarrito}
          empleados={empleadosDisponibles}
          initialConsumos={
            Object.keys(consumosInternosPorItem).reduce((acc: any, key) => {
              acc[key] = consumosInternosPorItem[key].map(c => ({
                productoId: c.productoId,
                nombreProducto: (c as any).nombreProducto || 'Producto',
                cantidad: c.cantidad
              }));
              return acc;
            }, {})
          }
        />

        {/* Diálogos */}
        {/* Dialogs peluquería */}
        <ServiceActionDialog
          open={serviceActionOpen}
          onOpenChange={setServiceActionOpen}
          servicio={servicioSeleccionado}
          onAgregarAlCarrito={handleServicioAlCarrito}
          onCrearCita={_redirigirACitas}
        />

        <EmployeeAssignmentDialog
          open={employeeAssignmentOpen}
          onOpenChange={setEmployeeAssignmentOpen}
          items={items}
          onConfirmar={handleConfirmarAsignaciones}
        />

        {/* Dialog para seleccionar empleado al agregar servicio al carrito */}
        <SelectEmployeeDialog
          open={selectEmployeeOpen}
          onOpenChange={setSelectEmployeeOpen}
          servicio={servicioToAddToCart}
          empleados={empleadosDisponibles}
          cargandoEmpleados={false}
          onConfirm={handleConfirmarEmpleadoYAgregarAlCarrito}
        />

        <ClientSelectionDialog
          open={clienteDialogOpen}
          onOpenChange={setClienteDialogOpen}
          empresaId={empresaId!}
          clienteSeleccionado={clienteSeleccionado}
          onSelectCliente={setClienteSeleccionado}
        />

        <CheckoutDialog
          open={checkoutDialogOpen}
          onOpenChange={setCheckoutDialogOpen}
          metodoPagoSeleccionado={metodoPagoSeleccionado}
          onMetodoPagoChange={setMetodoPagoSeleccionado}
          clienteSeleccionado={clienteSeleccionado}
          onOpenClientDialog={() => setClienteDialogOpen(true)}
          notas={notas}
          onNotasChange={setNotas}
          subtotal={subtotal}
          total={total}
          totalItems={totalItems}
          formatearMoneda={formatearMoneda}
          procesandoVenta={procesandoVenta}
          onProcesarVenta={handleProcesarVenta}
          onProcesarVentaMultiple={handleProcesarVentaMultiple}
        />

        <SaleCompletionDialog
          open={completadoDialogOpen}
          onOpenChange={setCompletadoDialogOpen}
          ventaCompletada={ventaCompletada}
          total={ventaCompletada?.total ?? total}
          metodoPagoSeleccionado={metodoPagoSeleccionado}
          formatearMoneda={formatearMoneda}
          onViewTicket={() => {
            setTicketAutoImprimir(false);
            setTicketPrinterOpen(true);
          }}
          onPrintTicket={() => {
            setTicketAutoImprimir(true);
            setTicketPrinterOpen(true);
          }}
          onNewSale={handleCompletadoCierre}
          ticketData={ticketData}
          pagosMultiples={pagosRealizados}
        />

        {/* Sistema de Impresión de Tickets */}
        {ticketData && (
          <TicketPrinter
            ticketData={ticketData}
            open={ticketPrinterOpen}
            onOpenChange={setTicketPrinterOpen}
            autoImprimir={ticketAutoImprimir}
            abrirCajero={metodoPagoSeleccionado === "EFECTIVO"}
            onPrintComplete={() => {
              setTicketPrinterOpen(false);
              toast({
                title: "Ticket procesado",
                description: "El ticket ha sido generado correctamente"
              });
            }}
          />
        )}
      </div>
    </div>
  );
}