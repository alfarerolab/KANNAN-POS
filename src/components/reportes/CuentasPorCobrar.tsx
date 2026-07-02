import { useState } from "react";
import { Loader2, Users, DollarSign, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CuentaPorCobrar {
  clienteId: string | null;
  clienteNombre: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  totalDeuda: number;
  cantidadVentas: number;
  ventas: Array<{
    id: string;
    fechaCreacion: Date;
    total: number;
    montoFiado: number;
    estado: string;
    usuarioNombre?: string;
  }>;
}

interface CuentasPorCobrarProps {
  cuentas: CuentaPorCobrar[];
  resumen: {
    totalDeudaGeneral: number;
    totalClientesConDeuda: number;
    totalVentasFiadas: number;
  };
  cargando: boolean;
}

export function CuentasPorCobrar({ cuentas, resumen, cargando }: CuentasPorCobrarProps) {
  const [expandedClientes, setExpandedClientes] = useState<Record<string, boolean>>({});

  const toggleClienteExpansion = (clienteId: string) => {
    setExpandedClientes(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando cuentas por cobrar...</p>
        </div>
      </div>
    );
  }

  if (!cuentas || cuentas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No hay cuentas por cobrar</h3>
        <p className="text-sm text-muted-foreground">No se encontraron ventas fiadas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total por Cobrar</p>
                <p className="text-xl md:text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
                  {formatCurrency(resumen.totalDeudaGeneral)}
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-destructive/15 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes con Deuda</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{resumen.totalClientesConDeuda}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ventas Fiadas</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{resumen.totalVentasFiadas}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Detalle por Cliente
        </h3>

        {cuentas.map((cuenta) => {
          const clienteKey = cuenta.clienteId || "sin-cliente";
          const isExpanded = expandedClientes[clienteKey];

          return (
            <Card key={clienteKey} className="border border-border/60 hover:shadow-sm transition-all duration-200">
              <CardHeader className="pb-3 px-4 md:px-6 pt-4">
                {/* Header responsive: apilado en móvil, fila en desktop */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Avatar + nombre */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-lg font-semibold">
                        {cuenta.clienteNombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground truncate">{cuenta.clienteNombre}</h4>
                        <Badge variant="destructive" className="font-medium text-xs shrink-0">
                          📝 {cuenta.cantidadVentas} {cuenta.cantidadVentas === 1 ? "venta" : "ventas"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        {cuenta.clienteEmail && <span className="truncate">📧 {cuenta.clienteEmail}</span>}
                        {cuenta.clienteTelefono && <span>📱 {cuenta.clienteTelefono}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Deuda + botón */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(cuenta.totalDeuda)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleClienteExpansion(clienteKey)}
                      className="h-8 px-2 text-xs"
                    >
                      {isExpanded ? (
                        <><ChevronDown className="h-4 w-4 mr-1" />Ocultar</>
                      ) : (
                        <><ChevronRight className="h-4 w-4 mr-1" />Ver ventas</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Ventas expandidas */}
              {isExpanded && (
                <CardContent className="pt-0 px-4 md:px-6 pb-4">
                  <div className="bg-muted/30 rounded-lg p-3 md:p-4 space-y-3">
                    {cuenta.ventas.map((venta) => (
                      <div
                        key={venta.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-border/30 last:border-b-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              Venta #{venta.id.substring(0, 8)}
                            </span>
                            <Badge
                              className={cn(
                                "text-xs",
                                venta.estado === "COMPLETADA" && "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15",
                                venta.estado === "PENDIENTE" && "bg-amber-500/15 text-yellow-800 hover:bg-amber-500/15"
                              )}
                            >
                              {venta.estado}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(venta.fechaCreacion)} · {venta.usuarioNombre || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                          <div className="font-semibold text-foreground">{formatCurrency(venta.montoFiado)}</div>
                          <p className="text-xs text-muted-foreground">de {formatCurrency(venta.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}