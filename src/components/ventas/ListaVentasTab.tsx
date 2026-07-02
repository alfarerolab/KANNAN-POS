// src/components/ventas/ListaVentasTab.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search,
  Download,
  Eye,
  RefreshCcw,
  ShoppingCart,
  AlertCircle,
  MoreVertical,
  Printer,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoPagoFiado } from "@/types/ventas-fiadas";
import { DialogoPagarDeudaTotal } from "./DialogoPagarDeudaTotal";

interface Venta {
  id: string;
  folio?: string;
  fechaCreacion: Date | string;
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
  };
  total: number;
  metodoPago: string;
  estado: "COMPLETADA" | "PENDIENTE" | "CANCELADA";
  usuario?: {
    id: string;
    nombre: string;
  };
  esVentaFiada?: boolean;
  saldoPendiente?: number;
  montoPagado?: number;
  estadoPago?: EstadoPagoFiado;
  fechaVencimiento?: Date | string;
  diasCredito?: number;
  pagosFiados?: {
    id: string;
    monto: number;
    fechaPago: Date | string;
    metodoPago: string;
  }[];
}

interface ClienteConDeuda {
  id: string;
  nombre: string;
  email?: string;
  deudaTotal: number;
  cantidadVentas: number;
}

interface ListaVentasTabProps {
  formatearMoneda: (cantidad: number) => string;
}

