import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener los detalles de un producto específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = resolvedParams.id;

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
        componentes: {
          include: {
            componente: true,
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

    if (producto.esCombo && producto.componentes.length > 0) {
      let stockCalculado = Infinity;
      for (const comp of producto.componentes) {
        const stockComponente = Number(comp.componente.enStock) || 0;
        const posibles = Math.floor(stockComponente / comp.cantidad);
        if (posibles < stockCalculado) stockCalculado = posibles;
      }
      return NextResponse.json({
        ...producto,
        enStock: stockCalculado === Infinity ? 0 : stockCalculado,
      });
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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = resolvedParams.id;
    const body = await request.json();
    
    const {
      nombre, descripcion, precio, precioCosto, precioSugerido, tipoVenta,
      incluyeIva, tarifaIva, esExentoIva,
      precioPorKilo, precioPorGramo, precioPorMetro, precioPorLitro,
      unidadBase, unidadVenta, factorConversion, requiereBalanza, pesoAproximado,
      codigoBarras, sku, imagen, enStock, stockMinimo, activo, categoriaId, proveedorId,
      esCombo, precioEspecial, diasPrecioEspecial, componentes,
    } = body;

    const productoExistente = await db.producto.findFirst({
      where: { id: productoId, empresaId },
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

    if (tipoVenta !== undefined) {
      const tiposVentaPermitidos = ["UNIDAD", "PESO", "METRO", "LITRO", "SERVICIO", "TIEMPO", "PRECIO_LIBRE"];
      if (!tiposVentaPermitidos.includes(tipoVenta)) {
        return NextResponse.json(
          { mensaje: `El tipo de venta debe ser uno de: ${tiposVentaPermitidos.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const tipoVentaActual = tipoVenta || productoExistente.tipoVenta;

    if (precio !== undefined && precio !== null && precio !== "") {
      if (tipoVentaActual === "PESO" || tipoVentaActual === "PRECIO_LIBRE") {
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) {
          return NextResponse.json({ mensaje: "El precio debe ser un número positivo o cero" }, { status: 400 });
        }
      } else {
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum <= 0) {
          return NextResponse.json({ mensaje: "El precio debe ser un número positivo mayor a 0" }, { status: 400 });
        }
      }
    }

    if (precioSugerido !== undefined && precioSugerido !== null && precioSugerido !== "") {
      if (isNaN(Number(precioSugerido)) || Number(precioSugerido) <= 0) {
        return NextResponse.json({ mensaje: "El precio sugerido debe ser un número positivo" }, { status: 400 });
      }
    }

    if (precioCosto !== undefined && precioCosto !== null && precioCosto !== "") {
      if (isNaN(Number(precioCosto)) || Number(precioCosto) < 0) {
        return NextResponse.json({ mensaje: "El precio de costo debe ser un número positivo o cero" }, { status: 400 });
      }
    }

    if (tipoVentaActual === "PESO") {
      if (precioPorKilo !== undefined && (precioPorKilo === null || precioPorKilo === "" || Number(precioPorKilo) <= 0)) {
        return NextResponse.json({ mensaje: "El precio por kilo es obligatorio para productos vendidos por peso" }, { status: 400 });
      }
      if (precioCosto !== undefined && (precioCosto === null || precioCosto === "" || Number(precioCosto) <= 0)) {
        return NextResponse.json({ mensaje: "El precio de costo es obligatorio para productos vendidos por peso" }, { status: 400 });
      }
    }

    if (tipoVentaActual === "PRECIO_LIBRE") {
      if (precioCosto !== undefined && (precioCosto === null || precioCosto === "" || Number(precioCosto) <= 0)) {
        return NextResponse.json({ mensaje: "El precio de costo es obligatorio para productos de precio libre" }, { status: 400 });
      }
    }

    if (categoriaId && categoriaId !== productoExistente.categoriaId) {
      const categoriaExiste = await db.categoria.findFirst({ where: { id: categoriaId, empresaId } });
      if (!categoriaExiste) {
        return NextResponse.json({ mensaje: "La categoría no existe o no pertenece a su empresa" }, { status: 400 });
      }
    }

    if (proveedorId && proveedorId !== productoExistente.proveedorId) {
      const proveedorExiste = await db.proveedor.findFirst({ where: { id: proveedorId, empresaId } });
      if (!proveedorExiste) {
        return NextResponse.json({ mensaje: "El proveedor no existe o no pertenece a su empresa" }, { status: 400 });
      }
    }

    const datosActualizacion: any = {};

    if (nombre !== undefined) datosActualizacion.nombre = nombre.trim();
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion && descripcion.trim() !== "" ? descripcion.trim() : null;
    
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
    if (incluyeIva !== undefined) datosActualizacion.incluyeIva = Boolean(incluyeIva);
    if (tarifaIva !== undefined) datosActualizacion.tarifaIva = Number(tarifaIva);
    if (esExentoIva !== undefined) {
      datosActualizacion.esExentoIva = Boolean(esExentoIva);
      if (Boolean(esExentoIva)) datosActualizacion.tarifaIva = 0;
    }
    if (precioPorKilo !== undefined) datosActualizacion.precioPorKilo = precioPorKilo && precioPorKilo !== "" ? Number(precioPorKilo) : null;
    if (precioPorGramo !== undefined) datosActualizacion.precioPorGramo = precioPorGramo && precioPorGramo !== "" ? Number(precioPorGramo) : null;
    if (precioPorMetro !== undefined) datosActualizacion.precioPorMetro = precioPorMetro && precioPorMetro !== "" ? Number(precioPorMetro) : null;
    if (precioPorLitro !== undefined) datosActualizacion.precioPorLitro = precioPorLitro && precioPorLitro !== "" ? Number(precioPorLitro) : null;
    if (unidadBase !== undefined) datosActualizacion.unidadBase = unidadBase && unidadBase.trim() !== "" ? unidadBase.trim() : null;
    if (unidadVenta !== undefined) datosActualizacion.unidadVenta = unidadVenta && unidadVenta.trim() !== "" ? unidadVenta.trim() : null;
    if (factorConversion !== undefined) datosActualizacion.factorConversion = factorConversion && factorConversion !== "" ? Number(factorConversion) : null;
    if (requiereBalanza !== undefined) datosActualizacion.requiereBalanza = Boolean(requiereBalanza);
    if (pesoAproximado !== undefined) datosActualizacion.pesoAproximado = pesoAproximado && pesoAproximado !== "" ? Number(pesoAproximado) : null;
    if (codigoBarras !== undefined) datosActualizacion.codigoBarras = codigoBarras && codigoBarras.trim() !== "" ? codigoBarras.trim() : null;
    if (sku !== undefined) datosActualizacion.sku = sku && sku.trim() !== "" ? sku.trim() : null;
    if (imagen !== undefined) datosActualizacion.imagen = imagen && imagen.trim() !== "" ? imagen.trim() : null;
    const esComboFinal = esCombo !== undefined ? Boolean(esCombo) : productoExistente.esCombo;
    if (!esComboFinal && enStock !== undefined) datosActualizacion.enStock = Number(enStock);
    if (stockMinimo !== undefined) datosActualizacion.stockMinimo = Number(stockMinimo);
    if (activo !== undefined) datosActualizacion.activo = Boolean(activo);
    if (categoriaId !== undefined) datosActualizacion.categoriaId = categoriaId && categoriaId.trim() !== "" ? categoriaId : null;
    if (proveedorId !== undefined) datosActualizacion.proveedorId = proveedorId && proveedorId.trim() !== "" ? proveedorId : null;
    if (esCombo !== undefined) datosActualizacion.esCombo = Boolean(esCombo);
    if (precioEspecial !== undefined) datosActualizacion.precioEspecial = precioEspecial && precioEspecial !== "" ? Number(precioEspecial) : null;
    if (diasPrecioEspecial !== undefined) datosActualizacion.diasPrecioEspecial = diasPrecioEspecial ? JSON.stringify(diasPrecioEspecial) : null;

    if (componentes !== undefined && Array.isArray(componentes)) {
      datosActualizacion.componentes = { deleteMany: {} };
      if (esComboFinal && componentes.length > 0) {
        datosActualizacion.componentes.create = componentes.map((comp: any) => ({
          componenteId: comp.componenteId,
          cantidad: Number(comp.cantidad) || 1,
          esCortesia: Boolean(comp.esCortesia),
        }));
      }
    }

    // ── Guardar stock anterior ANTES de actualizar ──────────────────────────
    const stockAnterior = Number(productoExistente.enStock);
    const nuevoStockVal = datosActualizacion.enStock; // undefined si no se envió

    // Actualizar el producto
    const productoActualizado = await db.producto.update({
      where: { id: productoId },
      data: datosActualizacion,
      include: {
        categoria: true,
        proveedor: {
          select: { id: true, nombre: true, empresa: true },
        },
        componentes: {
          include: { componente: true },
        },
      },
    });

    // ── Registrar movimiento de inventario si cambió el stock ───────────────
    // Solo aplica a productos que NO son combo y cuando se envió enStock en el body
    if (
      !esComboFinal &&
      nuevoStockVal !== undefined &&
      nuevoStockVal !== stockAnterior
    ) {
      const diferencia = nuevoStockVal - stockAnterior;
      const tipoMovimiento: "ENTRADA" | "SALIDA" | null =
        diferencia > 0 ? "ENTRADA" : diferencia < 0 ? "SALIDA" : null;

      if (tipoMovimiento) {
        await db.movimientoInventario.create({
          data: {
            productoId,
            usuarioId: session.user.id,
            cantidad: Math.abs(diferencia),
            tipo: tipoMovimiento,
            stockPrevio: stockAnterior,
            stockNuevo: nuevoStockVal,
            motivo:
              (body.motivoStock as string | undefined)?.trim() ||
              `Ajuste de stock desde edición de producto`,
            fechaMovimiento: new Date(),
          },
        });
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // Si es combo, calcular y devolver el stock dinámico en la respuesta
    if (productoActualizado.esCombo && productoActualizado.componentes.length > 0) {
      let stockCalculado = Infinity;
      for (const comp of productoActualizado.componentes) {
        const stockComponente = Number(comp.componente.enStock) || 0;
        const posibles = Math.floor(stockComponente / comp.cantidad);
        if (posibles < stockCalculado) stockCalculado = posibles;
      }
      return NextResponse.json({
        ...productoActualizado,
        enStock: stockCalculado === Infinity ? 0 : stockCalculado,
      });
    }

    return NextResponse.json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);

    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { mensaje: "Ya existe un producto con esos datos únicos (código de barras o SKU)" },
          { status: 400 }
        );
      }
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const productoId = resolvedParams.id;

    const producto = await db.producto.findFirst({
      where: { id: productoId, empresaId },
    });

    if (!producto) {
      return NextResponse.json(
        { mensaje: "Producto no encontrado o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    const productoEnVentas = await db.itemVenta.findFirst({
      where: { productoId },
    });

    if (productoEnVentas) {
      const productoDesactivado = await db.producto.update({
        where: { id: productoId },
        data: { activo: false },
      });
      return NextResponse.json({
        mensaje: "El producto ha sido desactivado porque está asociado a ventas",
        producto: productoDesactivado,
      });
    }

    await db.producto.delete({ where: { id: productoId } });

    return NextResponse.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}