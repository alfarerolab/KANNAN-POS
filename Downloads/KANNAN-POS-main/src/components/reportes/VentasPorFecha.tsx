import { useState } from "react";
import { Loader2, BarChart3, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const METODOS_PAGO: Record<string, { nombre: string; icon: string }> = {
  EFECTIVO: { nombre: "Efectivo", icon: "💵" },
  TARJETA_CREDITO: { nombre: "Tarjeta de Crédito", icon: "💳" },
  TARJETA_DEBITO: { nombre: "Tarjeta de Débito", icon: "💳" },
  TRANSFERENCIA: { nombre: "Transferencia", icon: "🏦" },
  FIADO: { nombre: "Fiado", icon: "📝" },
  OTRO: { nombre: "Otro", icon: "💰" },
};

interface ReporteVentas {
  ventas: any[];
}

interface VentasPorFechaProps {
  reporteVentas: ReporteVentas | null;
  cargando: boolean;
}

export function VentasPorFecha({ reporteVentas, cargando }: VentasPorFechaProps) {
  const [ventasExpanded, setVentasExpanded] = useState<Record<string, boolean>>({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [soloFiadas, setSoloFiadas] = useState(false);
  const ventasPorPagina = 5;

  const toggleVentaExpansion = (ventaId: string) => {
    setVentasExpanded(prev => ({ ...prev, [ventaId]: !prev[ventaId] }));
  };

  const ventasFiltradas = soloFiadas
    ? (reporteVentas?.ventas || []).filter((venta: any) =>
        venta.pagos?.some((pago: any) => pago.metodoPago === "FIADO") ||
        venta.metodoPago === "FIADO"
      )
    : (reporteVentas?.ventas || []);

  const ventasPaginadas = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina
  );

  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);

  const cambiarPagina = (nuevaPagina: number) => {
    setPaginaActual(nuevaPagina);
    setVentasExpanded({});
  };

  const ventasFiadasTotal = reporteVentas?.ventas.filter((venta: any) =>
    venta.pagos?.some((pago: any) => pago.metodoPago === "FIADO") ||
    venta.metodoPago === "FIADO"
  ).length || 0;

  // Páginas a mostrar (máximo 5 botones)
  const getPaginasVisibles = () => {
    const rango = 2;
    let inicio = Math.max(1, paginaActual - rango);
    let fin = Math.min(totalPaginas, paginaActual + rango);
    if (fin - inicio < rango * 2) {
      if (inicio === 1) fin = Math.min(totalPaginas, inicio + rango * 2);
      else inicio = Math.max(1, fin - rango * 2);
    }
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  if (!reporteVentas?.ventas || reporteVentas.ventas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No se encontraron ventas</h3>
        <p className="text-sm text-muted-foreground">
          No hay ventas registradas con los filtros seleccionados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Detalle de Ventas</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-medium">
              {ventasFiltradas.length} ventas {soloFiadas ? "fiadas" : "encontradas"}
            </Badge>
            {ventasFiadasTotal > 0 && (
              <Badge variant="destructive" className="font-medium">
                📝 {ventasFiadasTotal} ventas fiadas
              </Badge>
            )}
            {totalPaginas > 1 && (
              <span className="text-sm text-muted-foreground">
                Pág. {paginaActual} de {totalPaginas}
              </span>
            )}
          </div>
        </div>

        {ventasFiadasTotal > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={soloFiadas ? "default" : "outline"}
              size="sm"
              onClick={() => { setSoloFiadas(!soloFiadas); setPaginaActual(1); }}
              className="flex items-center gap-2"
            >
              📝 {soloFiadas ? "Mostrar todas las ventas" : "Solo ventas fiadas"}
            </Button>
            {soloFiadas && (
              <p className="text-sm text-muted-foreground">
                Mostrando únicamente ventas con pago FIADO
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {ventasPaginadas.map((venta) => (
          <Card key={venta.id} className="border border-border/60 hover:shadow-sm transition-all duration-200">
            {/* Header de la venta — responsive */}
            <CardHeader className="pb-3 px-4 md:px-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Icono + info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                    <span className="text-primary-foreground text-xs font-semibold">
                      #{venta.id.substring(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground text-sm">
                        Venta #{venta.id.substring(0, 8)}
                      </h4>
                      <Badge
                        className={cn(
                          "font-medium text-xs",
                          venta.estado === "COMPLETADA" && "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15",
                          venta.estado === "PENDIENTE" && "bg-amber-500/15 text-yellow-800 hover:bg-amber-500/15",
                          venta.estado === "CANCELADA" && "bg-destructive/15 text-red-800 dark:text-red-300 hover:bg-destructive/15",
                          venta.estado === "REEMBOLSADA" && "bg-blue-500/15 text-blue-800 dark:text-blue-300 hover:bg-blue-500/15"
                        )}
                      >
                        {venta.estado}
                      </Badge>
                      {(venta.pagos?.some((pago: any) => pago.metodoPago === "FIADO") || venta.metodoPago === "FIADO") && (
                        <Badge variant="destructive" className="font-medium text-xs">📝 FIADO</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(venta.fechaVenta || venta.fechaCreacion)}
                    </p>
                  </div>
                </div>

                {/* Total + botón */}
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-xl font-bold text-foreground">
                    {formatCurrency(venta.total)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVentaExpansion(venta.id)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {ventasExpanded[venta.id] ? (
                      <><ChevronDown className="h-4 w-4 mr-1" />Ocultar</>
                    ) : (
                      <><ChevronRight className="h-4 w-4 mr-1" />Ver detalles</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Info básica */}
            <CardContent className="pt-0 px-4 md:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cliente</p>
                  <p className="text-sm font-medium text-foreground">
                    {venta.cliente?.nombre || "Cliente no registrado"}
                  </p>
                  {venta.cliente?.email && (
                    <p className="text-xs text-muted-foreground">{venta.cliente.email}</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Vendedor</p>
                  <p className="text-sm font-medium text-foreground">
                    {venta.usuario?.nombre || "N/A"}
                  </p>
                  {venta.usuario?.email && (
                    <p className="text-xs text-muted-foreground">{venta.usuario.email}</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Método de Pago</p>
                  {venta.pagos && venta.pagos.length > 0 ? (
                    <>
                      {venta.pagos.length > 1 && (
                        <Badge variant="secondary" className="mb-1 text-xs">💳 Pago Mixto</Badge>
                      )}
                      <div className="space-y-1">
                        {venta.pagos.map((pago: any) => (
                          <div key={pago.id} className="flex items-center gap-2">
                            <span className="text-sm">{METODOS_PAGO[pago.metodoPago]?.icon || "💰"}</span>
                            <p className="text-sm font-medium text-foreground">
                              {METODOS_PAGO[pago.metodoPago]?.nombre || pago.metodoPago}
                            </p>
                            <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(pago.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {venta.metodoPago ? (METODOS_PAGO[venta.metodoPago]?.nombre || venta.metodoPago) : "No especificado"}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {venta.items?.length || 0} {venta.items?.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>

              {/* Detalles expandibles */}
              {ventasExpanded[venta.id] && (
                <div className="space-y-4">
                  <Separator className="my-2" />

                  {/* Lista de productos/servicios */}
                  {venta.items && venta.items.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-medium text-foreground flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4" />
                        {(() => {
                          const hasServicios = venta.items.some((item: any) =>
                            item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio"
                          );
                          const hasProductos = venta.items.some((item: any) =>
                            item.tipo === "PRODUCTO" || item.tipo === "producto" || item.tipo === "Producto" || !item.tipo || item.tipo === null
                          );
                          if (hasServicios && hasProductos) return "Productos y Servicios vendidos";
                          if (hasServicios) return "Servicios vendidos";
                          return "Productos vendidos";
                        })()}
                      </h5>
                      <div className="bg-muted/30 rounded-lg p-3 md:p-4">
                        <div className="space-y-3">
                          {venta.items.map((item: any, index: number) => (
                            <div
                              key={item.id || index}
                              className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-b-0"
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <div className={cn(
                                  "w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5",
                                  (item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio")
                                    ? "bg-blue-500/15 dark:bg-blue-900/30"
                                    : "bg-emerald-500/15 dark:bg-green-900/30"
                                )}>
                                  {(item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio") ? (
                                    <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  ) : (
                                    <Package className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-medium text-foreground text-sm truncate">{item.nombre}</p>
                                    <Badge
                                      variant={(item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio") ? "default" : "secondary"}
                                      className={cn(
                                        "text-[10px] font-medium shrink-0",
                                        (item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio")
                                          ? "bg-blue-500/15 text-blue-800 dark:text-blue-300 hover:bg-blue-500/15"
                                          : "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15"
                                      )}
                                    >
                                      {(item.tipo === "SERVICIO" || item.tipo === "servicio" || item.tipo === "Servicio") ? "Serv." : "Prod."}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Precio unit.: {formatCurrency(item.cantidad > 0 ? item.subtotal / item.cantidad : 0)}
                                  </p>
                                  {item.descripcion && (
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">{item.descripcion}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <Badge variant="outline" className="text-xs font-medium mb-1">
                                  ×{item.cantidad}
                                </Badge>
                                <p className="font-semibold text-foreground text-sm">{formatCurrency(item.subtotal)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Totales */}
                  <div className="bg-muted/50 dark:bg-background/50 rounded-lg p-3 md:p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(venta.subtotal || 0)}</span>
                      </div>
                      {venta.impuestos > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Impuestos:</span>
                          <span className="font-medium">{formatCurrency(venta.impuestos)}</span>
                        </div>
                      )}
                      {venta.descuento > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Descuento:</span>
                          <span className="font-medium">-{formatCurrency(venta.descuento)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Total:</span>
                        <span className="text-lg">{formatCurrency(venta.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {venta.notas && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</p>
                        <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{venta.notas}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Información de pago</p>
                      <div className="bg-muted/30 p-3 rounded-md space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Método:</span> {venta.metodoPago || "No especificado"}
                        </div>
                        {venta.referenciaPago && (
                          <div className="text-sm">
                            <span className="font-medium">Referencia:</span> {venta.referenciaPago}
                          </div>
                        )}
                        <div className="text-sm flex items-center gap-2">
                          <span className="font-medium">Estado:</span>
                          <Badge className={cn(
                            "text-xs",
                            venta.estado === "COMPLETADA" && "bg-emerald-500/15 text-green-800 dark:text-green-300",
                            venta.estado === "PENDIENTE" && "bg-amber-500/15 text-yellow-800",
                            venta.estado === "CANCELADA" && "bg-destructive/15 text-red-800 dark:text-red-300"
                          )}>
                            {venta.estado}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación responsive */}
      {totalPaginas > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {((paginaActual - 1) * ventasPorPagina) + 1}–{Math.min(paginaActual * ventasPorPagina, ventasFiltradas.length)} de {ventasFiltradas.length} ventas
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
              className="px-3"
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {getPaginasVisibles().map((pagina) => (
                <Button
                  key={pagina}
                  variant={pagina === paginaActual ? "default" : "outline"}
                  size="sm"
                  onClick={() => cambiarPagina(pagina)}
                  className="w-9 h-9 p-0"
                >
                  {pagina}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              className="px-3"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}