export function ListaVentasTab({ formatearMoneda }: ListaVentasTabProps) {
  const router = useRouter();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    metodoPago: "todos",
    estado: "todos",
    estadoPago: "todos",
    fechaInicio: "",
    fechaFin: "",
    soloFiadas: false,
  });

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);

  const [verPorCliente, setVerPorCliente] = useState(false);
  const [clientesConDeuda, setClientesConDeuda] = useState<ClienteConDeuda[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string; email?: string } | null>(null);
  const [dialogoPagoDeudaAbierto, setDialogoPagoDeudaAbierto] = useState(false);

  useEffect(() => {
    cargarVentas();
  }, [filtros, paginaActual]);

  useEffect(() => {
    if (verPorCliente) {
      cargarDeudaPorCliente();
    }
  }, [verPorCliente, filtros.soloFiadas]);

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
      if (filtros.metodoPago !== "todos") params.append("metodoPago", filtros.metodoPago);
      if (filtros.estado !== "todos") params.append("estado", filtros.estado);
      if (filtros.estadoPago !== "todos") params.append("estadoPago", filtros.estadoPago);
      if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
      if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
      if (filtros.soloFiadas) params.append("soloFiadas", "true");
      params.append("pagina", paginaActual.toString());
      params.append("limite", "20");

      const response = await fetch(`/api/ventas?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar ventas");

      const data = await response.json();
      setVentas(data.datos || []);
      setTotalVentas(data.meta?.total || 0);
      setTotalPaginas(data.meta?.totalPaginas || 1);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      toast.error("Error al cargar las ventas");
    } finally {
      setLoading(false);
    }
  };

  const cargarDeudaPorCliente = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("soloFiadas", "true");
      params.append("estadoPago", "PENDIENTE,PAGO_PARCIAL,VENCIDO");
      params.append("limite", "1000");

      const response = await fetch(`/api/ventas?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar ventas");

      const data = await response.json();
      const ventasData = data.datos || [];

      const clientesMap = new Map<string, ClienteConDeuda>();
      ventasData.forEach((venta: Venta) => {
        if (venta.cliente && (venta.saldoPendiente || 0) > 0) {
          const clienteId = venta.cliente.id;
          if (clientesMap.has(clienteId)) {
            const cliente = clientesMap.get(clienteId)!;
            cliente.deudaTotal += venta.saldoPendiente || 0;
            cliente.cantidadVentas += 1;
          } else {
            clientesMap.set(clienteId, {
              id: clienteId,
              nombre: venta.cliente.nombre,
              email: venta.cliente.email,
              deudaTotal: venta.saldoPendiente || 0,
              cantidadVentas: 1,
            });
          }
        }
      });

      const clientes = Array.from(clientesMap.values()).sort((a, b) => b.deudaTotal - a.deudaTotal);
      setClientesConDeuda(clientes);
    } catch (error) {
      console.error("Error al cargar deuda por cliente:", error);
      toast.error("Error al cargar deuda por cliente");
    } finally {
      setLoading(false);
    }
  };

  // ── Utilidades ──────────────────────────────────────────────────────────────

  const formatearFecha = (fecha: Date | string | null | undefined) => {
    if (!fecha) return "Sin fecha";
    const normalized = typeof fecha === "string" ? fecha.replace(" ", "T") : fecha;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoBadge = (estado: string) => {
    const configs = {
      COMPLETADA: { className: "bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15 dark:hover:bg-emerald-900/40", icon: <CheckCircle2 className="h-3 w-3 mr-1" />, label: "Completada" },
      PENDIENTE:  { className: "bg-amber-500/15 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 dark:hover:bg-amber-900/40", icon: <Clock className="h-3 w-3 mr-1" />, label: "Pendiente" },
      CANCELADA:  { className: "bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300 hover:bg-destructive/15 dark:hover:bg-red-900/40", icon: <XCircle className="h-3 w-3 mr-1" />, label: "Cancelada" },
    };
    const key = estado?.toUpperCase() as keyof typeof configs;
    const config = configs[key] || configs.COMPLETADA;
    return (
      <Badge className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getEstadoPagoBadge = (venta: Venta) => {
    if (!venta.esVentaFiada) return null;
    const estaVencida =
      venta.fechaVencimiento &&
      new Date(venta.fechaVencimiento) < new Date() &&
      venta.estadoPago !== EstadoPagoFiado.PAGADO;

    switch (venta.estadoPago) {
      case EstadoPagoFiado.PAGADO:
        return <Badge className="bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15"><CheckCircle2 className="h-3 w-3 mr-1" />Pagado</Badge>;
      case EstadoPagoFiado.PAGO_PARCIAL: {
        const pct = venta.total > 0 ? ((venta.montoPagado || 0) / venta.total) * 100 : 0;
        return <Badge className="bg-blue-500/15 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 dark:text-blue-300 hover:bg-blue-500/15"><CreditCard className="h-3 w-3 mr-1" />Abono: {pct.toFixed(0)}%</Badge>;
      }
      case EstadoPagoFiado.VENCIDO:
        return <Badge className="bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300 hover:bg-destructive/15"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
      default:
        if (estaVencida)
          return <Badge className="bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300 hover:bg-destructive/15"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
        return <Badge className="bg-orange-500/15 text-orange-800 dark:text-orange-300 hover:bg-orange-500/15"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const getMetodoPagoBadge = (metodo: string, esFiada?: boolean) => {
    if (esFiada)
      return <Badge variant="outline" className="border-orange-500/40 text-orange-700 dark:text-orange-400"><CreditCard className="h-3 w-3 mr-1" />Crédito</Badge>;

    const configs: Record<string, { color: string; label: string }> = {
      EFECTIVO:      { color: "bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",  label: "Efectivo" },
      TARJETA:       { color: "bg-blue-500/15 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 dark:text-blue-300",    label: "Tarjeta" },
      TRANSFERENCIA: { color: "bg-purple-500/15 text-purple-800", label: "Transferencia" },
      MIXTO:         { color: "bg-muted text-foreground",    label: "Mixto" },
    };
    const config = configs[metodo] || { color: "bg-muted text-foreground", label: metodo };
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const getDiasVencimiento = (venta: Venta) => {
    if (!venta.esVentaFiada || !venta.fechaVencimiento) return null;
    const hoy = new Date();
    const fechaVenc = new Date(venta.fechaVencimiento);
    const diffDays = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0)  return <span className="text-xs text-red-600 dark:text-red-400 font-medium">Vencida hace {Math.abs(diffDays)} días</span>;
    if (diffDays === 0) return <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Vence hoy</span>;
    if (diffDays <= 3)  return <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Vence en {diffDays} días</span>;
    return <span className="text-xs text-muted-foreground">Vence en {diffDays} días</span>;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleVerDetalle    = (id: string) => router.push(`/dashboard/ventas/${id}`);
  const handleRegistrarPago = (id: string) => router.push(`/dashboard/ventas/${id}#pagos`);
  const handleImprimirTicket = (id: string) => window.open(`/dashboard/pos/ticket?ventaId=${id}`, "_blank");

  const handleExportar = async () => {
    toast.info("Exportando ventas...");
    toast.success("Ventas exportadas exitosamente");
  };

  const handleLimpiarFiltros = () => {
    setFiltros({ busqueda: "", metodoPago: "todos", estado: "todos", estadoPago: "todos", fechaInicio: "", fechaFin: "", soloFiadas: false });
    setPaginaActual(1);
  };

  const handlePagarDeudaTotal = (cliente: ClienteConDeuda) => {
    setClienteSeleccionado({ id: cliente.id, nombre: cliente.nombre, email: cliente.email });
    setDialogoPagoDeudaAbierto(true);
  };

  const handlePagoDeudaRegistrado = () => {
    if (verPorCliente) {
      cargarDeudaPorCliente();
    } else {
      cargarVentas();
    }
  };

 

  const AccionesMenu = ({ venta }: { venta: Venta }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleVerDetalle(venta.id)}>
          <Eye className="mr-2 h-4 w-4" />Ver Detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleImprimirTicket(venta.id)}>
          <Printer className="mr-2 h-4 w-4" />Imprimir Ticket
        </DropdownMenuItem>
        {venta.esVentaFiada && (venta.saldoPendiente || 0) > 0 && (
          <DropdownMenuItem onClick={() => handleRegistrarPago(venta.id)} className="text-green-600 dark:text-green-400">
            <DollarSign className="mr-2 h-4 w-4" />Registrar Pago
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Tarjeta de venta para móvil ───────────────────────────────────────────

  const VentaCard = ({ venta }: { venta: Venta }) => (
    <div className="border rounded-lg p-3 space-y-2 bg-card hover:bg-muted/30 transition-colors">
      {/* Fila 1: Folio + acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {venta.folio || venta.id.substring(0, 8).toUpperCase()}
          </span>
          {venta.esVentaFiada && (
            <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-700 dark:text-orange-400">CRÉDITO</Badge>
          )}
        </div>
        <AccionesMenu venta={venta} />
      </div>

      {/* Fila 2: Cliente + fecha */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{venta.cliente?.nombre || "Cliente General"}</p>
          {venta.cliente?.email && (
            <p className="text-xs text-muted-foreground">{venta.cliente.email}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground text-right shrink-0">
          {formatearFecha(venta.fechaCreacion)}
        </span>
      </div>

      {/* Fila 3: Método + Estado */}
      <div className="flex items-center gap-2 flex-wrap">
        {getMetodoPagoBadge(venta.metodoPago, venta.esVentaFiada)}
        {getEstadoBadge(venta.estado)}
        {venta.esVentaFiada && getEstadoPagoBadge(venta)}
      </div>

      {/* Fila 4: Total + saldo */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-bold text-base">{formatearMoneda(venta.total)}</span>
        {venta.esVentaFiada && (
          <div className="text-right">
            <span className={`text-sm font-medium ${(venta.saldoPendiente || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              Saldo: {formatearMoneda(venta.saldoPendiente || 0)}
            </span>
            {(venta.montoPagado || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Pagado: {formatearMoneda(venta.montoPagado || 0)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Vencimiento si aplica */}
      {venta.esVentaFiada && venta.fechaVencimiento && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Vence: {formatearFecha(venta.fechaVencimiento).split(",")[0]}</span>
          {getDiasVencimiento(venta)}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleLimpiarFiltros} className="h-8 text-xs sm:text-sm">
                Limpiar
              </Button>
              <Button onClick={cargarVentas} variant="outline" size="sm" disabled={loading} className="h-8 w-8 p-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Folio, cliente..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Método de Pago</Label>
              <Select value={filtros.metodoPago} onValueChange={(v) => setFiltros({ ...filtros, metodoPago: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="MIXTO">Mixto</SelectItem>
                  <SelectItem value="FIADO">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Estado</Label>
              <Select value={filtros.estado} onValueChange={(v) => setFiltros({ ...filtros, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="COMPLETADA">Completada</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Estado de Pago</Label>
              <Select value={filtros.estadoPago} onValueChange={(v) => setFiltros({ ...filtros, estadoPago: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PAGO_PARCIAL">Pago Parcial</SelectItem>
                  <SelectItem value="PAGADO">Pagado</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Fecha Inicio</Label>
              <Input type="date" value={filtros.fechaInicio} onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Fecha Fin</Label>
              <Input type="date" value={filtros.fechaFin} onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })} />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="solo-fiadas"
                  checked={filtros.soloFiadas}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, soloFiadas: checked })}
                />
                <Label htmlFor="solo-fiadas" className="cursor-pointer text-xs sm:text-sm">
                  Solo Ventas Fiadas
                </Label>
              </div>
            </div>
          </div>

          {filtros.soloFiadas && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="ver-por-cliente" checked={verPorCliente} onCheckedChange={setVerPorCliente} />
                  <Label htmlFor="ver-por-cliente" className="cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm">
                    <Users className="h-4 w-4" />
                    Ver deuda por cliente
                  </Label>
                </div>
                <Badge variant="outline" className="text-xs">
                  {verPorCliente ? `${clientesConDeuda.length} clientes` : "Total ventas"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-8">
                Permite pagar la deuda total del cliente con distribución automática
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabla / Tarjetas ── */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">
                {verPorCliente ? "Deuda por Cliente" : "Lista de Ventas"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {verPorCliente
                  ? `${clientesConDeuda.length} cliente${clientesConDeuda.length !== 1 ? "s" : ""} con deuda pendiente`
                  : `${totalVentas} venta${totalVentas !== 1 ? "s" : ""} encontrada${totalVentas !== 1 ? "s" : ""}`
                }
              </CardDescription>
            </div>
            <Button onClick={handleExportar} variant="outline" size="sm" className="h-8 sm:h-9 shrink-0">
              <Download className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : verPorCliente ? (
            clientesConDeuda.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay clientes con deudas pendientes</p>
              </div>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead className="text-center">Ventas</TableHead>
                        <TableHead className="text-right">Deuda Total</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesConDeuda.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{cliente.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cliente.email || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{cliente.cantidadVentas} venta{cliente.cantidadVentas !== 1 ? "s" : ""}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-red-600 dark:text-red-400">{formatearMoneda(cliente.deudaTotal)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button onClick={() => handlePagarDeudaTotal(cliente)} size="sm" variant="default">
                              <DollarSign className="mr-1 h-4 w-4" />
                              Pagar Deuda
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="sm:hidden space-y-3">
                  {clientesConDeuda.map((cliente) => (
                    <div key={cliente.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cliente.nombre}</p>
                          {cliente.email && <p className="text-xs text-muted-foreground">{cliente.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <Badge variant="outline" className="text-xs">{cliente.cantidadVentas} venta{cliente.cantidadVentas !== 1 ? "s" : ""}</Badge>
                        <span className="font-bold text-red-600 dark:text-red-400">{formatearMoneda(cliente.deudaTotal)}</span>
                      </div>
                      <Button onClick={() => handlePagarDeudaTotal(cliente)} size="sm" variant="default" className="w-full">
                        <DollarSign className="mr-1 h-4 w-4" />
                        Pagar Deuda Total
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : ventas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron ventas</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Estado Pago</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((venta) => (
                      <TableRow key={venta.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {venta.folio || venta.id.substring(0, 8).toUpperCase()}
                            {venta.esVentaFiada && (
                              <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-700 dark:text-orange-400">CRÉDITO</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatearFecha(venta.fechaCreacion)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{venta.cliente?.nombre || "Cliente General"}</span>
                            {venta.cliente?.email && <span className="text-xs text-muted-foreground">{venta.cliente.email}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{getMetodoPagoBadge(venta.metodoPago, venta.esVentaFiada)}</TableCell>
                        <TableCell className="text-right font-medium">{formatearMoneda(venta.total)}</TableCell>
                        <TableCell>{getEstadoBadge(venta.estado)}</TableCell>
                        <TableCell>
                          {venta.esVentaFiada ? (
                            <div className="flex flex-col gap-1">
                              {getEstadoPagoBadge(venta)}
                              {venta.pagosFiados && venta.pagosFiados.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {venta.pagosFiados.length} pago{venta.pagosFiados.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {venta.esVentaFiada ? (
                            <div className="flex flex-col items-end">
                              <span className={`font-medium ${(venta.saldoPendiente || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                {formatearMoneda(venta.saldoPendiente || 0)}
                              </span>
                              {(venta.montoPagado || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Pagado: {formatearMoneda(venta.montoPagado || 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {venta.esVentaFiada && venta.fechaVencimiento ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{formatearFecha(venta.fechaVencimiento).split(",")[0]}</span>
                              {getDiasVencimiento(venta)}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <AccionesMenu venta={venta} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {ventas.map((venta) => (
                  <VentaCard key={venta.id} venta={venta} />
                ))}
              </div>
            </>
          )}

          {!verPorCliente && totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4 gap-2">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Página {paginaActual} de {totalPaginas}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                  disabled={paginaActual === 1 || loading}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                  disabled={paginaActual === totalPaginas || loading}
                  className="h-8"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DialogoPagarDeudaTotal
        abierto={dialogoPagoDeudaAbierto}
        onClose={() => setDialogoPagoDeudaAbierto(false)}
        cliente={clienteSeleccionado}
        onPagoRegistrado={handlePagoDeudaRegistrado}
      />
    </div>
  );
}