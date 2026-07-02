"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  ArrowUp,
  ArrowDown,
  Edit3,
  Calendar,
  User,
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface MovimientoInventario {
  id: string;
  fechaMovimiento: string;
  productoId: string;
  usuarioId: string;
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  stockPrevio: number;
  stockNuevo: number;
  motivo: string;
  producto: {
    id: string;
    nombre: string;
    sku?: string;
    codigoBarras?: string;
    categoria?: string;
  };
  usuario: {
    id: string;
    nombre: string;
  };
}

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  enStock: number;
}

interface ResumenMovimientos {
  totalEntradas: number;
  totalSalidas: number;
  totalAjustes: number;
  cantidadEntradas: number;
  cantidadSalidas: number;
}

interface NuevoMovimiento {
  productoId: string;
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  motivo: string;
}

const TIPOS_MOVIMIENTO = {
  ENTRADA: { 
    label: "Entrada", 
    icon: ArrowUp, 
    color: "text-green-600 dark:text-green-400", 
    bgColor: "bg-emerald-500/10",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-emerald-500/30"
  },
  SALIDA: { 
    label: "Salida", 
    icon: ArrowDown, 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-destructive/10",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-destructive/30"
  },
  AJUSTE: { 
    label: "Ajuste", 
    icon: Edit3, 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-500/30"
  },
};

