import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener los detalles de un producto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = params.id;

    const producto = await db.producto.findFirst({
      where: {
        id: productoId,
        empresaId,
      },
      include: {
        categoria: true,
        proveedor: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
          },
        },
      },
    });

    if (!producto) {
      return NextResponse.json(
        { mensaje: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error al obtener detalles del producto:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener detalles del producto" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un producto existente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = params.id;
    const body = await request.json();
    
    const {
      // Campos básicos
      nombre,
      descripcion,
      precio,
      precioCosto,
      precioSugerido,
      tipoVenta,

       // Campos de IVA
      incluyeIva,
      tarifaIva,
      esExentoIva,
      
      // Nuevos campos de unidades de medida
      precioPorKilo,
      precioPorGramo,
      precioPorMetro,
      precioPorLitro,
      unidadBase,
      unidadVenta,
      factorConversion,
      requiereBalanza,
      pesoAproximado,
      
      // Campos existentes
      codigoBarras,
      sku,
      imagen,
      enStock,
      stockMinimo,
      activo,
      categoriaId,
      proveedorId,
    } = body;

    // Verificar que el producto exista y pertenezca a la empresa
    const productoExistente = await db.producto.findFirst({
      where: {
        id: productoId,
        empresaId,
      },
    });

    if (!productoExistente) {
      return NextResponse.json(
        { mensaje: "Producto no encontrado o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    if (tarifaIva !== undefined) {
      const tarifaNumerico = Number(tarifaIva);
      if (![0, 5, 19].includes(tarifaNumerico)) {
        return NextResponse.json(
          { mensaje: "La tarifa de IVA debe ser 0%, 5% o 19%" },
          { status: 400 }
        );
      }
    }

    // Validar tipo de venta si se proporciona
    if (tipoVenta !== undefined) {
      const tiposVentaPermitidos = ["UNIDAD", "PESO", "METRO", "LITRO", "SERVICIO", "TIEMPO", "PRECIO_LIBRE"];
      
      if (!tiposVentaPermitidos.includes(tipoVenta)) {
        return NextResponse.json(
          { mensaje: `El tipo de venta debe ser uno de: ${tiposVentaPermitidos.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validación condicional del precio basada en tipoVenta actual o nueva
    const tipoVentaActual = tipoVenta || productoExistente.tipoVenta;
    
    // Validar que el precio sea numérico si se proporciona (para tipos que NO son PESO ni PRECIO_LIBRE)
    if (precio !== undefined && precio !== null && precio !== "") {
      // Para PESO y PRECIO_LIBRE, el precio puede ser 0 o vacío (opcional)
      if (tipoVentaActual === "PESO" || tipoVentaActual === "PRECIO_LIBRE") {
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) {
          return NextResponse.json(
            { mensaje: "El precio debe ser un número positivo o cero" },
            { status: 400 }
          );
        }
      } else {
        // Para otros tipos, el precio debe ser mayor a 0
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum <= 0) {
          return NextResponse.json(
            { mensaje: "El precio debe ser un número positivo mayor a 0" },
            { status: 400 }
          );
        }
      }
    }

    // Validar precio sugerido si se proporciona
    if (precioSugerido !== undefined && precioSugerido !== null && precioSugerido !== "") {
      if (isNaN(Number(precioSugerido)) || Number(precioSugerido) <= 0) {
        return NextResponse.json(
          { mensaje: "El precio sugerido debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Validar precio de costo si se proporciona
    if (precioCosto !== undefined && precioCosto !== null && precioCosto !== "") {
      if (isNaN(Number(precioCosto)) || Number(precioCosto) < 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo debe ser un número positivo o cero" },
          { status: 400 }
        );
      }
    }

    // Validación específica para productos por PESO
    if (tipoVentaActual === "PESO") {
      // Para PESO, validar que precioPorKilo exista si se está actualizando
      if (precioPorKilo !== undefined) {
        if (precioPorKilo === null || precioPorKilo === "" || Number(precioPorKilo) <= 0) {
          return NextResponse.json(
            { mensaje: "El precio por kilo es obligatorio para productos vendidos por peso" },
            { status: 400 }
          );
        }
      }

      // Validar que precioCosto exista para PESO
      if (precioCosto !== undefined) {
        if (precioCosto === null || precioCosto === "" || Number(precioCosto) <= 0) {
          return NextResponse.json(
            { mensaje: "El precio de costo es obligatorio para productos vendidos por peso" },
            { status: 400 }
          );
        }
      }
    }

    // Validación específica para PRECIO_LIBRE
    if (tipoVentaActual === "PRECIO_LIBRE") {
      // Para PRECIO_LIBRE, validar que precioCosto exista
      if (precioCosto !== undefined) {
        if (precioCosto === null || precioCosto === "" || Number(precioCosto) <= 0) {
          return NextResponse.json(
            { mensaje: "El precio de costo es obligatorio para productos de precio libre" },
            { status: 400 }
          );
        }
      }
    }

    // Validar precios específicos por unidad
    const validarPrecioUnidad = (valor: any, nombreCampo: string) => {
      if (valor !== undefined && valor !== null && valor !== "") {
        const numero = Number(valor);
        if (isNaN(numero) || numero <= 0) {
          return `${nombreCampo} debe ser un número positivo`;
        }
      }
      return null;
    };

    const erroresValidacion = [
      validarPrecioUnidad(precioPorKilo, "El precio por kilo"),
      validarPrecioUnidad(precioPorGramo, "El precio por gramo"),
      validarPrecioUnidad(precioPorMetro, "El precio por metro"),
      validarPrecioUnidad(precioPorLitro, "El precio por litro"),
      validarPrecioUnidad(factorConversion, "El factor de conversión"),
      validarPrecioUnidad(pesoAproximado, "El peso aproximado"),
    ].filter(Boolean);

    if (erroresValidacion.length > 0) {
      return NextResponse.json(
        { mensaje: erroresValidacion[0] },
        { status: 400 }
      );
    }

    // Validar stock si se proporciona
    if (enStock !== undefined && (isNaN(Number(enStock)) || Number(enStock) < 0)) {
      return NextResponse.json(
        { mensaje: "El stock debe ser un número positivo o cero" },
        { status: 400 }
      );
    }

    if (stockMinimo !== undefined && (isNaN(Number(stockMinimo)) || Number(stockMinimo) < 0)) {
      return NextResponse.json(
        { mensaje: "El stock mínimo debe ser un número positivo o cero" },
        { status: 400 }
      );
    }

    // Si se proporciona código de barras, verificar que no exista en otro producto
    if (codigoBarras && codigoBarras !== productoExistente.codigoBarras) {
      const existeConCodigoBarras = await db.producto.findFirst({
        where: {
          codigoBarras,
          empresaId,
          id: { not: productoId },
        },
      });

      if (existeConCodigoBarras) {
        return NextResponse.json(
          { mensaje: "Ya existe otro producto con ese código de barras" },
          { status: 400 }
        );
      }
    }

    // Verificar que la categoría exista y pertenezca a la empresa (si se proporciona)
    if (categoriaId && categoriaId !== productoExistente.categoriaId) {
      const categoriaExiste = await db.categoria.findFirst({
        where: {
          id: categoriaId,
          empresaId,
        },
      });

      if (!categoriaExiste) {
        return NextResponse.json(
          { mensaje: "La categoría no existe o no pertenece a su empresa" },
          { status: 400 }
        );
      }
    }

    // Verificar que el proveedor exista y pertenezca a la empresa (si se proporciona)
    if (proveedorId && proveedorId !== productoExistente.proveedorId) {
      const proveedorExiste = await db.proveedor.findFirst({
        where: {
          id: proveedorId,
          empresaId,
        },
      });

      if (!proveedorExiste) {
        return NextResponse.json(
          { mensaje: "El proveedor no existe o no pertenece a su empresa" },
          { status: 400 }
        );
      }
    }

    // Construir objeto de datos para actualizar
    const datosActualizacion: any = {};

    // Campos básicos
    if (nombre !== undefined) datosActualizacion.nombre = nombre.trim();
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion && descripcion.trim() !== "" ? descripcion.trim() : null;
    
    // Para PESO y PRECIO_LIBRE, el precio puede ser 0 o null
    if (precio !== undefined) {
      if (tipoVentaActual === "PESO" || tipoVentaActual === "PRECIO_LIBRE") {
        datosActualizacion.precio = precio && precio !== "" ? Number(precio) : 0;
      } else {
        datosActualizacion.precio = precio && precio !== "" ? Number(precio) : null;
      }
    }
    
    if (precioCosto !== undefined) datosActualizacion.precioCosto = precioCosto && precioCosto !== "" ? Number(precioCosto) : null;
    if (precioSugerido !== undefined) datosActualizacion.precioSugerido = precioSugerido && precioSugerido !== "" ? Number(precioSugerido) : null;
    if (tipoVenta !== undefined) datosActualizacion.tipoVenta = tipoVenta;

    // Campos de IVA
    if (incluyeIva !== undefined) datosActualizacion.incluyeIva = Boolean(incluyeIva);
    if (tarifaIva !== undefined) datosActualizacion.tarifaIva = Number(tarifaIva);
    if (esExentoIva !== undefined) {
      datosActualizacion.esExentoIva = Boolean(esExentoIva);
      // Si se marca como exento, poner tarifa en 0
      if (Boolean(esExentoIva)) {
        datosActualizacion.tarifaIva = 0;
      }
    }

    // Nuevos campos de unidades
    if (precioPorKilo !== undefined) datosActualizacion.precioPorKilo = precioPorKilo && precioPorKilo !== "" ? Number(precioPorKilo) : null;
    if (precioPorGramo !== undefined) datosActualizacion.precioPorGramo = precioPorGramo && precioPorGramo !== "" ? Number(precioPorGramo) : null;
    if (precioPorMetro !== undefined) datosActualizacion.precioPorMetro = precioPorMetro && precioPorMetro !== "" ? Number(precioPorMetro) : null;
    if (precioPorLitro !== undefined) datosActualizacion.precioPorLitro = precioPorLitro && precioPorLitro !== "" ? Number(precioPorLitro) : null;
    if (unidadBase !== undefined) datosActualizacion.unidadBase = unidadBase && unidadBase.trim() !== "" ? unidadBase.trim() : null;
    if (unidadVenta !== undefined) datosActualizacion.unidadVenta = unidadVenta && unidadVenta.trim() !== "" ? unidadVenta.trim() : null;
    if (factorConversion !== undefined) datosActualizacion.factorConversion = factorConversion && factorConversion !== "" ? Number(factorConversion) : null;
    if (requiereBalanza !== undefined) datosActualizacion.requiereBalanza = Boolean(requiereBalanza);
    if (pesoAproximado !== undefined) datosActualizacion.pesoAproximado = pesoAproximado && pesoAproximado !== "" ? Number(pesoAproximado) : null;

    // Campos existentes
    if (codigoBarras !== undefined) datosActualizacion.codigoBarras = codigoBarras && codigoBarras.trim() !== "" ? codigoBarras.trim() : null;
    if (sku !== undefined) datosActualizacion.sku = sku && sku.trim() !== "" ? sku.trim() : null;
    if (imagen !== undefined) datosActualizacion.imagen = imagen && imagen.trim() !== "" ? imagen.trim() : null;
    if (enStock !== undefined) datosActualizacion.enStock = Number(enStock);
    if (stockMinimo !== undefined) datosActualizacion.stockMinimo = Number(stockMinimo);
    if (activo !== undefined) datosActualizacion.activo = Boolean(activo);
    if (categoriaId !== undefined) datosActualizacion.categoriaId = categoriaId && categoriaId.trim() !== "" ? categoriaId : null;
    if (proveedorId !== undefined) datosActualizacion.proveedorId = proveedorId && proveedorId.trim() !== "" ? proveedorId : null;

    console.log("Datos a actualizar:", datosActualizacion);

    // Actualizar el producto
    const productoActualizado = await db.producto.update({
      where: {
        id: productoId,
      },
      data: datosActualizacion,
      include: {
        categoria: true,
        proveedor: {
          select: {
            id: true,
            nombre: true,
            empresa: true,
          },
        },
      },
    });

    return NextResponse.json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);

    // Manejar errores específicos de Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;

      // Error de constraint único
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { mensaje: "Ya existe un producto con esos datos únicos (código de barras o SKU)" },
          { status: 400 }
        );
      }

      // Error de foreign key
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { mensaje: "La categoría o proveedor seleccionado no es válido" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { mensaje: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = params.id;

    // Verificar que el producto exista y pertenezca a la empresa
    const producto = await db.producto.findFirst({
      where: {
        id: productoId,
        empresaId,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { mensaje: "Producto no encontrado o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Verificar si el producto está siendo utilizado en ventas
    const productoEnVentas = await db.itemVenta.findFirst({
      where: {
        productoId,
      },
    });

    if (productoEnVentas) {
      // Opción 2: Desactivar el producto en lugar de eliminarlo
      const productoDesactivado = await db.producto.update({
        where: {
          id: productoId,
        },
        data: {
          activo: false,
        },
      });

      return NextResponse.json({
        mensaje: "El producto ha sido desactivado porque está asociado a ventas",
        producto: productoDesactivado,
      });
    }

    // Si no está siendo utilizado, eliminar el producto
    await db.producto.delete({
      where: {
        id: productoId,
      },
    });

    return NextResponse.json({
      mensaje: "Producto eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}