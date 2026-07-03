"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Wallet, TrendingUp, Calendar as CalendarIcon, Loader2, RefreshCw,
  Plus, Trash2, Download, Search, CheckSquare, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Tag, HelpCircle, Receipt, FileText, FileSpreadsheet
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GastoDialog } from "@/components/gastos/GastoDialog";
import { servicioUsuarios } from "@/lib/api-service";

interface CajaResumen {
  caja: number;
  bancolombia: number;
  nequi: number;
  daviplata: number;
  tarjeta: number;
  otro: number;
  total: number;
  efectivoEsperado: number;
  montoInicial: number;
  turnoAbierto: any | null;
}

export default function CajaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("balance");

  // --- TAB 1: BALANCE DE CAJA STATES ---
  const [terminales, setTerminales] = useState<any[]>([]);
  const [terminalesSeleccionados, setTerminalesSeleccionados] = useState<string[]>([]);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cargandoBalance, setCargandoBalance] = useState(true);
  const [resumenBalance, setResumenBalance] = useState<CajaResumen | null>(null);
  const [cajaSeleccionadaId, setCajaSeleccionadaId] = useState<string>("todas");
  const [movimientos, setMovimientos] = useState<any[]>([]);

  // --- DETALLE DE TRANSACCION (BREAKDOWN MODAL) ---
  const [dialogDetalleAbierto, setDialogDetalleAbierto] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [detalleMovimiento, setDetalleMovimiento] = useState<any | null>(null);

  const verDetalleMovimiento = async (id: string, ventaId?: string) => {
    if (id.startsWith("g-")) {
      const gastoObj = movimientos.find(m => m.id === id);
      setDetalleMovimiento({
        tipoMov: "GASTO",
        concepto: gastoObj?.cliente || "Gasto general",
        monto: Math.abs(gastoObj?.importe || 0),
        fecha: gastoObj?.fecha,
        usuario: { nombre: gastoObj?.cobradoPor || "Usuario" },
        metodoPago: gastoObj?.en || "Efectivo",
        categoria: "General"
      });
      setDialogDetalleAbierto(true);
      return;
    }

    const realVentaId = ventaId || (id.startsWith("v-") ? id.substring(2) : id.startsWith("pd-") ? id.substring(3) : id);
    if (!realVentaId) return;

    setDialogDetalleAbierto(true);
    setCargandoDetalle(true);
    setDetalleMovimiento(null);
    try {
      const res = await fetch(`/api/ventas/${realVentaId}`);
      if (!res.ok) throw new Error("No se pudo obtener el detalle");
      const data = await res.json();
      setDetalleMovimiento({ ...data, tipoMov: "VENTA" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "No se pudieron cargar los detalles de la venta", variant: "destructive" });
      setDialogDetalleAbierto(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Shift Management Dialogs
  const [openAbrir, setOpenAbrir] = useState(false);
  const [montoInicial, setMontoInicial] = useState(0);
  const [openCerrar, setOpenCerrar] = useState(false);
  const [montoFinalReal, setMontoFinalReal] = useState(0);
  const [notasArqueo, setNotasArqueo] = useState("");
  const [procesandoTurno, setProcesandoTurno] = useState(false);

  // --- TAB 2: DETALLE DE COBROS STATES ---
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargandoCobros, setCargandoCobros] = useState(false);
  const [cobros, setCobros] = useState<any[]>([]);
  const [cobrosStats, setCobrosStats] = useState<any>({
    cobrosCount: 0,
    importe: 0,
    impuestos: 0,
    deuda: 0,
    total: 0,
  });
  const [periodoCobros, setPeriodoCobros] = useState<string>("mes");
  const [fechaDesdeCobros, setFechaDesdeCobros] = useState("");
  const [fechaHastaCobros, setFechaHastaCobros] = useState("");
  const [filtroEmpleadoCobros, setFiltroEmpleadoCobros] = useState("todos");
  const [filtroCajaCobros, setFiltroCajaCobros] = useState("todos");
  const [filtroPagoCobros, setFiltroPagoCobros] = useState("todos");
  const [filtroEstadoCobros, setFiltroEstadoCobros] = useState("todos");

  // --- TAB 3: CONTROL DE GASTOS STATES ---
  const [cargandoGastos, setCargandoGastos] = useState(false);
  const [gastos, setGastos] = useState<any[]>([]);
  const [gastosStats, setGastosStats] = useState<any>({
    gastosCount: 0,
    total: 0,
  });
  const [periodoGastos, setPeriodoGastos] = useState<string>("mes");
  const [fechaDesdeGastos, setFechaDesdeGastos] = useState("");
  const [fechaHastaGastos, setFechaHastaGastos] = useState("");
  const [busquedaGastos, setBusquedaGastos] = useState("");
  const [dialogoGastoAbierto, setDialogoGastoAbierto] = useState(false);
  const [gastoEditar, setGastoEditar] = useState<any>(null);

  // Selection Checkboxes
  const [selectedCobros, setSelectedCobros] = useState<string[]>([]);
  const [selectedGastos, setSelectedGastos] = useState<string[]>([]);

  // --- TAB 4: CAJAS STATES ---
  const [cajas, setCajas] = useState<any[]>([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [nuevaCajaNombre, setNuevaCajaNombre] = useState("");
  const [creandoCaja, setCreandoCaja] = useState(false);

  // Permissions Check
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role as string)) {
      toast({ title: "Sin permisos", description: "No tienes permisos para ver el control de caja", variant: "destructive" });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  const cargarCajas = useCallback(async () => {
    if (!session) return;
    setCargandoCajas(true);
    try {
      const res = await fetch("/api/cajas");
      if (res.ok) {
        const data = await res.json();
        setCajas(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoCajas(false);
    }
  }, [session]);

  // General Initialization
  useEffect(() => {
    if (session) {
      cargarTerminales();
      cargarUsuarios();
      cargarCajas();
    }
  }, [session, cargarCajas]);

  const handleCrearCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCajaNombre.trim()) return;
    setCreandoCaja(true);
    try {
      const res = await fetch("/api/cajas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCajaNombre }),
      });
      if (!res.ok) throw new Error("No se pudo crear la caja");
      toast({ title: "Caja creada correctamente" });
      setNuevaCajaNombre("");
      cargarCajas();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreandoCaja(false);
    }
  };

  const toggleCajaActiva = async (id: string, activaActual: boolean) => {
    try {
      const res = await fetch(`/api/cajas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !activaActual }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la caja");
      toast({ title: "Caja actualizada correctamente" });
      cargarCajas();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const eliminarCaja = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta caja?")) return;
    try {
      const res = await fetch(`/api/cajas/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar la caja");
      toast({ title: "Caja eliminada correctamente" });
      cargarCajas();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const cargarTerminales = async () => {
    try {
      const res = await fetch("/api/terminales");
      if (res.ok) {
        const data = await res.json();
        setTerminales(data || []);
        // Select all by default
        if (data && data.length > 0) {
          setTerminalesSeleccionados(data.map((t: any) => t.id));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const data = await servicioUsuarios.obtenerUsuarios({ limite: 100 });
      const lista = data.datos || data.usuarios || data;
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper date parsing
  const calcularRangoFechas = (periodo: string, desdeInput: string, hastaInput: string) => {
    const ahora = new Date();
    let desde = new Date();
    let hasta = new Date();

    if (periodo === "hoy") {
      desde = startOfDay(ahora);
      hasta = endOfDay(ahora);
    } else if (periodo === "semana") {
      desde = startOfWeek(ahora, { weekStartsOn: 1 });
      hasta = endOfWeek(ahora, { weekStartsOn: 1 });
    } else if (periodo === "mes") {
      desde = startOfMonth(ahora);
      hasta = endOfMonth(ahora);
    } else if (periodo === "anio") {
      desde = new Date(ahora.getFullYear(), 0, 1);
      hasta = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (periodo === "personalizado") {
      desde = desdeInput ? new Date(`${desdeInput}T00:00:00-05:00`) : startOfMonth(ahora);
      hasta = hastaInput ? new Date(`${hastaInput}T23:59:59.999-05:00`) : endOfMonth(ahora);
    }
    return { desde, hasta };
  };

  // --- LOADER ACTIONS ---

  // Load Balance & Daily Movements
  const cargarBalance = useCallback(async () => {
    if (!session) return;
    setCargandoBalance(true);
    try {
      const activeIds = terminalesSeleccionados.length > 0 ? terminalesSeleccionados.join(",") : "all";
      const params = new URLSearchParams({
        fecha,
        terminales: activeIds,
      });
      if (cajaSeleccionadaId && cajaSeleccionadaId !== "todas") {
        params.append("cajaId", cajaSeleccionadaId);
      }
      const res = await fetch(`/api/caja/movimientos?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener los movimientos");
      const data = await res.json();
      setResumenBalance(data.resumen);
      setMovimientos(data.movimientos || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo cargar el balance", variant: "destructive" });
    } finally {
      setCargandoBalance(false);
    }
  }, [fecha, terminalesSeleccionados, cajaSeleccionadaId, session, toast]);

  // Load Charge Logs
  const cargarCobrosLogs = useCallback(async () => {
    if (!session) return;
    setCargandoCobros(true);
    try {
      const { desde, hasta } = calcularRangoFechas(periodoCobros, fechaDesdeCobros, fechaHastaCobros);
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        usuarioId: filtroEmpleadoCobros,
        cajaId: filtroCajaCobros,
        metodoPago: filtroPagoCobros,
        estadoPago: filtroEstadoCobros,
      });

      const res = await fetch(`/api/caja/cobros-detalle?${params}`);
      if (!res.ok) throw new Error("Error al obtener los cobros");
      const data = await res.json();
      setCobrosStats(data.estadisticas);
      setCobros(data.cobros || []);
      setSelectedCobros([]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron cargar los cobros", variant: "destructive" });
    } finally {
      setCargandoCobros(false);
    }
  }, [periodoCobros, fechaDesdeCobros, fechaHastaCobros, filtroEmpleadoCobros, filtroCajaCobros, filtroPagoCobros, filtroEstadoCobros, session, toast]);

  // Load Expenses
  const cargarGastosLogs = useCallback(async () => {
    if (!session) return;
    setCargandoGastos(true);
    try {
      const { desde, hasta } = calcularRangoFechas(periodoGastos, fechaDesdeGastos, fechaHastaGastos);
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });

      const res = await fetch(`/api/gastos?${params}`);
      if (!res.ok) throw new Error("Error al cargar los gastos");
      const data = await res.json();
      setGastos(data.gastos || []);
      
      const total = (data.gastos || []).reduce((acc: number, curr: any) => acc + curr.monto, 0);
      setGastosStats({
        gastosCount: (data.gastos || []).length,
        total,
      });
      setSelectedGastos([]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron cargar los gastos", variant: "destructive" });
    } finally {
      setCargandoGastos(false);
    }
  }, [periodoGastos, fechaDesdeGastos, fechaHastaGastos, session, toast]);

  // Trigger loads based on active tab
  useEffect(() => {
    if (session) {
      if (activeTab === "balance") {
        cargarBalance();
      } else if (activeTab === "cobros") {
        cargarCobrosLogs();
      } else if (activeTab === "gastos") {
        cargarGastosLogs();
      } else if (activeTab === "cajas") {
        cargarCajas();
      }
    }
  }, [activeTab, cargarBalance, cargarCobrosLogs, cargarGastosLogs, cargarCajas, session]);

  // Refresh balance when terminals change, date changes or register changes
  useEffect(() => {
    if (session && activeTab === "balance") {
      cargarBalance();
    }
  }, [fecha, terminalesSeleccionados, cajaSeleccionadaId, activeTab]);

  // --- HANDLERS FOR DRAWER TURNS ---
  const handleAbrirCaja = async () => {
    if (!cajaSeleccionadaId || cajaSeleccionadaId === "todas") {
      toast({ title: "Error", description: "Debe seleccionar una caja registradora específica para abrir el turno", variant: "destructive" });
      return;
    }
    setProcesandoTurno(true);
    try {
      const res = await fetch("/api/caja/turnos/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoInicial, cajaId: cajaSeleccionadaId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo abrir la caja");
      }
      toast({ title: "Caja abierta correctamente" });
      setOpenAbrir(false);
      cargarBalance();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcesandoTurno(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!cajaSeleccionadaId || cajaSeleccionadaId === "todas") {
      toast({ title: "Error", description: "Debe seleccionar una caja registradora específica para cerrar el turno", variant: "destructive" });
      return;
    }
    setProcesandoTurno(true);
    try {
      const res = await fetch("/api/caja/turnos/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoFinalReal, notas: notasArqueo, cajaId: cajaSeleccionadaId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo cerrar la caja");
      }
      toast({ title: "Arqueo y cierre de caja realizados correctamente" });
      setOpenCerrar(false);
      setMontoFinalReal(0);
      setNotasArqueo("");
      cargarBalance();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcesandoTurno(false);
    }
  };

  // --- ELIMINAR GASTO ---
  const handleEliminarGasto = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast({ title: "Gasto eliminado correctamente" });
      cargarGastosLogs();
      if (fecha === format(new Date(), "yyyy-MM-dd")) {
        cargarBalance();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo eliminar", variant: "destructive" });
    }
  };

  // --- EXPORT TO CSV CLIENT SIDE ---
  const handleExportarCobros = () => {
    const dataToExport = selectedCobros.length > 0 
      ? cobros.filter(c => selectedCobros.includes(c.id))
      : cobros;

    if (dataToExport.length === 0) {
      toast({ title: "Sin datos", description: "No hay registros de cobros para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Fecha", "Cliente", "Cobrador", "Caja", "Factura", "Forma de Pago", "Importe", "Impuesto", "Total"];
    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    dataToExport.forEach(c => {
      const row = [
        format(new Date(c.fecha), "dd/MM/yyyy HH:mm"),
        `"${c.cliente.replace(/"/g, '""')}"`,
        `"${c.cobrador.replace(/"/g, '""')}"`,
        `"${c.caja.replace(/"/g, '""')}"`,
        `"${c.factura}"`,
        `"${c.formaPago}"`,
        c.importe,
        c.impuesto,
        c.total
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_cobros_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarGastos = () => {
    const dataToExport = selectedGastos.length > 0 
      ? gastos.filter(g => selectedGastos.includes(g.id))
      : gastos;

    if (dataToExport.length === 0) {
      toast({ title: "Sin datos", description: "No hay registros de gastos para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Fecha", "Concepto", "Categoría", "Método Pago", "Importe"];
    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    dataToExport.forEach(g => {
      const row = [
        format(new Date(g.fecha), "dd/MM/yyyy"),
        `"${g.concepto.replace(/"/g, '""')}"`,
        `"${g.categoria.nombre.replace(/"/g, '""')}"`,
        `"${g.metodoPago || "Efectivo"}"`,
        g.monto
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_gastos_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Currency Formatter
  const formatMoneda = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const esHoy = fecha === format(new Date(), "yyyy-MM-dd");

  const toggleTerminal = (id: string) => {
    if (terminalesSeleccionados.includes(id)) {
      setTerminalesSeleccionados(terminalesSeleccionados.filter(t => t !== id));
    } else {
      setTerminalesSeleccionados([...terminalesSeleccionados, id]);
    }
  };

  const shiftDay = (days: number) => {
    const d = new Date(fecha + "T00:00:00");
    const updated = addDays(d, days);
    setFecha(format(updated, "yyyy-MM-dd"));
  };

  // Expense matching filters
  const gastosFiltrados = gastos.filter(g => 
    busquedaGastos 
      ? g.concepto.toLowerCase().includes(busquedaGastos.toLowerCase()) || 
        g.categoria?.nombre.toLowerCase().includes(busquedaGastos.toLowerCase())
      : true
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      
      {/* Dynamic Main Header Banner */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Control y Reportes de Caja</h1>
            <p className="text-sm text-muted-foreground">
              Supervisión de balances diarios, arqueos, cobros y registro de egresos operativos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              if (activeTab === "balance") cargarBalance();
              else if (activeTab === "cobros") cargarCobrosLogs();
              else if (activeTab === "gastos") cargarGastosLogs();
            }} className="h-10 w-10 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="balance" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border/60 pb-1 mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="balance" className="rounded-lg px-4 py-2 text-sm font-medium">
              Balance de Caja
            </TabsTrigger>
            <TabsTrigger value="cobros" className="rounded-lg px-4 py-2 text-sm font-medium">
              Detalle de Cobros
            </TabsTrigger>
            <TabsTrigger value="gastos" className="rounded-lg px-4 py-2 text-sm font-medium">
              Gastos
            </TabsTrigger>
            <TabsTrigger value="cajas" className="rounded-lg px-4 py-2 text-sm font-medium">
              Cajas Registradoras
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: BALANCE DE CAJA & ARQUEO */}
        {/* ========================================================================= */}
        <TabsContent value="balance" className="space-y-6 outline-none">
          
          {/* Box/Terminal Selection Checkboxes & Date Control */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center bg-card/40 border border-border/80 rounded-2xl p-5 shadow-sm">
            
            <div className="flex flex-col gap-2 w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caja Registradora:</span>
              <Select value={cajaSeleccionadaId} onValueChange={setCajaSeleccionadaId}>
                <SelectTrigger className="h-10 bg-card">
                  <SelectValue placeholder="Seleccione Caja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las cajas</SelectItem>
                  {cajas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar por Punto de Venta (Terminal):</span>
              <div className="flex flex-wrap gap-5">
                {terminales.map((term) => (
                  <label key={term.id} className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-foreground/80 hover:text-foreground">
                    <Checkbox
                      checked={terminalesSeleccionados.includes(term.id)}
                      onCheckedChange={() => toggleTerminal(term.id)}
                    />
                    {term.nombre}
                  </label>
                ))}
                {terminales.length === 0 && (
                  <span className="text-sm text-muted-foreground">Cargando puntos de venta...</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha de Consulta:</span>
              <div className="flex items-center gap-1.5 w-full">
                <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} className="h-10 w-10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="pl-9 h-10 w-full"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => shiftDay(1)} className="h-10 w-10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>

          {/* Turn Drawer State Warning Banner */}
          {esHoy && resumenBalance && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-4 bg-muted/30 border border-border/80 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                {cajaSeleccionadaId === "todas" ? (
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      Vista consolidada (Todas las cajas)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selecciona una caja registradora específica para poder abrir o cerrar turnos.
                    </p>
                  </div>
                ) : (
                  <>
                    <span className={`inline-block w-3 h-3 rounded-full ${resumenBalance.turnoAbierto ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <div className="text-sm">
                      {resumenBalance.turnoAbierto ? (
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                          Caja Abierta — Base inicial: {formatMoneda(resumenBalance.montoInicial)}
                        </p>
                      ) : (
                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                          Esta caja registradora está cerrada
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(`${fecha}T00:00:00`), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {cajaSeleccionadaId !== "todas" && (
                <div>
                  {resumenBalance.turnoAbierto ? (
                    <Button variant="destructive" onClick={() => setOpenCerrar(true)} className="h-10 px-5 shadow-sm font-semibold">
                      Cerrar Caja
                    </Button>
                  ) : (
                    <Button onClick={() => setOpenAbrir(true)} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                      Abrir Caja
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 1 Balance Cards */}
          {cargandoBalance ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resumenBalance ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <Card className="shadow-sm border-border bg-card/60">
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CAJA (Efectivo)</span>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-extrabold text-foreground">{formatMoneda(resumenBalance.caja)}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border bg-card/60">
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NEQUI</span>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{formatMoneda(resumenBalance.nequi)}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border bg-card/60">
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DAVIPLATA</span>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{formatMoneda(resumenBalance.daviplata)}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80 bg-primary/5 border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">TOTAL</span>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-black text-primary">{formatMoneda(resumenBalance.total)}</p>
                </CardContent>
              </Card>

            </div>
          ) : null}

          {/* Movimientos del día */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/80">
              <h3 className="font-bold text-foreground">Movimientos y facturación del día</h3>
              <p className="text-xs text-muted-foreground">Listado cronológico de cobros y gastos del día seleccionado</p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="font-semibold py-3 px-6">FECHA</TableHead>
                    <TableHead className="font-semibold py-3 px-6">CLIENTE / CONCEPTO</TableHead>
                    <TableHead className="font-semibold py-3 px-6">COBRADO POR</TableHead>
                    <TableHead className="font-semibold py-3 px-6">TIPO</TableHead>
                    <TableHead className="font-semibold py-3 px-6">EN</TableHead>
                    <TableHead className="font-semibold py-3 px-6 text-right">IMPORTE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargandoBalance ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                    </TableRow>
                  ) : movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Wallet className="h-10 w-10 mx-auto opacity-30 mb-2" />
                        No se registran movimientos para el día seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientos.map((m) => (
                      <TableRow 
                        key={m.id} 
                        className="hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => verDetalleMovimiento(m.id, m.ventaId)}
                      >
                        <TableCell className="py-4 px-6 text-sm font-medium whitespace-nowrap">
                          {format(new Date(m.fecha), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="py-4 px-6 font-semibold text-foreground">
                          {m.cliente}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground whitespace-nowrap">
                          {m.cobradoPor}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge variant={m.tipo.includes("Cobro") ? "default" : "destructive"} className="text-xs font-semibold px-2 py-0.5">
                            {m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm font-medium text-muted-foreground">
                          {m.en}
                        </TableCell>
                        <TableCell className={`py-4 px-6 text-right font-bold text-sm whitespace-nowrap ${m.importe > 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {formatMoneda(m.importe)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: DETALLE DE COBROS */}
        {/* ========================================================================= */}
        <TabsContent value="cobros" className="space-y-6 outline-none">
          
          {/* Advanced Filter Box */}
          <div className="bg-card/40 border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
            
            {/* Period selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">Período:</span>
              <div className="flex gap-1 bg-muted p-1 rounded-xl">
                {["hoy", "semana", "mes", "anio", "personalizado"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodoCobros(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all uppercase ${
                      periodoCobros === p 
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "anio" ? "Año" : p}
                  </button>
                ))}
              </div>

              {periodoCobros === "personalizado" && (
                <div className="flex items-center gap-2 ml-2">
                  <Input type="date" value={fechaDesdeCobros} onChange={(e) => setFechaDesdeCobros(e.target.value)} className="w-36 h-9 text-xs" />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input type="date" value={fechaHastaCobros} onChange={(e) => setFechaHastaCobros(e.target.value)} className="w-36 h-9 text-xs" />
                  <Button size="sm" onClick={cargarCobrosLogs} className="h-9 px-3">Aplicar</Button>
                </div>
              )}
            </div>

            {/* Dropdown Filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Empleados</span>
                <Select value={filtroEmpleadoCobros} onValueChange={setFiltroEmpleadoCobros}>
                  <SelectTrigger className="h-10 bg-card">
                    <SelectValue placeholder="Cualquier cajero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Cualquier cajero</SelectItem>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Caja Registradora</span>
                <Select value={filtroCajaCobros} onValueChange={setFiltroCajaCobros}>
                  <SelectTrigger className="h-10 bg-card">
                    <SelectValue placeholder="Cualquier caja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Cualquier caja</SelectItem>
                    {cajas.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Forma de Pago</span>
                <Select value={filtroPagoCobros} onValueChange={setFiltroPagoCobros}>
                  <SelectTrigger className="h-10 bg-card">
                    <SelectValue placeholder="Cualquier forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Cualquier forma</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="BANCOLOMBIA">Bancolombia</SelectItem>
                    <SelectItem value="NEQUI">Nequi</SelectItem>
                    <SelectItem value="DAVIPLATA">Daviplata</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="FIADO">Fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Estado de Venta</span>
                <Select value={filtroEstadoCobros} onValueChange={setFiltroEstadoCobros}>
                  <SelectTrigger className="h-10 bg-card">
                    <SelectValue placeholder="Cualquier opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Cualquier opción</SelectItem>
                    <SelectItem value="PAGADO">Cobrado (Contado)</SelectItem>
                    <SelectItem value="DEUDA">Por Cobrar (Fiado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="flex justify-end">
              <Button onClick={cargarCobrosLogs} className="h-10 px-6 font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" /> Buscar Cobros
              </Button>
            </div>

          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            
            <Card className="shadow-sm border-border bg-card/60">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">COBROS</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black text-foreground">{cobrosStats.cobrosCount}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card/60">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IMPORTE (Subtotal)</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold text-foreground">{formatMoneda(cobrosStats.importe)}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card/60">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IMPUESTOS</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold text-foreground">{formatMoneda(cobrosStats.impuestos)}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card/60">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">DEUDA (Pendiente)</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold text-rose-500">{formatMoneda(cobrosStats.deuda)}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">TOTAL COBRADO</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatMoneda(cobrosStats.total)}</p>
              </CardContent>
            </Card>

          </div>

          {/* Table list */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-foreground">Listado de Cobros</h3>
                <p className="text-xs text-muted-foreground">Detalle individual de pagos recibidos en el período</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportarCobros} className="h-9 text-xs flex items-center gap-2 border-border/80">
                  <Download className="h-3.5 w-3.5" /> Descargar CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-12 py-3 px-6">
                      <Checkbox
                        checked={cobros.length > 0 && selectedCobros.length === cobros.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCobros(cobros.map(c => c.id));
                          else setSelectedCobros([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-semibold py-3 px-6">FECHA COBRO</TableHead>
                    <TableHead className="font-semibold py-3 px-6">CLIENTE</TableHead>
                    <TableHead className="font-semibold py-3 px-6">COBRADOR</TableHead>
                    <TableHead className="font-semibold py-3 px-6">CAJA</TableHead>
                    <TableHead className="font-semibold py-3 px-6">FACTURA</TableHead>
                    <TableHead className="font-semibold py-3 px-6">FORMA DE PAGO</TableHead>
                    <TableHead className="font-semibold py-3 px-6 text-right">TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargandoCobros ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                    </TableRow>
                  ) : cobros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No hay cobros registrados en el período con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    cobros.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="py-4 px-6">
                          <Checkbox
                            checked={selectedCobros.includes(c.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedCobros([...selectedCobros, c.id]);
                              else setSelectedCobros(selectedCobros.filter(id => id !== c.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm font-medium whitespace-nowrap cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {format(new Date(c.fecha), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="py-4 px-6 font-semibold text-foreground cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {c.cliente}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {c.cobrador}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {c.caja}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {c.factura}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          <Badge variant="outline" className="font-medium">{c.formaPago}</Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right font-bold text-foreground whitespace-nowrap cursor-pointer" onClick={() => verDetalleMovimiento(c.id)}>
                          {formatMoneda(c.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: CONTROL DE GASTOS */}
        {/* ========================================================================= */}
        <TabsContent value="gastos" className="space-y-6 outline-none">
          
          {/* Expenses Filter Box */}
          <div className="bg-card/40 border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">Período:</span>
                <div className="flex gap-1 bg-muted p-1 rounded-xl">
                  {["hoy", "semana", "mes", "anio", "personalizado"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriodoGastos(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all uppercase ${
                        periodoGastos === p 
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p === "anio" ? "Año" : p}
                    </button>
                  ))}
                </div>

                {periodoGastos === "personalizado" && (
                  <div className="flex items-center gap-2 ml-2">
                    <Input type="date" value={fechaDesdeGastos} onChange={(e) => setFechaDesdeGastos(e.target.value)} className="w-36 h-9 text-xs" />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input type="date" value={fechaHastaGastos} onChange={(e) => setFechaHastaGastos(e.target.value)} className="w-36 h-9 text-xs" />
                    <Button size="sm" onClick={cargarGastosLogs} className="h-9 px-3">Aplicar</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => { setGastoEditar(null); setDialogoGastoAbierto(true); }} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2 shadow-sm">
                  <Plus className="h-4 w-4" /> Nuevo Gasto
                </Button>
              </div>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar gasto por concepto o categoría..."
                value={busquedaGastos}
                onChange={(e) => setBusquedaGastos(e.target.value)}
                className="pl-9 h-10 w-full bg-card"
              />
            </div>

          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="shadow-sm border-border bg-card/60">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GASTOS</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black text-foreground">{gastosStats.gastosCount}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-rose-50 dark:bg-rose-950/20 border-l-4 border-l-rose-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">TOTAL GASTADO</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatMoneda(gastosStats.total)}</p>
              </CardContent>
            </Card>

          </div>

          {/* Table List */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-foreground">Resumen de Gastos</h3>
                <p className="text-xs text-muted-foreground">Listado de egresos operativos documentados en el período</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportarGastos} className="h-9 text-xs flex items-center gap-2 border-border/80">
                  <Download className="h-3.5 w-3.5" /> Descargar CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-12 py-3 px-6">
                      <Checkbox
                        checked={gastos.length > 0 && selectedGastos.length === gastos.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedGastos(gastos.map(g => g.id));
                          else setSelectedGastos([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-semibold py-3 px-6">FECHA</TableHead>
                    <TableHead className="font-semibold py-3 px-6">CONCEPTO (REGISTRO)</TableHead>
                    <TableHead className="font-semibold py-3 px-6">CATEGORÍA</TableHead>
                    <TableHead className="font-semibold py-3 px-6">MÉTODO PAGO</TableHead>
                    <TableHead className="font-semibold py-3 px-6 text-right">IMPORTE</TableHead>
                    <TableHead className="font-semibold py-3 px-6 text-center">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargandoGastos ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                    </TableRow>
                  ) : gastosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No hay gastos registrados en el período
                      </TableCell>
                    </TableRow>
                  ) : (
                    gastosFiltrados.map((g) => (
                      <TableRow key={g.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="py-4 px-6">
                          <Checkbox
                            checked={selectedGastos.includes(g.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedGastos([...selectedGastos, g.id]);
                              else setSelectedGastos(selectedGastos.filter(id => id !== g.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm font-medium whitespace-nowrap">
                          {format(new Date(g.fecha), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="py-4 px-6 font-semibold text-foreground">
                          {g.concepto}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="px-2 py-0.5">{g.categoria?.nombre || "General"}</Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                          {g.metodoPago || "EFECTIVO"}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatMoneda(g.monto)}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarGasto(g.id)}
                            className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: GESTION DE CAJAS REGISTRADORAS */}
        {/* ========================================================================= */}
        <TabsContent value="cajas" className="space-y-6 outline-none">
          
          <div className="bg-card/40 border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-foreground">Crear Nueva Caja Registradora</h3>
            <p className="text-xs text-muted-foreground">Registra un nuevo flujo financiero independiente para un área o terminal de venta.</p>
            
            <form onSubmit={handleCrearCaja} className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Nombre de la caja (Ej. Caja Segundo Piso, Caja Barra...)"
                value={nuevaCajaNombre}
                onChange={(e) => setNuevaCajaNombre(e.target.value)}
                className="flex-1 h-10 bg-card"
                disabled={creandoCaja}
                required
              />
              <Button type="submit" className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2" disabled={creandoCaja}>
                {creandoCaja ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear Caja
              </Button>
            </form>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/80">
              <h3 className="font-bold text-foreground">Listado de Cajas Registradoras</h3>
              <p className="text-xs text-muted-foreground">Administra el estado y activación de las cajas registradoras de tu negocio.</p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="font-semibold py-3 px-6">NOMBRE</TableHead>
                    <TableHead className="font-semibold py-3 px-6">ESTADO</TableHead>
                    <TableHead className="font-semibold py-3 px-6">FECHA CREACIÓN</TableHead>
                    <TableHead className="font-semibold py-3 px-6 text-center">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargandoCajas ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : cajas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No hay cajas registradoras configuradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cajas.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="py-4 px-6 font-semibold text-foreground">
                          {c.nombre}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge variant={c.activa ? "default" : "secondary"} className="text-xs font-semibold px-2 py-0.5">
                            {c.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                          {format(new Date(c.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleCajaActiva(c.id, c.activa)}
                              className="h-8 text-xs px-3"
                            >
                              {c.activa ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => eliminarCaja(c.id)}
                              className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* SHIFT OPEN/CLOSE DIALOGS */}
      {/* ========================================================================= */}
      
      {/* Dialog: Abrir Caja */}
      <Dialog open={openAbrir} onOpenChange={setOpenAbrir}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caja del Día</DialogTitle>
            <DialogDescription>
              Registra el monto de base en efectivo con el que inicias el turno.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Monto Inicial (Base en efectivo) *</label>
              <Input
                type="number"
                value={montoInicial}
                onChange={(e) => setMontoInicial(Number(e.target.value))}
                placeholder="Ej. 100000"
                className="h-11 font-bold text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbrir(false)} disabled={procesandoTurno}>
              Cancelar
            </Button>
            <Button onClick={handleAbrirCaja} disabled={procesandoTurno} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {procesandoTurno ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cerrar Caja (Arqueo) */}
      <Dialog open={openCerrar} onOpenChange={setOpenCerrar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arqueo y Cierre de Caja</DialogTitle>
            <DialogDescription>
              Compara el saldo físico en efectivo con el saldo del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resumenBalance && (
              <div className="bg-muted p-4 rounded-xl space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Inicial (Base):</span>
                  <span className="font-semibold">{formatMoneda(resumenBalance.montoInicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingresos en Efectivo:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+{formatMoneda(resumenBalance.caja)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastos en Efectivo:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatMoneda(resumenBalance.efectivoEsperado - resumenBalance.montoInicial - resumenBalance.caja)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Efectivo Esperado:</span>
                  <span className="text-primary">{formatMoneda(resumenBalance.efectivoEsperado)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Efectivo Real en Caja (Físico) *</label>
              <Input
                type="number"
                value={montoFinalReal}
                onChange={(e) => setMontoFinalReal(Number(e.target.value))}
                placeholder="Ej. 120000"
                className="h-11 font-bold text-lg"
              />
            </div>

            {resumenBalance && (
              <div className="flex justify-between text-sm px-1">
                <span>Diferencia (Sobrante/Faltante):</span>
                <span className={`font-bold ${montoFinalReal - resumenBalance.efectivoEsperado === 0 ? "text-muted-foreground" : montoFinalReal - resumenBalance.efectivoEsperado > 0 ? "text-green-600" : "text-rose-600"}`}>
                  {formatMoneda(montoFinalReal - resumenBalance.efectivoEsperado)}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Notas / Observaciones</label>
              <Input
                value={notasArqueo}
                onChange={(e) => setNotasArqueo(e.target.value)}
                placeholder="Escribe alguna novedad si la hay..."
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCerrar(false)} disabled={procesandoTurno}>
              Cancelar
            </Button>
            <Button onClick={handleCerrarCaja} disabled={procesandoTurno} variant="destructive" className="font-semibold">
              {procesandoTurno ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog for new expense */}
      <GastoDialog
        open={dialogoGastoAbierto}
        onOpenChange={setDialogoGastoAbierto}
        onSuccess={() => {
          cargarGastosLogs();
          if (fecha === format(new Date(), "yyyy-MM-dd")) {
            cargarBalance();
          }
        }}
        gastoEditar={gastoEditar}
      />

      {/* Dialog para desglosar el pago / detalle de venta */}
      <Dialog open={dialogDetalleAbierto} onOpenChange={setDialogDetalleAbierto}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Receipt className="h-5 w-5 text-primary" />
              {detalleMovimiento?.tipoMov === "GASTO" ? "Detalle de Gasto" : "Detalle de Transacción"}
            </DialogTitle>
            <DialogDescription>
              {detalleMovimiento?.tipoMov === "GASTO"
                ? "Resumen del gasto registrado en el sistema."
                : "Desglose de los productos y servicios adquiridos en esta venta."}
            </DialogDescription>
          </DialogHeader>

          {cargandoDetalle ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Obteniendo detalles...</p>
            </div>
          ) : detalleMovimiento ? (
            detalleMovimiento.tipoMov === "GASTO" ? (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Fecha</span>
                    <span className="font-medium">
                      {detalleMovimiento.fecha ? format(new Date(detalleMovimiento.fecha), "dd/MM/yyyy") : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Registrado por</span>
                    <span className="font-medium">{detalleMovimiento.usuario?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Método de Pago</span>
                    <span className="font-medium uppercase">{detalleMovimiento.metodoPago}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Categoría</span>
                    <span className="font-medium">{detalleMovimiento.categoria}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Concepto</h4>
                  <p className="text-base text-foreground font-medium p-3 bg-card border rounded-lg">
                    {detalleMovimiento.concepto}
                  </p>
                </div>
                <div className="flex justify-between items-center border-t pt-3 font-bold text-lg">
                  <span>Monto del Gasto:</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatMoneda(detalleMovimiento.monto)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                {/* General Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border text-xs sm:text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Fecha / Hora</span>
                    <span className="font-semibold text-foreground">
                      {format(new Date(detalleMovimiento.createdAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Atendido por</span>
                    <span className="font-semibold text-foreground">{detalleMovimiento.usuario?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Cliente</span>
                    <span className="font-semibold text-foreground">{detalleMovimiento.cliente?.nombre || "Desconocido"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Método de Pago</span>
                    <span className="font-semibold text-foreground">
                      {detalleMovimiento.esVentaFiada 
                        ? `Fiado (Pendiente: ${formatMoneda(detalleMovimiento.saldoPendiente)})` 
                        : detalleMovimiento.metodoPago}
                    </span>
                  </div>
                  {detalleMovimiento.terminal && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Caja</span>
                      <span className="font-semibold text-foreground">{detalleMovimiento.terminal?.nombre}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground block">Estado</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{detalleMovimiento.estado}</span>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground">Productos / Servicios comprados</h4>
                  <div className="border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-xs font-semibold py-2 px-3">Item</TableHead>
                          <TableHead className="text-xs font-semibold py-2 px-3">Realizado por</TableHead>
                          <TableHead className="text-center text-xs font-semibold py-2 px-3">Cant.</TableHead>
                          <TableHead className="text-right text-xs font-semibold py-2 px-3">Precio</TableHead>
                          <TableHead className="text-right text-xs font-semibold py-2 px-3">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalleMovimiento.items?.map((item: any) => (
                          <TableRow key={item.id} className="hover:bg-muted/5">
                            <TableCell className="py-2.5 px-3 text-xs sm:text-sm">
                              <p className="font-medium text-foreground text-left">
                                {item.producto?.nombre || item.servicio?.nombre || "Item sin nombre"}
                              </p>
                              {item.producto?.codigo && (
                                <p className="text-[10px] text-muted-foreground text-left">Cód: {item.producto.codigo}</p>
                              )}
                              {item.servicio && (
                                <p className="text-[10px] text-primary font-medium text-left">Servicio</p>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs sm:text-sm text-left font-medium text-muted-foreground">
                              {item.empleado?.nombre || "—"}
                            </TableCell>
                            <TableCell className="text-center py-2.5 px-3 text-xs sm:text-sm font-medium">
                              {parseFloat(item.cantidad.toString())}
                            </TableCell>
                            <TableCell className="text-right py-2.5 px-3 text-xs sm:text-sm font-medium">
                              {formatMoneda(parseFloat(item.precio.toString()))}
                            </TableCell>
                            <TableCell className="text-right py-2.5 px-3 text-xs sm:text-sm font-bold text-foreground">
                              {formatMoneda(parseFloat(item.subtotal.toString()))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="space-y-1.5 border-t pt-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatMoneda(detalleMovimiento.subtotal)}</span>
                  </div>
                  {detalleMovimiento.impuesto > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Impuestos:</span>
                      <span>{formatMoneda(detalleMovimiento.impuesto)}</span>
                    </div>
                  )}
                  {detalleMovimiento.descuento > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Descuento:</span>
                      <span>-{formatMoneda(detalleMovimiento.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2 text-foreground">
                    <span>Total pagado:</span>
                    <span>{formatMoneda(detalleMovimiento.total)}</span>
                  </div>
                </div>

                {/* Redirection link */}
                <div className="flex gap-2 justify-end pt-3">
                  <Button variant="outline" size="sm" onClick={() => setDialogDetalleAbierto(false)}>
                    Cerrar
                  </Button>
                  <Button size="sm" onClick={() => {
                    setDialogDetalleAbierto(false);
                    router.push(`/dashboard/ventas/${detalleMovimiento.id}`);
                  }} className="bg-primary hover:bg-primary/90 font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Ver factura completa
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No se pudieron encontrar los detalles de este movimiento.
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
