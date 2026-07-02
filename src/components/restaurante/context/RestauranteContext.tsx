"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  EstacionPreparacionRestaurante,
  EstadoMesaRestaurante,
  EstadoPreparacionRestaurante,
  MetodoPago,
} from "@/lib/prisma-types";
import { useReactToPrint } from "react-to-print";

import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { useToast } from "@/hooks/use-toast";
import { servicioClientes, servicioPOS } from "@/lib/api-service";
import { restauranteApi } from "@/lib/restaurante-api";
import {
  calcularDivisionIgual,
  calcularDivisionPorItems,
  construirTicketRestaurante,
  ESTACIONES_PREPARACION,
  inferirEstacionPreparacion,
} from "@/lib/restaurante-shared";
import type {
  MetodoPagoRestaurante,
  RestauranteMesa,
  RestaurantePedidoItem,
  RestaurantePreparacionItem,
  RestauranteReporteResumen,
} from "@/types/restaurante";

// ─── Interfaces locales ───────────────────────────────────────────────────────

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | null;
  enStock: number;
  categoria?: { id: string; nombre: string } | null;
}

export interface ClienteCatalogo {
  id: string;
  nombre: string;
  telefono?: string | null;
}

interface ProductoCatalogoApi {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  enStock?: number | string | null;
  categoria?: { id: string; nombre: string } | null;
}

interface ProductosCatalogoResponse {
  datos?: ProductoCatalogoApi[];
}

interface ClientesCatalogoResponse {
  datos?: ClienteCatalogo[];
}

export type TicketRestauranteData = ReturnType<typeof construirTicketRestaurante>;

export const METODOS_PAGO: Array<{ value: MetodoPagoRestaurante; label: string }> = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA_DEBITO", label: "Tarjeta débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

export const ESTADOS_MESA_OPCIONES: Array<{
  value: EstadoMesaRestaurante;
  label: string;
}> = [
  { value: "LIBRE", label: "Libre" },
  { value: "RESERVADA", label: "Reservada" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "OCUPADA", label: "Ocupada" },
  { value: "INACTIVA", label: "Inactiva" },
];

export type RolVista = "mesero" | "cocina" | "caja";
export type ModoModulo = "restaurante" | "bar";

// ─── Tipos del contexto ────────────────────────────────────────────────────────

export interface RestauranteContextValue {
  // Modo del módulo
  modo: ModoModulo;
  // Datos
  mesas: RestauranteMesa[];
  productos: ProductoCatalogo[];
  clientes: ClienteCatalogo[];
  preparacionItems: RestaurantePreparacionItem[];
  reporte: RestauranteReporteResumen | null;
  ticketData: TicketRestauranteData | null;

  // Selección
  selectedMesaId: string | null;
  setSelectedMesaId: (id: string | null) => void;
  mesaSeleccionada: RestauranteMesa | null;
  pedidoActivo: RestauranteMesa["pedidoAbierto"];

  // Catálogo
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoriaSeleccionada: string;
  setCategoriaSeleccionada: (cat: string) => void;
  productosFiltrados: ProductoCatalogo[];
  categorias: Array<{ id: string; nombre: string }>;

  // Preparación
  filtroEstacion: EstacionPreparacionRestaurante;
  setFiltroEstacion: (estacion: EstacionPreparacionRestaurante) => void;

  // Vista / rol
  rolVista: RolVista;
  setRolVista: (rol: RolVista) => void;

  // Estados de carga
  cargandoVista: boolean;
  recargandoVista: boolean;
  guardandoCuenta: boolean;
  creandoMesa: boolean;
  guardandoMesa: boolean;
  agregandoProducto: boolean;
  actualizandoItem: boolean;
  actualizandoPreparacionId: string | null;
  facturandoCuenta: boolean;
  uniendoMesas: boolean;
  moviendoMesa: boolean;
  dividiendoCuenta: boolean;

  // Dialogs abiertos
  crearMesaOpen: boolean;
  setCrearMesaOpen: (v: boolean) => void;
  editarMesaOpen: boolean;
  setEditarMesaOpen: (v: boolean) => void;
  productoOpen: boolean;
  setProductoOpen: (v: boolean) => void;
  selectedProduct: ProductoCatalogo | null;
  itemOpen: boolean;
  setItemOpen: (v: boolean) => void;
  selectedItem: RestaurantePedidoItem | null;
  unirMesasOpen: boolean;
  setUnirMesasOpen: (v: boolean) => void;
  moverMesaOpen: boolean;
  setMoverMesaOpen: (v: boolean) => void;
  facturarOpen: boolean;
  setFacturarOpen: (v: boolean) => void;
  imprimirOpen: boolean;
  setImprimirOpen: (v: boolean) => void;
  dividirCuentaOpen: boolean;
  setDividirCuentaOpen: (v: boolean) => void;
  comandaOpen: boolean;
  setComandaOpen: (v: boolean) => void;
  ticketPrinterOpen: boolean;
  setTicketPrinterOpen: (v: boolean) => void;

