// src/app/dashboard/ventas/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Printer, Receipt, Loader2, AlertCircle, Edit, DollarSign, CreditCard, History, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { HistorialPagosVentaFiada } from "@/components/ventas/HistorialPagosVentaFiada";
import { DialogoRegistrarPago } from "@/components/ventas/DialogoRegistrarPago";
import { DialogoEditarVenta } from "@/components/ventas/DialogoEditarVenta";
import { HistorialAuditoriaVenta } from "@/components/ventas/HistorialAuditoriaVenta";
import { EstadoPagoFiado } from "@/types/ventas-fiadas";

const METODOS_PAGO: { [key: string]: { nombre: string; icon: string } } = {
  "EFECTIVO": { nombre: "Efectivo", icon: "💵" },
  "TARJETA_CREDITO": { nombre: "Tarjeta de Crédito", icon: "💳" },
  "TARJETA_DEBITO": { nombre: "Tarjeta de Débito", icon: "💳" },
  "TRANSFERENCIA": { nombre: "Transferencia Bancaria", icon: "🏦" },
  "NEQUI": { nombre: "Transferencia (Nequi)", icon: "📱" },
  "DAVIPLATA": { nombre: "Transferencia (Daviplata)", icon: "📱" },
  "FIADO": { nombre: "Fiado", icon: "📝" },
  "MIXTO": { nombre: "Pago Mixto", icon: "💳" },
  "OTRO": { nombre: "Otro", icon: "💰" }
};

interface PagoDetalle {
  id: string;
  metodoPago: string;
  monto: number;
  referencia?: string;
}

interface ItemVenta {
  id: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  producto?: {
    id: string;
    nombre: string;
    codigo?: string;
    precio: number;
  };
  servicio?: {
    id: string;
    nombre: string;
    precio: number;
  };
  empleado?: {
    id: string;
    nombre: string;
  };
}

interface DetalleVenta {
  id: string;
  createdAt: string;
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
  };
  usuario: {
    id: string;
    nombre: string;
    email?: string;
  };
  items: ItemVenta[];
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  estado: "COMPLETADA" | "PENDIENTE" | "CANCELADA" | "REEMBOLSADA";
  metodoPago: string;
  notas?: string;
  reciboImpreso?: boolean;
  pagos?: PagoDetalle[];
  esVentaFiada?: boolean;
  saldoPendiente?: number;
  montoPagado?: number;
  estadoPago?: EstadoPagoFiado;
  fechaVencimiento?: Date | string;
  diasCredito?: number;
  pagosFiados?: any[];
}

