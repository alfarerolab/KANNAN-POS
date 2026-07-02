import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Categoria } from "@/types/producto";

export function useCategories() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await fetch("/api/categorias");
        if (!response.ok) {
          console.error("Error response:", response.status, response.statusText);
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.datos && Array.isArray(data.datos)) {
          setCategorias(data.datos);
        } else if (Array.isArray(data)) {
          setCategorias(data);
        } else {
          console.error("La respuesta de categorías no tiene el formato esperado:", data);
          setCategorias([]);
        }
      } catch (error) {
        console.error("Error al cargar categorías:", error);
        setCategorias([]);
        toast({
          title: "Error",
          description: "No se pudieron cargar las categorías",
          variant: "destructive",
        });
      }
    };

    fetchCategorias();
  }, [toast]);

  return { categorias };
}