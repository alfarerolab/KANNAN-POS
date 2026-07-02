import { Rol } from "../lib/prisma-types";
// Tipos para el sistema de autorización
export interface IPermisoRol {
  [key: string]: boolean;
}

export interface IMapaPermisosRol {
  [key: string]: IPermisoRol;
}

export interface INivelPermiso {
  [key: string]: number;
}

export interface IRutasRol {
  [key: string]: string[];
}

// Funciones de autorización
export interface IAutorización {
  rolUsuario?: Rol;
  empresaId?: string;
  usuarioId?: string;
  tienePermiso: (permiso: string) => boolean;
  tieneNivelRol: (rolMinimo: Rol) => boolean;
  esSuperAdmin: () => boolean;
  esAdministrador: () => boolean;
  esGerente: () => boolean;
  esEmpleado: () => boolean;
  perteneceAEmpresaUsuario: (entidadEmpresaId: string) => boolean;
  esPropietarioEntidad: (entidadUsuarioId: string) => boolean;
  estaCargando: boolean;
  estaAutenticado: boolean;
}

// Propiedades para los componentes de protección
export interface IProtectorAutorizacionProps {
  children: React.ReactNode;
  permiso?: string;
  rolMinimo?: Rol;
  alternativa?: React.ReactNode;
  redirigirA?: string;
  mostrarToast?: boolean;
}

export interface IContenidoPorRolProps {
  children: React.ReactNode;
  rolesPermitidos: Rol[];
  alternativa?: React.ReactNode;
}

