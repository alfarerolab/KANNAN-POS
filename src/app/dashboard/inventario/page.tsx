"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  BarChart3,
  RefreshCw,
  Edit3,
  Loader2,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface ProductoInventario {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  ultimaActualizacion: string;
  estado: "normal" | "bajo" | "agotado";
  sku?: string;
  codigoBarras?: string;
  valorInventario: number;
}

interface EstadisticasInventario {
  totalProductos: number;
  productosConStockBajo: number;
  productosAgotados: number;
  valorTotalInventario: number;
  valorTotalVenta: number;
  gananciaTotal: number;
  productosNormales: number;
}

interface InventarioResponse {
  inventario: ProductoInventario[];
  estadisticas: EstadisticasInventario;
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasInventario>({
    totalProductos: 0,
    productosConStockBajo: 0,
    productosAgotados: 0,
    valorTotalInventario: 0,
    valorTotalVenta: 0,
    gananciaTotal: 0,
    productosNormales: 0
  });
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState<number>(1);
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'salida'>('entrada');
  const { toast } = useToast();

  const cargarInventario = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventario', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('El servidor devolvió una respuesta inválida (no JSON)');
      }

      const data: InventarioResponse = await response.json();
      
      if (data.inventario && Array.isArray(data.inventario)) {
        setProductos(data.inventario);
        if (data.estadisticas) {
          setEstadisticas(data.estadisticas);
        }
      } else {
        throw new Error('Formato de datos incorrecto');
      }
      
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar el inventario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogoAjuste = (producto: ProductoInventario, tipo: 'entrada' | 'salida') => {
    setProductoSeleccionado(producto);
    setTipoAjuste(tipo);
    setCantidadAjuste(1);
    setDialogOpen(true);
  };

  const ajustarStock = async () => {
    if (!productoSeleccionado || cantidadAjuste <= 0) return;

    try {
      setActualizando(productoSeleccionado.id);
      
      const response = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productoId: productoSeleccionado.id,
          tipo: tipoAjuste.toUpperCase(),
          cantidad: cantidadAjuste,
          motivo: `Ajuste manual desde inventario - ${tipoAjuste}`
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error en el servidor - respuesta inválida');
      }

      const result = await response.json();

      toast({
        title: "Stock actualizado",
        description: `${tipoAjuste === 'entrada' ? 'Agregadas' : 'Removidas'} ${cantidadAjuste} unidades de ${productoSeleccionado.nombre}`,
      });
      
      setDialogOpen(false);
      await cargarInventario();
      
    } catch (error) {
      console.error("Error al ajustar stock:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el stock",
        variant: "destructive",
      });
    } finally {
      setActualizando(null);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    producto.categoria.toLowerCase().includes(filtro.toLowerCase()) ||
    (producto.sku && producto.sku.toLowerCase().includes(filtro.toLowerCase()))
  );

  const getEstadoBadge = (estado: string, stock: number) => {
    switch (estado) {
      case "normal":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-green-700 dark:text-green-400 border-emerald-500/30 hover:bg-emerald-500/15">
            <CheckCircle className="w-3 h-3 mr-1" />
            Normal
          </Badge>
        );
      case "bajo":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-yellow-700 dark:text-yellow-400 border-amber-500/30 hover:bg-amber-500/15">
            <Clock className="w-3 h-3 mr-1" />
            Stock Bajo
          </Badge>
        );
      case "agotado":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-red-700 dark:text-red-400 border-destructive/30 hover:bg-destructive/15">
            <AlertCircle className="w-3 h-3 mr-1" />
            Agotado
          </Badge>
        );
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStockColor = (stock: number, stockMinimo: number) => {
    if (stock === 0) return "text-red-600 dark:text-red-400 font-bold";
    if (stock <= stockMinimo) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    return "text-green-600 dark:text-green-400 font-medium";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-4 sm:-m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu inventario en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={cargarInventario}
              disabled={loading}
              className="flex items-center gap-2 px-3 h-11 shadow-sm transition-all duration-200 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Link href="/dashboard/inventario/movimientos">
              <Button variant="outline" className="flex items-center gap-2 px-3 h-11 shadow-sm transition-all duration-200 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Movimientos</span>
              </Button>
            </Link>
            <Link href="/dashboard/productos/nuevo">
              <Button className="flex items-center gap-2 px-3 sm:px-5 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 text-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Nuevo</span>
                <span className="hidden sm:inline"> Producto</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-border/60 border-b border-border/60">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Total Productos</p>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground">{estadisticas.totalProductos}</div>
          <p className="text-[11px] text-muted-foreground">En el inventario</p>
        </div>

        <div className="px-4 lg:px-6 py-4 border-l md:border-l-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Stock Bajo</p>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground">{estadisticas.productosConStockBajo}</div>
          <p className="text-[11px] text-muted-foreground">Requieren reposición</p>
        </div>

        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Agotados</p>
            <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
              <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground">{estadisticas.productosAgotados}</div>
          <p className="text-[11px] text-muted-foreground">Sin stock disponible</p>
        </div>

        <div className="px-4 lg:px-6 py-4 border-l md:border-l-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Valor en Costo</p>
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-foreground break-all leading-tight">{formatCurrency(estadisticas.valorTotalInventario)}</div>
          <p className="text-[11px] text-muted-foreground">Lo invertido en stock</p>
        </div>

        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Valor de Venta</p>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-foreground break-all leading-tight">{formatCurrency(estadisticas.valorTotalVenta)}</div>
          <p className="text-[11px] text-muted-foreground">Si se vende todo</p>
        </div>

        <div className="px-4 lg:px-6 py-4 border-l md:border-l-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Ganancia Potencial</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 break-all leading-tight">{formatCurrency(estadisticas.gananciaTotal)}</div>
          <p className="text-[11px] text-muted-foreground">Venta − Costo</p>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground">Gestión de Inventario</p>
            <p className="text-sm text-muted-foreground">
              {productosFiltrados.length === 0 && filtro
                ? "No se encontraron resultados para tu búsqueda"
                : `${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'producto' : 'productos'} ${filtro ? 'encontrado(s)' : 'en total'}`
              }
            </p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, categoría o SKU..."
              className="pl-9 h-9"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>
        {/* Listado de Inventario */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8 pt-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            {/* Vista móvil: tarjetas */}
            <div className="block md:hidden">
              {productosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 px-6">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-medium text-foreground">
                      {filtro ? "No se encontraron productos" : "No hay productos en el inventario"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {filtro ? "Intenta con otros términos de búsqueda" : "Crea tu primer producto para comenzar"}
                    </p>
                  </div>
                  {!filtro && (
                    <Link href="/dashboard/productos/nuevo">
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear primer producto
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/80">
                  {productosFiltrados.map((producto) => (
                    <div key={producto.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      {/* Fila superior: avatar + nombre + estado */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                          <span className="text-white text-sm font-bold">
                            {producto.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground text-sm leading-tight truncate">
                              {producto.nombre}
                            </span>
                            {getEstadoBadge(producto.estado, producto.stock)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs text-muted-foreground">{producto.categoria}</span>
                            {producto.sku && (
                              <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
                                SKU: {producto.sku}
                              </span>
                            )}
                            {producto.codigoBarras && (
                              <span className="px-1.5 py-0.5 bg-muted text-foreground/70 rounded text-[10px] font-medium">
                                CB: {producto.codigoBarras}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fila inferior: stock + precio + acciones */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Stock</span>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-base font-bold ${getStockColor(producto.stock, producto.stockMinimo)}`}>
                                {producto.stock}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/ mín {producto.stockMinimo}</span>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Precio</span>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(producto.precio)}</span>
                          </div>
                        </div>

                        {/* Acciones compactas */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => abrirDialogoAjuste(producto, 'salida')}
                            disabled={producto.stock === 0 || actualizando === producto.id}
                            className="h-8 w-8 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                            title="Reducir stock"
                          >
                            {actualizando === producto.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => abrirDialogoAjuste(producto, 'entrada')}
                            disabled={actualizando === producto.id}
                            className="h-8 w-8 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-green-700 dark:text-green-400 transition-all duration-200"
                            title="Aumentar stock"
                          >
                            {actualizando === producto.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Link href={`/dashboard/productos/${producto.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              title="Editar producto"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vista escritorio: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground py-4 px-6">Producto</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Categoría</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Stock</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Precio</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Estado</TableHead>
                    <TableHead className="font-semibold text-foreground py-4 px-6">Última Actualización</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4 px-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-32 px-6">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {filtro
                                ? "No se encontraron productos"
                                : "No hay productos en el inventario"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {filtro
                                ? "Intenta con otros términos de búsqueda"
                                : "Crea tu primer producto para comenzar"}
                            </p>
                          </div>
                          {!filtro && (
                            <Link href="/dashboard/productos/nuevo">
                              <Button variant="outline" className="mt-2">
                                <Plus className="h-4 w-4 mr-2" />
                                Crear primer producto
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productosFiltrados.map((producto) => (
                      <TableRow key={producto.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                              <span className="text-primary-foreground text-sm font-semibold">
                                {producto.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{producto.nombre}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {producto.sku && (
                                  <span className="px-2 py-1 bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                    SKU: {producto.sku}
                                  </span>
                                )}
                                {producto.codigoBarras && (
                                  <span className="px-2 py-1 bg-muted text-foreground/80 rounded text-xs font-medium">
                                    CB: {producto.codigoBarras}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="px-3 py-1 bg-muted text-foreground rounded-full text-sm font-medium">
                            {producto.categoria}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className={`text-lg font-bold ${getStockColor(producto.stock, producto.stockMinimo)}`}>
                              {producto.stock}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Mín: {producto.stockMinimo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="font-medium text-foreground">{formatCurrency(producto.precio)}</span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {getEstadoBadge(producto.estado, producto.stock)}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-foreground">
                              {new Date(producto.ultimaActualizacion).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(producto.ultimaActualizacion).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirDialogoAjuste(producto, 'salida')}
                              disabled={producto.stock === 0 || actualizando === producto.id}
                              className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                              title="Reducir stock"
                            >
                              {actualizando === producto.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirDialogoAjuste(producto, 'entrada')}
                              disabled={actualizando === producto.id}
                              className="h-9 w-9 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-green-700 dark:text-green-400 transition-all duration-200"
                              title="Aumentar stock"
                            >
                              {actualizando === producto.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={`/dashboard/productos/${producto.id}`}>
                              <Button
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                                title="Editar producto"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para ajuste de stock */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 text-xl">
              {tipoAjuste === 'entrada' ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                  <Minus className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              {tipoAjuste === 'entrada' ? 'Agregar Stock' : 'Remover Stock'}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              {productoSeleccionado && (
                <>
                  Producto: <span className="font-semibold text-foreground">{productoSeleccionado.nombre}</span>
                  <br />
                  Stock actual: <span className="font-semibold text-lg text-foreground">{productoSeleccionado.stock}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Cantidad:</label>
            <Input
              type="number"
              min="1"
              value={cantidadAjuste}
              onChange={(e) => setCantidadAjuste(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-center text-lg font-semibold h-12"
              placeholder="Ingresa la cantidad"
            />
            
            {productoSeleccionado && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Nuevo stock:</p>
                <p className="text-xl font-bold text-foreground">
                  {tipoAjuste === 'entrada' 
                    ? productoSeleccionado.stock + cantidadAjuste
                    : Math.max(0, productoSeleccionado.stock - cantidadAjuste)
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={!!actualizando}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              onClick={ajustarStock}
              disabled={!!actualizando || cantidadAjuste <= 0}
              className={`flex-1 sm:flex-none ${tipoAjuste === 'entrada' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {actualizando ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </div>
              ) : (
                `${tipoAjuste === 'entrada' ? 'Agregar' : 'Remover'} ${cantidadAjuste}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}