"use client";

import { useState, useEffect } from "react";
import { servicioPOS, servicioProductos } from '@/lib/api-service';
import { useToast } from "@/hooks/use-toast";

interface UseProductLoaderProps {
  searchTerm: string;
  categoriaSeleccionada: string | null;
  empresaId?: string;
  configuracion?: any;
  configPOS?: any;
  filtroDisponibilidad?: string; // Nuevo parámetro
}

export function useProductLoader({
  searchTerm,
  categoriaSeleccionada,
  empresaId,
  configuracion,
  configPOS,
  filtroDisponibilidad = "todos"
}: UseProductLoaderProps) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!empresaId || !configuracion) {
      return;
    }

    const cargarProductos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        let responseProductos;
        
        try {
          responseProductos = await servicioPOS.obtenerProductos({
            busqueda: searchTerm,
            categoriaId: categoriaSeleccionada || undefined,
            soloDisponibles: filtroDisponibilidad === "disponibles",
            limite: 100,
            pagina: 1
          });
        } catch (posError) {
          // Fallback al endpoint de productos general
          try {
            responseProductos = await servicioProductos.obtenerProductos({
              busqueda: searchTerm,
              categoriaId: categoriaSeleccionada || undefined,
              activo: true,
              limite: 100,
              pagina: 1
            });

            // Normalizar respuesta del fallback
            responseProductos = {
              datos: responseProductos.datos || responseProductos.productos || [],
              paginacion: responseProductos.paginacion || {
                total: responseProductos.total || 0,
                pagina: 1,
                limite: 100,
                totalPaginas: 1
              },
              categorias: responseProductos.categorias || []
            };

          } catch (fallbackError) {
            console.error('❌ Both endpoints failed:', fallbackError);
            throw fallbackError;
          }
        }

        let productosData = responseProductos.datos || [];

        
        // Aplicar filtros adicionales en el cliente
        if (filtroDisponibilidad !== "todos") {
          productosData = productosData.filter((producto: any) => {
            const stock = Number(producto.enStock);
            // Solo usar stockMinimo si está definido y es mayor a 0
            const stockMin = producto.stockMinimo && Number(producto.stockMinimo) > 0 
              ? Number(producto.stockMinimo) 
              : null;

            switch (filtroDisponibilidad) {
              case "disponibles":
                return stock > 0;
              case "bajo":
                // Solo considerar "bajo" si tiene stockMinimo configurado
                return stockMin !== null && stock > 0 && stock < stockMin;
              case "agotados":
                return stock === 0;
              default:
                return true;
            }
          });
        }

        setProductos(productosData);
        setCategorias(responseProductos.categorias || []);
      } catch (error) {
        console.error("❌ Error loading products:", error);

        let errorMessage = "No se pudieron cargar los productos";
        
        if (error instanceof Error) {
          if (error.message.includes('fetch')) {
            errorMessage = "Error de conexión. Verifica tu conexión a internet.";
          } else if (error.message.includes('401') || error.message.includes('No autorizado')) {
            errorMessage = "Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.";
          } else if (error.message.includes('403')) {
            errorMessage = "No tienes permisos para acceder a esta información.";
          } else {
            errorMessage = error.message;
          }
        }

        setError(errorMessage);
        toast({
          title: "Error al cargar productos",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce para búsquedas
    const timeoutId = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        cargarProductos();
      }
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoriaSeleccionada, empresaId, configuracion, configPOS?.mostrarServicios, filtroDisponibilidad, toast]);

  return {
    productos,
    categorias,
    isLoading,
    error
  };
}
