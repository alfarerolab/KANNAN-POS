import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { servicioPOS } from '@/lib/api-service';
import type { ItemCarrito } from "@/types";
// Tipo para pagos múltiples
export interface PagoDetalle {
  id: string;
  metodoPago: string;
  monto: number;
  referencia?: string;
}

interface UseSaleProcessingProps {
  items: ItemCarrito[];
  empresaId: string;
  configuracion: any;
  subtotal: number;
  total: number;
  vaciarCarrito: () => void;
}

export function useSaleProcessing({
  items,
  empresaId,
  configuracion,
  subtotal,
  total,
  vaciarCarrito
}: UseSaleProcessingProps) {
  const { toast } = useToast();
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  // Función auxiliar para preparar items del carrito
  const prepararItemsCarrito = () => {
    const itemsCarrito: ItemCarrito[] = [];
    const problemasEncontrados: string[] = [];
    const citasParaActualizar: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Calcular subtotal correcto según tipo de venta
      let subtotalItem: number;
      
      if (item.producto.tipoVenta === "PESO" && item.peso) {
        const precioPorKilo = item.producto.precioPorKilo || 0;
        subtotalItem = item.peso * precioPorKilo;
      } else if (item.precioLibre) {
        subtotalItem = item.precioLibre;
      } else {
        subtotalItem = item.cantidad * item.producto.precio;
      }

      const baseItem = {
        id: item.id,
        cantidad: item.cantidad,
        subtotal: subtotalItem,
        empleadoId: item.empleadoId,
        esCortesia: item.esCortesia
      };

      if (item.producto.esServicio) {
        let servicioId: string | undefined = item.producto.servicioId;

        if (!servicioId) {
          const idString = item.producto.id.toString();
          if (idString.includes('srv_')) {
            const matches = idString.match(/srv_(\d+)_/);
            servicioId = matches ? matches[1] : undefined;
          } else if (idString.match(/^\d+$/)) {
            servicioId = idString;
          } else {
            const numeroEncontrado = idString.match(/\d+/);
            servicioId = numeroEncontrado ? numeroEncontrado[0] : undefined;
          }
        }

        if (!servicioId || servicioId.trim() === '') {
          const problema = `Servicio "${item.producto.nombre}" no tiene un ID válido`;
          console.error('ERROR:', problema);
          problemasEncontrados.push(problema);
          continue;
        }

        if (item.producto.citaId) {
          citasParaActualizar.push(item.producto.citaId);
        }

        const servicioItem: ItemCarrito = {
          ...baseItem,
          producto: {
            id: servicioId.toString(),
            nombre: item.producto.nombre,
            precio: Number(item.producto.precio),
            empresaId: empresaId,
            tipoVenta: "SERVICIO" as const,
            esServicio: true,
            categoria: typeof item.producto.categoria === 'string'
              ? item.producto.categoria
              : (item.producto.categoria?.nombre || 'Servicios'),
            duracion: item.producto.duracion || 60,
            servicioId: servicioId.toString(),
            citaId: item.producto.citaId,
            clienteAsociado: item.producto.clienteAsociado
          }
        };

        itemsCarrito.push(servicioItem);

      } else {
        // Procesamiento de productos
        const productoEmpresaId = item.producto.empresaId;

        if (!productoEmpresaId) {
          const problema = `Producto "${item.producto.nombre}" no tiene empresaId`;
          problemasEncontrados.push(problema);
          continue;
        }

        if (productoEmpresaId !== empresaId) {
          const problema = `Producto "${item.producto.nombre}" pertenece a otra empresa`;
          problemasEncontrados.push(problema);
          continue;
        }

        let tipoVentaProducto: "UNIDAD" | "PESO" | "METRO" | "LITRO" | "TIEMPO" | "PRECIO_LIBRE";

        if (item.precioLibre) {
          tipoVentaProducto = "PRECIO_LIBRE";
        } else if (item.producto.tipoVenta) {
          const tipoVentaValido = ["UNIDAD", "PESO", "METRO", "LITRO", "TIEMPO", "PRECIO_LIBRE"] as const;
          tipoVentaProducto = tipoVentaValido.includes(item.producto.tipoVenta as typeof tipoVentaValido[number])
            ? item.producto.tipoVenta as typeof tipoVentaValido[number]
            : "UNIDAD";
        } else {
          tipoVentaProducto = "UNIDAD";
        }

        const productoItem: ItemCarrito = {
          ...baseItem,
          producto: {
            id: item.producto.id,
            nombre: item.producto.nombre,
            precio: Number(item.producto.precio),
            precioPorKilo: item.producto.precioPorKilo ? Number(item.producto.precioPorKilo) : undefined,
            empresaId: item.producto.empresaId,
            tipoVenta: tipoVentaProducto,
            categoria: typeof item.producto.categoria === 'string'
              ? item.producto.categoria
              : (item.producto.categoria?.nombre || item.producto.categoria?.id || 'General'),
            esServicio: false,
          },
          peso: item.peso,
          medida: item.medida,
          unidadMedida: item.unidadMedida,
          precioLibre: item.precioLibre
        };

        itemsCarrito.push(productoItem);
      }
    }

    return { itemsCarrito, problemasEncontrados, citasParaActualizar };
  };

  // Función auxiliar para actualizar citas
  const actualizarCitas = async (citasParaActualizar: string[], ventaId: string) => {
    if (citasParaActualizar.length === 0) return;

    const promesasActualizacion = citasParaActualizar.map(async (citaId) => {
      try {
        const responseActualizacion = await fetch(`/api/citas/${citaId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estado: 'FACTURADA',
            ventaId: ventaId
          }),
        });

        if (responseActualizacion.ok) {
          const citaActualizada = await responseActualizacion.json();
          return { success: true, citaId, data: citaActualizada };
        } else {
          const errorData = await responseActualizacion.json().catch(() => ({ error: 'Error desconocido' }));
          console.error(`Error al actualizar cita ${citaId}:`, errorData);
          return { success: false, citaId, error: errorData.error };
        }
      } catch (error) {
        console.error(`Error al actualizar cita ${citaId}:`, error);
        return { 
          success: false, 
          citaId, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });

    const resultadosActualizacion = await Promise.all(promesasActualizacion);
    const fallidas = resultadosActualizacion.filter(r => !r.success);

    if (fallidas.length > 0) {
      console.error(`${fallidas.length} citas no se pudieron actualizar:`, fallidas);
      toast({
        title: "Advertencia",
        description: `${fallidas.length} citas no se pudieron actualizar automáticamente`,
        variant: "destructive"
      });
    }
  };

  // Función principal para procesar venta (con pago único O múltiple)
  const procesarVenta = async (
    clienteSeleccionado: any,
    metodoPago: string,
    notas: string,
    session: any,
    pagosMultiples?: PagoDetalle[],
    consumosInternos?: Record<string, { productoId: string; cantidad: number }[]>,
    comandaId?: string,
    cajaId?: string
  ) => {
    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Debe agregar al menos un producto para procesar la venta",
        variant: "destructive"
      });
      return null;
    }

    // Si hay pagos múltiples, validar
    const esPagoMultiple = pagosMultiples && pagosMultiples.length > 1;
    
    if (esPagoMultiple && pagosMultiples!.length === 0) {
      toast({
        title: "Sin pagos",
        description: "Debe agregar al menos un pago para completar la venta",
        variant: "destructive"
      });
      return null;
    }

    try {
      setProcesandoVenta(true);

      if (esPagoMultiple) {
      }

      const { itemsCarrito, problemasEncontrados, citasParaActualizar } = prepararItemsCarrito();

      if (problemasEncontrados.length > 0) {
        toast({
          title: "Productos inválidos encontrados",
          description: `Se encontraron ${problemasEncontrados.length} productos con problemas`,
          variant: "destructive"
        });
        return null;
      }

      if (itemsCarrito.length === 0) {
        toast({
          title: "No hay productos válidos",
          description: "Todos los productos en el carrito tienen problemas de validación",
          variant: "destructive"
        });
        return null;
      }

      // Preparar datos de venta
      let datosVenta: any = {
        items: itemsCarrito,
        clienteId: clienteSeleccionado?.id,
        notas: notas || undefined,
        subtotal,
        impuesto: 0,
        descuento: 0,
        total,
        empresaId: empresaId,
        tipoNegocio: configuracion?.tipoNegocio,
        comandaId: comandaId, // Added comandaId
        consumosInternos: consumosInternos, // NUEVO: pasar consumos al backend
        cajaId: cajaId || undefined,
      };

      // Si es pago múltiple, agregar los pagos
      if (esPagoMultiple) {
        // Usar el primer método de pago como principal (requerido por el backend)
        datosVenta.metodoPago = pagosMultiples![0].metodoPago;
        
        // Flag para que el backend cree los registros de PagoVenta
        datosVenta.pagosMultiples = true;
        
        // Agregar los pagos como array
        datosVenta.pagos = pagosMultiples!.map(pago => ({
          metodoPago: pago.metodoPago,
          monto: pago.monto,
          referencia: pago.referencia || undefined
        }));
      } else {
        // Pago único
        datosVenta.metodoPago = metodoPago;
      }

      // Agregar consumos internos de inventario (peluquería)
      if (consumosInternos && Object.keys(consumosInternos).length > 0) {
        // Convertir de { itemId: [{productoId, cantidad}] } a array plano
        const consumosArray: { productoId: string; cantidad: number }[] = [];
        Object.values(consumosInternos).forEach(lista => {
          lista.forEach(c => consumosArray.push(c));
        });
        datosVenta.consumosInternos = consumosArray;
      }

      const response = await servicioPOS.procesarVenta(datosVenta);
      await actualizarCitas(citasParaActualizar, response.id);

      // Preparar datos del ticket
      const datosTicket: any = {
        venta: response,
        empresa: {
          nombre: configuracion?.empresa?.nombre || "Mi Empresa",
        },
        cliente: clienteSeleccionado,
        items: items,
        subtotal,
        impuesto: 0,
        total,
        terminal: { nombre: "Terminal Principal" },
        usuario: { nombre: session?.user?.nombre || "Cajero" }
      };

      // Agregar información de pago según el tipo
      if (esPagoMultiple) {
        datosTicket.metodoPago = "Pago Mixto";
        datosTicket.pagosMultiples = pagosMultiples;
      } else {
        datosTicket.metodoPago = metodoPago;
        datosTicket.pagosMultiples = undefined;
      }

      return {
        venta: response,
        ticketData: datosTicket,
        citasActualizadas: citasParaActualizar.length
      };

    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      let mensaje = "Error al procesar la venta";
      if (errorObj.message?.includes("no pertenece")) {
        mensaje = "Algunos productos no pertenecen a tu empresa. Revisa el carrito.";
      } else if (errorObj.message?.includes("no son válidos")) {
        mensaje = "Algunos productos no son válidos. Elimínalos del carrito.";
      } else if (errorObj.message) {
        mensaje = errorObj.message;
      }

      toast({
        title: "Error al procesar la venta",
        description: mensaje,
        variant: "destructive"
      });
      return null;
    } finally {
      setProcesandoVenta(false);
    }
  };

  return {
    procesarVenta,
    procesandoVenta
  };
}