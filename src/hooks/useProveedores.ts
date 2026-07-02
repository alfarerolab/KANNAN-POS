// hooks/useProveedores.ts
import { useEffect, useState } from "react";

interface Proveedor {
  id: string;
  nombre: string;
  empresa?: string | null;
}

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const response = await fetch("/api/proveedores");
        if (response.ok) {
          const data = await response.json();
          setProveedores(data.datos || data || []);
        }
      } catch (error) {
        console.error("Error cargando proveedores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProveedores();
  }, []);

  return { proveedores, isLoading };
}