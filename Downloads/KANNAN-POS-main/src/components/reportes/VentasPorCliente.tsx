import { Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface VentaPorCliente {
  clienteId: string;
  nombre: string;
  email: string;
  telefono: string;
  cantidadVentas: number;
  totalVentas: number;
  promedioVenta: number;
  ultimaCompra: string | null;
}

interface VentasPorClienteProps {
  ventasPorCliente: VentaPorCliente[];
  cargando: boolean;
}

export function VentasPorCliente({ ventasPorCliente, cargando }: VentasPorClienteProps) {
  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  if (ventasPorCliente.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No se encontraron datos de clientes</h3>
        <p className="text-sm text-muted-foreground">
          No hay datos de ventas por cliente disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Top Clientes</h3>
        <Badge variant="secondary" className="font-medium">
          {ventasPorCliente.length} clientes activos
        </Badge>
      </div>

      {/* Tabla — solo desktop */}
      <div className="hidden md:block rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 bg-muted/30 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground">Cliente</TableHead>
              <TableHead className="font-semibold text-foreground">Contacto</TableHead>
              <TableHead className="font-semibold text-foreground">Cantidad de Ventas</TableHead>
              <TableHead className="font-semibold text-foreground">Total Ventas</TableHead>
              <TableHead className="font-semibold text-foreground">Promedio por Venta</TableHead>
              <TableHead className="font-semibold text-foreground">Última Compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventasPorCliente.map((cliente) => (
              <TableRow key={cliente.clienteId} className="border-b border-border/50 hover:bg-muted/20 transition-colors duration-150">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-primary-foreground text-sm font-semibold">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{cliente.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-muted-foreground">{cliente.email}</div>
                    {cliente.telefono && (
                      <div className="text-muted-foreground">{cliente.telefono}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-medium">
                    {cliente.cantidadVentas} compras
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(cliente.totalVentas)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatCurrency(cliente.promedioVenta)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {cliente.ultimaCompra ? formatDateTime(cliente.ultimaCompra) : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Tarjetas — solo móvil */}
      <div className="md:hidden space-y-3">
        {ventasPorCliente.map((cliente) => (
          <div key={cliente.clienteId} className="border border-border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
                <span className="text-primary-foreground text-sm font-semibold">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{cliente.nombre}</p>
                <div className="flex flex-col gap-0.5">
                  {cliente.email && <p className="text-xs text-muted-foreground truncate">{cliente.email}</p>}
                  {cliente.telefono && <p className="text-xs text-muted-foreground">{cliente.telefono}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Compras</p>
                <p className="text-sm font-bold text-foreground">{cliente.cantidadVentas}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatCurrency(cliente.totalVentas)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Promedio</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(cliente.promedioVenta)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Última compra</p>
                <p className="text-xs font-medium text-foreground">
                  {cliente.ultimaCompra ? formatDateTime(cliente.ultimaCompra) : "N/A"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}