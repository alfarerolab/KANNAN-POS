"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { empresa_tipoNegocio as TipoNegocio } from '@prisma/client';
import { obtenerConfiguracionNegocio, type ConfiguracionNegocio } from '@/lib/configuracion-negocio';

export interface ConfiguracionEmpresa {
  id: string;
  empresaId: string;
  tipoNegocio: TipoNegocio;

  // Funcionalidades habilitadas
  habilitarServicios: boolean;
  habilitarCitas: boolean;
  habilitarVariantes: boolean;
  habilitarRecetas: boolean;
  habilitarLotes: boolean;
  habilitarVencimientos: boolean;
  habilitarMascotas?: boolean;

  // Configuraciones específicas
  configuracionPos?: {
    mostrarStock: boolean;
    permitirVentaSinStock: boolean;
    impresionAutomatica: boolean;
    formatoTicket: string;
    mostrarLogos: boolean;
    sonidoVenta: boolean;
  };

  configuracionFactura?: {
    numeracionAutomatica: boolean;
    prefijo: string;
    siguienteNumero: number;
    incluirImpuestos: boolean;
    porcentajeImpuesto: number;
  };

  configuracionInventario?: {
    alertaStockMinimo: boolean;
    actualizacionAutomatica: boolean;
    permitirStockNegativo: boolean;
    metodoValoracion: 'FIFO' | 'LIFO' | 'PROMEDIO';
  };

  empresa: {
    id: string;
    nombre: string;
    email: string;
    tipoNegocio: TipoNegocio;
    bodegaHabilitada: boolean;
  };
}

