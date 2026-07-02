"use client";

import { useMemo } from 'react';
import { useConfiguracionEmpresa } from './use-configuracion-empresa';
import { obtenerConfiguracionNegocio } from '@/lib/configuracion-negocio';
import type { TipoNegocio } from "../lib/prisma-types";
export interface ValidacionConfiguracion {
  esOptima: boolean;
  problemas: string[];
  recomendaciones: string[];
  puntuacion: number; // 0-100
}

export function useValidacionConfiguracion() {
  const { configuracion, configNegocio } = useConfiguracionEmpresa();

  const validacion = useMemo((): ValidacionConfiguracion => {
    if (!configuracion || !configNegocio) {
      return {
        esOptima: false,
        problemas: ['Configuración no disponible'],
        recomendaciones: ['Configurar el tipo de negocio'],
        puntuacion: 0
      };
    }

    const problemas: string[] = [];
    const recomendaciones: string[] = [];
    let puntos = 0;
    const maxPuntos = 10;

    // Validar funcionalidades principales
    if (configuracion.habilitarServicios === configNegocio.funcionalidades.servicios) {
      puntos += 2;
    } else if (configNegocio.funcionalidades.servicios && !configuracion.habilitarServicios) {
      problemas.push('Los servicios están deshabilitados pero son recomendados para este tipo de negocio');
      recomendaciones.push('Habilitar la gestión de servicios');
    }

    if (configuracion.habilitarCitas === configNegocio.funcionalidades.citas) {
      puntos += 2;
    } else if (configNegocio.funcionalidades.citas && !configuracion.habilitarCitas) {
      problemas.push('Las citas están deshabilitadas pero son recomendadas para este tipo de negocio');
      recomendaciones.push('Habilitar el sistema de citas');
    }

    if (configuracion.habilitarVariantes === configNegocio.funcionalidades.variantes) {
      puntos += 1;
    } else if (configNegocio.funcionalidades.variantes && !configuracion.habilitarVariantes) {
      problemas.push('Las variantes de producto están deshabilitadas');
      recomendaciones.push('Habilitar variantes para gestionar tallas, colores, etc.');
    }

    if (configuracion.habilitarVencimientos === configNegocio.funcionalidades.vencimientos) {
      puntos += 2;
    } else if (configNegocio.funcionalidades.vencimientos && !configuracion.habilitarVencimientos) {
      problemas.push('El control de vencimientos está deshabilitado');
      recomendaciones.push('Habilitar el control de fechas de vencimiento');
    }

    if (configuracion.habilitarLotes === configNegocio.funcionalidades.lotes) {
      puntos += 1;
    }

    if (configuracion.habilitarRecetas === configNegocio.funcionalidades.recetas) {
      puntos += 1;
    }

    // Validación específica por tipo de negocio
    if (configuracion.tipoNegocio === 'TIENDA_BARRIO') {
      puntos += 1; // Bonus por ser el nuevo tipo bien configurado

      if (!configuracion.habilitarVencimientos) {
        problemas.push('Las tiendas de barrio necesitan control de vencimientos');
        recomendaciones.push('Activar el control de vencimientos para productos perecederos');
      }

      if (configuracion.habilitarServicios || configuracion.habilitarCitas) {
        problemas.push('Las tiendas de barrio no necesitan servicios ni citas');
        recomendaciones.push('Deshabilitar servicios y citas para simplificar la interfaz');
      }
    }

    const esOptima = problemas.length === 0 && puntos >= maxPuntos * 0.8;
    const puntuacion = Math.round((puntos / maxPuntos) * 100);

    return {
      esOptima,
      problemas,
      recomendaciones,
      puntuacion
    };
  }, [configuracion, configNegocio]);

  const aplicarConfiguracionOptima = async () => {
    if (!configuracion || !configNegocio) return false;

    try {
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipoNegocio: configuracion.tipoNegocio,
          habilitarServicios: configNegocio.funcionalidades.servicios,
          habilitarCitas: configNegocio.funcionalidades.citas,
          habilitarVariantes: configNegocio.funcionalidades.variantes,
          habilitarRecetas: configNegocio.funcionalidades.recetas,
          habilitarLotes: configNegocio.funcionalidades.lotes,
          habilitarVencimientos: configNegocio.funcionalidades.vencimientos,
          configuracionPos: {
            ...configuracion.configuracionPos,
            mostrarStock: configNegocio.camposPOS.mostrarStock,
            permitirVentaSinStock: configNegocio.camposPOS.permitirVentaSinStock
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error al aplicar configuración óptima:', error);
      return false;
    }
  };

  return {
    validacion,
    aplicarConfiguracionOptima,
    tipoNegocio: configuracion?.tipoNegocio,
    nombreTipo: configNegocio?.nombre
  };
}
