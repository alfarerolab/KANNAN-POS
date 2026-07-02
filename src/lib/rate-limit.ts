/**
 * rate-limit.ts
 * Rate limiting en memoria para proteger endpoints críticos.
 * En producción se recomienda usar Redis para entornos multi-instancia.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Almacenamiento en memoria — se resetea al reiniciar el servidor
const stores = new Map<string, Map<string, RateLimitEntry>>();

// Limpieza periódica para evitar fugas de memoria (cada 5 minutos)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt) {
          store.delete(key);
        }
      }
    }
  }, CLEANUP_INTERVAL);
  // No bloquear el proceso
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
    startCleanup();
  }
  return store;
}

export interface RateLimitConfig {
  /** Nombre identificador del limiter (ej: 'login', 'registro') */
  name: string;
  /** Máximo de peticiones permitidas en la ventana */
  limit: number;
  /** Duración de la ventana en milisegundos */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

/**
 * Verifica si una clave (IP, email, etc.) tiene permitido hacer la petición.
 */
export function checkRateLimit(config: RateLimitConfig, key: string): RateLimitResult {
  const store = getStore(config.name);
  const now = Date.now();
  const entry = store.get(key);

  // Primera petición o ventana expirada
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt,
      retryAfterMs: 0,
    };
  }

  // Incrementar contador
  entry.count++;

  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Extrae la IP del request (compatible con proxies)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

// ─── Configuraciones predefinidas ──────────────────────────────────────────

/** Login: 5 intentos por minuto por IP */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  name: 'login',
  limit: 5,
  windowMs: 60 * 1000, // 1 minuto
};

/** Login por email: 10 intentos por hora */
export const LOGIN_EMAIL_RATE_LIMIT: RateLimitConfig = {
  name: 'login-email',
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1 hora
};

/** Registro: 3 por hora por IP */
export const REGISTRO_RATE_LIMIT: RateLimitConfig = {
  name: 'registro',
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hora
};

/** API general: 100 peticiones por minuto por IP */
export const API_GENERAL_RATE_LIMIT: RateLimitConfig = {
  name: 'api-general',
  limit: 100,
  windowMs: 60 * 1000, // 1 minuto
};

/** Configuración inicial: 5 intentos por 10 minutos */
export const CONFIG_INICIAL_RATE_LIMIT: RateLimitConfig = {
  name: 'config-inicial',
  limit: 5,
  windowMs: 10 * 60 * 1000, // 10 minutos
};
