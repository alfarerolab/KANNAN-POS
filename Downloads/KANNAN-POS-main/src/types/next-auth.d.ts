import { Rol, TipoNegocio } from "../lib/prisma-types";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Rol;
      empresaId: string;
      nombre: string;
      email: string;
      configuracionCompletada: boolean;
      empresaInactiva: boolean;
      sinSuscripcion: boolean;
      usuarioInactivo: boolean;
      suscripcionPorVencer: boolean;
      diasRestantes?: number;
      tipoNegocio?: TipoNegocio; // ⭐ AGREGAR ESTA LÍNEA
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: Rol;
    empresaId: string;
    configuracionCompletada?: boolean;
    empresaInactiva?: boolean;
    sinSuscripcion?: boolean;
    usuarioInactivo?: boolean;
    suscripcionPorVencer?: boolean;
    diasRestantes?: number;
    tipoNegocio?: TipoNegocio; 
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Rol;
    empresaId: string;
    sub?: string;
    configuracionCompletada: boolean;
    empresaInactiva?: boolean;
    sinSuscripcion?: boolean;
    usuarioInactivo?: boolean;
    suscripcionPorVencer?: boolean;
    diasRestantes?: number;
    tipoNegocio?: TipoNegocio;
    lastCheck?: number; // ⭐ Agregado para polling en revalidación
  }
}