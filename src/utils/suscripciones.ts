// utils/suscripciones.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Función para combinar clases de Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatear moneda en español
export function formatearMoneda(monto: number, incluirSimbolo = true): string {
  const formateado = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(monto);

  return incluirSimbolo ? `$${formateado}` : formateado;
}

// Formatear fecha en español
export function formatearFecha(
  fecha: string | Date,
  formato: 'corta' | 'larga' | 'completa' = 'corta'
): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const formatos: Record<'corta' | 'larga' | 'completa', Intl.DateTimeFormatOptions> = {
    corta: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    larga: {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    },
    completa: {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  };

  return fechaObj.toLocaleDateString('es-ES', formatos[formato]);
}

// Formatear tiempo relativo (hace X días, en X días)
export function formatearTiempoRelativo(fecha: string | Date): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diferenciaDias = Math.ceil((fechaObj.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

  if (diferenciaDias === 0) return 'Hoy';
  if (diferenciaDias === 1) return 'Mañana';
  if (diferenciaDias === -1) return 'Ayer';
  if (diferenciaDias > 1) return `En ${diferenciaDias} días`;
  if (diferenciaDias < -1) return `Hace ${Math.abs(diferenciaDias)} días`;
  
  return formatearFecha(fechaObj);
}

// Calcular días restantes hasta una fecha
export function calcularDiasRestantes(fechaVencimiento: string | null): number {
  if (!fechaVencimiento) return 9999; // Sin vencimiento
  
  const vencimiento = new Date(fechaVencimiento);
  const ahora = new Date();
  
  // Normalizar las fechas a medianoche para comparación exacta
  vencimiento.setHours(23, 59, 59, 999);
  ahora.setHours(0, 0, 0, 0);
  
  return Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
}

// Determinar estado basado en días restantes
export function determinarEstadoSuscripcion(
  activa: boolean, 
  diasRestantes: number
): 'activa' | 'por_vencer' | 'vencida' | 'suspendida' {
  if (!activa) return 'suspendida';
  if (diasRestantes < 0) return 'vencida';
  if (diasRestantes <= 15) return 'por_vencer';
  return 'activa';
}

// Obtener color para estado
export function getColorEstado(estado: string): string {
  const colores = {
    activa: 'text-green-600',
    por_vencer: 'text-yellow-600',
    vencida: 'text-red-600',
    suspendida: 'text-gray-600'
  };
  
  return colores[estado as keyof typeof colores] || 'text-gray-600';
}

// Obtener icono para estado
export function getIconoEstado(estado: string): string {
  const iconos = {
    activa: '✅',
    por_vencer: '⚠️',
    vencida: '❌',
    suspendida: '⏸️'
  };
  
  return iconos[estado as keyof typeof iconos] || '📋';
}

// Obtener descripción legible del estado
export function getDescripcionEstado(estado: string): string {
  const descripciones = {
    activa: 'Suscripción activa y vigente',
    por_vencer: 'Suscripción próxima a vencer',
    vencida: 'Suscripción vencida',
    suspendida: 'Suscripción suspendida'
  };
  
  return descripciones[estado as keyof typeof descripciones] || 'Estado desconocido';
}

// Validar email
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Generar ID único
export function generarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Formatear número con separadores de miles
export function formatearNumero(numero: number): string {
  return new Intl.NumberFormat('es-ES').format(numero);
}

// Calcular porcentaje
export function calcularPorcentaje(valor: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((valor / total) * 100 * 100) / 100;
}

// Formatear porcentaje
export function formatearPorcentaje(porcentaje: number, decimales = 1): string {
  return `${porcentaje.toFixed(decimales)}%`;
}

// Obtener texto de urgencia basado en días restantes
export function getTextoUrgencia(diasRestantes: number): {
  texto: string;
  color: string;
  urgencia: 'alta' | 'media' | 'baja';
} {
  if (diasRestantes < 0) {
    return {
      texto: `Vencida hace ${Math.abs(diasRestantes)} ${Math.abs(diasRestantes) === 1 ? 'día' : 'días'}`,
      color: 'text-red-600',
      urgencia: 'alta'
    };
  }
  
  if (diasRestantes === 0) {
    return {
      texto: 'Vence hoy',
      color: 'text-red-600',
      urgencia: 'alta'
    };
  }
  
  if (diasRestantes <= 7) {
    return {
      texto: `Vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`,
      color: 'text-red-600',
      urgencia: 'alta'
    };
  }
  
  if (diasRestantes <= 15) {
    return {
      texto: `Vence en ${diasRestantes} días`,
      color: 'text-yellow-600',
      urgencia: 'media'
    };
  }
  
  if (diasRestantes <= 30) {
    return {
      texto: `Vence en ${diasRestantes} días`,
      color: 'text-yellow-600',
      urgencia: 'media'
    };
  }
  
  return {
    texto: `${diasRestantes} días restantes`,
    color: 'text-green-600',
    urgencia: 'baja'
  };
}

// Exportar función para descargar datos como CSV
export function exportarCSV(datos: any[], nombreArchivo = 'suscripciones'): void {
  if (datos.length === 0) return;
  
  const headers = Object.keys(datos[0]);
  const csvContent = [
    headers.join(','),
    ...datos.map(row => headers.map(header => {
      const value = row[header];
      // Escapar comillas y envolver en comillas si contiene comas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}_${formatearFecha(new Date(), 'corta').replace(/\//g, '-')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Función para filtrar datos de forma eficiente
export function filtrarDatos<T>(
  datos: T[],
  filtros: Record<string, any>,
  camposBusqueda: (keyof T)[]
): T[] {
  return datos.filter(item => {
    // Filtro de búsqueda por texto
    if (filtros.searchTerm) {
      const terminoBusqueda = filtros.searchTerm.toLowerCase();
      const coincide = camposBusqueda.some(campo => {
        const valor = item[campo];
        return typeof valor === 'string' && 
               valor.toLowerCase().includes(terminoBusqueda);
      });
      if (!coincide) return false;
    }
    
    // Otros filtros específicos
    return Object.entries(filtros).every(([clave, valor]) => {
      if (clave === 'searchTerm' || valor === 'todos' || valor === '') return true;
      return item[clave as keyof T] === valor;
    });
  });
}

// Función para ordenar datos
export function ordenarDatos<T>(
  datos: T[],
  campo: keyof T,
  direccion: 'asc' | 'desc' = 'asc'
): T[] {
  return [...datos].sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];
    
    if (valorA === valorB) return 0;
    
    const comparacion = valorA < valorB ? -1 : 1;
    return direccion === 'asc' ? comparacion : -comparacion;
  });
}

// Función para agrupar datos
export function agruparPor<T>(
  datos: T[],
  campo: keyof T
): Record<string, T[]> {
  return datos.reduce((grupos, item) => {
    const clave = String(item[campo]);
    if (!grupos[clave]) {
      grupos[clave] = [];
    }
    grupos[clave].push(item);
    return grupos;
  }, {} as Record<string, T[]>);
}