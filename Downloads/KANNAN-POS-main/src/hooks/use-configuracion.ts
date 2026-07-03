import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface ConfigData {
  tipoNegocio: string;
  habilitarServicios?: boolean;
  habilitarCitas?: boolean;
  habilitarVariantes?: boolean;
  habilitarRecetas?: boolean;
  habilitarLotes?: boolean;
  habilitarVencimientos?: boolean;
  habilitarInventarioAvanzado?: boolean;
  habilitarReportes?: boolean;
  habilitarMultiUsuarios?: boolean;
  configuracionPos?: any;
  configuracionFactura?: any;
  configuracionInventario?: any;
}

export function useConfiguracion() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const guardarConfiguracion = useCallback(async (configData: ConfigData) => {
    setIsLoading(true);

    try {
      // PASO 1: Validar datos
      if (!configData.tipoNegocio) {
        throw new Error('Tipo de negocio es requerido');
      }

      // PASO 2: Guardar configuración en el servidor
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }

      const responseData = await response.json();
      // PASO 3: Actualizar estado del usuario
      if (session?.user?.id) {
        const updateResponse = await fetch('/api/usuarios/actualizar-configuracion', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuarioId: session.user.id,
            configuracionCompletada: true
          }),
        });

        if (updateResponse.ok) {
        } else {
        }
      }

      // PASO 4: Actualizar sesión localmente
      try {
        await updateSession({
          configuracionCompletada: true
        });
      } catch (sessionError) {
      }

      // PASO 5: Refrescar sesión desde servidor
      try {
        await fetch('/api/auth/update-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (refreshError) {
      }

      // PASO 6: Mostrar mensaje de éxito
      toast({
        title: "🎉 ¡Configuración completada!",
        description: "Tu sistema POS está listo para usar",
        duration: 3000,
      });

      // PASO 7: Esperar y redirigir
      await new Promise(resolve => setTimeout(resolve, 1500));

      // PASO 8: Redirigir con múltiples métodos de respaldo
      // Método principal
      router.push('/dashboard');
      
      // Métodos de respaldo
      setTimeout(() => {
        if (window.location.pathname.includes('configuracion-inicial')) {
          window.location.href = '/dashboard';
        }
      }, 2000);

      // Último recurso: recargar página
      setTimeout(() => {
        if (window.location.pathname.includes('configuracion-inicial')) {
          window.location.reload();
        }
      }, 4000);

      return { success: true, data: responseData };

    } catch (error) {
      console.error('❌ Error en useConfiguracion:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al guardar configuración';

      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [session, updateSession, router, toast]);

  const verificarEstadoConfiguracion = useCallback(async () => {
    if (!session?.user?.id) return null;

    try {
      const response = await fetch(`/api/usuarios/${session.user.id}/estado`);
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.error('Error verificando estado:', error);
      return null;
    }
  }, [session?.user?.id]);

  return {
    guardarConfiguracion,
    verificarEstadoConfiguracion,
    isLoading,
    session,
    configuracionCompletada: session?.user?.configuracionCompletada || false,
    esConfiguracionInicial: !session?.user?.configuracionCompletada
  };
}