import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Rol } from "@/lib/prisma-types";
import { useAutorizacion } from "@/hooks/use-autorizacion";
import { useToast } from "@/hooks/use-toast";

interface ProtectorAutorizacionProps {
  children: ReactNode;
  permiso?: string;
  rolMinimo?: Rol;
  alternativa?: ReactNode;
  redirigirA?: string;
  mostrarToast?: boolean;
}

/**
 * Componente para proteger rutas o componentes según permisos específicos
 */
export function ProtectorAutorizacion({
  children,
  permiso,
  rolMinimo,
  alternativa = null,
  redirigirA,
  mostrarToast = true,
}: ProtectorAutorizacionProps) {
  const { tienePermiso, tieneNivelRol, estaCargando } = useAutorizacion();
  const router = useRouter();
  const { toast } = useToast();

  // No mostrar nada mientras se está cargando la sesión
  if (estaCargando) {
    return null;
  }

  let autorizado = true;

  // Verificar permisos si se especifica
  if (permiso) {
    autorizado = tienePermiso(permiso);
  }

  // Verificar nivel de rol si se especifica
  if (rolMinimo && autorizado) {
    autorizado = tieneNivelRol(rolMinimo);
  }

  // Si no está autorizado
  if (!autorizado) {
    // Redirigir si se especifica una ruta
    if (redirigirA) {
      // Mostrar mensaje de error si está activado
      if (mostrarToast) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder a esta sección",
          variant: "destructive",
        });
      }

      // Usar setTimeout para evitar errores de "cannot update a component while rendering"
      setTimeout(() => {
        router.push(redirigirA);
      }, 100);

      return null;
    }

    // Mostrar alternativa si no hay redirección
    return <>{alternativa}</>;
  }

  // Si está autorizado, mostrar el contenido protegido
  return <>{children}</>;
}

/**
 * Componente para mostrar contenido solo a roles específicos
 */
export function ContenidoPorRol({
  children,
  rolesPermitidos,
  alternativa = null,
}: {
  children: ReactNode;
  rolesPermitidos: Rol[];
  alternativa?: ReactNode;
}) {
  const { rolUsuario, estaCargando } = useAutorizacion();

  if (estaCargando || !rolUsuario) {
    return null;
  }

  if (rolesPermitidos.includes(rolUsuario)) {
    return <>{children}</>;
  }

  return <>{alternativa}</>;
}