export default function MovimientosInventarioPage() {
  const { data: session } = useSession();
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [resumen, setResumen] = useState<ResumenMovimientos>({
    totalEntradas: 0,
    totalSalidas: 0,
    totalAjustes: 0,
    cantidadEntradas: 0,
    cantidadSalidas: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [exportando, setExportando] = useState(false);
  
  // Estados para el diálogo de nuevo movimiento
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creandoMovimiento, setCreandoMovimiento] = useState(false);
  const [nuevoMovimiento, setNuevoMovimiento] = useState<NuevoMovimiento>({
    productoId: '',
    cantidad: 0,
    tipo: 'ENTRADA',
    motivo: ''
  });

  const cargarMovimientos = async () => {
    if (!session?.user?.empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = new URL('/api/inventario/movimientos', window.location.origin);

      if (filtroTipo && filtroTipo !== "TODOS") {
        url.searchParams.append('tipo', filtroTipo);
      }
      if (fechaInicio) {
        url.searchParams.append('fechaInicio', fechaInicio);
      }
      if (fechaFin) {
        url.searchParams.append('fechaFin', fechaFin);
      }

      const response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Respuesta no JSON:', textResponse);
        throw new Error('El servidor devolvió una respuesta inválida');
      }

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes autorización para ver los movimientos");
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.movimientos && Array.isArray(data.movimientos)) {
        setMovimientos(data.movimientos);
        calcularResumen(data.movimientos);
      } else {
        console.error('Formato de datos incorrecto:', data);
        setMovimientos([]);
        toast.error("Formato de datos de movimientos incorrecto");
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar los movimientos');
      setMovimientos([]);
      toast.error("Error al cargar los movimientos de inventario");
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await fetch('/api/productos?inventario=true', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.datos && Array.isArray(data.datos)) {
            setProductos(data.datos.map((p: any) => ({
              id: p.id,
              nombre: p.nombre,
              sku: p.sku,
              enStock: p.stock || p.enStock || 0
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const calcularResumen = (movimientosData: MovimientoInventario[]) => {
    const entradas = movimientosData.filter(m => m.tipo === 'ENTRADA');
    const salidas = movimientosData.filter(m => m.tipo === 'SALIDA');
    const ajustes = movimientosData.filter(m => m.tipo === 'AJUSTE');

    const cantidadEntradas = entradas.reduce((sum, m) => sum + Math.abs(m.cantidad), 0);
    const cantidadSalidas = salidas.reduce((sum, m) => sum + Math.abs(m.cantidad), 0);

    setResumen({
      totalEntradas: entradas.length,
      totalSalidas: salidas.length,
      totalAjustes: ajustes.length,
      cantidadEntradas,
      cantidadSalidas
    });
  };

  const crearMovimiento = async () => {
    if (!nuevoMovimiento.productoId || !nuevoMovimiento.cantidad || nuevoMovimiento.cantidad <= 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setCreandoMovimiento(true);

      const response = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoMovimiento),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Respuesta no JSON:', textResponse);
        throw new Error('Error en el servidor - respuesta inválida');
      }

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Error al crear el movimiento');
        return;
      }

      toast.success('Movimiento registrado correctamente');
      
      setDialogOpen(false);
      setNuevoMovimiento({
        productoId: '',
        cantidad: 0,
        tipo: 'ENTRADA',
        motivo: ''
      });

      cargarMovimientos();
      cargarProductos();

    } catch (error) {
      console.error('Error al crear movimiento:', error);
      toast.error('Error al crear el movimiento');
    } finally {
      setCreandoMovimiento(false);
    }
  };

  const exportarMovimientos = async () => {
    try {
      setExportando(true);
      generarCSVLocal();
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error("Error al exportar los movimientos");
    } finally {
      setExportando(false);
    }
  };

  const generarCSVLocal = () => {
    const movimientosFiltrados = movimientos.filter(movimiento =>
      movimiento.producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      movimiento.producto.sku?.toLowerCase().includes(filtro.toLowerCase()) ||
      movimiento.motivo?.toLowerCase().includes(filtro.toLowerCase())
    );

    const csvContent = [
      'Fecha,Producto,SKU,Tipo,Cantidad,Stock Anterior,Stock Nuevo,Motivo,Usuario',
      ...movimientosFiltrados.map(mov => 
        `"${formatearFecha(mov.fechaMovimiento)}","${mov.producto.nombre}","${mov.producto.sku || ''}","${mov.tipo}","${mov.cantidad}","${mov.stockPrevio}","${mov.stockNuevo}","${mov.motivo}","${mov.usuario.nombre}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    toast.success("Movimientos exportados correctamente");
  };

  useEffect(() => {
    if (session?.user?.empresaId) {
      cargarMovimientos();
      cargarProductos();
    }
  }, [session?.user?.empresaId, filtroTipo, fechaInicio, fechaFin]);

  const movimientosFiltrados = movimientos.filter(movimiento =>
    movimiento.producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    movimiento.producto.sku?.toLowerCase().includes(filtro.toLowerCase()) ||
    movimiento.motivo?.toLowerCase().includes(filtro.toLowerCase())
  );

  const formatearFecha = (fechaString: string) => {
    return new Date(fechaString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const productoSeleccionado = productos.find(p => p.id === nuevoMovimiento.productoId);

  if (!session?.user?.empresaId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-medium text-foreground">Acceso denegado</p>
            <p className="text-sm text-muted-foreground">Debes iniciar sesión para ver los movimientos de inventario.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-medium text-foreground">Error al cargar movimientos</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => cargarMovimientos()} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando movimientos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventario">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Movimientos de Inventario</h1>
            <p className="text-base text-muted-foreground">
              Historial completo de entradas, salidas y ajustes de stock
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200">
                <Plus className="h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Registrar Movimiento
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed pt-2">
                  Crea un nuevo movimiento de inventario para actualizar el stock
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="producto" className="text-base font-medium">Producto</Label>
                  <Select
                    value={nuevoMovimiento.productoId}
                    onValueChange={(value) => setNuevoMovimiento({...nuevoMovimiento, productoId: value})}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{producto.nombre}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {producto.sku && <span className="bg-muted px-2 py-1 rounded">{producto.sku}</span>}
                              <span className="font-medium">Stock: {producto.enStock}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo" className="text-base font-medium">Tipo de movimiento</Label>
                    <Select
                      value={nuevoMovimiento.tipo}
                      onValueChange={(value: 'ENTRADA' | 'SALIDA' | 'AJUSTE') => 
                        setNuevoMovimiento({...nuevoMovimiento, tipo: value})
                      }
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENTRADA">
                          <div className="flex items-center gap-2">
                            <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            Entrada (+)
                          </div>
                        </SelectItem>
                        <SelectItem value="SALIDA">
                          <div className="flex items-center gap-2">
                            <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            Salida (-)
                          </div>
                        </SelectItem>
                        <SelectItem value="AJUSTE">
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Ajuste (=)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cantidad" className="text-base font-medium">Cantidad</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      min="1"
                      value={nuevoMovimiento.cantidad || ''}
                      onChange={(e) => setNuevoMovimiento({
                        ...nuevoMovimiento, 
                        cantidad: parseInt(e.target.value) || 0
                      })}
                      placeholder="0"
                      className="h-12 text-center text-lg font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo" className="text-base font-medium">Motivo</Label>
                  <Textarea
                    id="motivo"
                    value={nuevoMovimiento.motivo}
                    onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, motivo: e.target.value})}
                    placeholder="Describe el motivo del movimiento..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {productoSeleccionado && nuevoMovimiento.cantidad > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-base font-semibold">Vista previa</Label>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Producto:</span>
                        <span className="font-semibold">{productoSeleccionado.nombre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock actual:</span>
                        <span className="font-semibold text-lg">{productoSeleccionado.enStock}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground">Stock después:</span>
                        <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                          {nuevoMovimiento.tipo === 'ENTRADA' && 
                            productoSeleccionado.enStock + nuevoMovimiento.cantidad
                          }
                          {nuevoMovimiento.tipo === 'SALIDA' && 
                            Math.max(0, productoSeleccionado.enStock - nuevoMovimiento.cantidad)
                          }
                          {nuevoMovimiento.tipo === 'AJUSTE' && 
                            nuevoMovimiento.cantidad
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-3 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={creandoMovimiento}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={crearMovimiento}
                  disabled={creandoMovimiento || !nuevoMovimiento.productoId || !nuevoMovimiento.cantidad}
                  className="flex-1 sm:flex-none"
                >
                  {creandoMovimiento ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Registrar
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={exportarMovimientos}
            variant="outline"
            disabled={loading || movimientos.length === 0 || exportando}
            className="flex items-center gap-2 px-4 h-11 shadow-sm transition-all duration-200"
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Entradas</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">+{resumen.cantidadEntradas}</div>
            <p className="text-xs text-muted-foreground">{resumen.totalEntradas} movimientos</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Salidas</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">-{resumen.cantidadSalidas}</div>
            <p className="text-xs text-muted-foreground">{resumen.totalSalidas} movimientos</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Ajustes</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{resumen.totalAjustes}</div>
            <p className="text-xs text-muted-foreground">Correcciones de stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border border-border shadow-sm bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Filtros</h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, SKU o motivo..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10 h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Tipo de movimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los tipos</SelectItem>
                  <SelectItem value="ENTRADA">Entradas</SelectItem>
                  <SelectItem value="SALIDA">Salidas</SelectItem>
                  <SelectItem value="AJUSTE">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Fecha inicio</Label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm h-11 bg-background"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Fecha fin</Label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm h-11 bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de movimientos */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Historial de Movimientos
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {movimientosFiltrados.length === 0 && filtro
                  ? "No se encontraron resultados para tu búsqueda"
                  : `${movimientosFiltrados.length} ${movimientosFiltrados.length === 1 ? 'movimiento' : 'movimientos'} ${filtro ? 'encontrado(s)' : 'en total'}`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {movimientosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium text-foreground">
                  {filtro
                    ? "No se encontraron movimientos"
                    : "No hay movimientos registrados"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filtro
                    ? "Intenta con otros términos de búsqueda"
                    : "Registra tu primer movimiento para comenzar"}
                </p>
              </div>
              {!filtro && (
                <Button onClick={() => setDialogOpen(true)} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primer movimiento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {movimientosFiltrados.map((movimiento) => {
                const TipoConfig = TIPOS_MOVIMIENTO[movimiento.tipo];
                const IconoTipo = TipoConfig.icon;

                return (
                  <div key={movimiento.id} className="border border-border/50 rounded-lg p-6 hover:bg-muted/20 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-lg ${TipoConfig.bgColor} ${TipoConfig.borderColor} border flex items-center justify-center`}>
                          <IconoTipo className={`h-6 w-6 ${TipoConfig.color}`} />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-semibold text-lg text-foreground">{movimiento.producto.nombre}</h4>
                            
                            <div className="flex items-center gap-2">
                              {movimiento.producto.sku && (
                                <span className="px-2 py-1 bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                  SKU: {movimiento.producto.sku}
                                </span>
                              )}
                              {movimiento.producto.codigoBarras && (
                                <span className="px-2 py-1 bg-muted text-foreground/80 rounded text-xs font-medium">
                                  CB: {movimiento.producto.codigoBarras}
                                </span>
                              )}
                              <Badge variant="outline" className={`${TipoConfig.bgColor} ${TipoConfig.borderColor}`}>
                                <span className={`${TipoConfig.textColor} font-semibold`}>{TipoConfig.label}</span>
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">{formatearFecha(movimiento.fechaMovimiento)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{movimiento.usuario.nombre}</span>
                            </div>
                          </div>

                          {movimiento.motivo && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">
                                <span className="font-semibold text-card-foreground">Motivo:</span>{' '}
                                <span className="text-muted-foreground">{movimiento.motivo}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div className={`text-2xl font-bold ${TipoConfig.color}`}>
                          {movimiento.tipo === 'ENTRADA' ? '+' : movimiento.tipo === 'SALIDA' ? '-' : '±'}
                          {Math.abs(movimiento.cantidad)}
                        </div>
                        <div className="text-sm">
                          <div className="bg-muted px-3 py-2 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Stock:</span>
                            </div>
                            <div className="font-mono font-semibold text-base">
                              <span className="text-red-600 dark:text-red-400">{movimiento.stockPrevio}</span>
                              <span className="mx-2 text-muted-foreground">→</span>
                              <span className="text-green-600 dark:text-green-400">{movimiento.stockNuevo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {movimientos.length > 0 && (
            <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <span>
                  Mostrando <span className="font-semibold">{movimientosFiltrados.length}</span> de{' '}
                  <span className="font-semibold">{movimientos.length}</span> movimientos
                </span>
                {filtro && (
                  <span className="px-2 py-1 bg-blue-500/15 text-blue-800 dark:text-blue-300 rounded text-xs">
                    Filtrado por: "{filtro}"
                  </span>
                )}
              </div>
              <span className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}