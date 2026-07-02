import { useCallback, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productoFormSchema, type ProductoFormValues } from "@/types/producto";

// Hook personalizado para manejar el formulario del producto
export function useProductForm() {
  // Función para generar SKU automático
  const generateSKU = useCallback((nombre: string = "") => {
    const timestamp = Date.now().toString().slice(-3);
    const randomNum = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const namePrefix = nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 3)
      .padEnd(2, 'X');

    return `${namePrefix}${timestamp}${randomNum}`;
  }, []);

  // Definir valores por defecto para el formulario
  const defaultValues: ProductoFormValues = {
    nombre: "",
    descripcion: "",
    tipoVenta: "UNIDAD",
    tieneIva: false,
    tarifaIva: "",
    incluyeIva: true,
    precio: "",
    precioCosto: "",
    precioSugerido: "",
    margenGanancia: "",
    precioPorKilo: "",
    precioPorGramo: "",
    precioPorMetro: "",
    precioPorLitro: "",
    unidadBase: "",
    unidadVenta: "",
    factorConversion: "",
    requiereBalanza: false,
    pesoAproximado: "",
    codigoBarras: "",
    sku: generateSKU(),
    imagen: "",
    imagenCodigoBarras: "",
    enStock: "0",
    stockMinimo: "5",
    activo: true,
    categoriaId: "",
    proveedorId: "",
    manejaVencimiento: false,
    fechasVencimiento: [],
    esCombo: false,
    diasPrecioEspecial: [],
    componentes: [],
  };

  const form = useForm<ProductoFormValues, any, ProductoFormValues>({
    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
    resolver: zodResolver(productoFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Observar cambios en el nombre para regenerar SKU
  const watchedNombre = form.watch("nombre");

  useEffect(() => {
    if (watchedNombre && watchedNombre.trim().length >= 2) {
      const newSKU = generateSKU(watchedNombre);
      form.setValue("sku", newSKU);
    }
  }, [watchedNombre, form, generateSKU]);

  const onSubmit: SubmitHandler<ProductoFormValues> = async (data) => {
    // Preparar datos base (sin precios, se agregan según el tipo de venta)
    const formattedData: any = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      tipoVenta: data.tipoVenta,

      // Campos de IVA
      tieneIva: Boolean(data.tieneIva),
      tarifaIva: data.tarifaIva && data.tarifaIva !== "" ? Number.parseFloat(data.tarifaIva) : null,

      // Configuración de unidades
      unidadBase: data.unidadBase?.trim() || null,
      unidadVenta: data.unidadVenta?.trim() || null,
      factorConversion: data.factorConversion && data.factorConversion !== "" ? Number.parseFloat(data.factorConversion) : null,
      requiereBalanza: Boolean(data.requiereBalanza),
      pesoAproximado: data.pesoAproximado && data.pesoAproximado !== "" ? Number.parseFloat(data.pesoAproximado) : null,

      // Otros campos
      codigoBarras: data.codigoBarras?.trim() || null,
      sku: data.sku?.trim() || null,
      imagen: data.imagen?.trim() || null,
      imagenCodigoBarras: data.imagenCodigoBarras?.trim() || null,
      enStock: Number.parseFloat(data.enStock),
      stockMinimo: Number.parseFloat(data.stockMinimo),
      activo: Boolean(data.activo),
      categoriaId: data.categoriaId && data.categoriaId !== "sin-categoria" && data.categoriaId !== "" ? data.categoriaId : null,
      proveedorId: data.proveedorId && data.proveedorId !== "sin-proveedor" && data.proveedorId !== "" ? data.proveedorId : null,

      // ✅ GESTIÓN DE VENCIMIENTOS - SIEMPRE SE INCLUYEN
      manejaVencimiento: Boolean(data.manejaVencimiento),
      fechasVencimiento: data.manejaVencimiento && data.fechasVencimiento && data.fechasVencimiento.length > 0 
        ? data.fechasVencimiento 
        : null,
    };

    // Manejo específico según tipo de venta
    if (data.tipoVenta === "PESO") {
      // Para PESO:
      // - Precio de costo: OBLIGATORIO
      // - Precio por kilo: OBLIGATORIO
      // - Precio de venta: Se copia del precio por kilo para que se muestre en el carrito

      formattedData.precioCosto = data.precioCosto && data.precioCosto !== ""
        ? Number.parseFloat(data.precioCosto)
        : null;

      formattedData.precioPorKilo = data.precioPorKilo && data.precioPorKilo !== ""
        ? Number.parseFloat(data.precioPorKilo)
        : null;

      formattedData.precioPorGramo = data.precioPorGramo && data.precioPorGramo !== ""
        ? Number.parseFloat(data.precioPorGramo)
        : null;

      // IMPORTANTE: Para productos por peso, copiamos el precioPorKilo al precio
      // para que se muestre correctamente en el carrito y otras partes
      formattedData.precio = formattedData.precioPorKilo;

      // Validación extra en el cliente
      if (!formattedData.precioCosto || formattedData.precioCosto <= 0) {
        throw new Error("El precio de costo es obligatorio para productos por peso y debe ser mayor a 0");
      }

      if (!formattedData.precioPorKilo || formattedData.precioPorKilo <= 0) {
        throw new Error("El precio por kilo es obligatorio para productos por peso y debe ser mayor a 0");
      }

    } else if (data.tipoVenta === "METRO") {
      // Para METRO:
      // - Precio de costo: OBLIGATORIO
      // - Precio por metro: OBLIGATORIO
      // - Precio de venta: Se copia del precio por metro

      formattedData.precioCosto = data.precioCosto && data.precioCosto !== ""
        ? Number.parseFloat(data.precioCosto)
        : null;

      formattedData.precioPorMetro = data.precioPorMetro && data.precioPorMetro !== ""
        ? Number.parseFloat(data.precioPorMetro)
        : null;

      // IMPORTANTE: Para productos por metro, copiamos el precioPorMetro al precio
      formattedData.precio = formattedData.precioPorMetro;

      // Validación extra en el cliente
      if (!formattedData.precioCosto || formattedData.precioCosto <= 0) {
        throw new Error("El precio de costo es obligatorio para productos por metro y debe ser mayor a 0");
      }

      if (!formattedData.precioPorMetro || formattedData.precioPorMetro <= 0) {
        throw new Error("El precio por metro es obligatorio para productos por metro y debe ser mayor a 0");
      }

    } else if (data.tipoVenta === "LITRO") {
      // Para LITRO:
      // - Precio de costo: OBLIGATORIO
      // - Precio por litro: OBLIGATORIO
      // - Precio de venta: Se copia del precio por litro

      formattedData.precioCosto = data.precioCosto && data.precioCosto !== ""
        ? Number.parseFloat(data.precioCosto)
        : null;

      formattedData.precioPorLitro = data.precioPorLitro && data.precioPorLitro !== ""
        ? Number.parseFloat(data.precioPorLitro)
        : null;

      // IMPORTANTE: Para productos por litro, copiamos el precioPorLitro al precio
      formattedData.precio = formattedData.precioPorLitro;

      // Validación extra en el cliente
      if (!formattedData.precioCosto || formattedData.precioCosto <= 0) {
        throw new Error("El precio de costo es obligatorio para productos por litro y debe ser mayor a 0");
      }

      if (!formattedData.precioPorLitro || formattedData.precioPorLitro <= 0) {
        throw new Error("El precio por litro es obligatorio para productos por litro y debe ser mayor a 0");
      }

    } else if (data.tipoVenta === "PRECIO_LIBRE") {
      // Para PRECIO_LIBRE:
      // - Precio de costo: OBLIGATORIO
      // - Precio de venta: OPCIONAL (usar 0 si está vacío)
      // - Precio sugerido: OPCIONAL

      formattedData.precioCosto = data.precioCosto && data.precioCosto !== ""
        ? Number.parseFloat(data.precioCosto)
        : null;

      formattedData.precio = data.precio && data.precio !== ""
        ? Number.parseFloat(data.precio)
        : 0; // Para precio libre, usar 0 si está vacío

      formattedData.precioSugerido = data.precioSugerido && data.precioSugerido !== ""
        ? Number.parseFloat(data.precioSugerido)
        : null;

      // Validación extra en el cliente
      if (!formattedData.precioCosto || formattedData.precioCosto <= 0) {
        throw new Error("El precio de costo es obligatorio para productos de precio libre y debe ser mayor a 0");
      }

    } else {
      // Para otros tipos (UNIDAD, etc.):
      // - Precio de venta: OBLIGATORIO y debe ser > 0
      // - Precio de costo: OPCIONAL
      // - Precio sugerido: OPCIONAL

      if (!data.precio || data.precio === "") {
        throw new Error("El precio es obligatorio para este tipo de producto");
      }

      formattedData.precio = Number.parseFloat(data.precio);

      if (isNaN(formattedData.precio) || formattedData.precio <= 0) {
        throw new Error("El precio debe ser mayor a 0");
      }

      formattedData.precioCosto = data.precioCosto && data.precioCosto !== ""
        ? Number.parseFloat(data.precioCosto)
        : null;

      formattedData.precioSugerido = data.precioSugerido && data.precioSugerido !== ""
        ? Number.parseFloat(data.precioSugerido)
        : null;

    }

    // ✅ VERIFICACIÓN FINAL DE VENCIMIENTOS
    // Realizar la petición POST
    const response = await fetch("/api/productos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      let errorMessage = "Error al crear el producto";

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.mensaje || errorData.message || errorMessage;
          if (errorData.detalles) {
            errorMessage += ` - Detalles: ${errorData.detalles}`;
          }
        } else {
          const errorText = await response.text();
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
        }
      } catch (parseError) {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }

      console.error("Error del servidor:", errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  };

  return {
    form,
    onSubmit,
    generateSKU,
  };
}
