// app/api/pos/productos/buscar-por-codigo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Autenticación
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = token.empresaId as string;
    const url = new URL(req.url);
    const codigo = url.searchParams.get("codigo");

    // Validar que se envió el código
    if (!codigo || codigo.trim() === "") {
      return NextResponse.json(
        { error: "El código de barras es requerido" },
        { status: 400 }
      );
    }

    // 1. Buscar primero en productos principales
    let producto = await db.producto.findFirst({
      where: {
        codigoBarras: codigo.trim(),
        empresaId: empresaId,
        activo: true,
      },
      include: {
        categoria: {
          select: { id: true, nombre: true }
        }
      },
    });

    let variantePreseleccionada = null;

    // 2. Si no se encuentra, buscar en variantes
    if (!producto) {
      const variante = await db.varianteProducto.findFirst({
        where: {
          codigoBarras: codigo.trim(),
          activo: true,
          producto: {
            empresaId: empresaId,
            activo: true,
          },
        },
        include: {
          producto: {
            include: {
              categoria: {
                select: { id: true, nombre: true }
              }
            }
          },
        },
      });

      if (variante) {
        producto = variante.producto;
        variantePreseleccionada = {
          id: variante.id,
          nombre: variante.nombre,
          precio: variante.precio ? Number(variante.precio) : null,
          enStock: variante.enStock,
          codigoBarras: variante.codigoBarras,
          sku: variante.sku,
          talla: variante.talla,
          color: variante.color,
          material: variante.material
        };
      }
    }

    // 3. Si no se encuentra en ningún lado
    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado", codigo },
        { status: 404 }
      );
    }

    // 4. Obtener variantes disponibles
    const variantes = await db.varianteProducto.findMany({
      where: {
        productoId: producto.id,
        activo: true
      },
      orderBy: { nombre: "asc" }
    });

    // 5. Verificar disponibilidad
    const stockDisponible = variantePreseleccionada 
      ? variantePreseleccionada.enStock 
      : Number(producto.enStock);
    
    if (stockDisponible <= 0 && producto.tipoVenta !== "SERVICIO") {
      return NextResponse.json(
        { 
          error: "Sin stock", 
          mensaje: `${producto.nombre} no tiene unidades disponibles`,
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            enStock: stockDisponible
          }
        },
        { status: 400 }
      );
    }

    // 6. Transformar el producto para el POS
    const productoParaPOS = {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: variantePreseleccionada?.precio || Number(producto.precio || 0),
      precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
      precioSugerido: producto.precioSugerido ? Number(producto.precioSugerido) : null,
      tipoVenta: producto.tipoVenta,
      imagen: producto.imagen,
      codigoBarras: producto.codigoBarras,
      sku: producto.sku,
      enStock: stockDisponible,
      stockMinimo: Number(producto.stockMinimo),
      empresaId: producto.empresaId,
      categoria: producto.categoria?.nombre || "Sin categoría",
      categoriaId: producto.categoria?.id || null,
      
      // Campos de IVA
      incluyeIva: producto.incluyeIva,
      tarifaIva: producto.tarifaIva ? Number(producto.tarifaIva) : 0,
      esExentoIva: producto.esExentoIva,
      
      // Campos de unidades de medida
      precioPorKilo: producto.precioPorKilo ? Number(producto.precioPorKilo) : null,
      precioPorGramo: producto.precioPorGramo ? Number(producto.precioPorGramo) : null,
      precioPorMetro: producto.precioPorMetro ? Number(producto.precioPorMetro) : null,
      precioPorLitro: producto.precioPorLitro ? Number(producto.precioPorLitro) : null,
      unidadBase: producto.unidadBase,
      unidadVenta: producto.unidadVenta,
      factorConversion: producto.factorConversion ? Number(producto.factorConversion) : null,
      requiereBalanza: producto.requiereBalanza,
      pesoAproximado: producto.pesoAproximado ? Number(producto.pesoAproximado) : null,
      
      // Variante preseleccionada (si el código era de una variante)
      variantePreseleccionada: variantePreseleccionada,
      
      // Variantes disponibles
      // @ts-expect-error Autofix Next15 o tipos implícitos
      variantes: variantes.map((v) => ({
        id: v.id,
        nombre: v.nombre,
        precio: v.precio ? Number(v.precio) : null,
        enStock: v.enStock,
        codigoBarras: v.codigoBarras,
        sku: v.sku,
        talla: v.talla,
        color: v.color,
        material: v.material,
        activo: v.activo
      })),
      
      // Flags adicionales
      tieneVariantes: variantes.length > 0,
      esServicio: producto.tipoVenta === "SERVICIO",
      esVariante: !!variantePreseleccionada
    };

    return NextResponse.json(productoParaPOS);

  } catch (error) {
    console.error("Error al buscar producto por código:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}