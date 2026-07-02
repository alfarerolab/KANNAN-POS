import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import { ValoresFormularioLogin, ValoresFormularioRegistro } from "@/types";

export const useAuth = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
  }, []);


  

  const iniciarSesion = useCallback(async (data: ValoresFormularioLogin) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        contrasena: data.contrasena,
      });

      if (result?.error) {
        const errorMessage = result.error === "CredentialsSignin"
          ? "Credenciales inválidas. Verifica tu email y contraseña."
          : "Error de autenticación. Por favor, intenta de nuevo.";

        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (result?.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));
        toast.success("Sesión iniciada correctamente");
        router.push("/dashboard");
        router.refresh();
        return { success: true };
      }

      return { success: false, error: "Error desconocido al iniciar sesión" };
    } catch (error) {
      const errorMessage = "Ocurrió un error inesperado. Por favor, intenta de nuevo.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error en iniciarSesion:", error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // VERSIÓN SIMPLIFICADA de cerrarSesion
  const cerrarSesion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Primero limpiar cookies manualmente para asegurar
      clearAuthCookies();

      // Luego intentar el signOut de NextAuth
      await signOut({
        redirect: false,
        callbackUrl: "/iniciar-sesion"
      });

      toast.success("Sesión cerrada correctamente");

      // Usar window.location para forzar recarga completa
      window.location.href = "/iniciar-sesion";

      return { success: true };
    } catch (error) {
      console.error("Error al cerrar sesión:", error);

      // En caso de error, forzar redirección directa
      window.location.href = "/iniciar-sesion";
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función auxiliar para limpiar cookies de autenticación
  const clearAuthCookies = async () => {
    // Lista de cookies de NextAuth que pueden existir
    const authCookies = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url'
    ];

    authCookies.forEach(cookieName => {
      // Limpiar para el dominio actual
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Limpiar para subdominios
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });
  };

  

  return {
    iniciarSesion,
    cerrarSesion,
    isLoading,
    error,
    clearError,
    session,
    status,
    isAuthenticated: !!session,
  };
};
