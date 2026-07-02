import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todos los productos de la empresa actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    // Opciones de filtrado
    const categoriaId = searchParams.get("categoriaId");
    const busqueda = searchParams.get("busqueda");
    const activo = searchParams.get("activo");
    const stockBajo = searchParams.get("stockBajo");
    const soloInventario = searchParams.get("inventario");

    // Opciones de paginación
    const pagina = Number.parseInt(searchParams.get("pagina") || "1");
    const limite = Number.parseInt(searchParams.get("limite") || "20");
    const omitir = (pagina - 1) * limite;

    // Construir la consulta
    const whereClause: any = { empresaId };

    if (categoriaId) {
      whereClause.categoriaId = categoriaId;
    }

    if (busqueda) {
      whereClause.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { descripcion: { contains: busqueda, mode: 'insensitive' } },
        { codigoBarras: { contains: busqueda, mode: 'insensitive' } },
        { sku: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    if (activo === "true") {
      whereClause.activo = true;
    } else if (activo === "false") {
      whereClause.activo = false;
    }

    // Para vista de inventario, incluir más información
    const includeClause = {
      categoria: {
        select: {
          id: true,
          nombre: true
        }
      },
      proveedor: {
        select: {
          id: true,
          nombre: true,
          empresa: true,
        },
      },
      // Solo para vista de inventario
      ...(soloInventario === "true" && {
        movimientosInventario: {
          orderBy: {
            fechaMovimiento: 'desc' as const
          },
          take: 1,
          select: {
            fechaMovimiento: true,
            usuario: {
              select: {
                nombre: true
              }
            }
          }
        }
      })
    };

    // Contar productos para la paginación
    const totalProductos = await db.producto.count({
      where: whereClause,
    });

    // Obtener productos
    const productos = await db.producto.findMany({
      where: whereClause,
      include: includeClause,
      orderBy: {
        nombre: "asc",
      },
      skip: omitir,
      take: limite,
    });

    // Transformar datos para vista de inventario
    if (soloInventario === "true") {
      const productosInventario = productos.map(producto => {
        const stock = Number(producto.enStock);
        const stockMinimo = Number(producto.stockMinimo);
        
        // Determinar estado del stock
        let estado: "normal" | "bajo" | "agotado" = "normal";
        if (stock === 0) {
          estado = "agotado";
        } else if (stock <= stockMinimo) {
          estado = "bajo";
        }

        return {
          id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria?.nombre || "Sin categoría",
          stock,
          stockMinimo,
          precio: producto.precio ? Number(producto.precio) : null,
          precioSugerido: producto.precioSugerido ? Number(producto.precioSugerido) : null,
          ultimaActualizacion: producto.movimientosInventario[0]?.fechaMovimiento?.toISOString() || producto.fechaActualizacion.toISOString(),
          estado,
          sku: producto.sku,
          codigoBarras: producto.codigoBarras,
          activo: producto.activo,
          // Campos de unidades
          tipoVenta: producto.tipoVenta,
          unidadBase: producto.unidadBase,
          unidadVenta: producto.unidadVenta,
          requiereBalanza: producto.requiereBalanza,
        };
      });

      // Filtrar por stock bajo si se solicita
      const productosFiltrados = stockBajo === "true" 
        ? productosInventario.filter(p => p.estado === "bajo" || p.estado === "agotado")
        : productosInventario;

      return NextResponse.json({
        datos: productosFiltrados,
        meta: {
          total: stockBajo === "true" ? productosFiltrados.length : totalProductos,
          pagina,
          limite,
          totalPaginas: Math.ceil((stockBajo === "true" ? productosFiltrados.length : totalProductos) / limite),
        },
      });
    }

    // Respuesta normal para otras vistas - transformar productos para incluir precioSugerido
    const productosTransformados = productos.map(producto => ({
      ...producto,
      precio: producto.precio ? Number(producto.precio) : null,
      precioSugerido: producto.precioSugerido ? Number(producto.precioSugerido) : null,
      precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
    }));

    return NextResponse.json({
      datos: productosTransformados,
      meta: {
        total: totalProductos,
        pagina,
        limite,
        totalPaginas: Math.ceil(totalProductos / limite),
      },
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    let body;
    
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return NextResponse.json(
        { mensaje: "El cuerpo de la petición no es válido JSON" },
        { status: 400 }
      );
    }

    console.log("Body recibido:", body);

    const {
      // Campos básicos
      nombre,
      descripcion,
      precio,
      precioCosto,
      precioSugerido,
      tipoVenta,
      
      // Campos de IVA - del formulario vienen tieneIva y tarifaIva
      tieneIva,
      tarifaIva,
      
      // Precios por unidad de medida
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
      imagenCodigoBarras,
      enStock,
      stockMinimo,
      activo,
      categoriaId,
      proveedorId,
      
      // ✅ CAMPOS DE VENCIMIENTO AGREGADOS
      manejaVencimiento,
      fechasVencimiento,
    } = body;

    // Validación básica
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === "") {
      return NextResponse.json(
        { mensaje: "El nombre es requerido y debe ser una cadena válida" },
        { status: 400 }
      );
    }

    // Validar tipo de venta
    const tipoVentaValido = tipoVenta || "UNIDAD";
    const tiposVentaPermitidos = ["UNIDAD", "PESO", "METRO", "LITRO", "SERVICIO", "TIEMPO", "PRECIO_LIBRE"];
    
    if (!tiposVentaPermitidos.includes(tipoVentaValido)) {
      return NextResponse.json(
        { mensaje: `Tipo de venta inválido. Debe ser uno de: ${tiposVentaPermitidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Validar precio según tipo de venta
    let precioNumerico = null;
    let precioCostoNumerico = null;
    let precioSugeridoNumerico = null;

    // Precio de costo (común para varios tipos)
    if (precioCosto !== undefined && precioCosto !== null && precioCosto !== "") {
      precioCostoNumerico = Number(precioCosto);
      if (isNaN(precioCostoNumerico) || precioCostoNumerico < 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Precio sugerido (opcional para algunos tipos)
    if (precioSugerido !== undefined && precioSugerido !== null && precioSugerido !== "") {
      precioSugeridoNumerico = Number(precioSugerido);
      if (isNaN(precioSugeridoNumerico) || precioSugeridoNumerico < 0) {
        return NextResponse.json(
          { mensaje: "El precio sugerido debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Validaciones específicas por tipo de venta
    if (tipoVentaValido === "PESO") {
      // Para PESO: precio de costo y precio por kilo son OBLIGATORIOS
      if (!precioCostoNumerico || precioCostoNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo es obligatorio y debe ser mayor a 0 para productos por peso" },
          { status: 400 }
        );
      }

      if (!precioPorKilo || precioPorKilo === "") {
        return NextResponse.json(
          { mensaje: "El precio por kilo es obligatorio para productos vendidos por peso" },
          { status: 400 }
        );
      }

      const precioPorKiloNum = Number(precioPorKilo);
      if (isNaN(precioPorKiloNum) || precioPorKiloNum <= 0) {
        return NextResponse.json(
          { mensaje: "El precio por kilo debe ser un número mayor a 0" },
          { status: 400 }
        );
      }

      // El precio de venta se copia del precio por kilo
      precioNumerico = precioPorKiloNum;
    } else if (tipoVentaValido === "METRO") {
      // Para METRO: precio de costo y precio por metro son OBLIGATORIOS
      if (!precioCostoNumerico || precioCostoNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo es obligatorio y debe ser mayor a 0 para productos por metro" },
          { status: 400 }
        );
      }

      if (!precioPorMetro || precioPorMetro === "") {
        return NextResponse.json(
          { mensaje: "El precio por metro es obligatorio para productos vendidos por metro" },
          { status: 400 }
        );
      }

      const precioPorMetroNum = Number(precioPorMetro);
      if (isNaN(precioPorMetroNum) || precioPorMetroNum <= 0) {
        return NextResponse.json(
          { mensaje: "El precio por metro debe ser un número mayor a 0" },
          { status: 400 }
        );
      }

      // El precio de venta se copia del precio por metro
      precioNumerico = precioPorMetroNum;
    } else if (tipoVentaValido === "LITRO") {
      // Para LITRO: precio de costo y precio por litro son OBLIGATORIOS
      if (!precioCostoNumerico || precioCostoNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo es obligatorio y debe ser mayor a 0 para productos por litro" },
          { status: 400 }
        );
      }

      if (!precioPorLitro || precioPorLitro === "") {
        return NextResponse.json(
          { mensaje: "El precio por litro es obligatorio para productos vendidos por litro" },
          { status: 400 }
        );
      }

      const precioPorLitroNum = Number(precioPorLitro);
      if (isNaN(precioPorLitroNum) || precioPorLitroNum <= 0) {
        return NextResponse.json(
          { mensaje: "El precio por litro debe ser un número mayor a 0" },
          { status: 400 }
        );
      }

      // El precio de venta se copia del precio por litro
      precioNumerico = precioPorLitroNum;
    } else if (tipoVentaValido === "PRECIO_LIBRE") {
      // Para PRECIO_LIBRE: precio de costo es OBLIGATORIO, precio de venta puede ser 0
      if (!precioCostoNumerico || precioCostoNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio de costo es obligatorio y debe ser mayor a 0 para productos de precio libre" },
          { status: 400 }
        );
      }

      // Para precio libre, el precio puede ser 0 (se ingresa en el momento de venta)
      if (precio !== undefined && precio !== null && precio !== "") {
        precioNumerico = Number(precio);
        if (isNaN(precioNumerico) || precioNumerico < 0) {
          return NextResponse.json(
            { mensaje: "El precio debe ser un número positivo o cero" },
            { status: 400 }
          );
        }
      } else {
        precioNumerico = 0;
      }
    } else {
      // Para UNIDAD y otros: precio es OBLIGATORIO
      if (!precio || precio === "") {
        return NextResponse.json(
          { mensaje: "El precio es obligatorio para productos vendidos por unidad" },
          { status: 400 }
        );
      }

      precioNumerico = Number(precio);
      if (isNaN(precioNumerico) || precioNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio debe ser mayor a 0" },
          { status: 400 }
        );
      }
    }

    // Validar campos de IVA
    let tarifaIvaNumerico = 19; // Valor por defecto
    let incluyeIvaBoolean = true;
    let esExentoIvaBoolean = false;

    if (tieneIva !== undefined && tieneIva !== null) {
      const tieneIvaBoolean = Boolean(tieneIva);
      
      if (tieneIvaBoolean) {
        // Si tiene IVA, validar la tarifa
        if (tarifaIva !== undefined && tarifaIva !== null && tarifaIva !== "") {
          tarifaIvaNumerico = Number(tarifaIva);
          if (isNaN(tarifaIvaNumerico) || tarifaIvaNumerico < 0 || tarifaIvaNumerico > 100) {
            return NextResponse.json(
              { mensaje: "La tarifa de IVA debe ser un número entre 0 y 100" },
              { status: 400 }
            );
          }
        }
        esExentoIvaBoolean = false;
      } else {
        // Si no tiene IVA, está exento
        tarifaIvaNumerico = 0;
        esExentoIvaBoolean = true;
      }
    }

    // Validar precios por unidad de medida
    let precioPorKiloNumerico = null;
    let precioPorGramoNumerico = null;
    let precioPorMetroNumerico = null;
    let precioPorLitroNumerico = null;

    if (tipoVentaValido === "PESO") {
      // Ya validamos precioPorKilo arriba
      precioPorKiloNumerico = Number(precioPorKilo);
      
      if (precioPorGramo !== undefined && precioPorGramo !== null && precioPorGramo !== "") {
        precioPorGramoNumerico = Number(precioPorGramo);
        if (isNaN(precioPorGramoNumerico) || precioPorGramoNumerico <= 0) {
          return NextResponse.json(
            { mensaje: "El precio por gramo debe ser un número positivo" },
            { status: 400 }
          );
        }
      }
    }

    if (tipoVentaValido === "METRO" && precioPorMetro !== undefined && precioPorMetro !== null && precioPorMetro !== "") {
      precioPorMetroNumerico = Number(precioPorMetro);
      if (isNaN(precioPorMetroNumerico) || precioPorMetroNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio por metro debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    if (tipoVentaValido === "LITRO" && precioPorLitro !== undefined && precioPorLitro !== null && precioPorLitro !== "") {
      precioPorLitroNumerico = Number(precioPorLitro);
      if (isNaN(precioPorLitroNumerico) || precioPorLitroNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El precio por litro debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Validar factor de conversión
    let factorConversionNumerico = null;
    if (factorConversion !== undefined && factorConversion !== null && factorConversion !== "") {
      factorConversionNumerico = Number(factorConversion);
      if (isNaN(factorConversionNumerico) || factorConversionNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El factor de conversión debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Validar peso aproximado
    let pesoAproximadoNumerico = null;
    if (pesoAproximado !== undefined && pesoAproximado !== null && pesoAproximado !== "") {
      pesoAproximadoNumerico = Number(pesoAproximado);
      if (isNaN(pesoAproximadoNumerico) || pesoAproximadoNumerico <= 0) {
        return NextResponse.json(
          { mensaje: "El peso aproximado debe ser un número positivo" },
          { status: 400 }
        );
      }
    }

    // Validar stock
    if (enStock === undefined || enStock === null) {
      return NextResponse.json(
        { mensaje: "El stock es requerido" },
        { status: 400 }
      );
    }

    const enStockNumerico = Number(enStock);
    if (isNaN(enStockNumerico) || enStockNumerico < 0) {
      return NextResponse.json(
        { mensaje: "El stock debe ser un número positivo o cero" },
        { status: 400 }
      );
    }

    if (stockMinimo === undefined || stockMinimo === null) {
      return NextResponse.json(
        { mensaje: "El stock mínimo es requerido" },
        { status: 400 }
      );
    }

    const stockMinimoNumerico = Number(stockMinimo);
    if (isNaN(stockMinimoNumerico) || stockMinimoNumerico < 0) {
      return NextResponse.json(
        { mensaje: "El stock mínimo debe ser un número positivo o cero" },
        { status: 400 }
      );
    }

    // Verificar código de barras único
    if (codigoBarras && typeof codigoBarras === 'string' && codigoBarras.trim() !== "") {
      const productoExistente = await db.producto.findFirst({
        where: {
          codigoBarras: codigoBarras.trim(),
          empresaId,
        },
      });

      if (productoExistente) {
        return NextResponse.json(
          { mensaje: "Ya existe un producto con ese código de barras" },
          { status: 400 }
        );
      }
    }

    // Verificar categoría
    if (categoriaId && typeof categoriaId === 'string' && categoriaId.trim() !== "") {
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

    // Verificar proveedor
    if (proveedorId && typeof proveedorId === 'string' && proveedorId.trim() !== "") {
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

    // ✅ VALIDAR FECHAS DE VENCIMIENTO
    let fechasVencimientoValidadas = null;

    if (manejaVencimiento && fechasVencimiento) {
      // Verificar que sea un array
      if (!Array.isArray(fechasVencimiento)) {
        return NextResponse.json(
          { mensaje: "Las fechas de vencimiento deben ser un array" },
          { status: 400 }
        );
      }

      // Validar cada fecha de vencimiento
      try {
        fechasVencimientoValidadas = fechasVencimiento.map((vencimiento, index) => {
          if (!vencimiento.fecha) {
            throw new Error(`La fecha es requerida en el lote ${index + 1}`);
          }

          // Validar que la fecha sea válida
          const fechaObj = new Date(vencimiento.fecha);
          if (isNaN(fechaObj.getTime())) {
            throw new Error(`La fecha del lote ${index + 1} no es válida`);
          }

          if (vencimiento.cantidad === undefined || vencimiento.cantidad === null) {
            throw new Error(`La cantidad es requerida en el lote ${index + 1}`);
          }

          const cantidad = Number(vencimiento.cantidad);
          if (isNaN(cantidad) || cantidad < 0) {
            throw new Error(`La cantidad del lote ${index + 1} debe ser un número positivo o cero`);
          }

          return {
            fecha: vencimiento.fecha,
            cantidad: cantidad,
            lote: vencimiento.lote || null,
          };
        });

        console.log("Fechas de vencimiento validadas:", fechasVencimientoValidadas);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al validar fechas de vencimiento";
        return NextResponse.json(
          { mensaje: errorMessage },
          { status: 400 }
        );
      }
    }

    // Preparar datos del producto
    const productoData = {
      // Campos básicos
      nombre: nombre.trim(),
      descripcion: descripcion && typeof descripcion === 'string' ? descripcion.trim() : null,
      precio: precioNumerico,
      precioCosto: precioCostoNumerico,
      precioSugerido: precioSugeridoNumerico,
      tipoVenta: tipoVentaValido as "UNIDAD" | "PESO" | "METRO" | "LITRO" | "SERVICIO" | "TIEMPO" | "PRECIO_LIBRE",

      // Campos de IVA
      incluyeIva: incluyeIvaBoolean,
      tarifaIva: tarifaIvaNumerico,
      esExentoIva: esExentoIvaBoolean,

      // Precios por unidad de medida
      precioPorKilo: precioPorKiloNumerico,
      precioPorGramo: precioPorGramoNumerico,
      precioPorMetro: precioPorMetroNumerico,
      precioPorLitro: precioPorLitroNumerico,
      
      // Configuración de unidades
      unidadBase: unidadBase && typeof unidadBase === 'string' && unidadBase.trim() !== "" ? unidadBase.trim() : null,
      unidadVenta: unidadVenta && typeof unidadVenta === 'string' && unidadVenta.trim() !== "" ? unidadVenta.trim() : null,
      factorConversion: factorConversionNumerico,
      requiereBalanza: requiereBalanza !== undefined ? Boolean(requiereBalanza) : false,
      pesoAproximado: pesoAproximadoNumerico,

      // Campos existentes
      codigoBarras: codigoBarras && typeof codigoBarras === 'string' && codigoBarras.trim() !== "" ? codigoBarras.trim() : null,
      sku: sku && typeof sku === 'string' && sku.trim() !== "" ? sku.trim() : null,
      imagen: imagen && typeof imagen === 'string' && imagen.trim() !== "" ? imagen.trim() : null,
      imagenCodigoBarras: imagenCodigoBarras && typeof imagenCodigoBarras === 'string' && imagenCodigoBarras.trim() !== "" ? imagenCodigoBarras.trim() : null,
      enStock: enStockNumerico,
      stockMinimo: stockMinimoNumerico,
      activo: activo !== undefined ? Boolean(activo) : true,
      empresaId,
      categoriaId: categoriaId && typeof categoriaId === 'string' && categoriaId.trim() !== "" ? categoriaId : null,
      proveedorId: proveedorId && typeof proveedorId === 'string' && proveedorId.trim() !== "" ? proveedorId : null,
      
      // ✅ CAMPOS DE VENCIMIENTO
      manejaVencimiento: manejaVencimiento !== undefined ? Boolean(manejaVencimiento) : false,
      fechasVencimiento: fechasVencimientoValidadas,
    };

    console.log("Datos del producto a crear:", productoData);

    // Crear el producto
    const producto = await db.producto.create({
      data: productoData,
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

    console.log("Producto creado exitosamente:", producto);

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("Error completo al crear producto:", error);

    // Manejar errores específicos de Prisma
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

      if (prismaError.code === 'P2012') {
        return NextResponse.json(
          { mensaje: "Faltan campos requeridos" },
          { status: 400 }
        );
      }

      if (prismaError.code === 'P2009' || prismaError.message?.includes('Unknown field')) {
        console.error("Campo desconocido en el schema:", prismaError);
        return NextResponse.json(
          { mensaje: "Error: intentando guardar un campo que no existe en la base de datos" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { mensaje: "Error interno del servidor al crear el producto" },
      { status: 500 }
    );
  }
}