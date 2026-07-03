import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Medal, Award, Users, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VendedorData {
  usuarioId: string;
  nombre: string;
  email: string;
  cantidadVentas: number;
  totalVentas: number;
  promedioVenta: number;
  tasaConversion?: number;
}

interface VendedoresTabProps {
  datos?: any;
  loading?: boolean;
  formatearMoneda: (cantidad?: number) => string;
}

export const VendedoresTab: React.FC<VendedoresTabProps> = ({
  formatearMoneda
}) => {
  const [vendedores, setVendedores] = useState<VendedorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarVendedores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/reportes/ventas-por-usuario');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      let usuariosArray = [];
      
      if (Array.isArray(data)) {
        usuariosArray = data;
      } else if (data.datos && Array.isArray(data.datos)) {
        usuariosArray = data.datos;
      } else if (data.usuarios && Array.isArray(data.usuarios)) {
        usuariosArray = data.usuarios;
      } else if (data.ventasPorUsuario && Array.isArray(data.ventasPorUsuario)) {
        usuariosArray = data.ventasPorUsuario;
      }
      
      const vendedoresAdaptados = usuariosArray.map((usuario: any, index: number) => ({
        usuarioId: usuario.usuarioId || usuario.id || `usuario-${index}`,
        nombre: usuario.nombre || usuario.name || 'Usuario sin nombre',
        email: usuario.email || '',
        cantidadVentas: usuario.cantidadVentas || usuario.ventas || 0,
        totalVentas: usuario.totalVentas || usuario.total || 0,
        promedioVenta: usuario.promedioVenta || usuario.promedio || 0,
        tasaConversion: usuario.tasaConversion || 0
      }));
      
      vendedoresAdaptados.sort((a: VendedorData, b: VendedorData) => b.totalVentas - a.totalVentas);
      
      setVendedores(vendedoresAdaptados);
    } catch (err) {
      console.error('Error al cargar vendedores:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarVendedores();
  }, []);

  const getPosicionIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 2:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold">#{index + 1}</span>;
    }
  };

  const getPosicionBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 1:
        return 'bg-gradient-to-r from-gray-400 to-gray-600';
      case 2:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Ranking de Vendedores
            </CardTitle>
            <CardDescription>
              Cargando datos de rendimiento de vendedores...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Cargando vendedores...</p>
              </div>
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
              <Users className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Error al cargar datos</h3>
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                <Button 
                  onClick={cargarVendedores} 
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendedores.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Ranking de Vendedores
                </CardTitle>
                <CardDescription>No se encontraron datos de vendedores</CardDescription>
              </div>
              <Button onClick={cargarVendedores} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar datos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
              <p className="text-muted-foreground">
                No hay datos de vendedores para el período seleccionado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular totales
  const totalVentas = vendedores.reduce((sum, v) => sum + v.cantidadVentas, 0);
  const totalIngresos = vendedores.reduce((sum, v) => sum + v.totalVentas, 0);
  const promedioGeneral = vendedores.length > 0 
    ? vendedores.reduce((acc, v) => acc + v.promedioVenta, 0) / vendedores.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {vendedores[0]?.nombre || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatearMoneda(vendedores[0]?.totalVentas || 0)} en ventas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalVentas}
            </div>
            <p className="text-xs text-muted-foreground">
              Entre todos los vendedores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatearMoneda(totalIngresos)}
            </div>
            <p className="text-xs text-muted-foreground">
              Generados por el equipo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatearMoneda(promedioGeneral)}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio por vendedor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de vendedores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {vendedores.length} vendedores activos en el período
              </CardDescription>
            </div>
            <Button onClick={cargarVendedores} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Top 3 destacado */}
          <div className="space-y-4 mb-6">
            {vendedores.slice(0, 3).map((vendedor, index) => {
              const porcentajeDelTotal = totalVentas > 0 
                ? (vendedor.cantidadVentas / totalVentas) * 100 
                : 0;
              
              return (
                <div 
                  key={vendedor.usuarioId} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-bold ${getPosicionBg(index)}`}>
                      {getPosicionIcon(index)}
                    </div>
                    
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {vendedor.nombre}
                        {index === 0 && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        <Badge variant="secondary" className="text-xs">
                          Top {index + 1}
                        </Badge>
                      </h4>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">{vendedor.cantidadVentas}</span>
                          ventas
                        </span>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {formatearMoneda(vendedor.promedioVenta)} promedio
                        </span>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {porcentajeDelTotal.toFixed(1)}% del total
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-xl text-green-600 dark:text-green-400">
                      {formatearMoneda(vendedor.totalVentas)}
                    </p>
                    <div className="w-24 bg-muted rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-amber-500' :
                          index === 1 ? 'bg-muted-foreground' :
                          'bg-orange-500'
                        }`}
                        style={{ 
                          width: `${Math.min((vendedor.totalVentas / (vendedores[0]?.totalVentas || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      vs. top performer
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resto de vendedores en tabla */}
          {vendedores.length > 3 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Posición</TableHead>
                    <TableHead className="font-semibold">Vendedor</TableHead>
                    <TableHead className="font-semibold">Ventas</TableHead>
                    <TableHead className="font-semibold">Total</TableHead>
                    <TableHead className="font-semibold">Promedio</TableHead>
                    <TableHead className="font-semibold">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.slice(3).map((vendedor, index) => {
                    const porcentajeDelTotal = totalVentas > 0 
                      ? (vendedor.cantidadVentas / totalVentas) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={vendedor.usuarioId} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{index + 4}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-semibold">
                                {vendedor.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{vendedor.nombre}</span>
                              {vendedor.email && (
                                <p className="text-xs text-muted-foreground">{vendedor.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {vendedor.cantidadVentas}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600 dark:text-green-400">
                          {formatearMoneda(vendedor.totalVentas)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatearMoneda(vendedor.promedioVenta)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {porcentajeDelTotal.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};