// utils/iva.ts - Funciones auxiliares para el manejo de IVA dinámico

export interface ProductoConIVA {
  id: string;
  precio: number;
  tieneIva: boolean;
  tarifaIva: number;
  incluyeIva: boolean;
  tipoVenta: string;
  precioPorKilo?: number;
  precioPorMetro?: number;
  precioPorLitro?: number;
  // Nuevos campos para conversiones
  unidadBase?: string;
  unidadVenta?: string;
  factorConversion?: number;
  precioCosto?: number;
}

export interface ItemCarritoConIVA {
  id: string;
  producto: ProductoConIVA;
  cantidad: number;
  peso?: number;
  medida?: number;
  precioLibre?: number;
}

export interface CalculoIVA {
  precioBase: number;
  valorIva: number;
  precioTotal: number;
  tarifaAplicada: number;
}

export interface CalculoConversion {
  costoUnitario: number;
  precioVentaUnitario: number;
  unidadBase: string;
  unidadVenta: string;
  factorConversion: number;
}

/**
 * Calcula el IVA para un producto individual según su configuración dinámica
 */
export const calcularIVAProducto = (
  precioUnitario: number,
  producto: ProductoConIVA
): CalculoIVA => {
  // Si el producto no tiene IVA
  if (!producto.tieneIva) {
    return {
      precioBase: precioUnitario,
      valorIva: 0,
      precioTotal: precioUnitario,
      tarifaAplicada: 0
    };
  }

  const tarifaIva = producto.tarifaIva || 0;

  // Si no hay tarifa de IVA definida
  if (tarifaIva === 0) {
    return {
      precioBase: precioUnitario,
      valorIva: 0,
      precioTotal: precioUnitario,
      tarifaAplicada: 0
    };
  }

  let precioBase: number;
  let valorIva: number;
  let precioTotal: number;

  if (producto.incluyeIva) {
    // El precio incluye IVA, extraer el IVA
    precioBase = precioUnitario / (1 + tarifaIva / 100);
    valorIva = precioUnitario - precioBase;
    precioTotal = precioUnitario;
  } else {
    // El precio no incluye IVA, agregar IVA
    precioBase = precioUnitario;
    valorIva = precioUnitario * (tarifaIva / 100);
    precioTotal = precioUnitario + valorIva;
  }

  return {
    precioBase: Math.round(precioBase * 100) / 100,
    valorIva: Math.round(valorIva * 100) / 100,
    precioTotal: Math.round(precioTotal * 100) / 100,
    tarifaAplicada: tarifaIva
  };
};

/**
 * Calcula la conversión de unidades y costos
 */
export const calcularConversionUnidades = (producto: ProductoConIVA): CalculoConversion | null => {
  if (!producto.unidadBase || !producto.unidadVenta || !producto.factorConversion || !producto.precioCosto) {
    return null;
  }

  const costoUnitario = producto.precioCosto / producto.factorConversion;
  const precioVentaUnitario = producto.precio / producto.factorConversion;

  return {
    costoUnitario: Math.round(costoUnitario * 10000) / 10000,
    precioVentaUnitario: Math.round(precioVentaUnitario * 10000) / 10000,
    unidadBase: producto.unidadBase,
    unidadVenta: producto.unidadVenta,
    factorConversion: producto.factorConversion
  };
};

/**
 * Calcula el precio unitario según el tipo de venta
 */
export const obtenerPrecioUnitario = (item: ItemCarritoConIVA): number => {
  const { producto } = item;

  switch (producto.tipoVenta) {
    case 'PESO':
      return (producto.precioPorKilo || 0) * (item.peso || 0);
    case 'METRO':
      return (producto.precioPorMetro || 0) * (item.medida || 0);
    case 'LITRO':
      return (producto.precioPorLitro || 0) * (item.medida || 0);
    case 'PRECIO_LIBRE':
      return (item.precioLibre || 0) * item.cantidad;
    default:
      // Para ventas por unidad, considerar si hay conversión
      if (producto.factorConversion && producto.factorConversion > 0) {
        // Si se vende por unidades convertidas (ej: tabletas de una caja)
        const precioUnitario = producto.precio / producto.factorConversion;
        return precioUnitario * item.cantidad;
      }
      return producto.precio * item.cantidad;
  }
};