export function useConfiguracionEmpresa() {
  const { data: session } = useSession();
  const [configuracion, setConfiguracion] = useState<ConfiguracionEmpresa | null>(null);
  const [configNegocio, setConfigNegocio] = useState<ConfiguracionNegocio | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuracionCargada, setConfiguracionCargada] = useState(false);

  useEffect(() => {
    // 🔴 CAMBIO CRÍTICO: Verificar que existe sesión y empresa
    if (!session?.user?.empresaId) {
      setEstaCargando(false);
      setConfiguracionCargada(true);
      return;
    }

    const obtenerConfiguracion = async () => {
      try {
        setError(null); // Limpiar errores previos
        
        const response = await fetch('/api/configuracion');
        
        if (response.status === 404) {
          console.log('📋 No existe configuración inicial — obteniendo datos de empresa');
          try {
            const empresaRes = await fetch('/api/empresa');
            if (empresaRes.ok) {
              const empresaData = await empresaRes.json();
              const tipoNegocio = empresaData.tipoNegocio || 'OTRO';
              const configMinima: ConfiguracionEmpresa = {
                id: 'from-empresa',
                empresaId: session.user.empresaId,
                tipoNegocio: tipoNegocio as TipoNegocio,
                habilitarServicios: ['PELUQUERIA', 'SALON_BELLEZA', 'VETERINARIA'].includes(tipoNegocio),
                habilitarCitas: ['PELUQUERIA', 'SALON_BELLEZA', 'VETERINARIA'].includes(tipoNegocio),
                habilitarVariantes: false,
                habilitarRecetas: ['RESTAURANTE', 'BAR', 'CAFETERIA'].includes(tipoNegocio),
                habilitarLotes: false,
                habilitarVencimientos: false,
                habilitarMascotas: tipoNegocio === 'VETERINARIA',
                empresa: {
                  id: empresaData.id || session.user.empresaId,
                  nombre: empresaData.nombre || 'Mi Empresa',
                  email: empresaData.email || '',
                  tipoNegocio: tipoNegocio as TipoNegocio,
                  bodegaHabilitada: empresaData.bodegaHabilitada || false,
                }
              };
              setConfiguracion(configMinima);
              const configTipo = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);
              setConfigNegocio(configTipo);
            } else {
              setConfiguracion(null);
            }
          } catch {
            setConfiguracion(null);
          }
          setConfiguracionCargada(true);
          return;
        }

        // 🔴 CAMBIO CRÍTICO: Si es 403 (sin permisos), es porque es empleado/gerente
        // En ese caso, intentar obtener la configuración de la empresa desde la sesión
        if (response.status === 403) {
          console.log('⚠️ Usuario sin permisos directos - Usando configuración heredada de empresa');
          
          // Para empleados y gerentes, usar configuración básica de la empresa
          // que viene en la sesión o usar valores por defecto
          const tipoNegocio = session.user.tipoNegocio || 'OTRO';
          
          // Configuración mínima para empleados/gerentes
          const configMinima: ConfiguracionEmpresa = {
            id: 'inherited',
            empresaId: session.user.empresaId,
            tipoNegocio: tipoNegocio as TipoNegocio,
            habilitarServicios: true,
            habilitarCitas: true,
            habilitarVariantes: true,
            habilitarRecetas: false,
            habilitarLotes: false,
            habilitarVencimientos: false,
            habilitarMascotas: false,
            empresa: {
              id: session.user.empresaId,
              nombre: session.user.nombre || 'Mi Empresa',
              email: session.user.email || '',
              tipoNegocio: tipoNegocio as TipoNegocio,
              bodegaHabilitada: false,
            }
          };

          setConfiguracion(configMinima);
          setConfiguracionCargada(true);

          // Obtener configuración del tipo de negocio
          const configTipo = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);
          setConfigNegocio(configTipo);
          
          return;
        }
        
        if (!response.ok) {
          // Solo tratar como error si no es 404 o 403
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setConfiguracion(data);
        setConfiguracionCargada(true);

        // Obtener configuración del tipo de negocio
        if (data?.tipoNegocio || data?.empresa?.tipoNegocio) {
          const tipoNegocio = data.tipoNegocio || data.empresa.tipoNegocio;
          const configTipo = obtenerConfiguracionNegocio(tipoNegocio);
          setConfigNegocio(configTipo);
        }
      } catch (err) {
        console.error('❌ Error al cargar configuración:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        
        // 🔴 CAMBIO CRÍTICO: Incluso con error, marcar como cargado
        // y usar configuración por defecto para que el sistema funcione
        setConfiguracionCargada(true);
        
        // Configuración de emergencia
        if (session?.user?.empresaId) {
          const tipoNegocio = session.user.tipoNegocio || 'OTRO';
          const configMinima: ConfiguracionEmpresa = {
            id: 'emergency',
            empresaId: session.user.empresaId,
            tipoNegocio: tipoNegocio as TipoNegocio,
            habilitarServicios: true,
            habilitarCitas: true,
            habilitarVariantes: true,
            habilitarRecetas: false,
            habilitarLotes: false,
            habilitarVencimientos: false,
            habilitarMascotas: false,
            empresa: {
              id: session.user.empresaId,
              nombre: session.user.nombre || 'Mi Empresa',
              email: session.user.email || '',
              tipoNegocio: tipoNegocio as TipoNegocio,
              bodegaHabilitada: false,
            }
          };
          
          setConfiguracion(configMinima);
          const configTipo = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);
          setConfigNegocio(configTipo);
        }
      } finally {
        setEstaCargando(false);
      }
    };

    obtenerConfiguracion();
  }, [session?.user?.empresaId, session?.user?.tipoNegocio, session?.user?.nombre, session?.user?.email]);

  // Funciones de utilidad memoizadas para evitar re-renders en componentes consumidores
  const utils = useMemo(() => {
    const tieneServicios = () => {
      if (!configNegocio) return configuracion?.habilitarServicios || false;
      return configNegocio.funcionalidades.servicios && (configuracion?.habilitarServicios ?? true);
    };

    const tieneCitas = () => {
      if (!configNegocio) return configuracion?.habilitarCitas || false;
      return configNegocio.funcionalidades.citas && (configuracion?.habilitarCitas ?? true);
    };

    const tieneVariantes = () => {
      if (!configNegocio) return configuracion?.habilitarVariantes || false;
      return configNegocio.funcionalidades.variantes && (configuracion?.habilitarVariantes ?? true);
    };

    const tieneRecetas = () => {
      if (!configNegocio) return configuracion?.habilitarRecetas || false;
      return configNegocio.funcionalidades.recetas && (configuracion?.habilitarRecetas ?? true);
    };

    const tieneLotes = () => {
      if (!configNegocio) return configuracion?.habilitarLotes || false;
      return configNegocio.funcionalidades.lotes && (configuracion?.habilitarLotes ?? true);
    };

    const tieneVencimientos = () => {
      if (!configNegocio) return configuracion?.habilitarVencimientos || false;
      return configNegocio.funcionalidades.vencimientos && (configuracion?.habilitarVencimientos ?? true);
    };

    const tieneMascotas = () => {
      if (!configNegocio) return configuracion?.habilitarMascotas || configuracion?.tipoNegocio === 'VETERINARIA';
      return configNegocio.funcionalidades.mascotas && (configuracion?.habilitarMascotas ?? true);
    };

    const tieneVentasPorMayor = () => {
      if (!configNegocio) return false;
      return configNegocio.funcionalidades.ventasPorMayor;
    };

    const tieneSistemaCredito = () => {
      if (!configNegocio) return false;
      return configNegocio.funcionalidades.sistemaCredito;
    };

    const tieneClientesFrecuentes = () => {
      if (!configNegocio) return false;
      return configNegocio.funcionalidades.clientesFrecuentes;
    };

    const tieneVentaPorPeso = () => {
      if (!configNegocio) return false;
      return configNegocio.camposPOS.ventaPorPeso;
    };

    const tienePreciosPorMayor = () => {
      if (!configNegocio) return false;
      return configNegocio.camposPOS.preciosPorMayor;
    };

    const tieneSistemaFiar = () => {
      if (!configNegocio) return false;
      return configNegocio.camposPOS.sistemaFiar;
    };

    const tieneCalculadoraPeso = () => {
      if (!configNegocio) return false;
      return configNegocio.camposPOS.calculadoraPeso;
    };

    const tieneDescuentosVolumen = () => {
      if (!configNegocio) return false;
      return configNegocio.camposPOS.descuentosVolumen;
    };

    const esTiendaBarrio = () => {
      return configuracion?.tipoNegocio === 'TIENDA_BARRIO' || configuracion?.empresa?.tipoNegocio === 'TIENDA_BARRIO';
    };

    const esVeterinaria = () => {
      return configuracion?.tipoNegocio === 'VETERINARIA' || configuracion?.empresa?.tipoNegocio === 'VETERINARIA';
    };

    const obtenerTema = () => {
      if (!configNegocio) {
        return {
          color: 'slate',
          accent: 'bg-slate-500',
          gradiente: 'from-slate-50 to-gray-100',
          icon: '🪟'
        };
      }
      return {
        color: configNegocio.color,
        accent: `bg-${configNegocio.color}-500`,
        gradiente: configNegocio.gradiente,
        icon: configNegocio.icono
      };
    };

    const necesitaConfiguracionInicial = () => {
      if (session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'EMPLEADO' || session?.user?.role === 'GERENTE') {
        return false;
      }
      if (!configuracionCargada || estaCargando) return false;
      if (error && error.includes('Error de conexión')) return false;

      if (session?.user?.role === 'ADMINISTRADOR') {
        if (session?.user?.configuracionCompletada === false && !configuracion) return true;
        if (!configuracion && session?.user?.configuracionCompletada === true) return false;
      }
      return false;
    };

    const puedeModificarConfiguracion = () => {
      if (session?.user?.role === 'SUPERADMIN') return false;
      return session?.user?.role === 'ADMINISTRADOR';
    };

    const mostrarConfiguracion = () => {
      return puedeModificarConfiguracion() && configuracionCargada;
    };

    const obtenerElementosNavegacion = () => {
      const elementos = [
        { href: '/dashboard', titulo: 'Dashboard', mostrar: true },
        { href: '/dashboard/pos', titulo: 'Punto de Venta', mostrar: true },
        { href: '/dashboard/productos', titulo: 'Productos', mostrar: true },
        { href: '/dashboard/categorias', titulo: 'Categorías', mostrar: true },
        { href: '/dashboard/clientes', titulo: 'Clientes', mostrar: true },
        { href: '/dashboard/mascotas', titulo: 'Mascotas', mostrar: tieneMascotas() },
        { href: '/dashboard/ventas', titulo: 'Ventas', mostrar: true },
        { href: '/dashboard/inventario', titulo: 'Inventario', mostrar: true },
        { href: '/dashboard/servicios', titulo: 'Servicios', mostrar: tieneServicios() },
        { href: '/dashboard/citas', titulo: 'Citas', mostrar: tieneCitas() },
        { href: '/dashboard/proveedores', titulo: 'Proveedores', mostrar: true },
        { href: '/dashboard/reportes', titulo: 'Reportes', mostrar: true },
        { href: '/dashboard/usuarios', titulo: 'Usuarios', mostrar: true },
        { href: '/dashboard/terminales', titulo: 'Terminales', mostrar: true },
        { href: '/dashboard/creditos', titulo: 'Créditos (Fiar)', mostrar: tieneSistemaCredito() },
        { href: '/dashboard/ventas-mayoristas', titulo: 'Ventas al Por Mayor', mostrar: tieneVentasPorMayor() },
      ];
      return elementos.filter(elemento => elemento.mostrar);
    };

    const obtenerConfiguracionPOS = () => {
      const tema = obtenerTema();
      return {
        mostrarVariantes: tieneVariantes(),
        mostrarServicios: tieneServicios(),
        mostrarStock: configNegocio?.camposPOS.mostrarStock ?? configuracion?.configuracionPos?.mostrarStock ?? true,
        permitirVentaSinStock: configNegocio?.camposPOS.permitirVentaSinStock ?? configuracion?.configuracionPos?.permitirVentaSinStock ?? false,
        ventaPorPeso: tieneVentaPorPeso(),
        ventaPorMedida: configNegocio?.camposPOS.ventaPorMedida ?? false,
        requiereCliente: configNegocio?.camposPOS.requiereCliente ?? false,
        permitirDescuentos: configNegocio?.camposPOS.permitirDescuentos ?? true,
        mostrarRecetas: tieneRecetas(),
        mostrarLotes: tieneLotes(),
        mostrarVencimientos: tieneVencimientos(),
        mostrarMascotas: tieneMascotas(),
        esVeterinaria: esVeterinaria(),
        esTiendaBarrio: esTiendaBarrio(),
        preciosPorMayor: tienePreciosPorMayor(),
        preciosAlDetal: configNegocio?.camposPOS.preciosAlDetal ?? false,
        calculadoraPeso: tieneCalculadoraPeso(),
        sistemaFiar: tieneSistemaFiar(),
        descuentosVolumen: tieneDescuentosVolumen(),
        ventasPorMayor: tieneVentasPorMayor(),
        sistemaCredito: tieneSistemaCredito(),
        clientesFrecuentes: tieneClientesFrecuentes(),
        tema
      };
    };

    return {
      tieneServicios, tieneCitas, tieneVariantes, tieneRecetas, tieneLotes, tieneVencimientos, tieneMascotas,
      tieneVentasPorMayor, tieneSistemaCredito, tieneClientesFrecuentes, tieneVentaPorPeso, tienePreciosPorMayor,
      tieneSistemaFiar, tieneCalculadoraPeso, tieneDescuentosVolumen, esTiendaBarrio, esVeterinaria, obtenerTema,
      necesitaConfiguracionInicial, puedeModificarConfiguracion, mostrarConfiguracion, obtenerElementosNavegacion,
      obtenerConfiguracionPOS
    };
  }, [configuracion, configNegocio, session, configuracionCargada, estaCargando, error]);

  // Función para recargar configuración (mantenemos con useCallback)
  const recargarConfiguracion = useCallback(async () => {
    if (!session?.user?.empresaId) return;

    setEstaCargando(true);
    setError(null);
    
    try {
      const response = await fetch('/api/configuracion');
      
      if (response.status === 404) {
        setConfiguracion(null);
        return;
      }

      if (response.status === 403) {
        const tipoNegocio = session.user.tipoNegocio || 'OTRO';
        const configMinima: ConfiguracionEmpresa = {
          id: 'inherited',
          empresaId: session.user.empresaId,
          tipoNegocio: tipoNegocio as TipoNegocio,
          habilitarServicios: true,
          habilitarCitas: true,
          habilitarVariantes: true,
          habilitarRecetas: false,
          habilitarLotes: false,
          habilitarVencimientos: false,
          habilitarMascotas: false,
          empresa: {
            id: session.user.empresaId,
            nombre: session.user.nombre || 'Mi Empresa',
            email: session.user.email || '',
            tipoNegocio: tipoNegocio as TipoNegocio,
            bodegaHabilitada: false,
          }
        };

        setConfiguracion(configMinima);
        const configTipo = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);
        setConfigNegocio(configTipo);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setConfiguracion(data);

      if (data?.tipoNegocio || data?.empresa?.tipoNegocio) {
        const tipoNegocio = data.tipoNegocio || data.empresa.tipoNegocio;
        const configTipo = obtenerConfiguracionNegocio(tipoNegocio);
        setConfigNegocio(configTipo);
      }
    } catch (err) {
      console.error('❌ Error al recargar configuración:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEstaCargando(false);
    }
  }, [session?.user?.empresaId, session?.user?.tipoNegocio, session?.user?.nombre, session?.user?.email]);

  return {
    configuracion,
    configNegocio,
    estaCargando,
    error,
    configuracionCargada,
    ...utils,
    recargarConfiguracion,
  };
}