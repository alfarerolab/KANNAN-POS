export interface PlanConfig {
  id: string;
  nombre: string;
  duracionMeses: number;
  precioBase: number;
  precioConDescuento?: number;
  descuentoPorcentaje?: number;
  descripcion: string;
  caracteristicas: string[];
  popular?: boolean;
  activo: boolean;
}

export interface ConfiguracionPrecios {
  moneda: string;
  simboloMoneda: string;
  planes: PlanConfig[];
  descuentos: {
    trimestral: number; // porcentaje
    semestral: number;
    anual: number;
  };
  impuestos: {
    iva: number; // porcentaje
    aplicaIva: boolean;
  };
  configuracion: {
    permitirPlanesPersonalizados: boolean;
    minimoMesesPersonalizado: number;
    maximoMesesPersonalizado: number;
    fechaUltimaActualizacion: string;
  };
}

// Configuración por defecto - se puede modificar desde el panel de administración
export const configuracionPreciosDefault: ConfiguracionPrecios = {
  moneda: "COP",
  simboloMoneda: "$",
  planes: [
    {
      id: "mensual",
      nombre: "Plan Mensual",
      duracionMeses: 1,
      precioBase: 29,
      descripcion: "Perfecto para probar el sistema",
      caracteristicas: [
        "Acceso completo al POS",
        "Hasta 1000 productos",
        "2 usuarios incluidos",
        "Soporte por email"
      ],
      activo: true
    },
    {
      id: "trimestral",
      nombre: "Plan Trimestral",
      duracionMeses: 3,
      precioBase: 87, // 29 * 3
      precioConDescuento: 79,
      descuentoPorcentaje: 10,
      descripcion: "3 meses con descuento",
      caracteristicas: [
        "Todo lo del plan mensual",
        "10% de descuento",
        "Configuración personalizada"
      ],
      activo: true
    },
    {
      id: "semestral",
      nombre: "Plan Semestral",
      duracionMeses: 6,
      precioBase: 174, // 29 * 6
      precioConDescuento: 149,
      descuentoPorcentaje: 15,
      descripcion: "6 meses con mejor descuento",
      caracteristicas: [
        "Todo lo del plan trimestral",
        "15% de descuento",
        "Productos ilimitados",
        "5 usuarios incluidos"
      ],
      activo: true
    },
    {
      id: "anual",
      nombre: "Plan Anual",
      duracionMeses: 12,
      precioBase: 348, // 29 * 12
      precioConDescuento: 279,
      descuentoPorcentaje: 20,
      descripcion: "El mejor valor - 12 meses",
      caracteristicas: [
        "Todo lo del plan semestral",
        "20% de descuento",
        "Usuarios ilimitados",
        "Soporte prioritario",
        "Reportes avanzados"
      ],
      popular: true,
      activo: true
    }
  ],
  descuentos: {
    trimestral: 10,
    semestral: 15,
    anual: 20
  },
  impuestos: {
    iva: 19,
    aplicaIva: false // Se puede activar según el país
  },
  configuracion: {
    permitirPlanesPersonalizados: true,
    minimoMesesPersonalizado: 1,
    maximoMesesPersonalizado: 24,
    fechaUltimaActualizacion: new Date().toISOString()
  }
};

// Funciones utilitarias
export const calcularPrecioPlan = (plan: PlanConfig): number => {
  return plan.precioConDescuento || plan.precioBase;
};

export const calcularPrecioConIva = (precio: number, config: ConfiguracionPrecios): number => {
  if (!config.impuestos.aplicaIva) return precio;
  return precio * (1 + config.impuestos.iva / 100);
};

export const obtenerPlanPorId = (id: string, config: ConfiguracionPrecios): PlanConfig | undefined => {
  return config.planes.find(plan => plan.id === id && plan.activo);
};

export const calcularPrecioPersonalizado = (meses: number, config: ConfiguracionPrecios): number => {
  const precioBaseMensual = 29; // Se puede hacer configurable
  let precio = precioBaseMensual * meses;
  
  // Aplicar descuentos por volumen
  if (meses >= 12) {
    precio *= (1 - config.descuentos.anual / 100);
  } else if (meses >= 6) {
    precio *= (1 - config.descuentos.semestral / 100);
  } else if (meses >= 3) {
    precio *= (1 - config.descuentos.trimestral / 100);
  }
  
  return Math.round(precio * 100) / 100;
};

export const formatearPrecio = (precio: number, config: ConfiguracionPrecios): string => {
  return `${config.simboloMoneda}${precio.toFixed(2)}`;
};

// Hook para cargar configuración desde la base de datos
export const useConfiguracionPrecios = () => {
  // Esta función se conectaría a la API para cargar la configuración actual
  // Por ahora retorna la configuración por defecto
  return configuracionPreciosDefault;
};