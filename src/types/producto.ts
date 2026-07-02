import * as z from "zod";

// Esquema de validación para el formulario
export const productoFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede tener más de 100 caracteres" })
    .trim(),
  descripcion: z
    .string()
    .max(500, { message: "La descripción no puede tener más de 500 caracteres" })
    .optional()
    .or(z.literal(""))
    .default(""),

  // Campos de IVA dinámico
  tieneIva: z.boolean().default(false),
  tarifaIva: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  incluyeIva: z.boolean().default(true),

  tipoVenta: z.enum(["UNIDAD", "PESO", "METRO", "LITRO", "PRECIO_LIBRE"]).default("UNIDAD"),

  // Precio (se validará según tipoVenta)
  precio: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),

  // Precio de costo
  precioCosto: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),

  // Precio sugerido
  precioSugerido: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),

  // Margen de ganancia
  margenGanancia: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),

  // Precios por unidad de medida
  precioPorKilo: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  precioPorGramo: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  precioPorMetro: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  precioPorLitro: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),

  // Configuración de unidades
  unidadBase: z.string().optional().or(z.literal("")).default(""),
  unidadVenta: z.string().optional().or(z.literal("")).default(""),
  factorConversion: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  requiereBalanza: z.boolean().default(false),
  pesoAproximado: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  codigoBarras: z
    .string()
    .max(50, { message: "El código de barras no puede tener más de 50 caracteres" })
    .optional()
    .or(z.literal(""))
    .default(""),
  sku: z
    .string()
    .max(50, { message: "El SKU no puede tener más de 50 caracteres" })
    .optional()
    .or(z.literal(""))
    .default(""),
  imagen: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  imagenCodigoBarras: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  enStock: z
    .string()
    .min(1, { message: "El stock es requerido" })
    .default("0"),
  stockMinimo: z
    .string()
    .min(1, { message: "El stock mínimo es requerido" })
    .default("5"),
  activo: z.boolean().default(true),
  categoriaId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("sin-categoria"))
    .default(""),
  proveedorId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("sin-proveedor"))
    .default(""),

  // Gestión de vencimientos
  manejaVencimiento: z.boolean().default(false),
  fechasVencimiento: z.array(z.object({
    fecha: z.string(), // ISO date string
    cantidad: z.number().min(0),
    lote: z.string().optional(),
  })).optional().default([]),

  // Productos Compuestos (Combos) y Precios Dinámicos
  esCombo: z.boolean().optional().default(false),
  precioEspecial: z.string().optional().or(z.literal("")),
  diasPrecioEspecial: z.array(z.string()).optional().default([]),
  componentes: z.array(z.object({
    componenteId: z.string().min(1, "Debe seleccionar un producto"),
    cantidad: z.number().min(1, "La cantidad debe ser mayor a 0"),
    esCortesia: z.boolean().default(false),
  })).optional().default([]),

}).superRefine((data, ctx) => {
  // Validación para PESO
  if (data.tipoVenta === "PESO") {
    // 1. Precio de costo es OBLIGATORIO
    if (!data.precioCosto || data.precioCosto.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio de costo es obligatorio para productos por peso",
        path: ["precioCosto"]
      });
    } else {
      const precioCostoNum = Number.parseFloat(data.precioCosto);
      if (isNaN(precioCostoNum) || precioCostoNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio de costo debe ser mayor a 0",
          path: ["precioCosto"]
        });
      }
    }

    // 2. Precio por kilo es OBLIGATORIO
    if (!data.precioPorKilo || data.precioPorKilo.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio por kilo es obligatorio para productos vendidos por peso",
        path: ["precioPorKilo"]
      });
    } else {
      const precioPorKiloNum = Number.parseFloat(data.precioPorKilo);
      if (isNaN(precioPorKiloNum) || precioPorKiloNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio por kilo debe ser mayor a 0",
          path: ["precioPorKilo"]
        });
      }
    }

    // 3. Stock se maneja en kg (validar formato decimal)
    if (data.enStock && data.enStock.trim() !== "") {
      const stockNum = Number.parseFloat(data.enStock);
      if (isNaN(stockNum) || stockNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock debe ser un número positivo o cero (en kilogramos)",
          path: ["enStock"]
        });
      }
    }

    if (data.stockMinimo && data.stockMinimo.trim() !== "") {
      const stockMinNum = Number.parseFloat(data.stockMinimo);
      if (isNaN(stockMinNum) || stockMinNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock mínimo debe ser un número positivo o cero (en kilogramos)",
          path: ["stockMinimo"]
        });
      }
    }
  }

  // Validación para PRECIO_LIBRE
  else if (data.tipoVenta === "PRECIO_LIBRE") {
    // Precio de costo es OBLIGATORIO
    if (!data.precioCosto || data.precioCosto.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio de costo es obligatorio para productos de precio libre",
        path: ["precioCosto"]
      });
    } else {
      const precioCostoNum = Number.parseFloat(data.precioCosto);
      if (isNaN(precioCostoNum) || precioCostoNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio de costo debe ser mayor a 0",
          path: ["precioCosto"]
        });
      }
    }

    // Precio sugerido es OPCIONAL
    if (data.precioSugerido && data.precioSugerido.trim() !== "") {
      const precioSugeridoNum = Number.parseFloat(data.precioSugerido);
      if (isNaN(precioSugeridoNum) || precioSugeridoNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio sugerido debe ser un número positivo o cero",
          path: ["precioSugerido"]
        });
      }
    }
  }

  // Validación para METRO
  else if (data.tipoVenta === "METRO") {
    // 1. Precio de costo es OBLIGATORIO
    if (!data.precioCosto || data.precioCosto.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio de costo es obligatorio para productos por metro",
        path: ["precioCosto"]
      });
    } else {
      const precioCostoNum = Number.parseFloat(data.precioCosto);
      if (isNaN(precioCostoNum) || precioCostoNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio de costo debe ser mayor a 0",
          path: ["precioCosto"]
        });
      }
    }

    // 2. El precio por metro ES OBLIGATORIO
    if (!data.precioPorMetro || data.precioPorMetro.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio por metro es obligatorio para productos vendidos por metro",
        path: ["precioPorMetro"]
      });
    } else {
      const precioMetroNum = Number.parseFloat(data.precioPorMetro);
      if (isNaN(precioMetroNum) || precioMetroNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio por metro debe ser mayor a 0",
          path: ["precioPorMetro"]
        });
      }
    }

    // 3. Validar stock (en metros con decimales)
    if (data.enStock && data.enStock.trim() !== "") {
      const stockNum = Number.parseFloat(data.enStock);
      if (isNaN(stockNum) || stockNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock debe ser un número positivo o cero (en metros)",
          path: ["enStock"]
        });
      }
    }

    if (data.stockMinimo && data.stockMinimo.trim() !== "") {
      const stockMinNum = Number.parseFloat(data.stockMinimo);
      if (isNaN(stockMinNum) || stockMinNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock mínimo debe ser un número positivo o cero (en metros)",
          path: ["stockMinimo"]
        });
      }
    }
  }

  // Validación para LITRO
  else if (data.tipoVenta === "LITRO") {
    // 1. Precio de costo es OBLIGATORIO
    if (!data.precioCosto || data.precioCosto.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio de costo es obligatorio para productos por litro",
        path: ["precioCosto"]
      });
    } else {
      const precioCostoNum = Number.parseFloat(data.precioCosto);
      if (isNaN(precioCostoNum) || precioCostoNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio de costo debe ser mayor a 0",
          path: ["precioCosto"]
        });
      }
    }

    // 2. El precio por litro ES OBLIGATORIO
    if (!data.precioPorLitro || data.precioPorLitro.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio por litro es obligatorio para productos vendidos por litro",
        path: ["precioPorLitro"]
      });
    } else {
      const precioLitroNum = Number.parseFloat(data.precioPorLitro);
      if (isNaN(precioLitroNum) || precioLitroNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio por litro debe ser mayor a 0",
          path: ["precioPorLitro"]
        });
      }
    }

    // 3. Validar stock (en litros con decimales)
    if (data.enStock && data.enStock.trim() !== "") {
      const stockNum = Number.parseFloat(data.enStock);
      if (isNaN(stockNum) || stockNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock debe ser un número positivo o cero (en litros)",
          path: ["enStock"]
        });
      }
    }

    if (data.stockMinimo && data.stockMinimo.trim() !== "") {
      const stockMinNum = Number.parseFloat(data.stockMinimo);
      if (isNaN(stockMinNum) || stockMinNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock mínimo debe ser un número positivo o cero (en litros)",
          path: ["stockMinimo"]
        });
      }
    }
  }

  // Validación para UNIDAD
  else if (data.tipoVenta === "UNIDAD") {
    // El precio ES OBLIGATORIO para UNIDAD
    if (!data.precio || data.precio.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "El precio es obligatorio para productos vendidos por unidad",
        path: ["precio"]
      });
    } else {
      const precioNum = Number.parseFloat(data.precio);
      if (isNaN(precioNum) || precioNum <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio debe ser mayor a 0",
          path: ["precio"]
        });
      }
    }

    // Validar factor de conversión si se configuró
    if (data.factorConversion && data.factorConversion.trim() !== "") {
      const num = Number.parseFloat(data.factorConversion);
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "El factor de conversión debe ser un número mayor a 0",
          path: ["factorConversion"]
        });
      }
    }

    // Stock normal (enteros para UNIDAD)
    if (data.enStock && data.enStock.trim() !== "") {
      const stockNum = Number.parseFloat(data.enStock);
      if (isNaN(stockNum) || stockNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock debe ser un número positivo o cero",
          path: ["enStock"]
        });
      }
    }

    if (data.stockMinimo && data.stockMinimo.trim() !== "") {
      const stockMinNum = Number.parseFloat(data.stockMinimo);
      if (isNaN(stockMinNum) || stockMinNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El stock mínimo debe ser un número positivo o cero",
          path: ["stockMinimo"]
        });
      }
    }
  }

  // Validación de tarifaIva (para todos los tipos)
  if (data.tieneIva && data.tarifaIva && data.tarifaIva.trim() !== "") {
    const tarifaNum = Number.parseFloat(data.tarifaIva);
    if (isNaN(tarifaNum) || tarifaNum < 0 || tarifaNum > 100) {
      ctx.addIssue({
        code: "custom",
        message: "La tarifa de IVA debe ser un número entre 0 y 100",
        path: ["tarifaIva"]
      });
    }
  }

  // Validación de precio de costo (para UNIDAD - es opcional pero si se ingresa debe ser válido)
  if (data.tipoVenta === "UNIDAD") {
    if (data.precioCosto && data.precioCosto.trim() !== "") {
      const costoNum = Number.parseFloat(data.precioCosto);
      if (isNaN(costoNum) || costoNum < 0) {
        ctx.addIssue({
          code: "custom",
          message: "El precio de costo debe ser un número positivo",
          path: ["precioCosto"]
        });
      }
    }
  }
});

// Tipo inferido del esquema
export type ProductoFormValues = z.infer<typeof productoFormSchema>;

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  empresa?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface FechaVencimiento {
  fecha: string; // ISO date string
  cantidad: number;
  lote?: string;
}
