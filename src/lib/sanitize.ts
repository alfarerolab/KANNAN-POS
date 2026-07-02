/**
 * sanitize.ts
 * Utilidades de seguridad: sanitización de inputs y validación de IDs
 * Prisma ya usa parameterized queries, pero agregamos defensa en profundidad.
 */

// ─── Patrones peligrosos ───────────────────────────────────────────────────
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|CAST|CONVERT)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/gi,
  /(\bOR\b\s+['"\d]+=\s*['"\d]+)/gi,
  /(\bAND\b\s+['"\d]+=\s*['"\d]+)/gi,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

// Formato CUID v1 y v2, y UUID v4
const CUID_REGEX = /^c[a-z0-9]{24,}$/i;
const CUID2_REGEX = /^[a-z0-9]{24,}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Funciones públicas ────────────────────────────────────────────────────

/**
 * Sanitiza un string de entrada eliminando caracteres peligrosos.
 * NO usar para HTML complejo — solo para strings simples como nombres, emails, etc.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';

  let sanitized = input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .replace(/\\/g, '\\\\'); // Escape backslashes

  // Remover patrones XSS
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Valida que un ID tenga formato CUID o UUID válido.
 * Retorna el ID si es válido, null si no lo es.
 */
export function validateId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (CUID_REGEX.test(trimmed) || CUID2_REGEX.test(trimmed) || UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Sanitiza una query de búsqueda.
 * Elimina patrones SQL peligrosos y limita la longitud.
 */
export function sanitizeSearchQuery(query: unknown, maxLength = 100): string {
  if (typeof query !== 'string') return '';

  let sanitized = sanitizeInput(query).slice(0, maxLength);

  for (const pattern of SQL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Detecta si un string contiene patrones de SQL injection.
 * Retorna true si el input parece peligroso.
 */
export function hasSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitiza un objeto de paginación (page, limit).
 */
export function sanitizePagination(
  page: unknown,
  limit: unknown,
  maxLimit = 100
): { page: number; limit: number } {
  const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(String(limit), 10) || 20));
  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Valida un email básico.
 */
export function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}