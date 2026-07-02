/**
 * password-policy.ts
 * Política centralizada de contraseñas.
 * Todas las APIs deben usar esta función en lugar de validar directamente.
 */

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Valida que una contraseña cumpla con la política de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 letra minúscula
 * - Al menos 1 número
 * - Al menos 1 carácter especial (!@#$%^&*._-+)
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña es requerida'] };
  }

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }

  if (password.length > 128) {
    errors.push('Máximo 128 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos 1 letra mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Al menos 1 letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Al menos 1 número');
  }

  if (!/[!@#$%^&*._\-+]/.test(password)) {
    errors.push('Al menos 1 carácter especial (!@#$%^&*._-+)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mensaje de error formateado para la respuesta API
 */
export function getPasswordErrorMessage(validation: PasswordValidation): string {
  if (validation.valid) return '';
  return `La contraseña no cumple los requisitos: ${validation.errors.join(', ')}`;
}
