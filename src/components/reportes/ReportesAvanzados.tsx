import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Users,
  Package,
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Settings,
  Edit3,
  Save,
  X
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ReportesAvanzadosProps {
  empresaId: string;
}

interface MetricaAvanzada {
  titulo: string;
  valor: number;
  valorAnterior?: number;
  formato: 'currency' | 'number' | 'percentage';
  icono: React.ReactNode;
  color: string;
  descripcion: string;
  tendencia?: 'up' | 'down' | 'neutral';
}

interface DatosComparacion {
  fecha: string;
  actual: number;
  anterior: number;
  meta?: number;
}

interface RendimientoCategoria {
  categoria: string;
  ventas: number;
  ingresos: number;
  crecimiento: number;
  color: string;
}

interface ObjetivoPersonalizado {
  id: string;
  nombre: string;
  actual: number;
  meta: number;
  progreso: number;
  tipo: 'currency' | 'number' | 'percentage';
  descripcion?: string;
}

export function ReportesAvanzados({ empresaId }: ReportesAvanzadosProps) {
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // 'semana', 'mes', 'trimestre', 'año'
  const [tipoComparacion, setTipoComparacion] = useState('periodo-anterior');
  
  // Estados para los datos
  const [metricas, setMetricas] = useState<MetricaAvanzada[]>([]);
  const [tendenciaVentas, setTendenciaVentas] = useState<DatosComparacion[]>([]);
  const [rendimientoCategorias, setRendimientoCategorias] = useState<RendimientoCategoria[]>([]);
  const [distribucionVentas, setDistribucionVentas] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<ObjetivoPersonalizado[]>([]);
  
  // Estados para configuración de objetivos
  const [modalObjetivos, setModalObjetivos] = useState(false);
  const [editandoObjetivo, setEditandoObjetivo] = useState<ObjetivoPersonalizado | null>(null);
  const [nuevoObjetivo, setNuevoObjetivo] = useState({
    nombre: '',
    meta: 0,
    tipo: 'number' as 'currency' | 'number' | 'percentage',
    descripcion: ''
  });

  useEffect(() => {
    cargarDatos();
  }, [periodo, tipoComparacion, empresaId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Importar servicioReportes si no está disponible globalmente
      const { servicioReportes } = await import('@/lib/api-service');
      
      const datos = await servicioReportes.obtenerReportesAvanzados({
        periodo: periodo
      });

      // Mapear los datos de la API a nuestros estados
      setMetricas(datos.metricas.map((metrica: any) => ({
        ...metrica,
        icono: getIconoComponente(metrica.icono)
      })));
      
      setTendenciaVentas(datos.tendenciaVentas);
      setRendimientoCategorias(datos.rendimientoCategorias);
      setDistribucionVentas(datos.distribucionVentas);
      
      // Los objetivos vienen vacíos por primera vez
      const objetivosConProgreso = (datos.objetivos || []).map((objetivo: any) => ({
        ...objetivo,
        progreso: calcularProgreso(objetivo.actual || 0, objetivo.meta || 0)
      }));
      setObjetivos(objetivosConProgreso);

    } catch (error) {
        console.error('Error al cargar datos avanzados:', error);
        // Inicializar estados vacíos en caso de error
        setMetricas([]);
        setTendenciaVentas([]);
        setRendimientoCategorias([]);
        setDistribucionVentas([]);
        setObjetivos([]);
      } finally {
      setCargando(false);
    }
  };

  
  const getIconoComponente = (nombreIcono: string) => {
    switch (nombreIcono) {
      case 'DollarSign': return <DollarSign className="h-5 w-5" />;
      case 'Target': return <Target className="h-5 w-5" />;
      case 'TrendingUp': return <TrendingUp className="h-5 w-5" />;
      case 'Users': return <Users className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const calcularProgreso = (actual: number, meta: number): number => {
    if (!actual || !meta || meta <= 0) return 0;
    return Math.min((actual / meta) * 100, 100);
  };

  const calcularCrecimiento = (actual: number, anterior: number) => {
    if (anterior === 0) return 0;
    return ((actual - anterior) / anterior) * 100;
  };

  const formatearValor = (valor: number, formato: 'currency' | 'number' | 'percentage') => {
    switch (formato) {
      case 'currency':
        return formatCurrency(valor);
      case 'percentage':
        return `${valor.toFixed(1)}%`;
      default:
        return valor.toLocaleString();
    }
  };

  const guardarObjetivo = () => {
  if (!nuevoObjetivo.nombre || nuevoObjetivo.meta <= 0) return;

  const objetivo: ObjetivoPersonalizado = {
    id: `objetivo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: nuevoObjetivo.nombre,
      actual: 0, // Siempre empieza en 0
      meta: nuevoObjetivo.meta,
      progreso: 0, // Siempre empieza en 0
      tipo: nuevoObjetivo.tipo,
      descripcion: nuevoObjetivo.descripcion
    };

    setObjetivos(prev => [...prev, objetivo]);
    setNuevoObjetivo({ nombre: '', meta: 0, tipo: 'number', descripcion: '' });
    setModalObjetivos(false);
  };

  const editarObjetivo = (objetivo: ObjetivoPersonalizado) => {
    setEditandoObjetivo({ ...objetivo });
  };

  const guardarEdicionObjetivo = () => {
    if (!editandoObjetivo || editandoObjetivo.meta <= 0) return;

    const progreso = calcularProgreso(editandoObjetivo.actual, editandoObjetivo.meta);

    setObjetivos(prev => 
      prev.map(obj => 
        obj.id === editandoObjetivo.id 
          ? { ...editandoObjetivo, progreso }
          : obj
      )
    );
    setEditandoObjetivo(null);
  };

  const eliminarObjetivo = (id: string) => {
    setObjetivos(prev => prev.filter(obj => obj.id !== id));
  };

  // Función helper para obtener progreso seguro
  const obtenerProgresoSeguro = (progreso: number | null | undefined): number => {
    return progreso ?? 0;
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-blue-100"></div>
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Cargando reportes avanzados...</p>
            <p className="text-sm text-muted-foreground">Analizando datos de rendimiento</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reportes Avanzados</h2>
          <p className="text-muted-foreground">Análisis detallado del rendimiento empresarial</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Última Semana</SelectItem>
              <SelectItem value="mes">Último Mes</SelectItem>
              <SelectItem value="trimestre">Último Trimestre</SelectItem>
              <SelectItem value="año">Último Año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={cargarDatos}
            disabled={cargando}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricas.map((metrica, index) => {
          const crecimiento = metrica.valorAnterior 
            ? calcularCrecimiento(metrica.valor, metrica.valorAnterior)
            : null;
          const esCrecimientoPositivo = crecimiento ? crecimiento >= 0 : null;

          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metrica.titulo}
                  </CardTitle>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", 
                    metrica.color.includes('green') && "bg-emerald-500/15 text-green-600 dark:text-green-400",
                    metrica.color.includes('blue') && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                    metrica.color.includes('purple') && "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                    metrica.color.includes('orange') && "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                  )}>
                    {metrica.icono}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    {formatearValor(metrica.valor, metrica.formato)}
                  </div>
                  
                  {metrica.valorAnterior && crecimiento !== null && (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        esCrecimientoPositivo ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {esCrecimientoPositivo ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {Math.abs(crecimiento).toFixed(1)}%
                      </div>
                      <span className="text-xs text-muted-foreground">vs período anterior</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {metrica.descripcion}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs de Análisis */}
      <Tabs defaultValue="tendencias" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          {rendimientoCategorias.length > 0 && (
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          )}
          <TabsTrigger value="distribucion">Distribución</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
        </TabsList>

        {/* Tendencias */}
        <TabsContent value="tendencias" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ventas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparación de ingresos diarios vs período anterior y meta
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendenciaVentas}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="fecha" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(Number(value)), name]}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="anterior"
                      stackId="1"
                      stroke="#94a3b8"
                      fillOpacity={1}
                      fill="url(#colorAnterior)"
                      name="Período Anterior"
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stackId="2"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      name="Período Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="meta"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Meta"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorías */}
        {rendimientoCategorias.length > 0 && (
        <TabsContent value="categorias" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rendimientoCategorias.map((categoria, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: categoria.color }}
                        />
                        <div>
                          <p className="font-medium">{categoria.categoria}</p>
                          <p className="text-sm text-muted-foreground">
                            {categoria.ventas} ventas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(categoria.ingresos)}</p>
                        <div className={cn(
                          "text-sm font-medium flex items-center gap-1",
                          categoria.crecimiento >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {categoria.crecimiento >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(categoria.crecimiento).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rendimientoCategorias}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="categoria" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        {/* Distribución */}
        <TabsContent value="distribucion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Ventas por Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribucionVentas}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="valor"
                        label={({ nombre, valor }) => `${nombre}: ${valor}%`}
                      >
                        {distribucionVentas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                  {distribucionVentas.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.nombre}</span>
                      </div>
                      <Badge variant="secondary">{item.valor}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objetivos */}
        <TabsContent value="objetivos" className="mt-6">
          <div className="space-y-4">
            {/* Header con botón para agregar objetivo */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Objetivos y Metas</h3>
                <p className="text-sm text-muted-foreground">Configura y monitorea tus metas empresariales</p>
              </div>
              <Dialog open={modalObjetivos} onOpenChange={setModalObjetivos}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Nuevo Objetivo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Objetivo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="nombre">Nombre del Objetivo</Label>
                      <Input 
                        id="nombre"
                        value={nuevoObjetivo.nombre}
                        onChange={(e) => setNuevoObjetivo(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej: Ventas mensuales"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meta">Meta</Label>
                      <Input 
                        id="meta"
                        type="number"
                        value={nuevoObjetivo.meta}
                        onChange={(e) => setNuevoObjetivo(prev => ({ ...prev, meta: Number(e.target.value) }))}
                        placeholder="Valor objetivo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={nuevoObjetivo.tipo} onValueChange={(value: 'currency' | 'number' | 'percentage') => setNuevoObjetivo(prev => ({ ...prev, tipo: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="currency">Moneda</SelectItem>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="descripcion">Descripción (opcional)</Label>
                      <Input 
                        id="descripcion"
                        value={nuevoObjetivo.descripcion}
                        onChange={(e) => setNuevoObjetivo(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción del objetivo"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={guardarObjetivo} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setModalObjetivos(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de objetivos */}
            <div className="grid gap-4 md:grid-cols-2">
              {objetivos.map((objetivo) => {
                const progresoSeguro = obtenerProgresoSeguro(objetivo.progreso);
                
                return (
                  <Card key={objetivo.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{objetivo.nombre}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={progresoSeguro >= 90 ? "default" : progresoSeguro >= 70 ? "secondary" : "destructive"}>
                            {progresoSeguro.toFixed(0)}%
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => editarObjetivo(objetivo)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {editandoObjetivo?.id === objetivo.id && editandoObjetivo ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Valor Actual</Label>
                                <Input
                                  type="number"
                                  value={editandoObjetivo.actual}
                                  onChange={(e) => setEditandoObjetivo(prev => prev ? { ...prev, actual: Number(e.target.value) } : null)}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs">Meta</Label>
                                <Input
                                  type="number"
                                  value={editandoObjetivo.meta}
                                  onChange={(e) => setEditandoObjetivo(prev => prev ? { ...prev, meta: Number(e.target.value) } : null)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={guardarEdicionObjetivo} className="flex-1">
                                <Save className="h-3 w-3 mr-1" />
                                Guardar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditandoObjetivo(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => eliminarObjetivo(objetivo.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>
                                Actual: <span className="font-bold">
                                  {formatearValor(objetivo.actual, objetivo.tipo)}
                                </span>
                              </span>
                              <span>
                                Meta: <span className="font-bold">
                                  {formatearValor(objetivo.meta, objetivo.tipo)}
                                </span>
                              </span>
                            </div>
                            
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={cn(
                                  "h-2 rounded-full transition-all duration-300",
                                  progresoSeguro >= 90 ? "bg-green-500" :
                                  progresoSeguro >= 70 ? "bg-blue-500" :
                                  "bg-orange-500"
                                )}
                                style={{ width: `${Math.min(progresoSeguro, 100)}%` }}
                              />
                            </div>
                            
                            {objetivo.descripcion && (
                              <p className="text-xs text-muted-foreground">
                                {objetivo.descripcion}
                              </p>
                            )}
                            
                            <div className="text-xs text-muted-foreground">
                              {progresoSeguro >= 100 ? "¡Objetivo completado!" :
                               progresoSeguro >= 90 ? "Muy cerca del objetivo" :
                               progresoSeguro >= 70 ? "En buen camino" :
                               "Necesita atención"}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Mensaje cuando no hay objetivos */}
            {objetivos.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Target className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">Sin objetivos definidos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea tus primeros objetivos para monitorear el progreso de tu negocio
                  </p>
                  <Button onClick={() => setModalObjetivos(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Crear Primer Objetivo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}