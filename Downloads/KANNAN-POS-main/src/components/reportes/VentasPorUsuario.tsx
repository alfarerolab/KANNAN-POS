import { Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface VentaPorUsuario {
  usuarioId: string;
  nombre: string;
  email: string;
  cantidadVentas: number;
  totalVentas: number;
  promedioVenta: number;
}

interface VentasPorUsuarioProps {
  ventasPorUsuario: VentaPorUsuario[];
  cargando: boolean;
}

export function VentasPorUsuario({ ventasPorUsuario, cargando }: VentasPorUsuarioProps) {
  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (ventasPorUsuario.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No se encontraron datos de usuarios</h3>
        <p className="text-sm text-muted-foreground">
          No hay datos de ventas por usuario disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rendimiento por Usuario</h3>
        <Badge variant="secondary" className="font-medium">
          {ventasPorUsuario.length} usuarios activos
        </Badge>
      </div>

      {/* Tabla — solo desktop */}
      <div className="hidden md:block rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 bg-muted/30 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground">Usuario</TableHead>
              <TableHead className="font-semibold text-foreground">Email</TableHead>
              <TableHead className="font-semibold text-foreground">Cantidad de Ventas</TableHead>
              <TableHead className="font-semibold text-foreground">Total Ventas</TableHead>
              <TableHead className="font-semibold text-foreground">Promedio por Venta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventasPorUsuario.map((usuario) => (
              <TableRow key={usuario.usuarioId} className="border-b border-border/50 hover:bg-muted/20 transition-colors duration-150">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-primary-foreground text-sm font-semibold">
                        {usuario.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{usuario.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-medium">
                    {usuario.cantidadVentas} ventas
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(usuario.totalVentas)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatCurrency(usuario.promedioVenta)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Tarjetas — solo móvil */}
      <div className="md:hidden space-y-3">
        {ventasPorUsuario.map((usuario) => (
          <div key={usuario.usuarioId} className="border border-border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                <span className="text-primary-foreground text-sm font-semibold">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{usuario.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Ventas</p>
                <p className="text-lg font-bold text-foreground">{usuario.cantidadVentas}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 break-all">{formatCurrency(usuario.totalVentas)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2 col-span-2">
                <p className="text-[10px] text-muted-foreground">Promedio por venta</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(usuario.promedioVenta)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}