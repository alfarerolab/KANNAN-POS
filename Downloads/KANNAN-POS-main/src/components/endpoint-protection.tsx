import React from "react";
import { validarAccesoCliente } from "@/lib/endpoint-validator";

/**
 * Hook para validar funcionalidades en el cliente
 */
export function useValidacionFuncionalidad() {
  const validarAcceso = async (endpoint: string): Promise<boolean> => {
    return await validarAccesoCliente(endpoint);
  };

  return { validarAcceso };
}

/**
 * Componente HOC para proteger rutas según funcionalidades
 */
export function conValidacionFuncionalidad<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  funcionalidadRequerida: string
) {
  const ComponenteProtegido = (props: T) => {
    const [tieneAcceso, setTieneAcceso] = React.useState<boolean | null>(null);
    const { validarAcceso } = useValidacionFuncionalidad();

    React.useEffect(() => {
      validarAcceso(`/api/${funcionalidadRequerida}`)
        .then(setTieneAcceso);
    }, [validarAcceso, funcionalidadRequerida]);

    if (tieneAcceso === null) {
      return <div>Validando permisos...</div>;
    }

    if (!tieneAcceso) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <h3 className="text-lg font-semibold">Funcionalidad no disponible</h3>
            <p>No tienes acceso a esta funcionalidad en tu tipo de negocio.</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return ComponenteProtegido;
}

/**
 * Componente para proteger secciones condicionalmente
 */
export function SeccionProtegida({
  funcionalidadRequerida,
  children,
  fallback
}: {
  funcionalidadRequerida: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [tieneAcceso, setTieneAcceso] = React.useState<boolean | null>(null);
  const { validarAcceso } = useValidacionFuncionalidad();

  React.useEffect(() => {
    validarAcceso(`/api/${funcionalidadRequerida}`)
      .then(setTieneAcceso);
  }, [validarAcceso, funcionalidadRequerida]);

  if (tieneAcceso === null) {
    return <div>Validando permisos...</div>;
  }

  if (!tieneAcceso) {
    return fallback || null;
  }

  return <>{children}</>;
}