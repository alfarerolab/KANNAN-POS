import { Loader2, Package, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProductoVendido {
  id: string;
  nombre: string;
  cantidad: number;
  monto: number;
  tipo?: string;
}

interface ReporteVentas {
  productosMasVendidosPorCantidad: ProductoVendido[];
  productosMasVendidosPorMonto: ProductoVendido[];
}

interface ProductosYServiciosTopProps {
  reporteVentas: ReporteVentas | null;
  cargando: boolean;
}

export function ProductosYServiciosTop({ reporteVentas, cargando }: ProductosYServiciosTopProps) {
  const separarProductosYServicios = (items: ProductoVendido[]) => {
    const esServicio = (item: ProductoVendido) => {
      const esServicioPorTipo = item.tipo === 'SERVICIO' || item.tipo === 'servicio' || item.tipo === 'Servicio';
      const esServicioPorNombre = (!item.tipo || item.tipo === '' || item.tipo === 'undefined') &&
        item.nombre && item.nombre.toLowerCase().startsWith('servicio:');
      return esServicioPorTipo || esServicioPorNombre;
    };
    return {
      productos: items.filter(i => !esServicio(i)),
      servicios: items.filter(i => esServicio(i)),
    };
  };

  const medallas = ["🥇", "🥈", "🥉"];

  const TablaRanking = ({
    items,
    titulo,
    icono,
    tipo,
    porCantidad = false,
  }: {
    items: ProductoVendido[];
    titulo: string;
    icono: React.ReactNode;
    tipo: "productos" | "servicios";
    porCantidad?: boolean;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
            tipo === "productos"
              ? "bg-gradient-to-br from-green-500 to-emerald-600"
              : "bg-gradient-to-br from-blue-500 to-cyan-600"
          )}>
            {icono}
          </div>
          <h4 className="text-lg font-semibold text-foreground">{titulo}</h4>
        </div>
        <Badge variant="secondary" className="font-medium">
          {items.length} {tipo}
        </Badge>
      </div>

      {items.length > 0 ? (
        <>
          {/* Tabla — solo desktop */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 bg-muted/30 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground w-12">#</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    {tipo === "productos" ? "Producto" : "Servicio"}
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    {porCantidad ? "Cantidad" : "Ingresos"}
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    {porCantidad ? "Ingresos" : "Cantidad"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.slice(0, 10).map((item, index) => (
                  <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors duration-150">
                    <TableCell>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground text-sm font-semibold",
                        index === 0 && "bg-gradient-to-br from-yellow-400 to-orange-500",
                        index === 1 && "bg-gradient-to-br from-slate-300 to-slate-500",
                        index === 2 && "bg-gradient-to-br from-amber-600 to-yellow-700",
                        index > 2 && "bg-gradient-to-br from-slate-400 to-slate-600"
                      )}>
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell><span className="font-medium">{item.nombre}</span></TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-xs font-medium",
                        tipo === "servicios"
                          ? "bg-blue-500/15 text-blue-800 dark:text-blue-300 hover:bg-blue-500/15"
                          : "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15"
                      )}>
                        {tipo === "servicios" ? "Servicio" : "Producto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {porCantidad
                        ? <Badge variant="outline" className="font-medium">{item.cantidad} {tipo === "servicios" ? "serv." : "uds"}</Badge>
                        : <span className="font-semibold">{formatCurrency(item.monto)}</span>}
                    </TableCell>
                    <TableCell>
                      {porCantidad
                        ? <span className="font-semibold">{formatCurrency(item.monto)}</span>
                        : <Badge variant="outline" className="font-medium">{item.cantidad} {tipo === "servicios" ? "serv." : "uds"}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tarjetas — solo móvil */}
          <div className="md:hidden space-y-2">
            {items.slice(0, 10).map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0",
                  index === 0 && "bg-gradient-to-br from-yellow-400 to-orange-500",
                  index === 1 && "bg-gradient-to-br from-slate-300 to-slate-500",
                  index === 2 && "bg-gradient-to-br from-amber-600 to-yellow-700",
                  index > 2 && "bg-gradient-to-br from-slate-400 to-slate-600"
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {porCantidad
                      ? `${item.cantidad} ${tipo === "servicios" ? "serv." : "uds"} · ${formatCurrency(item.monto)}`
                      : `${formatCurrency(item.monto)} · ${item.cantidad} ${tipo === "servicios" ? "serv." : "uds"}`}
                  </p>
                </div>
                <Badge className={cn(
                  "text-[10px] shrink-0",
                  tipo === "servicios"
                    ? "bg-blue-500/15 text-blue-800 dark:text-blue-300"
                    : "bg-emerald-500/15 text-green-800 dark:text-green-300"
                )}>
                  {tipo === "servicios" ? "Serv." : "Prod."}
                </Badge>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground">No hay {tipo} en este ranking</p>
        </div>
      )}
    </div>
  );

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando productos y servicios...</p>
        </div>
      </div>
    );
  }

  if (!reporteVentas?.productosMasVendidosPorCantidad || reporteVentas.productosMasVendidosPorCantidad.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No se encontraron productos o servicios</h3>
        <p className="text-sm text-muted-foreground">No hay datos de productos o servicios vendidos disponibles</p>
      </div>
    );
  }

  const { productos: productosPorCantidad, servicios: serviciosPorCantidad } =
    separarProductosYServicios(reporteVentas.productosMasVendidosPorCantidad);

  const { productos: productosPorMonto, servicios: serviciosPorMonto } =
    reporteVentas.productosMasVendidosPorMonto
      ? separarProductosYServicios(reporteVentas.productosMasVendidosPorMonto)
      : { productos: [], servicios: [] };

  const tieneServicios = serviciosPorCantidad.length > 0 || serviciosPorMonto.length > 0;

  return (
    <div className="space-y-8">
      {/* Top por Cantidad */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Top por Cantidad Vendida</h3>
            <p className="text-sm text-muted-foreground">
              {tieneServicios ? "Productos y servicios más demandados" : "Productos más demandados"}
            </p>
          </div>
        </div>

        <div className={cn("grid gap-8", tieneServicios ? "md:grid-cols-2" : "")}>
          <TablaRanking
            items={productosPorCantidad}
            titulo="Top Productos"
            icono={<Package className="h-5 w-5 text-primary-foreground" />}
            tipo="productos"
            porCantidad={true}
          />
          {tieneServicios && (
            <TablaRanking
              items={serviciosPorCantidad}
              titulo="Top Servicios"
              icono={<Zap className="h-5 w-5 text-primary-foreground" />}
              tipo="servicios"
              porCantidad={true}
            />
          )}
        </div>
      </div>

      {/* Top por Ingresos */}
      {reporteVentas.productosMasVendidosPorMonto && reporteVentas.productosMasVendidosPorMonto.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Top por Ingresos Generados</h3>
              <p className="text-sm text-muted-foreground">
                {tieneServicios ? "Productos y servicios que más ingresos generan" : "Productos que más ingresos generan"}
              </p>
            </div>
          </div>

          <div className={cn("grid gap-8", tieneServicios ? "md:grid-cols-2" : "")}>
            <TablaRanking
              items={productosPorMonto}
              titulo="Top Productos"
              icono={<Package className="h-5 w-5 text-primary-foreground" />}
              tipo="productos"
              porCantidad={false}
            />
            {tieneServicios && (
              <TablaRanking
                items={serviciosPorMonto}
                titulo="Top Servicios"
                icono={<Zap className="h-5 w-5 text-primary-foreground" />}
                tipo="servicios"
                porCantidad={false}
              />
            )}
          </div>
        </div>
      )}

      {/* Resumen estadístico */}
      <div className="bg-muted/50 dark:bg-background/50 rounded-lg p-4 md:p-6">
        <div className={cn("grid gap-4", tieneServicios ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Set([...productosPorCantidad.map(p => p.id), ...productosPorMonto.map(p => p.id)]).size}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Productos Únicos</p>
          </div>
          {tieneServicios && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {new Set([...serviciosPorCantidad.map(s => s.id), ...serviciosPorMonto.map(s => s.id)]).size}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Servicios Únicos</p>
            </div>
          )}
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {productosPorCantidad.reduce((sum, p) => sum + p.cantidad, 0)}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Productos vendidos</p>
          </div>
          {tieneServicios && (
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {serviciosPorCantidad.reduce((sum, s) => sum + s.cantidad, 0)}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Servicios prestados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}