export default function DetalleVentaPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const [venta, setVenta] = useState<DetalleVenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [dialogoPagoAbierto, setDialogoPagoAbierto] = useState(false);
  const [dialogoEditarAbierto, setDialogoEditarAbierto] = useState(false);
  const [auditoriaRefreshKey, setAuditoriaRefreshKey] = useState(0);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#pagos" && venta?.esVentaFiada && (venta.saldoPendiente || 0) > 0) {
      setDialogoPagoAbierto(true);
    }
  }, [venta]);

  const cargarVenta = async () => {
    if (!session?.user?.empresaId || !params.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ventas/${params.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        if (response.status === 404) { setError("Venta no encontrada"); return; }
        if (response.status === 401) { setError("No tienes autorización para ver esta venta"); return; }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const ventaData = await response.json();
      setVenta(ventaData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar la venta');
      toast.error("Error al cargar los detalles de la venta");
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (nuevoEstado: string) => {
    if (!venta || !params.id) return;
    try {
      setActualizandoEstado(true);
      const response = await fetch(`/api/ventas/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar el estado');
      }
      const ventaActualizada = await response.json();
      if (ventaActualizada.venta) {
        setVenta(ventaActualizada.venta);
        toast.success(ventaActualizada.mensaje || `Estado actualizado a ${nuevoEstado}`);
      } else {
        setVenta(prev => prev ? { ...prev, estado: nuevoEstado as DetalleVenta["estado"] } : null);
        toast.success(`Estado actualizado a ${nuevoEstado}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el estado");
    } finally {
      setActualizandoEstado(false);
    }
  };

  const marcarReciboImpreso = async () => {
    if (!venta || !params.id) return;
    try {
      const response = await fetch(`/api/ventas/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reciboImpreso: true }),
      });
      if (!response.ok) throw new Error('Error al marcar recibo como impreso');
      setVenta(prev => prev ? { ...prev, reciboImpreso: true } : null);
      toast.success("Recibo marcado como impreso");
    } catch (error) {
      toast.error("Error al marcar el recibo como impreso");
    }
  };

  useEffect(() => {
    if (session?.user?.empresaId && params.id) cargarVenta();
  }, [session?.user?.empresaId, params.id]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "COMPLETADA": return <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300 dark:bg-green-900 dark:text-green-300">Completada</Badge>;
      case "PENDIENTE": return <Badge variant="secondary">Pendiente</Badge>;
      case "CANCELADA": return <Badge variant="destructive">Cancelada</Badge>;
      case "REEMBOLSADA": return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">Reembolsada</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getEstadoPagoBadge = (estadoPago?: EstadoPagoFiado) => {
    if (!estadoPago) return null;
    switch (estadoPago) {
      case EstadoPagoFiado.PAGADO: return <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300">Pagado Completo</Badge>;
      case EstadoPagoFiado.PAGO_PARCIAL: return <Badge className="bg-blue-500/15 text-blue-800 dark:text-blue-300">Pago Parcial</Badge>;
      case EstadoPagoFiado.PENDIENTE: return <Badge className="bg-orange-500/15 text-orange-800 dark:text-orange-300">Pago Pendiente</Badge>;
      case EstadoPagoFiado.VENCIDO: return <Badge className="bg-destructive/15 text-red-800 dark:text-red-300">Vencido</Badge>;
      default: return null;
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatearMoneda = (cantidad: number | string) => {
    const numero = typeof cantidad === 'string' ? parseFloat(cantidad) : cantidad;
    return isNaN(numero) ? '$0' : new Intl.NumberFormat("es-CO", {
      style: "currency", currency: "COP",
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(numero);
  };

  const handlePagoRegistrado = () => cargarVenta();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando detalles de la venta...</p>
        </div>
      </div>
    );
  }

  if (error || !venta) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription className="text-red-600 dark:text-red-400">
              {error || "No se pudo cargar la venta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/ventas">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Ventas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ventas">
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Detalle de Venta</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {formatearFecha(venta.createdAt)}
            </p>
          </div>
        </div>
        {/* Badges de estado en móvil van debajo del título */}
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
          {getEstadoBadge(venta.estado)}
          {venta.esVentaFiada && getEstadoPagoBadge(venta.estadoPago)}
        </div>
      </div>

      {/* ── Layout principal: 1 col en móvil, 3 cols en md+ ── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">

        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Items de la venta */}
          <Card>
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="text-base sm:text-lg">Items de la Venta</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {venta.items?.length || 0} producto{(venta.items?.length || 0) !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {/* Tabla con scroll horizontal en móvil */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Producto</TableHead>
                      <TableHead className="text-xs sm:text-sm">Realizado por</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Cantidad</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Precio</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 text-xs sm:text-sm">
                            <p className="font-medium">
                              {item.producto?.nombre || item.servicio?.nombre || 'Item eliminado'}
                            </p>
                            {item.producto?.codigo && (
                              <p className="text-xs text-muted-foreground">
                                Cód: {item.producto.codigo}
                              </p>
                            )}
                            {item.servicio && (
                              <p className="text-xs text-muted-foreground text-primary">
                                Servicio
                              </p>
                            )}
                        </TableCell>
                        <TableCell className="py-2 text-xs sm:text-sm text-left text-muted-foreground font-medium">
                          {item.empleado?.nombre || '—'}
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm py-2">{item.cantidad}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm py-2">{formatearMoneda(item.precio)}</TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm py-2">
                          {formatearMoneda(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-3" />

              {/* Totales */}
              <div className="space-y-1.5 px-2 sm:px-0">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Subtotal:</span>
                  <span>{formatearMoneda(venta.subtotal)}</span>
                </div>
                {venta.impuesto > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Impuesto:</span>
                    <span>{formatearMoneda(venta.impuesto)}</span>
                  </div>
                )}
                {venta.descuento > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600 dark:text-green-400">
                    <span>Descuento:</span>
                    <span>-{formatearMoneda(venta.descuento)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base sm:text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatearMoneda(venta.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Pagos - Solo para ventas fiadas */}
          {venta.esVentaFiada && (
            <>
              <Card id="pagos" className="border-orange-500/30">
                <CardHeader className="px-4 sm:px-6 pb-3">
                  {/* Header del card: apilado en móvil */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                        Estado de Pago - Venta Fiada
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-0.5">
                        Información de pagos y saldo pendiente
                      </CardDescription>
                    </div>
                    {(venta.saldoPendiente || 0) > 0 && (
                      <Button
                        onClick={() => setDialogoPagoAbierto(true)}
                        size="sm"
                        className="w-full sm:w-auto shrink-0"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Registrar Pago
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {/* 
                    Montos como lista en lugar de grid de 3 cols
                    Así los números largos (COP 250.052) nunca se cortan
                  */}
                  <div className="divide-y rounded-lg border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total de la Venta</p>
                      <p className="text-sm sm:text-base font-bold">{formatearMoneda(venta.total)}</p>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-500/10 dark:bg-green-950">
                      <p className="text-xs sm:text-sm text-green-800 dark:text-green-300 dark:text-green-200">Monto Pagado</p>
                      <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                        {formatearMoneda(venta.montoPagado || 0)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-destructive/10 dark:bg-red-950">
                      <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 dark:text-red-200">Saldo Pendiente</p>
                      <p className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">
                        {formatearMoneda(venta.saldoPendiente || 0)}
                      </p>
                    </div>
                  </div>

                  {venta.fechaVencimiento && (
                    <div className="mt-3 p-3 bg-amber-500/10 dark:bg-yellow-950 border border-amber-500/30 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Fecha de Vencimiento:{" "}
                          {new Date(venta.fechaVencimiento).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <HistorialPagosVentaFiada ventaId={venta.id} />
            </>
          )}

          {venta.notas && (
            <Card>
              <CardHeader className="px-4 sm:px-6 pb-3">
                <CardTitle className="text-base sm:text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-xs sm:text-sm text-muted-foreground">{venta.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-4 sm:space-y-6">

          {/* Información de la venta */}
          <Card>
            <CardHeader className="px-4 sm:px-6 pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base sm:text-lg">Información de la Venta</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setDialogoEditarAbierto(true)}
              >
                <Edit className="h-3.5 w-3.5" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div>
                <label className="text-xs sm:text-sm font-medium">Estado</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {getEstadoBadge(venta.estado)}
                  {venta.estado !== "CANCELADA" && venta.estado !== "REEMBOLSADA" && (
                    <Select
                      value={venta.estado}
                      onValueChange={actualizarEstado}
                      disabled={actualizandoEstado}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPLETADA">Completada</SelectItem>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="CANCELADA">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium">Método de Pago</label>
                <p className="mt-1 text-xs sm:text-sm">
                  {METODOS_PAGO[venta.metodoPago]?.nombre || venta.metodoPago}
                </p>
              </div>

              {venta.pagos && venta.pagos.length > 0 && (
                <div>
                  <label className="text-xs sm:text-sm font-medium mb-2 block">Detalles de Pago</label>
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    {venta.pagos.map((pago) => (
                      <div key={pago.id} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span>{METODOS_PAGO[pago.metodoPago]?.icon || "💰"}</span>
                          <span>{METODOS_PAGO[pago.metodoPago]?.nombre || pago.metodoPago}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatearMoneda(pago.monto)}</p>
                          {pago.referencia && (
                            <p className="text-xs text-muted-foreground">Ref: {pago.referencia}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {venta.pagos.length > 1 && (
                      <>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center font-semibold text-xs sm:text-sm">
                          <span>Total:</span>
                          <span>{formatearMoneda(venta.total)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs sm:text-sm font-medium">Vendedor</label>
                <div className="mt-1">
                  <p className="text-xs sm:text-sm">{venta.usuario.nombre}</p>
                  {venta.usuario.email && (
                    <p className="text-xs text-muted-foreground break-all">{venta.usuario.email}</p>
                  )}
                </div>
              </div>

              {venta.reciboImpreso !== undefined && (
                <div>
                  <label className="text-xs sm:text-sm font-medium">Recibo</label>
                  <div className="mt-1">
                    {venta.reciboImpreso ? (
                      <Badge variant="outline" className="text-green-600 dark:text-green-400 text-xs">✓ Impreso</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 dark:text-orange-400 text-xs">Pendiente de imprimir</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card className={venta.metodoPago === 'FIADO' && !venta.cliente ? 'border-yellow-500' : ''}>
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                Información del Cliente
                {venta.metodoPago === 'FIADO' && (
                  <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-400 text-xs">
                    📝 Venta Fiada
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {venta.cliente ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs sm:text-sm font-medium">Nombre</label>
                    <p className="mt-1 text-xs sm:text-sm">{venta.cliente.nombre}</p>
                  </div>
                  {venta.cliente.email && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium">Email</label>
                      <p className="mt-1 text-xs sm:text-sm break-all">{venta.cliente.email}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  {venta.metodoPago === 'FIADO' ? (
                    <div className="bg-amber-500/10 dark:bg-yellow-950 border border-amber-500/30 dark:border-yellow-800 rounded-lg p-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        Advertencia: Venta fiada sin cliente
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 dark:text-yellow-400 mt-1">
                        Las ventas fiadas requieren un cliente asociado
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm text-muted-foreground">Cliente no especificado</p>
                      <p className="text-xs text-muted-foreground mt-1">Venta realizada sin registro de cliente</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {venta.notas && (
            <Card>
              <CardHeader className="px-4 sm:px-6 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  Notas y Detalles
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 text-sm text-muted-foreground whitespace-pre-wrap">
                {venta.notas}
              </CardContent>
            </Card>
          )}

          {/* Resumen */}
          <Card>
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="text-base sm:text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Items vendidos:</span>
                <span>{venta.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Cantidad total:</span>
                <span>{venta.items?.reduce((acc, item) => acc + item.cantidad, 0) || 0}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-medium border-t pt-2">
                <span>Total de la venta:</span>
                <span>{formatearMoneda(venta.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="text-base sm:text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              <Button variant="outline" className="w-full text-xs sm:text-sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Factura
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm"
                onClick={() => toast.info("Funcionalidad de descarga en desarrollo")}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
              {venta.cliente?.email && (
                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm"
                  onClick={() => toast.info("Funcionalidad de envío por email en desarrollo")}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Enviar por Email
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Historial de auditoría */}
          <HistorialAuditoriaVenta
            ventaId={venta.id}
            refreshKey={auditoriaRefreshKey}
          />
        </div>
      </div>

      {/* Alerta de venta cancelada/reembolsada */}
      {(venta.estado === 'CANCELADA' || venta.estado === 'REEMBOLSADA') && (
        <Card className="border-amber-500/30 bg-amber-500/10 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="pt-4 px-4 sm:px-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Venta {venta.estado === 'CANCELADA' ? 'Cancelada' : 'Reembolsada'}
                </h4>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 dark:text-yellow-300 mt-1">
                  {venta.estado === 'CANCELADA'
                    ? 'Esta venta ha sido cancelada y los productos han sido devueltos al inventario.'
                    : 'Esta venta ha sido reembolsada y los productos han sido devueltos al inventario.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para registrar pagos */}
      {venta.esVentaFiada && (
        <DialogoRegistrarPago
          abierto={dialogoPagoAbierto}
          onClose={() => setDialogoPagoAbierto(false)}
          venta={{
            id: venta.id,
            total: venta.total,
            saldoPendiente: venta.saldoPendiente ?? 0,
            montoPagado: venta.montoPagado ?? 0,
            cliente: venta.cliente,
            fechaVencimiento: venta.fechaVencimiento,
          }}
          onPagoRegistrado={handlePagoRegistrado}
        />
      )}

      <DialogoEditarVenta
        abierto={dialogoEditarAbierto}
        onClose={() => setDialogoEditarAbierto(false)}
        venta={venta}
        onVentaActualizada={(ventaActualizada) => {
          setVenta(ventaActualizada);
          setAuditoriaRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}