import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, RefreshCw, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductoVendido {
  productoId: string;
  nombre?: string;
  cantidad: number;
  ingresos: number;
  precio?: number;
  categoria?: {
    id: string;
    nombre: string;
  };
  numeroVentas?: number;
}

interface ProductosTabProps {
  datos?: any;
  loading?: boolean;
  formatearMoneda: (cantidad?: number) => string;
}

export const ProductosTab: React.FC<ProductosTabProps> = ({
  datos,
  loading: loadingProp,
  formatearMoneda
}) => {
  const [productos, setProductos] = useState<ProductoVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);


  const cargarProductos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar primero con el endpoint de análisis de ventas
     let response = await fetch('/api/ventas/analisis');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Adaptar los datos al formato esperado
      let productosArray: ProductoVendido[] = [];

      // Buscar productos en diferentes ubicaciones de la respuesta
      if (Array.isArray(data)) {
        productosArray = data;
      } else if (data.topProductosCantidad && Array.isArray(data.topProductosCantidad)) {
        productosArray = data.topProductosCantidad;
      } else if (data.topProductosIngresos && Array.isArray(data.topProductosIngresos)) {
        productosArray = data.topProductosIngresos;
      } else if (data.productos && Array.isArray(data.productos)) {
        productosArray = data.productos;
      } else if (data.datos && Array.isArray(data.datos)) {
        productosArray = data.datos;
      }

      // Mapear los datos para asegurar la estructura correcta
      const productosMapeados = productosArray.map((producto: any) => ({
        productoId: producto.productoId || producto.id || producto.producto?.id || '',
        nombre: producto.nombre || producto.producto?.nombre || `Producto ${producto.productoId?.slice(-6) || 'Sin ID'}`,
        cantidad: producto.cantidadVendida || producto.cantidad || producto._sum?.cantidad || 0,
        ingresos: producto.ingresosTotales || producto.ingresos || (producto.cantidad * producto.precio) || 0,
        precio: producto.precio || producto.producto?.precio || 0,
        categoria: producto.categoria || producto.producto?.categoria,
        numeroVentas: producto.numeroVentas || producto.ventas || 0
      }));

      // Ordenar por cantidad vendida
      productosMapeados.sort((a, b) => b.cantidad - a.cantidad);

      setProductos(productosMapeados);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // Usar el loading del estado local
  const isLoading = loading || loadingProp;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Top Productos
            </CardTitle>
            <CardDescription>Cargando análisis de productos...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-3 border rounded">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Error al cargar productos</h3>
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={cargarProductos}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Top Productos
                </CardTitle>
                <CardDescription>No hay datos de productos disponibles</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={cargarProductos}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
              <p className="text-muted-foreground">No hay productos vendidos en el período seleccionado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular estadísticas
  const totalVendido = productos.reduce((sum, p) => sum + p.cantidad, 0);
  const ingresosTotal = productos.reduce((sum, p) => sum + p.ingresos, 0);

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{productos.length}</div>
              <div className="text-sm text-muted-foreground">Productos Diferentes</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalVendido}</div>
              <div className="text-sm text-muted-foreground">Unidades Vendidas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatearMoneda(ingresosTotal)}</div>
              <div className="text-sm text-muted-foreground">Ingresos Totales</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatearMoneda(totalVendido > 0 ? ingresosTotal / totalVendido : 0)}
              </div>
              <div className="text-sm text-muted-foreground">Precio Promedio</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de productos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Productos Vendidos</CardTitle>
              <CardDescription>
                {productos.length} productos analizados por ventas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={cargarProductos}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productos.map((producto, index) => (
              <div 
                key={producto.productoId} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-primary text-primary-foreground' :
                    index === 2 ? 'bg-primary text-primary-foreground' :
                    'bg-primary text-primary-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{producto.nombre}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground flex-wrap">
                      {producto.categoria && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {producto.categoria.nombre}
                          </Badge>
                          <span>•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {producto.cantidad} vendidos
                      </span>
                      {producto.precio && producto.precio > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatearMoneda(producto.precio)} c/u</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-bold text-lg text-green-600 dark:text-green-400">
                    {formatearMoneda(producto.ingresos)}
                  </p>
                  {producto.numeroVentas && producto.numeroVentas > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {producto.numeroVentas} ventas
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

           {/* PAGINACIÓN */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>

            <span className="font-medium text-sm">
              Página {page} de {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};