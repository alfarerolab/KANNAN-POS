import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    currencyDisplay: "code",
  }).format(amount);
}
// Formatear fecha
export function formatDate(date: Date | string | null | undefined, formatString = "PPP"): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Fecha inválida";
  return format(d, formatString, { locale: es });
}

// Formatear hora
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Hora inválida";
  return format(d, "h:mm a", { locale: es });
}

// Formatear fecha y hora
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Fecha inválida";
  return format(d, "PPP p", { locale: es });
}

// Generar código único
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Calcular subtotal (precio * cantidad)
export function calculateSubtotal(precio: number, cantidad: number): number {
  return precio * cantidad;
}

// Calcular impuesto
export function calculateTax(amount: number, taxRate = 0.16): number {
  return amount * taxRate;
}

// Calcular total (subtotal + impuesto - descuento)
export function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discount = 0
): number {
  return subtotal + taxAmount - discount;
}

// Calcular subtotal para productos por peso (precio por kilo * peso en kg)
export function calculateSubtotalPorPeso(precioPorKilo: number, pesoEnKg: number): number {
  return precioPorKilo * pesoEnKg;
}

// Calcular subtotal para productos por metro
export function calculateSubtotalPorMetro(precioPorMetro: number, metros: number): number {
  return precioPorMetro * metros;
}

// Calcular subtotal para productos por litro
export function calculateSubtotalPorLitro(precioPorLitro: number, litros: number): number {
  return precioPorLitro * litros;
}

// Calcular peso a partir del precio total y precio por kilo
export function calculatePesoDesdeTotal(total: number, precioPorKilo: number): number {
  return total / precioPorKilo;
}

// Calcular metros a partir del precio total y precio por metro
export function calculateMetrosDesdeTotal(total: number, precioPorMetro: number): number {
  return total / precioPorMetro;
}

// Calcular litros a partir del precio total y precio por litro
export function calculateLitrosDesdeTotal(total: number, precioPorLitro: number): number {
  return total / precioPorLitro;
}

// Formatear peso (kg con 3 decimales)
export function formatPeso(pesoEnKg: number): string {
  return `${pesoEnKg.toFixed(3)} kg`;
}

// Formatear medidas generales
export function formatMedida(cantidad: number, unidad: string): string {
  const decimales = unidad === 'kg' || unidad === 'l' ? 3 : 2;
  return `${cantidad.toFixed(decimales)} ${unidad}`;
}

// Obtener unidad de medida por tipo de venta
export function getUnidadMedida(tipoVenta: string): string {
  switch (tipoVenta) {
    case 'PESO':
      return 'kg';
    case 'METRO':
      return 'm';
    case 'LITRO':
      return 'l';
    case 'UNIDAD':
      return 'ud';
    default:
      return 'ud';
  }
}

// Convertir kg a gramos
export function kgAGramos(kg: number): number {
  return kg * 1000;
}

// Convertir gramos a kg
export function gramosAKg(gramos: number): number {
  return gramos / 1000;
}
