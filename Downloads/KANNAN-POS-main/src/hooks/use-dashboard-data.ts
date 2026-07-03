import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface DashboardStats {
  // Ventas
  totalVentasHoy: number;
  ventasHoy: number;
  totalVentasSemana: number;
  ventasSemana: number;
  totalVentasMes: number;
  ventasMes: number;
  cambioVentas: number;

  // Productos
  totalProductos: number;
  productosStockBajo: number;
  productosVencenProximamente?: number;
  productosSinStock: number;
  serviciosActivos?: number;

  // Clientes
  totalClientes: number;
  clientesNuevosMes: number;
  clientesNuevosHoy: number;

  // Citas (si aplica)
  citasHoy?: number;
  citasPendientes?: number;
  citasCompletadas?: number;

  // Datos para gráficos
  ventasPorDia: Array<{
    fecha: string;
    total: number;
    cantidad: number;
  }>;

  // Ventas recientes
  ventasRecientes: Array<{
    id: string;
    total: number;
    metodoPago: string;
    createdAt: string;
    cliente: {
      nombre: string;
    } | null;
  }>;

  // Productos más vendidos
  productosMasVendidos: Array<{
    id: string;
    nombre: string;
    precio: number;
    cantidadVendida: number;
  }>;
}

interface UseDashboardDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refreshData: () => Promise<void>;
  formatCurrency: (value: number) => string;
  hasData: boolean;
}

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const { data: session } = useSession();
  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000,
    enableRealTime = false
  } = options;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Formatear moneda
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Función para cargar datos del dashboard
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!session?.user?.empresaId) {
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Llamada a la API real
      const response = await fetch('/api/dashboard/estadisticas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas del dashboard');
      }

      const data = await response.json();

      // Transformar datos de la API al formato esperado
      const statsData: DashboardStats = {
        // Ventas
        totalVentasHoy: data.ventasHoy?.total || 0,
        ventasHoy: data.ventasHoy?.cantidad || 0,
        totalVentasSemana: data.ventasSemana?.total || 0,
        ventasSemana: data.ventasSemana?.cantidad || 0,
        totalVentasMes: data.ventasMes?.total || 0,
        ventasMes: data.ventasMes?.cantidad || 0,
        cambioVentas: data.cambioVentas || 0,

        // Productos
        totalProductos: data.productos?.total || 0,
        productosStockBajo: data.productos?.stockBajo || 0,
        productosSinStock: data.productos?.sinStock || 0,
        productosVencenProximamente: data.productos?.vencenProximamente || 0,
        serviciosActivos: data.servicios?.activos || 0,

        // Clientes
        totalClientes: data.clientes?.total || 0,
        clientesNuevosMes: data.clientes?.nuevosMes || 0,
        clientesNuevosHoy: data.clientes?.nuevosHoy || 0,

        // Citas
        citasHoy: data.citas?.hoy || 0,
        citasPendientes: data.citas?.pendientes || 0,
        citasCompletadas: data.citas?.completadas || 0,

        // Gráficos
        ventasPorDia: data.ventasPorDia || [],

        // Ventas recientes
        ventasRecientes: data.ventasRecientes || [],

        // Productos más vendidos
        productosMasVendidos: data.productosMasVendidos || [],
      };

      setStats(statsData);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.empresaId]);

  // Función para refrescar datos manualmente
  const refreshData = useCallback(async () => {
    await loadDashboardData(true);
  }, [loadDashboardData]);

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh || !session?.user?.empresaId) return;

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, session?.user?.empresaId, loadDashboardData]);

  // Real-time updates (opcional, con WebSocket o polling)
  useEffect(() => {
    if (!enableRealTime || !session?.user?.empresaId) return;

    // Aquí podrías implementar WebSocket para actualizaciones en tiempo real
    // Por ahora usamos polling cada 30 segundos
    const pollInterval = setInterval(() => {
      loadDashboardData(true);
    }, 30 * 1000);

    return () => clearInterval(pollInterval);
  }, [enableRealTime, session?.user?.empresaId, loadDashboardData]);

  return {
    stats,
    isLoading,
    isRefreshing,
    error,
    lastUpdate,
    refreshData,
    formatCurrency,
    hasData: stats !== null && (stats.ventasHoy > 0 || stats.totalProductos > 0),
  };
}

// Hook adicional para estadísticas específicas
export function useEstadisticasVentas(periodo: 'dia' | 'semana' | 'mes' = 'dia') {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const cargarEstadisticas = useCallback(async () => {
    if (!session?.user?.empresaId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/ventas/analytics?tipo=general&periodo=${periodo}`);
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.empresaId, periodo]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  return {
    data,
    loading,
    refresh: cargarEstadisticas,
  };
}