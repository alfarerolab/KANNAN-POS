"use client";

import { useState, useEffect } from 'react';
import { servicioServicios } from '@/lib/api-service';
import { useToast } from "@/hooks/use-toast";

interface UseServiceLoaderProps {
  empresaId?: string;
  mostrarServicios?: boolean;
  searchTerm?: string;
  categoriaSeleccionada?: string | null;
}

export function useServiceLoader({
  empresaId,
  mostrarServicios,
  searchTerm = "",
  categoriaSeleccionada = null
}: UseServiceLoaderProps) {
  const [serviciosRaw, setServiciosRaw] = useState<any[]>([]); // Datos originales de la API
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar datos desde la API (sin filtros de búsqueda)
  useEffect(() => {
    // Si no debe mostrar servicios o no hay empresaId, limpiar y salir
    if (!mostrarServicios || !empresaId) {
      setServiciosRaw([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cargarServicios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Cargar TODOS los servicios sin filtros de búsqueda para hacer filtrado local
        const response = await servicioServicios.obtenerServicios({
          activos: true,
          limite: 100
        });
        
        // Manejar diferentes formatos de respuesta
        let serviciosData = [];
        if (response && response.datos) {
          serviciosData = response.datos;
        } else if (Array.isArray(response)) {
          serviciosData = response;
        } else {
          serviciosData = [];
        }
        
        // Filtrado básico por empresa
        const serviciosFiltrados = serviciosData.filter((servicio: any) => {
          // 1. Si el servicio NO tiene empresaId, es un servicio global - incluirlo
          if (!servicio.empresaId || servicio.empresaId === null) {
            return true;
          }
          
          // 2. Si tiene empresaId, debe coincidir con la empresa actual
          const coincide = servicio.empresaId === empresaId;
          return coincide;
        });
        
        setServiciosRaw(serviciosFiltrados);
        
      } catch (error: any) {
        console.error('Error cargando servicios:', error);
        
        let errorMessage = "No se pudieron cargar los servicios";
        
        if (error instanceof Error) {
          if (error.message.includes('conexión') || error.message.includes('Failed to fetch')) {
            errorMessage = "Error de conexión. Verifica tu conexión a internet.";
          } else if (error.message.includes('No autorizado')) {
            errorMessage = "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.";
          } else if (error.message.includes('403')) {
            errorMessage = "No tienes permisos para acceder a esta información.";
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
        setServiciosRaw([]);
        
        toast({
          title: "Error al cargar servicios",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    cargarServicios();
  }, [empresaId, mostrarServicios, toast]); // No incluir searchTerm ni categoriaSeleccionada aquí

  // Función de filtrado avanzado local (similar al de productos)
  const getFilteredServicios = () => {
    if (!Array.isArray(serviciosRaw)) return [];

    return serviciosRaw.filter((servicio) => {
      // Filtro de búsqueda avanzada - múltiples campos (igual que productos)
      const searchMatch = !searchTerm || 
        servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (servicio.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (servicio.categoria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de categoría
      const categoriaMatch = !categoriaSeleccionada || 
        categoriaSeleccionada === null ||
        servicio.categoriaId === categoriaSeleccionada ||
        servicio.categoria?.id === categoriaSeleccionada;

      // Filtros específicos del POS
      const activoMatch = servicio.activo !== false; // Servicios activos
      const disponibleMatch = servicio.disponible !== false; // Si tienes campo disponible

      return searchMatch && categoriaMatch && activoMatch && disponibleMatch;
    });
  };

  // Aplicar filtros cada vez que cambien los términos de búsqueda
  const servicios = getFilteredServicios();

  return { 
    servicios, 
    isLoading, 
    error,
    // Función para recargar manualmente
    recargar: () => {
      if (mostrarServicios && empresaId) {
        setServiciosRaw([]);
        setIsLoading(true);
      }
    }
  };
}