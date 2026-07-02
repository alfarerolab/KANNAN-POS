/**
 * Utilidad para resolver precios dinámicos basados en el día de la semana.
 * 
 * Permite que un producto tenga dos precios:
 * - `precio`: precio base (días normales)
 * - `precioEspecial`: precio alternativo (días seleccionados)
 * - `diasPrecioEspecial`: JSON con los días que aplica el precio especial
 *   Ejemplo: ["VIERNES","SABADO","DOMINGO"]
 */

export const DIAS_SEMANA = [
  { id: "DOMINGO", label: "Domingo", abrev: "Dom", dayIndex: 0 },
  { id: "LUNES", label: "Lunes", abrev: "Lun", dayIndex: 1 },
  { id: "MARTES", label: "Martes", abrev: "Mar", dayIndex: 2 },
  { id: "MIERCOLES", label: "Miércoles", abrev: "Mié", dayIndex: 3 },
  { id: "JUEVES", label: "Jueves", abrev: "Jue", dayIndex: 4 },
  { id: "VIERNES", label: "Viernes", abrev: "Vie", dayIndex: 5 },
  { id: "SABADO", label: "Sábado", abrev: "Sáb", dayIndex: 6 },
] as const;

export type DiaSemana = typeof DIAS_SEMANA[number]["id"];

const DAY_INDEX_TO_ID: Record<number, DiaSemana> = {
  0: "DOMINGO",
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
  6: "SABADO",
};

/**
 * Obtiene el día de la semana actual como DiaSemana
 */
export function getDiaActual(): DiaSemana {
  return DAY_INDEX_TO_ID[new Date().getDay()];
}

/**
 * Parsea la cadena JSON de días de precio especial
 */
export function parseDiasPrecioEspecial(diasJSON: string | null | undefined): DiaSemana[] {
  if (!diasJSON) return [];
  try {
    const parsed = JSON.parse(diasJSON);
    if (Array.isArray(parsed)) {
      return parsed.filter((d: string) => DAY_INDEX_TO_ID[DIAS_SEMANA.findIndex(ds => ds.id === d)] !== undefined || DIAS_SEMANA.some(ds => ds.id === d));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Verifica si hoy es un día de precio especial para un producto
 */
export function esHoyPrecioEspecial(diasPrecioEspecial: string | null | undefined): boolean {
  const diasEspeciales = parseDiasPrecioEspecial(diasPrecioEspecial);
  if (diasEspeciales.length === 0) return false;
  
  const diaHoy = getDiaActual();
  return diasEspeciales.includes(diaHoy);
}

/**
 * Resuelve el precio correcto de un producto según el día de la semana.
 * 
 * @param producto - Debe tener al menos: precio, precioEspecial, diasPrecioEspecial
 * @returns El precio a aplicar hoy
 */
export function resolverPrecio(producto: {
  precio?: number | null;
  precioEspecial?: number | null;
  diasPrecioEspecial?: string | null;
}): number {
  const precioBase = Number(producto.precio ?? 0);
  
  // Si no tiene precio especial configurado, devolver el base
  if (producto.precioEspecial == null || !producto.diasPrecioEspecial) {
    return precioBase;
  }
  
  const precioEsp = Number(producto.precioEspecial);
  
  // Si hoy es un día de precio especial, retornar ese precio
  if (esHoyPrecioEspecial(producto.diasPrecioEspecial)) {
    return precioEsp;
  }
  
  return precioBase;
}

/**
 * Calcula el stock disponible de un combo basándose en sus componentes.
 * El stock del combo = mínimo de (stock_componente / cantidad_requerida) por cada componente.
 * 
 * @returns Cantidad máxima de combos que se pueden armar con el stock actual
 */
export function calcularStockCombo(componentes: Array<{
  cantidad: number;
  componente: {
    enStock: number | string;
  };
}>): number {
  if (componentes.length === 0) return 0;
  
  let minCombos = Infinity;
  
  for (const comp of componentes) {
    const stockDisponible = Number(comp.componente.enStock);
    const cantidadRequerida = comp.cantidad;
    
    if (cantidadRequerida <= 0) continue;
    
    const combosConEsteComponente = Math.floor(stockDisponible / cantidadRequerida);
    minCombos = Math.min(minCombos, combosConEsteComponente);
  }
  
  return minCombos === Infinity ? 0 : minCombos;
}

/**
 * Genera la etiqueta de precio para mostrar en la UI.
 * Si tiene precio especial activo, muestra indicador.
 */
export function etiquetaPrecio(producto: {
  precio?: number | null;
  precioEspecial?: number | null;
  diasPrecioEspecial?: string | null;
}): { precio: number; esEspecial: boolean; diasEspeciales: DiaSemana[] } {
  const diasEspeciales = parseDiasPrecioEspecial(producto.diasPrecioEspecial);
  const esEspecial = esHoyPrecioEspecial(producto.diasPrecioEspecial) && producto.precioEspecial != null;
  
  return {
    precio: resolverPrecio(producto),
    esEspecial,
    diasEspeciales,
  };
}
