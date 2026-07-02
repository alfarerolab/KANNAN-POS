// components/ventas/PrediccionesTab.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ComposedChart, Bar } from "recharts";
import { 
  Zap, Award, Target, Clock, TrendingUp, RefreshCw, Loader2, Brain, 
  Calculator, AlertCircle, CheckCircle, Info, Settings, Calendar,
  BarChart3, Activity, Lightbulb, Shield, Gauge, Database
} from "lucide-react";

import { PredictorVentas, DatoHistorico, PrediccionVentas } from "@/utils/predicciones";

interface PrediccionesTabProps {
  datos: any;
  loading: boolean;
  filtrosActuales: any;
  cargarAnalisis: (filtros: any) => void;
  formatearMoneda: (cantidad?: number) => string;
}

export const PrediccionesTab: React.FC<PrediccionesTabProps> = ({
  datos,
  loading,
  filtrosActuales,
  cargarAnalisis,
  formatearMoneda
}) => {
  // Estados para predicciones
  const [predicciones, setPredicciones] = useState<PrediccionVentas[]>([]);
  const [predictor, setPredictor] = useState<PredictorVentas | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loadingPredicciones, setLoadingPredicciones] = useState(false);
  const [errorPredicciones, setErrorPredicciones] = useState<string | null>(null);
  const [datosInsuficientes, setDatosInsuficientes] = useState(false);
  
  // Estados para configuración
  const [diasPrediccion, setDiasPrediccion] = useState(30);
  const [eventos, setEventos] = useState<{ fecha: string; impacto: number; descripcion: string }[]>([]);
  const [nuevoEvento, setNuevoEvento] = useState({ fecha: '', impacto: 0, descripcion: '' });

  // Verificar si hay datos suficientes
  const verificarDatos = () => {
    if (!datos || !('tendencias' in datos) || !datos.tendencias) {
      return { suficientes: false, cantidad: 0 };
    }
    
    const cantidad = datos.tendencias.length;
    return { suficientes: cantidad >= 30, cantidad };
  };

  // Efecto para generar predicciones cuando cambien los datos
  useEffect(() => {
    const { suficientes, cantidad } = verificarDatos();
    
    if (suficientes) {
      setDatosInsuficientes(false);
      generarPredicciones();
    } else {
      setDatosInsuficientes(true);
      setErrorPredicciones(`Se necesitan al menos 30 días de datos históricos. Actualmente tienes ${cantidad} días.`);
    }
  }, [datos, diasPrediccion, eventos]);

  const generarPredicciones = async () => {
    if (!datos || !('tendencias' in datos) || !datos.tendencias) return;

    setLoadingPredicciones(true);
    setErrorPredicciones(null);

    try {
      // Verificar datos antes de proceder
      const { suficientes, cantidad } = verificarDatos();
      if (!suficientes) {
        setDatosInsuficientes(true);
        setErrorPredicciones(`Se necesitan al menos 30 días de datos históricos. Actualmente tienes ${cantidad} días.`);
        return;
      }

      // Convertir datos de la API al formato requerido por el predictor
      const datosHistoricos: DatoHistorico[] = datos.tendencias.map((item: any, index: number) => {
        const fecha = new Date(item.fecha);
        return {
          fecha: fecha.toISOString().split('T')[0],
          ventas: item.cantidadVentas || 0,
          ingresos: item.ingresos || 0,
          productos: item.productosVendidos || 0,
          clientes: item.clientesAtendidos || 0,
          diaSemana: fecha.getDay(),
          semanaAño: Math.floor((fecha.getTime() - new Date(fecha.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
          mesAño: fecha.getMonth(),
          esFinSemana: fecha.getDay() === 0 || fecha.getDay() === 6,
          esFeriado: false
        };
      });

      // Crear predictor y generar predicciones
      const nuevoPredictor = new PredictorVentas(datosHistoricos);
      const nuevasPredicciones = nuevoPredictor.predecirVentas(diasPrediccion, eventos);
      const nuevosInsights = nuevoPredictor.obtenerInsights();

      setPredictor(nuevoPredictor);
      setPredicciones(nuevasPredicciones);
      setInsights(nuevosInsights);
      setDatosInsuficientes(false);

    } catch (error) {
      console.error('Error en predicciones:', error);
      if (error instanceof Error && error.message.includes('30 días')) {
        setDatosInsuficientes(true);
      }
      setErrorPredicciones(error instanceof Error ? error.message : 'Error al generar predicciones');
    } finally {
      setLoadingPredicciones(false);
    }
  };

  const agregarEvento = () => {
    if (nuevoEvento.fecha && nuevoEvento.descripcion) {
      setEventos([...eventos, { ...nuevoEvento }]);
      setNuevoEvento({ fecha: '', impacto: 0, descripcion: '' });
    }
  };

  const eliminarEvento = (index: number) => {
    setEventos(eventos.filter((_, i) => i !== index));
  };

  const obtenerColorConfianza = (confianza: number) => {
    if (confianza >= 80) return 'text-green-600 dark:text-green-400 bg-emerald-500/10';
    if (confianza >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-amber-500/10';
    return 'text-red-600 dark:text-red-400 bg-destructive/10';
  };

  const obtenerIconoTendencia = (tendencia: string) => {
    switch (tendencia) {
      case 'ascendente': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'descendente': return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const generarDatosDemostracion = () => {
    const ventasDemo = Array.from({ length: diasPrediccion }, (_, i) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i + 1);
      
      // Simular patrón de ventas con variación
      const baseVentas = 15 + Math.sin(i / 7) * 5 + Math.random() * 8;
      const baseIngresos = baseVentas * (50000 + Math.random() * 30000);
      
      return {
        fecha: fecha.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
        fechaCompleta: fecha.toISOString().split('T')[0],
        ventasPredichas: Math.floor(baseVentas),
        ingresosPredichos: Math.floor(baseIngresos),
        confianza: 65 + Math.random() * 25,
        rangoMinimo: Math.floor(baseVentas * 0.8),
        rangoMaximo: Math.floor(baseVentas * 1.3),
        tipo: 'demo'
      };
    });
    return ventasDemo;
  };

  // Datos para mostrar en caso de datos insuficientes
  const { suficientes, cantidad } = verificarDatos();
  
  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando sistema de predicciones...</p>
        </div>
      </div>
    );
  }

  // Vista cuando no hay suficientes datos
  if (datosInsuficientes || !suficientes) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Database className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-1" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-2">Datos Insuficientes para Predicciones</h3>
                <p className="text-yellow-700 dark:text-yellow-400 mb-4">
                  Para generar predicciones precisas con IA, necesitamos al menos 30 días de datos históricos. 
                  Actualmente tienes <strong>{cantidad} días</strong> de datos.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-yellow-700 dark:text-yellow-400">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Datos actuales: {cantidad} días
                  </div>
                  <div className="flex items-center text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Requerido: 30 días mínimo
                  </div>
                  <div className="flex items-center text-sm text-yellow-700 dark:text-yellow-400">
                    <Clock className="h-4 w-4 mr-2" />
                    Faltan: {Math.max(0, 30 - cantidad)} días
                  </div>
                </div>

                <div className="mt-4 p-3 bg-card rounded border-l-4 border-l-blue-500">
                  <p className="text-sm text-foreground/80">
                    <strong>Mientras tanto:</strong> Continúa registrando tus ventas diarias. 
                    Una vez que tengas suficientes datos, el sistema generará automáticamente 
                    predicciones precisas basadas en machine learning.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista demo con datos simulados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-purple-500" />
              Vista Previa del Sistema de Predicciones
              <Badge variant="outline" className="ml-2">Demo</Badge>
            </CardTitle>
            <CardDescription>
              Ejemplo de cómo funcionarán las predicciones una vez que tengas suficientes datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <h4 className="font-medium mb-3">Funcionalidades Disponibles:</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Predicciones de ventas con IA
                  </div>
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 mr-2 text-blue-500" />
                    Niveles de confianza por predicción
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    Impacto de eventos especiales
                  </div>
                  <div className="flex items-center text-sm">
                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                    Recomendaciones inteligentes
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg">
                <h4 className="font-medium mb-3">Vista Previa de Predicción (Demo):</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={generarDatosDemostracion().slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="fecha" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="ventasPredichas" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#8b5cf6', strokeWidth: 1, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  * Datos simulados solo para demostración
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-blue-500/10 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300">¿Cómo acelerar el proceso?</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Asegúrate de registrar todas tus ventas diariamente para alcanzar los 30 días más rápido.
                </p>
              </div>
              <Button variant="outline" onClick={() => cargarAnalisis(filtrosActuales)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar Datos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resto del componente cuando hay datos suficientes
  // (El código existente del componente completo...)
  
  const datosGrafico = datos && 'tendencias' in datos && datos.tendencias ? [
    ...datos.tendencias.slice(-60).map((item: any) => ({
      fecha: new Date(item.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
      fechaCompleta: item.fecha,
      ventasReales: item.cantidadVentas || 0,
      ingresosReales: item.ingresos || 0,
      tipo: 'historico'
    })),
    ...predicciones.slice(0, 30).map(pred => ({
      fecha: new Date(pred.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
      fechaCompleta: pred.fecha,
      ventasPredichas: pred.ventasPredichas,
      ingresosPredichos: pred.ingresosPredichos,
      confianza: pred.confianza,
      rangoMinimo: pred.rangoConfianza.minimo,
      rangoMaximo: pred.rangoConfianza.maximo,
      tipo: 'prediccion'
    }))
  ] : [];

  const proximaSemana = predicciones.slice(0, 7);
  const ventasProximaSemana = proximaSemana.reduce((acc, p) => acc + p.ventasPredichas, 0);
  const ingresosProximaSemana = proximaSemana.reduce((acc, p) => acc + p.ingresosPredichos, 0);
  const confianzaPromedio = proximaSemana.reduce((acc, p) => acc + p.confianza, 0) / proximaSemana.length;

  return (
    <div className="space-y-6">
      {/* Resumen de predicciones inteligentes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-purple-500" />
              IA Predictiva Avanzada
            </CardTitle>
            <CardDescription>Predicciones basadas en análisis estadístico y machine learning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPredicciones ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Próxima Semana</h4>
                    <Badge className={`${obtenerColorConfianza(confianzaPromedio)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {confianzaPromedio.toFixed(0)}% confianza
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-purple-700">
                        {ventasProximaSemana.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Ventas predichas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {formatearMoneda(ingresosProximaSemana)}
                      </p>
                      <p className="text-sm text-muted-foreground">Ingresos estimados</p>
                    </div>
                  </div>
                  
                  {insights && (
                    <div className="flex items-center mt-3 p-2 bg-card/60 rounded">
                      {obtenerIconoTendencia(insights.tendenciaCrecimiento)}
                      <span className="text-sm ml-2">
                        Tendencia {insights.tendenciaCrecimiento} detectada
                        {insights.tasaCrecimientoDiaria > 0 && 
                          ` (+${insights.tasaCrecimientoDiaria.toFixed(1)} ventas/día)`
                        }
                      </span>
                    </div>
                  )}
                </div>

                {insights && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center">
                      <Calculator className="mr-2 h-4 w-4" />
                      Análisis Estadístico
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">Confiabilidad del modelo</span>
                        <Badge variant="outline">
                          <Gauge className="w-3 h-3 mr-1" />
                          {(insights.confiabilidadModelo * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">Volatilidad</span>
                        <Badge variant="outline" className={insights.volatilidad > 0.3 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {(insights.volatilidad * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">Mejor día</span>
                        <Badge variant="outline">
                          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][insights.mejorDiaSemana]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Resto del componente... */}
        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            {datosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={datosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="ventasReales" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ventasPredichas" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Cargando gráfico de predicciones...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Exportación por defecto
export default PrediccionesTab;