  // Formularios
  nuevaMesa: { nombre: string; capacidad: number; ubicacion: string };
  setNuevaMesa: (v: { nombre: string; capacidad: number; ubicacion: string }) => void;
  mesaForm: {
    nombre: string;
    capacidad: number;
    ubicacion: string;
    estado: EstadoMesaRestaurante;
    activa: boolean;
  };
  setMesaForm: (v: {
    nombre: string;
    capacidad: number;
    ubicacion: string;
    estado: EstadoMesaRestaurante;
    activa: boolean;
  }) => void;
  cuentaForm: {
    nombreCuenta: string;
    comensales: number;
    clienteId: string;
    notas: string;
  };
  setCuentaForm: (
    v:
      | { nombreCuenta: string; comensales: number; clienteId: string; notas: string }
      | ((prev: {
          nombreCuenta: string;
          comensales: number;
          clienteId: string;
          notas: string;
        }) => { nombreCuenta: string; comensales: number; clienteId: string; notas: string })
  ) => void;
  facturaForm: {
    metodoPago: MetodoPagoRestaurante;
    clienteId: string;
    notas: string;
  };
  setFacturaForm: (
    v:
      | { metodoPago: MetodoPagoRestaurante; clienteId: string; notas: string }
      | ((prev: { metodoPago: MetodoPagoRestaurante; clienteId: string; notas: string }) => {
          metodoPago: MetodoPagoRestaurante;
          clienteId: string;
          notas: string;
        })
  ) => void;
  productoForm: { cantidad: number; notas: string; estacion: EstacionPreparacionRestaurante };
  setProductoForm: (
    v:
      | { cantidad: number; notas: string; estacion: EstacionPreparacionRestaurante }
      | ((prev: {
          cantidad: number;
          notas: string;
          estacion: EstacionPreparacionRestaurante;
        }) => { cantidad: number; notas: string; estacion: EstacionPreparacionRestaurante })
  ) => void;
  itemForm: {
    cantidad: number;
    notas: string;
    estacion: EstacionPreparacionRestaurante;
    estadoPreparacion: EstadoPreparacionRestaurante;
  };
  setItemForm: (
    v:
      | {
          cantidad: number;
          notas: string;
          estacion: EstacionPreparacionRestaurante;
          estadoPreparacion: EstadoPreparacionRestaurante;
        }
      | ((prev: {
          cantidad: number;
          notas: string;
          estacion: EstacionPreparacionRestaurante;
          estadoPreparacion: EstadoPreparacionRestaurante;
        }) => {
          cantidad: number;
          notas: string;
          estacion: EstacionPreparacionRestaurante;
          estadoPreparacion: EstadoPreparacionRestaurante;
        })
  ) => void;
  mesasParaUnir: string[];
  setMesasParaUnir: (v: string[] | ((prev: string[]) => string[])) => void;
  desunirMesaId: string;
  setDesunirMesaId: (v: string) => void;
  mesaDestinoId: string;
  setMesaDestinoId: (v: string) => void;
  divisionPersonas: number;
  setDivisionPersonas: (v: number) => void;
  divisionItems: Record<string, number>;
  setDivisionItems: (
    v: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  divisionIgual: ReturnType<typeof calcularDivisionIgual>;
  divisionSeleccionada: ReturnType<typeof calcularDivisionPorItems> | null;

  // Listas derivadas
  mesasDisponiblesParaUnir: RestauranteMesa[];
  mesasDisponiblesParaMover: RestauranteMesa[];
  mesaResumen: {
    libres: number;
    ocupadas: number;
    abiertas: number;
    totalAbierto: number;
  };

  // Refs de impresión
  printCuentaRef: React.RefObject<HTMLDivElement>;
  printComandaRef: React.RefObject<HTMLDivElement>;

  // Handlers
  recargarOperativo: (mesaIdPreferida?: string | null) => Promise<void>;
  crearMesaHandler: () => Promise<void>;
  guardarMesaHandler: () => Promise<void>;
  desactivarMesaHandler: () => Promise<void>;
  guardarCuenta: () => Promise<void>;
  abrirProducto: (producto: ProductoCatalogo) => void;
  agregarProductoHandler: () => Promise<void>;
  ajustarCantidadRapida: (item: RestaurantePedidoItem, cantidad: number) => Promise<void>;
  abrirEditorItem: (item: RestaurantePedidoItem) => void;
  guardarItemHandler: () => Promise<void>;
  unirMesasHandler: () => Promise<void>;
  desunirMesaHandler: (mesaIdADesunir: string) => Promise<void>;
  moverMesaHandler: () => Promise<void>;
  actualizarPreparacion: (
    item: RestaurantePreparacionItem,
    estadoPreparacion: EstadoPreparacionRestaurante
  ) => Promise<void>;
  facturarCuenta: () => Promise<void>;
  dividirPorItemsHandler: () => Promise<void>;
  facturarFraccionadoHandler: (pagos: { metodoPago: MetodoPagoRestaurante; monto: number }[]) => Promise<void>;
  handlePrintCuenta: (() => void) | undefined;
  handlePrintComanda: (() => void) | undefined;

  // Config
  configuracion: ReturnType<typeof useConfiguracionEmpresa>["configuracion"];
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const RestauranteContext = createContext<RestauranteContextValue | null>(null);

export function useRestaurante() {
  const ctx = useContext(RestauranteContext);
  if (!ctx) throw new Error("useRestaurante debe usarse dentro de RestauranteProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RestauranteProvider({ children, defaultView, modo = "restaurante" }: { children: React.ReactNode; defaultView?: RolVista; modo?: ModoModulo }) {
  const { configuracion } = useConfiguracionEmpresa();
  const { toast } = useToast();

  const printCuentaRef = useRef<HTMLDivElement>(null);
  const printComandaRef = useRef<HTMLDivElement>(null);

  // ── Datos ──
  const [mesas, setMesas] = useState<RestauranteMesa[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [clientes, setClientes] = useState<ClienteCatalogo[]>([]);
  const [preparacionItems, setPreparacionItems] = useState<RestaurantePreparacionItem[]>([]);
  const [reporte, setReporte] = useState<RestauranteReporteResumen | null>(null);
  const [ticketData, setTicketData] = useState<TicketRestauranteData | null>(null);

  // ── Selección ──
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductoCatalogo | null>(null);
  const [selectedItem, setSelectedItem] = useState<RestaurantePedidoItem | null>(null);

  // ── Catálogo ──
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [filtroEstacion, setFiltroEstacion] = useState<EstacionPreparacionRestaurante>(
    modo === "bar" ? "BARRA" : "COCINA"
  );

  // ── Vista ──
  const [rolVista, setRolVista] = useState<RolVista>(defaultView || "mesero");

  // ── Carga ──
  const [cargandoVista, setCargandoVista] = useState(true);
  const [recargandoVista, setRecargandoVista] = useState(false);
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [creandoMesa, setCreandoMesa] = useState(false);
  const [guardandoMesa, setGuardandoMesa] = useState(false);
  const [agregandoProducto, setAgregandoProducto] = useState(false);
  const [actualizandoItem, setActualizandoItem] = useState(false);
  const [actualizandoPreparacionId, setActualizandoPreparacionId] = useState<string | null>(null);
  const [facturandoCuenta, setFacturandoCuenta] = useState(false);
  const [uniendoMesas, setUniendoMesas] = useState(false);
  const [moviendoMesa, setMoviendoMesa] = useState(false);
  const [dividiendoCuenta, setDividiendoCuenta] = useState(false);

  // ── Dialogs ──
  const [crearMesaOpen, setCrearMesaOpen] = useState(false);
  const [editarMesaOpen, setEditarMesaOpen] = useState(false);
  const [productoOpen, setProductoOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [unirMesasOpen, setUnirMesasOpen] = useState(false);
  const [moverMesaOpen, setMoverMesaOpen] = useState(false);
  const [facturarOpen, setFacturarOpen] = useState(false);
  const [imprimirOpen, setImprimirOpen] = useState(false);
  const [dividirCuentaOpen, setDividirCuentaOpen] = useState(false);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [ticketPrinterOpen, setTicketPrinterOpen] = useState(false);

  // ── Formularios ──
  const [nuevaMesa, setNuevaMesa] = useState({ nombre: "", capacidad: 4, ubicacion: "" });
  const [mesaForm, setMesaForm] = useState<{
    nombre: string;
    capacidad: number;
    ubicacion: string;
    estado: EstadoMesaRestaurante;
    activa: boolean;
  }>({
    nombre: "",
    capacidad: 4,
    ubicacion: "",
    estado: "LIBRE",
    activa: true,
  });
  const [cuentaForm, setCuentaForm] = useState({
    nombreCuenta: "",
    comensales: 1,
    clienteId: "sin-cliente",
    notas: "",
  });
  const [facturaForm, setFacturaForm] = useState({
    metodoPago: "EFECTIVO" as MetodoPagoRestaurante,
    clienteId: "sin-cliente",
    notas: "",
  });
  const [productoForm, setProductoForm] = useState<{
    cantidad: number;
    notas: string;
    estacion: EstacionPreparacionRestaurante;
  }>({
    cantidad: 1,
    notas: "",
    estacion: modo === "bar" ? "BARRA" : "COCINA",
  });
  const [itemForm, setItemForm] = useState<{
    cantidad: number;
    notas: string;
    estacion: EstacionPreparacionRestaurante;
    estadoPreparacion: EstadoPreparacionRestaurante;
  }>({
    cantidad: 1,
    notas: "",
    estacion: "COCINA",
    estadoPreparacion: "PENDIENTE",
  });
  const [mesasParaUnir, setMesasParaUnir] = useState<string[]>([]);
  const [desunirMesaId, setDesunirMesaId] = useState("sin-mesa");
  const [mesaDestinoId, setMesaDestinoId] = useState("sin-destino");
  const [divisionPersonas, setDivisionPersonas] = useState(2);
  const [divisionItems, setDivisionItems] = useState<Record<string, number>>({});

  // ── Derivados ──
  const mesaSeleccionada = mesas.find((m) => m.id === selectedMesaId) ?? mesas[0] ?? null;
  const pedidoActivo = mesaSeleccionada?.pedidoAbierto ?? null;

  const categorias = [
    { id: "todas", nombre: "Todas" },
    ...productos
      .filter((p) => p.categoria?.id)
      .reduce<Array<{ id: string; nombre: string }>>((acc, p) => {
        if (p.categoria && !acc.some((item) => item.id === p.categoria?.id)) {
          acc.push({ id: p.categoria.id, nombre: p.categoria.nombre });
        }
        return acc;
      }, []),
  ];

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      !searchTerm ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase());
    const coincideCategoria =
      categoriaSeleccionada === "todas" || p.categoria?.id === categoriaSeleccionada;
    return coincideBusqueda && coincideCategoria;
  });

  const mesasDisponiblesParaUnir = mesas.filter((mesa) => {
    if (!pedidoActivo || !mesa.activa || mesa.id === mesaSeleccionada?.id) return false;
    return !pedidoActivo.mesas.some((mp) => mp.mesa.id === mesa.id);
  });

  const mesasDisponiblesParaMover = mesas.filter(
    (mesa) => mesa.activa && mesa.id !== mesaSeleccionada?.id && !mesa.pedidoAbierto
  );

  const pedidosUnicos = mesas.reduce<Record<string, { total: number }>>((acc, mesa) => {
    if (mesa.pedidoAbierto) acc[mesa.pedidoAbierto.id] = { total: mesa.pedidoAbierto.total };
    return acc;
  }, {});

  const mesaResumen = {
    libres: mesas.filter((m) => m.estado === "LIBRE" && m.activa).length,
    ocupadas: mesas.filter((m) => m.estado === "OCUPADA" && m.activa).length,
    abiertas: Object.keys(pedidosUnicos).length,
    totalAbierto: Object.values(pedidosUnicos).reduce((acc, p) => acc + p.total, 0),
  };

  const divisionIgual = calcularDivisionIgual(pedidoActivo?.total || 0, divisionPersonas);
  const divisionSeleccionada = pedidoActivo
    ? calcularDivisionPorItems(pedidoActivo, divisionItems)
    : null;

  // ── Impresión ──
  const handlePrintCuenta = useReactToPrint({
    content: () => printCuentaRef.current,
    documentTitle: pedidoActivo ? `precuenta-${pedidoActivo.id}` : "precuenta",
  });
  const handlePrintComanda = useReactToPrint({
    content: () => printComandaRef.current,
    documentTitle: `comanda-${filtroEstacion.toLowerCase()}`,
  });

  // ── Effects ──
  useEffect(() => {
    const cargarVista = async () => {
      try {
        setCargandoVista(true);
        const [mesasData, productosData, clientesData, preparacionData, reporteData] =
          await Promise.all([
            restauranteApi.obtenerMesas(),
            servicioPOS.obtenerProductos({ limite: 250, pagina: 1 }),
            servicioClientes.obtenerClientes({ limite: 200, pagina: 1 }),
            restauranteApi.obtenerPreparacion(),
            restauranteApi.obtenerReporteResumen(),
          ]);

        const productosCatalogo = (productosData as ProductosCatalogoResponse).datos || [];
        const clientesCatalogo = Array.isArray(clientesData)
          ? (clientesData as ClienteCatalogo[])
          : (clientesData as ClientesCatalogoResponse).datos || [];

        setMesas(mesasData);
        setSelectedMesaId(mesasData[0]?.id ?? null);
        setPreparacionItems(preparacionData);
        setReporte(reporteData);
        setProductos(
          productosCatalogo.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precio: p.precio ?? null,
            enStock: Number(p.enStock || 0),
            categoria: p.categoria || null,
          }))
        );
        setClientes(clientesCatalogo);
      } catch (error) {
        toast({
          title: "Error al cargar el módulo",
          description:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la operación del restaurante",
          variant: "destructive",
        });
      } finally {
        setCargandoVista(false);
      }
    };
    cargarVista();
  }, [toast]);

  useEffect(() => {
    if (!mesas.length) {
      setSelectedMesaId(null);
      return;
    }
    if (!selectedMesaId || !mesas.some((m) => m.id === selectedMesaId)) {
      setSelectedMesaId(mesas[0].id);
    }
  }, [mesas, selectedMesaId]);

  useEffect(() => {
    if (!mesaSeleccionada) return;
    setMesaForm({
      nombre: mesaSeleccionada.nombre,
      capacidad: mesaSeleccionada.capacidad,
      ubicacion: mesaSeleccionada.ubicacion || "",
      estado: mesaSeleccionada.estado,
      activa: mesaSeleccionada.activa,
    });
  }, [mesaSeleccionada]);

  useEffect(() => {
    if (!pedidoActivo) {
      setCuentaForm({
        nombreCuenta: mesaSeleccionada?.nombre || "",
        comensales: 1,
        clienteId: "sin-cliente",
        notas: "",
      });
      setFacturaForm((prev) => ({ ...prev, clienteId: "sin-cliente", notas: "" }));
      setMesasParaUnir([]);
      setDesunirMesaId("sin-mesa");
      setMesaDestinoId("sin-destino");
      setDivisionItems({});
      return;
    }
    setCuentaForm({
      nombreCuenta: pedidoActivo.nombreCuenta || "",
      comensales: pedidoActivo.comensales,
      clienteId: pedidoActivo.cliente?.id || "sin-cliente",
      notas: pedidoActivo.notas || "",
    });
    setFacturaForm((prev) => ({
      ...prev,
      clienteId: pedidoActivo.cliente?.id || "sin-cliente",
      notas: pedidoActivo.notas || "",
    }));
    setDivisionPersonas(Math.max(2, pedidoActivo.comensales));
    setDivisionItems(
      pedidoActivo.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {})
    );
  }, [pedidoActivo, mesaSeleccionada]);

  // ── Handlers ──
  const recargarOperativo = useCallback(
    async (mesaIdPreferida?: string | null) => {
      try {
        setRecargandoVista(true);
        const [mesasData, preparacionData, reporteData] = await Promise.all([
          restauranteApi.obtenerMesas(),
          restauranteApi.obtenerPreparacion(),
          restauranteApi.obtenerReporteResumen(),
        ]);
        setMesas(mesasData);
        setPreparacionItems(preparacionData);
        setReporte(reporteData);
        const mesaObjetivo =
          mesaIdPreferida && mesasData.some((m) => m.id === mesaIdPreferida)
            ? mesaIdPreferida
            : mesasData[0]?.id ?? null;
        setSelectedMesaId(mesaObjetivo);
      } catch (error) {
        toast({
          title: "No se pudo refrescar la operación",
          description: error instanceof Error ? error.message : "Intenta nuevamente",
          variant: "destructive",
        });
      } finally {
        setRecargandoVista(false);
      }
    },
    [toast]
  );

  // ── Auto Refresh Global ──
  useEffect(() => {
    // Polling global para mantener todas las vistas (Mesero, Caja, etc) sincronizadas.
    const intervalId = setInterval(() => {
      recargarOperativo(selectedMesaId);
    }, 10_000); // 10 segundos para mayor reactividad
    
    return () => clearInterval(intervalId);
  }, [selectedMesaId, recargarOperativo]);

  const crearMesaHandler = useCallback(async () => {
    try {
      setCreandoMesa(true);
      const mesa = await restauranteApi.crearMesa({
        nombre: nuevaMesa.nombre,
        capacidad: Number(nuevaMesa.capacidad),
        ubicacion: nuevaMesa.ubicacion,
      });
      setNuevaMesa({ nombre: "", capacidad: 4, ubicacion: "" });
      setCrearMesaOpen(false);
      await recargarOperativo(mesa.id);
      toast({ title: "Mesa creada", description: `${mesa.nombre} ya está disponible` });
    } catch (error) {
      toast({
        title: "No se pudo crear la mesa",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setCreandoMesa(false);
    }
  }, [nuevaMesa, recargarOperativo, toast]);

  const guardarMesaHandler = useCallback(async () => {
    if (!mesaSeleccionada) return;
    try {
      setGuardandoMesa(true);
      await restauranteApi.actualizarMesa(mesaSeleccionada.id, {
        nombre: mesaForm.nombre,
        capacidad: Number(mesaForm.capacidad),
        ubicacion: mesaForm.ubicacion,
        estado: mesaForm.estado,
        activa: mesaForm.activa,
      });
      setEditarMesaOpen(false);
      await recargarOperativo(mesaSeleccionada.id);
      toast({ title: "Mesa actualizada", description: "Cambios guardados correctamente" });
    } catch (error) {
      toast({
        title: "No se pudo actualizar la mesa",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setGuardandoMesa(false);
    }
  }, [mesaSeleccionada, mesaForm, recargarOperativo, toast]);

  const desactivarMesaHandler = useCallback(async () => {
    if (!mesaSeleccionada) return;
    try {
      setGuardandoMesa(true);
      await restauranteApi.desactivarMesa(mesaSeleccionada.id);
      setEditarMesaOpen(false);
      await recargarOperativo();
      toast({ title: "Mesa desactivada", description: "La mesa quedó fuera de operación" });
    } catch (error) {
      toast({
        title: "No se pudo desactivar la mesa",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setGuardandoMesa(false);
    }
  }, [mesaSeleccionada, recargarOperativo, toast]);

  const guardarCuenta = useCallback(async () => {
    if (!pedidoActivo) return;
    try {
      setGuardandoCuenta(true);
      await restauranteApi.actualizarPedido(pedidoActivo.id, {
        nombreCuenta: cuentaForm.nombreCuenta,
        comensales: cuentaForm.comensales,
        clienteId: cuentaForm.clienteId === "sin-cliente" ? undefined : cuentaForm.clienteId,
        notas: cuentaForm.notas,
      });
      await recargarOperativo(mesaSeleccionada?.id);
      toast({ title: "Cuenta actualizada", description: "Los datos de la mesa quedaron guardados" });
    } catch (error) {
      toast({
        title: "No se pudo guardar la cuenta",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setGuardandoCuenta(false);
    }
  }, [pedidoActivo, cuentaForm, mesaSeleccionada, recargarOperativo, toast]);

  const abrirProducto = useCallback(
    (producto: ProductoCatalogo) => {
      setSelectedProduct(producto);
      setProductoForm({
        cantidad: 1,
        notas: "",
        estacion: inferirEstacionPreparacion({
          categoria: producto.categoria?.nombre,
          nombreProducto: producto.nombre,
        }) as EstacionPreparacionRestaurante,
      });
      setProductoOpen(true);
    },
    []
  );

  const agregarProductoHandler = useCallback(async () => {
    if (!selectedProduct || !mesaSeleccionada) return;
    if (selectedProduct.precio == null) {
      toast({
        title: "Producto sin precio",
        description: "Este producto no puede agregarse a la cuenta",
        variant: "destructive",
      });
      return;
    }
    try {
      setAgregandoProducto(true);
      const pedido =
        mesaSeleccionada.pedidoAbierto ||
        (await restauranteApi.abrirPedido({
          mesaId: mesaSeleccionada.id,
          nombreCuenta: mesaSeleccionada.nombre,
          comensales: 1,
        }));
      await restauranteApi.agregarItem(pedido.id, {
        productoId: selectedProduct.id,
        cantidad: productoForm.cantidad,
        notas: productoForm.notas || undefined,
        estacion: productoForm.estacion,
      });
      setProductoOpen(false);
      await recargarOperativo(mesaSeleccionada.id);
      toast({
        title: "Consumo agregado",
        description: `${selectedProduct.nombre} quedó cargado en ${mesaSeleccionada.nombre}`,
      });
    } catch (error) {
      toast({
        title: "No se pudo agregar el producto",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setAgregandoProducto(false);
    }
  }, [selectedProduct, mesaSeleccionada, productoForm, recargarOperativo, toast]);

  const ajustarCantidadRapida = useCallback(
    async (item: RestaurantePedidoItem, cantidad: number) => {
      if (!pedidoActivo) return;
      try {
        setActualizandoItem(true);
        if (cantidad <= 0) {
          await restauranteApi.eliminarItem(pedidoActivo.id, item.id);
        } else {
          await restauranteApi.actualizarItem(pedidoActivo.id, item.id, {
            cantidad,
            notas: item.notas || undefined,
          });
        }
        await recargarOperativo(mesaSeleccionada?.id);
      } catch (error) {
        toast({
          title: "No se pudo ajustar el item",
          description: error instanceof Error ? error.message : "Intenta nuevamente",
          variant: "destructive",
        });
      } finally {
        setActualizandoItem(false);
      }
    },
    [pedidoActivo, mesaSeleccionada, recargarOperativo, toast]
  );

  const abrirEditorItem = useCallback((item: RestaurantePedidoItem) => {
    setSelectedItem(item);
    setItemForm({
      cantidad: item.cantidad,
      notas: item.notas || "",
      estacion: item.estacion,
      estadoPreparacion: item.estadoPreparacion,
    });
    setItemOpen(true);
  }, []);

  const guardarItemHandler = useCallback(async () => {
    if (!pedidoActivo || !selectedItem) return;
    try {
      setActualizandoItem(true);
      await restauranteApi.actualizarItem(pedidoActivo.id, selectedItem.id, {
        cantidad: itemForm.cantidad,
        notas: itemForm.notas || undefined,
        estacion: itemForm.estacion,
        estadoPreparacion: itemForm.estadoPreparacion,
      });
      setItemOpen(false);
      await recargarOperativo(mesaSeleccionada?.id);
      toast({ title: "Item actualizado", description: "Cambios aplicados" });
    } catch (error) {
      toast({
        title: "No se pudo actualizar el item",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setActualizandoItem(false);
    }
  }, [pedidoActivo, selectedItem, itemForm, mesaSeleccionada, recargarOperativo, toast]);

  const unirMesasHandler = useCallback(async () => {
    if (!pedidoActivo || mesasParaUnir.length === 0) return;
    try {
      setUniendoMesas(true);
      await restauranteApi.unirMesas(pedidoActivo.id, mesasParaUnir);
      setMesasParaUnir([]);
      setUnirMesasOpen(false);
      await recargarOperativo(mesaSeleccionada?.id);
      toast({ title: "Mesas unidas", description: "La cuenta quedó consolidada" });
    } catch (error) {
      toast({
        title: "No se pudieron unir las mesas",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUniendoMesas(false);
    }
  }, [pedidoActivo, mesasParaUnir, mesaSeleccionada, recargarOperativo, toast]);

  const desunirMesaHandler = useCallback(async (mesaIdADesunir: string) => {
    if (!pedidoActivo || mesaIdADesunir === "sin-mesa") return;
    try {
      setUniendoMesas(true);
      await restauranteApi.desunirMesa(pedidoActivo.id, mesaIdADesunir);
      setDesunirMesaId("sin-mesa");
      setUnirMesasOpen(false);
      await recargarOperativo(mesaSeleccionada?.id);
      toast({ title: "Mesa desunida", description: "La mesa ha sido separada de la cuenta" });
    } catch (error) {
      toast({
        title: "No se pudo desunir la mesa",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUniendoMesas(false);
    }
  }, [pedidoActivo, mesaSeleccionada, recargarOperativo, toast]);

  const moverMesaHandler = useCallback(async () => {
    if (
      !pedidoActivo ||
      !mesaSeleccionada ||
      mesaDestinoId === "sin-destino" ||
      !pedidoActivo.mesas.some((mp) => mp.mesa.id === mesaSeleccionada.id)
    )
      return;
    try {
      setMoviendoMesa(true);
      await restauranteApi.moverMesa(pedidoActivo.id, {
        mesaOrigenId: mesaSeleccionada.id,
        mesaDestinoId,
      });
      setMoverMesaOpen(false);
      await recargarOperativo(mesaDestinoId);
      toast({ title: "Cuenta movida", description: "La mesa cambió de ubicación correctamente" });
    } catch (error) {
      toast({
        title: "No se pudo mover la mesa",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setMoviendoMesa(false);
    }
  }, [pedidoActivo, mesaSeleccionada, mesaDestinoId, recargarOperativo, toast]);

  const actualizarPreparacion = useCallback(
    async (item: RestaurantePreparacionItem, estadoPreparacion: EstadoPreparacionRestaurante) => {
      try {
        setActualizandoPreparacionId(item.id);
        await restauranteApi.actualizarItem(item.pedidoId, item.id, { estadoPreparacion });
        await recargarOperativo(mesaSeleccionada?.id);
      } catch (error) {
        toast({
          title: "No se pudo actualizar la preparación",
          description: error instanceof Error ? error.message : "Intenta nuevamente",
          variant: "destructive",
        });
      } finally {
        setActualizandoPreparacionId(null);
      }
    },
    [mesaSeleccionada, recargarOperativo, toast]
  );

  const facturarCuenta = useCallback(async () => {
    if (!pedidoActivo) return;
    try {
      setFacturandoCuenta(true);
      const resultado = await restauranteApi.facturarPedido(pedidoActivo.id, {
        metodoPago: facturaForm.metodoPago,
        clienteId: facturaForm.clienteId === "sin-cliente" ? undefined : facturaForm.clienteId,
        notas: facturaForm.notas || undefined,
      });
      setTicketData(
        construirTicketRestaurante({
          pedido: resultado.pedido,
          venta: resultado.venta,
          empresa: { nombre: configuracion?.empresa?.nombre || "Mi Empresa" },
          cliente: resultado.pedido.cliente || undefined,
          usuario: resultado.pedido.usuario,
        })
      );
      setFacturarOpen(false);
      setTicketPrinterOpen(true);
      await recargarOperativo(mesaSeleccionada?.id);
      toast({
        title: "Cuenta facturada",
        description: `Venta ${resultado.venta.id.slice(0, 8).toUpperCase()} generada`,
      });
    } catch (error) {
      toast({
        title: "No se pudo facturar la cuenta",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setFacturandoCuenta(false);
    }
  }, [pedidoActivo, facturaForm, configuracion, mesaSeleccionada, recargarOperativo, toast]);

  const dividirPorItemsHandler = useCallback(async () => {
    if (!pedidoActivo) return;
    const itemsExtraer = Object.entries(divisionItems)
      .filter(([, cant]) => cant > 0)
      .map(([itemId, cantidad]) => ({ itemId, cantidadAExtraer: cantidad }));
    
    if (itemsExtraer.length === 0) {
      toast({ title: "Sin selección", description: "Selecciona al menos un producto", variant: "destructive" });
      return;
    }

    try {
      setDividiendoCuenta(true);
      const resultado = await restauranteApi.dividirPedidoItems(pedidoActivo.id, {
        items: itemsExtraer,
        metodoPago: facturaForm.metodoPago,
        clienteId: facturaForm.clienteId === "sin-cliente" ? undefined : facturaForm.clienteId,
      });
      setTicketData(
        construirTicketRestaurante({
          pedido: resultado.pedido,
          venta: resultado.venta,
          empresa: { nombre: configuracion?.empresa?.nombre || "Mi Empresa" },
          cliente: resultado.pedido.cliente || undefined,
          usuario: resultado.pedido.usuario,
        })
      );
      setDividirCuentaOpen(false);
      setTicketPrinterOpen(true);
      await recargarOperativo(mesaSeleccionada?.id);
      toast({
        title: "Cuenta dividida exitosamente",
        description: `Venta separada generada`,
      });
    } catch (error) {
      toast({
        title: "Error al dividir",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setDividiendoCuenta(false);
    }
  }, [pedidoActivo, divisionItems, facturaForm, configuracion, mesaSeleccionada, recargarOperativo, toast]);

  const facturarFraccionadoHandler = useCallback(async (pagos: { metodoPago: MetodoPagoRestaurante; monto: number }[]) => {
    if (!pedidoActivo) return;
    
    try {
      setDividiendoCuenta(true);
      const resultado = await restauranteApi.pagoFraccionado(pedidoActivo.id, {
        pagosMultiples: pagos.map(p => ({ metodoPago: p.metodoPago, monto: p.monto })),
        clienteId: facturaForm.clienteId === "sin-cliente" ? undefined : facturaForm.clienteId,
      });
      setTicketData(
        construirTicketRestaurante({
          pedido: resultado.pedido,
          venta: resultado.venta,
          empresa: { nombre: configuracion?.empresa?.nombre || "Mi Empresa" },
          cliente: resultado.pedido.cliente || undefined,
          usuario: resultado.pedido.usuario,
        })
      );
      setDividirCuentaOpen(false);
      setTicketPrinterOpen(true);
      await recargarOperativo(null);
      toast({
        title: "Pago fraccionado exitoso",
        description: `Último pago procesado y cuenta cerrada.`,
      });
    } catch (error) {
      toast({
        title: "Error al registrar pagos",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setDividiendoCuenta(false);
    }
  }, [pedidoActivo, facturaForm, configuracion, recargarOperativo, toast]);

  const value: RestauranteContextValue = {
    // Modo
    modo,
    // Datos
    mesas,
    productos,
    clientes,
    preparacionItems,
    reporte,
    ticketData,
    // Selección
    selectedMesaId,
    setSelectedMesaId,
    mesaSeleccionada,
    pedidoActivo,
    // Catálogo
    searchTerm,
    setSearchTerm,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    productosFiltrados,
    categorias,
    // Preparación
    filtroEstacion,
    setFiltroEstacion,
    // Vista
    rolVista,
    setRolVista,
    // Carga
    cargandoVista,
    recargandoVista,
    guardandoCuenta,
    creandoMesa,
    guardandoMesa,
    agregandoProducto,
    actualizandoItem,
    actualizandoPreparacionId,
    facturandoCuenta,
    uniendoMesas,
    moviendoMesa,
    dividiendoCuenta,
    // Dialogs
    crearMesaOpen,
    setCrearMesaOpen,
    editarMesaOpen,
    setEditarMesaOpen,
    productoOpen,
    setProductoOpen,
    selectedProduct,
    itemOpen,
    setItemOpen,
    selectedItem,
    unirMesasOpen,
    setUnirMesasOpen,
    moverMesaOpen,
    setMoverMesaOpen,
    facturarOpen,
    setFacturarOpen,
    imprimirOpen,
    setImprimirOpen,
    dividirCuentaOpen,
    setDividirCuentaOpen,
    comandaOpen,
    setComandaOpen,
    ticketPrinterOpen,
    setTicketPrinterOpen,
    // Formularios
    nuevaMesa,
    setNuevaMesa,
    mesaForm,
    setMesaForm,
    cuentaForm,
    setCuentaForm,
    facturaForm,
    setFacturaForm,
    productoForm,
    setProductoForm,
    itemForm,
    setItemForm,
    mesasParaUnir,
    setMesasParaUnir,
    desunirMesaId,
    setDesunirMesaId,
    mesaDestinoId,
    setMesaDestinoId,
    divisionPersonas,
    setDivisionPersonas,
    divisionItems,
    setDivisionItems,
    divisionIgual,
    divisionSeleccionada,
    // Listas derivadas
    mesasDisponiblesParaUnir,
    mesasDisponiblesParaMover,
    mesaResumen,
    // Refs
    printCuentaRef,
    printComandaRef,
    // Handlers
    recargarOperativo,
    crearMesaHandler,
    guardarMesaHandler,
    desactivarMesaHandler,
    guardarCuenta,
    abrirProducto,
    agregarProductoHandler,
    ajustarCantidadRapida,
    abrirEditorItem,
    guardarItemHandler,
    unirMesasHandler,
    desunirMesaHandler,
    moverMesaHandler,
    actualizarPreparacion,
    facturarCuenta,
    dividirPorItemsHandler,
    facturarFraccionadoHandler,
    handlePrintCuenta,
    handlePrintComanda,
    // Config
    configuracion,
  };

  return <RestauranteContext.Provider value={value}>{children}</RestauranteContext.Provider>;
}
