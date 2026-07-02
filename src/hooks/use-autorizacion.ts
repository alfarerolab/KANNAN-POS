import { useSession } from "next-auth/react";
import { useMemo, useCallback } from "react";
import type { Rol } from "../lib/prisma-types";
// Define los permisos por rol
// @ts-expect-error Mismatch de tipos Prisma u obj temporal
const PERMISOS_POR_ROL: Record<Rol, string[]> = {
  SUPERADMIN: [
    "verDashboard",
    "gestionarUsuarios",
    "gestionarEmpresas",
    "configurarSistema",
    "verReportes",
    "gestionarProductos",
    "gestionarInventario",
    "crearVenta",
    "verVentas",
    "gestionarClientes",
    "gestionarProveedores",
    "gestionarFinanzas",
    "accederPOS",
    "gestionarServicios",
    "gestionarMascotas",
    // Permisos de terminales
    "leerTerminal",
    "crearTerminal",
    "editarTerminal",
    "eliminarTerminal",
  ],
  ADMINISTRADOR: [
    "verDashboard",
    "gestionarUsuarios",
    "verReportes",
    "gestionarProductos",
    "gestionarInventario",
    "crearVenta",
    "verVentas",
    "gestionarClientes",
    "gestionarProveedores",
    "gestionarFinanzas",
    "accederPOS",
    "gestionarServicios",
    "gestionarMascotas",
    // Permisos de terminales
    "leerTerminal",
    "crearTerminal",
    "editarTerminal",
    "eliminarTerminal",
  ],
  GERENTE: [
    "verDashboard",
    "verReportes",
    "gestionarProductos",
    "gestionarInventario",
    "crearVenta",
    "verVentas",
    "gestionarClientes",
    "accederPOS",
    "gestionarServicios",
    "gestionarMascotas",
    // Permisos de terminales (limitado para gerentes)
    "leerTerminal",
    "crearTerminal",
    "editarTerminal",
  ],
  EMPLEADO: [
    "verDashboard",
    "crearVenta",
    "verVentas",
    "gestionarClientes",
    "accederPOS",
    // Permisos básicos de terminales para empleados
    "leerTerminal",
  ],
};

// JerarquÃ­a de roles (del mÃ¡s alto al mÃ¡s bajo)
// @ts-expect-error Mismatch de tipos Prisma u obj temporal
const JERARQUIA_ROLES: Record<Rol, number> = {
  SUPERADMIN: 4,
  ADMINISTRADOR: 3,
  GERENTE: 2,
  EMPLEADO: 1,
};

export function useAutorizacion() {
  const { data: session, status } = useSession();

  const datosUsuario = useMemo(() => {
    if (status === "loading") {
      return {
        rolUsuario: null,
        permisosUsuario: [],
        estaCargando: true,
        esSuperAdmin: false,
        esAdminOGerente: false,
        esEmpleado: false,
      };
    }

    if (!session?.user?.role) {
      return {
        rolUsuario: null,
        permisosUsuario: [],
        estaCargando: false,
        esSuperAdmin: false,
        esAdminOGerente: false,
        esEmpleado: false,
      };
    }

    const rol = session.user.role as Rol;
    const permisosUsuario = PERMISOS_POR_ROL[rol] || [];

    return {
      rolUsuario: rol,
      permisosUsuario,
      estaCargando: false,
      esSuperAdmin: rol === "SUPERADMIN",
      esAdminOGerente: rol === "ADMINISTRADOR" || rol === "GERENTE",
      esEmpleado: rol === "EMPLEADO",
    };
  }, [session, status]);

  // FunciÃ³n para verificar si el usuario tiene un permiso especÃ­fico
  const tienePermiso = useCallback((permiso: string): boolean => {
    if (datosUsuario.estaCargando || !datosUsuario.rolUsuario) {
      return false;
    }
    
    return datosUsuario.permisosUsuario.includes(permiso);
  }, [datosUsuario.permisosUsuario, datosUsuario.estaCargando, datosUsuario.rolUsuario]);

  // FunciÃ³n para verificar si el usuario tiene al menos el nivel de rol especificado
  const tieneNivelRol = useCallback((rolMinimo: Rol): boolean => {
    if (datosUsuario.estaCargando || !datosUsuario.rolUsuario) {
      return false;
    }

    const nivelUsuario = JERARQUIA_ROLES[datosUsuario.rolUsuario];
    const nivelMinimo = JERARQUIA_ROLES[rolMinimo];

    return nivelUsuario >= nivelMinimo;
  }, [datosUsuario.rolUsuario, datosUsuario.estaCargando]);

  // FunciÃ³n para verificar mÃºltiples permisos
  const tieneAlgunPermiso = useCallback((permisos: string[]): boolean => {
    return permisos.some(permiso => tienePermiso(permiso));
  }, [tienePermiso]);

  // FunciÃ³n para verificar que tenga todos los permisos
  const tieneTodosPermisos = useCallback((permisos: string[]): boolean => {
    return permisos.every(permiso => tienePermiso(permiso));
  }, [tienePermiso]);

  return {
    // Datos del usuario
    ...datosUsuario,
    session,
    status,
    isAuthenticated: status === "authenticated",
    
    // Funciones de verificaciÃ³n
    tienePermiso,
    tieneNivelRol,
    tieneAlgunPermiso,
    tieneTodosPermisos,

    // Propiedades de conveniencia (mantener compatibilidad)
    esSuperAdmin: datosUsuario.esSuperAdmin,
    esAdminOGerente: datosUsuario.esAdminOGerente,
    esEmpleado: datosUsuario.esEmpleado,
    isLoading: datosUsuario.estaCargando,
    estaCargando: datosUsuario.estaCargando, // Alias adicional
  };
}