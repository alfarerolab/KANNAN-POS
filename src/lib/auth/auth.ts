import { compare, hash } from "bcryptjs";
import type { Rol, TipoNegocio } from "../prisma-types";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "../db";
import { checkRateLimit, LOGIN_RATE_LIMIT, LOGIN_EMAIL_RATE_LIMIT } from "../rate-limit";

const isDev = process.env.NODE_ENV === "development";
const log = {
  debug: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Rol | "ADMINISTRADOR";
  empresaId: string;
  configuracionCompletada: boolean;
  tipoNegocio?: TipoNegocio;
}

interface ExtendedUser extends AuthUser {
  empresaInactiva?: boolean;
  sinSuscripcion?: boolean;
  usuarioInactivo?: boolean;
  suscripcionPorVencer?: boolean;
  diasRestantes?: number;
}

const normalizeRole = (role: Rol | string): Rol | "ADMINISTRADOR" => {
  return role === "ADMIN" ? "ADMINISTRADOR" : (role as Rol);
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/iniciar-sesion",
    error: "/iniciar-sesion",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.contrasena) {
            return null;
          }

          // ── Rate Limiting ───────────────────────────────────────────
          const clientIp =
            (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (req?.headers?.['x-real-ip'] as string) ||
            '127.0.0.1';

          const ipCheck = checkRateLimit(LOGIN_RATE_LIMIT, clientIp);
          if (!ipCheck.allowed) {
            log.warn(`Rate limit login IP: ${clientIp}`);
            throw new Error('Demasiados intentos. Espera un momento antes de volver a intentar.');
          }

          const emailCheck = checkRateLimit(LOGIN_EMAIL_RATE_LIMIT, credentials.email.toLowerCase());
          if (!emailCheck.allowed) {
            log.warn(`Rate limit login email: ${credentials.email}`);
            throw new Error('Demasiados intentos para este correo. Intenta más tarde.');
          }
          // ─────────────────────────────────────────────────────────────

          log.debug("Auth: buscando usuario", credentials.email);

          const user = await db.usuario.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              empresa: {
                include: {
                  configuracion: true,
                },
              },
            },
          });

          if (!user?.contrasena) {
            return null;
          }

          const isPasswordValid = await compare(
            credentials.contrasena,
            user.contrasena
          );

          if (!isPasswordValid) {
            return null;
          }

          // ── Bloquear usuarios/empresas inactivas en login ──────────
          if (!user.activo) {
            throw new Error('Tu cuenta ha sido desactivada. Contacta al administrador.');
          }

          if (user.esEmpleadoOperativo) {
            throw new Error('Los empleados operativos no tienen acceso al sistema web.');
          }

          if (!user.empresa?.activa) {
            throw new Error('La empresa ha sido desactivada. Contacta soporte.');
          }

          const tipoNegocio =
            user.empresa?.configuracion?.tipoNegocio ||
            user.empresa?.tipoNegocio ||
            undefined;
          const normalizedRole = normalizeRole(user.rol);

          // SUPERADMIN: entra sin ninguna validación de suscripción
          if (user.rol === "SUPERADMIN") {
            return {
              id: user.id,
              name: user.nombre,
              email: user.email,
              role: normalizedRole,
              empresaId: user.empresaId,
              configuracionCompletada: true,
              tipoNegocio,
            };
          }

          const authUser: ExtendedUser = {
            id: user.id,
            name: user.nombre,
            email: user.email,
            role: normalizedRole,
            empresaId: user.empresaId,
            configuracionCompletada: user.configuracionCompletada || false,
            tipoNegocio,
          };

          // Nota: usuarios/empresas inactivas ya son bloqueados arriba.
          // Estos flags se mantienen para retrocompatibilidad con el middleware.
          if (!user.activo) {
            authUser.usuarioInactivo = true;
          }

          if (!user.empresa?.activa) {
            authUser.empresaInactiva = true;
          }

          // Validar vencimiento usando fechaVencimiento de la empresa
          // SOLO marcar sinSuscripcion si la fecha existe Y expiró
          // Si no hay fechaVencimiento pero la empresa está activa, no bloquear
          const fechaVencimiento = user.empresa?.fechaVencimiento;
          if (fechaVencimiento) {
            const diasRestantes = Math.ceil(
              (fechaVencimiento.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );

            if (diasRestantes <= 0) {
              authUser.sinSuscripcion = true;
            } else if (diasRestantes <= 7) {
              authUser.suscripcionPorVencer = true;
              authUser.diasRestantes = diasRestantes;
            }
          } else if (!user.empresa?.activa) {
            // Solo marcar sinSuscripcion si la empresa NO está activa
            authUser.sinSuscripcion = true;
          }

          log.debug("Auth: usuario autenticado", user.email);

          return authUser;
        } catch (error) {
          log.error("Error en authorize:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // ─────────────────────────────────────────────────────────────────
      // updateSession() llamado desde el cliente (reactivación / desactivación)
      // Actualiza TODOS los campos relevantes del token desde la BD
      // ─────────────────────────────────────────────────────────────────
      if (trigger === "update" && token.id) {
        try {
          const usuarioActualizado = await db.usuario.findUnique({
            where: { id: token.id as string },
            include: {
              empresa: {
                include: {
                  configuracion: true,
                },
              },
            },
          });

          if (usuarioActualizado) {
            token.configuracionCompletada =
              usuarioActualizado.configuracionCompletada || false;
            token.tipoNegocio =
              usuarioActualizado.empresa?.configuracion?.tipoNegocio ||
              usuarioActualizado.empresa?.tipoNegocio ||
              undefined;
            token.role = normalizeRole(usuarioActualizado.rol) as Rol;

            // ✅ Actualizar estado de cuenta (crítico para activación/desactivación)
            token.usuarioInactivo = !usuarioActualizado.activo;
            token.empresaInactiva = !usuarioActualizado.empresa?.activa;

            const fechaVencimiento = usuarioActualizado.empresa?.fechaVencimiento;
            if (fechaVencimiento) {
              const diasRestantes = Math.ceil(
                (fechaVencimiento.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              );
              token.sinSuscripcion = diasRestantes <= 0;
              token.suscripcionPorVencer = diasRestantes > 0 && diasRestantes <= 7;
              token.diasRestantes =
                diasRestantes > 0 ? diasRestantes : undefined;
            } else if (!usuarioActualizado.empresa?.activa) {
              // Solo marcar sinSuscripcion si la empresa NO está activa
              token.sinSuscripcion = true;
              token.suscripcionPorVencer = false;
            } else {
              // Empresa activa sin fecha de vencimiento = sin restricción
              token.sinSuscripcion = false;
              token.suscripcionPorVencer = false;
            }

            // ✅ Renovar lastCheck para que el middleware no redirija
            // durante los 5 segundos siguientes (ventana de gracia)
            token.lastCheck = Date.now();
          }
        } catch (error) {
          log.error("Error al actualizar token desde BD:", error);
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // Revalidación periódica de estado de empresa (cada 30 segundos)
      // ─────────────────────────────────────────────────────────────────
      if (!user && token.id && token.role !== "SUPERADMIN") {
        const THIRTY_SECONDS = 30 * 1000;
        const now = Date.now();
        const lastCheck = (token.lastCheck as number) || 0;

        if (now - lastCheck > THIRTY_SECONDS) {
          try {
            const usuarioDb = await db.usuario.findUnique({
              where: { id: token.id as string },
              include: { empresa: true },
            });

            if (usuarioDb) {
              token.usuarioInactivo = !usuarioDb.activo;

              if (usuarioDb.empresa) {
                token.empresaInactiva = !usuarioDb.empresa.activa;

                const fechaVencimiento = usuarioDb.empresa.fechaVencimiento;
                if (fechaVencimiento) {
                  const diasRestantes = Math.ceil(
                    (fechaVencimiento.getTime() - now) /
                      (1000 * 60 * 60 * 24)
                  );
                  token.sinSuscripcion = diasRestantes <= 0;

                  if (diasRestantes > 0 && diasRestantes <= 7) {
                    token.suscripcionPorVencer = true;
                    token.diasRestantes = diasRestantes;
                  } else {
                    token.suscripcionPorVencer = false;
                  }
                } else if (!usuarioDb.empresa.activa) {
                  // Solo marcar sinSuscripcion si la empresa NO está activa
                  token.sinSuscripcion = true;
                } else {
                  // Empresa activa sin fecha de vencimiento = sin restricción
                  token.sinSuscripcion = false;
                  token.suscripcionPorVencer = false;
                }
              }
            }
            token.lastCheck = now;
          } catch (error) {
            log.error("Error en revalidación periódica JWT:", error);
          }
        }
      }

      // Primera asignación al hacer login
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.role = normalizeRole(extendedUser.role) as Rol;
        token.empresaId = extendedUser.empresaId;
        token.configuracionCompletada = extendedUser.configuracionCompletada;
        token.tipoNegocio = extendedUser.tipoNegocio;
        token.lastCheck = Date.now();

        if (extendedUser.empresaInactiva) token.empresaInactiva = true;
        if (extendedUser.sinSuscripcion) token.sinSuscripcion = true;
        if (extendedUser.usuarioInactivo) token.usuarioInactivo = true;
        if (extendedUser.suscripcionPorVencer) {
          token.suscripcionPorVencer = true;
          token.diasRestantes = extendedUser.diasRestantes;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Rol;
        session.user.empresaId = token.empresaId as string;
        session.user.nombre = session.user.nombre || token.name || "";
        session.user.configuracionCompletada =
          token.configuracionCompletada as boolean;
        session.user.tipoNegocio = token.tipoNegocio as TipoNegocio | undefined;

        session.user.empresaInactiva = token.empresaInactiva || false;
        session.user.sinSuscripcion = token.sinSuscripcion || false;
        session.user.usuarioInactivo = token.usuarioInactivo || false;
        session.user.suscripcionPorVencer = token.suscripcionPorVencer || false;
        session.user.diasRestantes = token.diasRestantes;
      }

      return session;
    },

    async signIn() {
      return true;
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export const esSuperAdmin = (rol: Rol | string) => {
  return rol === "SUPERADMIN";
};

export const esAdminOGerente = (rol: Rol | string) => {
  return rol === "ADMINISTRADOR" || rol === "ADMIN" || rol === "GERENTE";
};

export const esEmpleado = (rol: Rol | string) => {
  return rol === "EMPLEADO";
};

export const isSuperAdmin = esSuperAdmin;
export const isAdminOrManager = esAdminOGerente;
export const isEmployee = esEmpleado;

export const hashPassword = async (password: string) => {
  return await hash(password, 12);
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
) => {
  return await compare(plainPassword, hashedPassword);
};