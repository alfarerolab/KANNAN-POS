// src/constants/business-types.ts

export type BusinessType = 
  | 'TIENDA_COMIDA'
  | 'TIENDA_BARRIO'
  | 'FERRETERIA'
  | 'PELUQUERIA'
  | 'SALON_BELLEZA'
  | 'ROPA'
  | 'RESTAURANTE'
  | 'BAR'
  | 'CAFETERIA'
  | 'FARMACIA'
  | 'LIBRERIA'
  | 'ELECTRONICA'
  | 'VETERINARIA'
  | 'SERVICIOS'
  | 'SALUD'
  | 'PROFESIONAL'
  | 'MIXTO'
  | 'PERSONALIZADO'
  | 'OTRO';

export const VALID_BUSINESS_TYPES: readonly BusinessType[] = [
  'TIENDA_COMIDA',
  'TIENDA_BARRIO',
  'FERRETERIA',
  'PELUQUERIA',
  'SALON_BELLEZA',
  'ROPA',
  'RESTAURANTE',
  'BAR',
  'CAFETERIA',
  'FARMACIA',
  'LIBRERIA',
  'ELECTRONICA',
  'VETERINARIA',
  'SERVICIOS',
  'SALUD',
  'PROFESIONAL',
  'MIXTO',
  'PERSONALIZADO',
  'OTRO'
] as const;

export function isValidBusinessType(type: string): type is BusinessType {
  return VALID_BUSINESS_TYPES.includes(type as BusinessType);
}

export function validateBusinessType(type: string | null): BusinessType | null {
  if (!type) return null;
  return isValidBusinessType(type) ? type : null;
}