/**
 * Calcula el IVA para un item del carrito
 */
export const calcularIVAItem = (item: ItemCarritoConIVA): CalculoIVA => {
  const precioUnitarioTotal = obtenerPrecioUnitario(item);
  return calcularIVAProducto(precioUnitarioTotal, item.producto);
};

/**
 * Calcula los totales del carrito con IVA
 */
export const calcularTotalesCarrito = (items: ItemCarritoConIVA[]) => {
  let subtotalSinIva = 0;
  let totalIva = 0;
  const ivasPorTarifa: { [key: string]: number } = {};
  const itemsConIVA: Array<ItemCarritoConIVA & { calculoIva: CalculoIVA }> = [];

  items.forEach(item => {
    const calculoIva = calcularIVAItem(item);

    subtotalSinIva += calculoIva.precioBase;
    totalIva += calculoIva.valorIva;

    // Agrupar IVA por tarifa
    if (calculoIva.tarifaAplicada > 0) {
      const tarifaKey = `${calculoIva.tarifaAplicada}%`;
      ivasPorTarifa[tarifaKey] = (ivasPorTarifa[tarifaKey] || 0) + calculoIva.valorIva;
    }

    itemsConIVA.push({
      ...item,
      calculoIva
    });
  });

  return {
    subtotalSinIva: Math.round(subtotalSinIva * 100) / 100,
    totalIva: Math.round(totalIva * 100) / 100,
    totalConIva: Math.round((subtotalSinIva + totalIva) * 100) / 100,
    ivasPorTarifa,
    itemsConIVA
  };
};

/**
 * Calcula el margen de ganancia entre costo y precio
 */
export const calcularMargenGanancia = (precioCosto: number, precioVenta: number): number => {
  if (precioCosto <= 0) return 0;
  return ((precioVenta - precioCosto) / precioCosto) * 100;
};

/**
 * Calcula el precio de venta basado en costo y margen
 */
export const calcularPrecioConMargen = (precioCosto: number, margen: number): number => {
  return precioCosto * (1 + margen / 100);
};

/**
 * Formatea el valor de IVA para mostrar en la UI
 */
export const formatearIVA = (valor: number, moneda = '$'): string => {
  return `${moneda}${valor.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Formatea un valor monetario
 */
export const formatearMoneda = (valor: number, moneda = '$'): string => {
  return `${moneda}${valor.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Obtiene la descripción de la tarifa de IVA según el porcentaje
 */
export const obtenerDescripcionTarifaIVA = (tarifa: number): string => {
  switch (tarifa) {
    case 0:
      return 'Exento/Sin IVA';
    case 5:
      return 'Productos básicos';
    case 19:
      return 'Tarifa general';
    default:
      return `Tarifa especial (${tarifa}%)`;
  }
};

/**
 * Valida si una tarifa de IVA es válida
 */
export const esValidaTarifaIVA = (tarifa: number): boolean => {
  return tarifa >= 0 && tarifa <= 100;
};

/**
 * Calcula el precio sin IVA a partir de un precio con IVA
 */
export const calcularPrecioSinIVA = (precioConIva: number, tarifaIva: number): number => {
  if (tarifaIva === 0) return precioConIva;
  return Math.round((precioConIva / (1 + tarifaIva / 100)) * 100) / 100;
};

/**
 * Calcula el precio con IVA a partir de un precio sin IVA
 */
export const calcularPrecioConIVA = (precioSinIva: number, tarifaIva: number): number => {
  if (tarifaIva === 0) return precioSinIva;
  return Math.round((precioSinIva * (1 + tarifaIva / 100)) * 100) / 100;
};

/**
 * Calcula el desglose completo de un producto (precio base, IVA, conversiones)
 */
export const calcularDesgloseCompleto = (producto: ProductoConIVA) => {
  const calculoIva = calcularIVAProducto(producto.precio, producto);
  const calculoConversion = calcularConversionUnidades(producto);

  return {
    iva: calculoIva,
    conversion: calculoConversion,
    margen: producto.precioCosto ? calcularMargenGanancia(producto.precioCosto, producto.precio) : null
  };
};
