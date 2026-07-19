import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ItemCarrito, ProductoCarrito, AgregarProductoCarrito } from "@/types";
const CART_STORAGE_KEY = 'pos_cart_items';
const CART_TIMESTAMP_KEY = 'pos_cart_timestamp';

// Función para calcular IVA
const calcularIVADelItem = (item: ItemCarrito) => {
  const { producto } = item;
  const tieneConfiguracionIVA = producto.tarifaIva !== null && producto.tarifaIva !== undefined && producto.tarifaIva > 0;
  const debeAplicarIVA = !producto.esExentoIva && tieneConfiguracionIVA;
  
  if (!debeAplicarIVA) {
    return {
      subtotalSinIva: item.subtotal,
      ivaCalculado: 0,
      subtotalConIva: item.subtotal
    };
  }
  
  const tarifaIva = producto.tarifaIva!;
  
  if (producto.incluyeIva) {
    const subtotalSinIva = item.subtotal / (1 + tarifaIva / 100);
    const ivaCalculado = item.subtotal - subtotalSinIva;
    return { subtotalSinIva, ivaCalculado, subtotalConIva: item.subtotal };
  } else {
    const subtotalSinIva = item.subtotal;
    const ivaCalculado = item.subtotal * (tarifaIva / 100);
    const subtotalConIva = item.subtotal + ivaCalculado;
    return { subtotalSinIva, ivaCalculado, subtotalConIva };
  }
};

// Calcular precio con IVA
const calcularPrecioConIVA = (precioBase: number, producto: ProductoCarrito): number => {
  const tieneConfiguracionIVA = producto.tarifaIva !== null && producto.tarifaIva !== undefined && producto.tarifaIva > 0;
  const debeAplicarIVA = !producto.esExentoIva && tieneConfiguracionIVA;
  
  if (!debeAplicarIVA || producto.incluyeIva) {
    return precioBase;
  }
  
  return precioBase * (1 + producto.tarifaIva! / 100);
};

export const useCart = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [impuesto, setImpuesto] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [total, setTotal] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar carrito desde localStorage (expira en 1 hora)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const savedTimestamp = localStorage.getItem(CART_TIMESTAMP_KEY);
      
      if (savedCart && savedTimestamp) {
        // 🛡️ El carrito ahora NO expira por tiempo, persiste hasta que se completa la venta o se borra manualmente
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error al cargar carrito:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_TIMESTAMP_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Guardar carrito en localStorage
  useEffect(() => {
    if (isHydrated) {
      try {
        if (items.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
          localStorage.setItem(CART_TIMESTAMP_KEY, Date.now().toString());
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(CART_TIMESTAMP_KEY);
        }
      } catch (error) {
        console.error('Error al guardar carrito:', error);
      }
    }
  }, [items, isHydrated]);

  // Calcular totales
  const calcularTotales = useCallback(() => {
    let subtotalSinIva = 0;
    let totalIva = 0;
    let totalConIva = 0;

    items.forEach(item => {
      const { subtotalSinIva: itemSubtotal, ivaCalculado, subtotalConIva: itemTotal } = calcularIVADelItem(item);
      subtotalSinIva += itemSubtotal;
      totalIva += ivaCalculado;
      totalConIva += itemTotal;
    });

    const totalFinal = Math.max(0, totalConIva - descuento);
    setSubtotal(subtotalSinIva);
    setImpuesto(totalIva);
    setTotal(totalFinal);
  }, [items, descuento]);

  // Calcular subtotal según tipo de venta
  const calcularSubtotal = (producto: ProductoCarrito, cantidad: number, peso?: number, medida?: number, esCortesia: boolean = false): number => {
    if (esCortesia) return 0;

    let precioBase = 0;

    if (producto.tipoVenta === "PESO" && peso) {
      precioBase = (producto.precioPorKilo || producto.precio) * peso;
    } else if (producto.tipoVenta === "METRO" && medida) {
      precioBase = (producto.precioPorMetro || producto.precio) * medida;
    } else if (producto.tipoVenta === "LITRO" && medida) {
      precioBase = (producto.precioPorLitro || producto.precio) * medida;
    } else {
      precioBase = producto.precio * cantidad;
    }

    return calcularPrecioConIVA(precioBase, producto);
  };

  // Agregar servicio
  const agregarServicio = useCallback((servicio: any) => {
    let toastMessage: { title: string; description: string; variant?: "destructive" } | null = null;

    setItems((prevItems) => {
      try {
        const servicioProducto: ProductoCarrito = {
          id: servicio.id,
          nombre: servicio.nombre,
          precio: servicio.precio,
          tipoVenta: "UNIDAD",
          imagen: servicio.imagen,
          empresaId: servicio.empresaId,
          esServicio: true,
          duracion: servicio.duracion,
          servicioId: servicio.id,
          categoria: servicio.categoria ? {
            id: servicio.categoria.id,
            nombre: servicio.categoria.nombre
          } : undefined,
          esExentoIva: servicio.esExentoIva,
          tarifaIva: servicio.tarifaIva,
          incluyeIva: servicio.incluyeIva
        };

        // Siempre agregar como nuevo ítem (permite mismo servicio con distintas empleadas)
          const nuevoItem: ItemCarrito = {
            id: `srv_${servicio.id}_${Date.now()}`,
            producto: servicioProducto,
            cantidad: 1,
            unidadMedida: 'servicio',
            subtotal: calcularSubtotal(servicioProducto, 1),
          };

          toastMessage = {
            title: "Servicio agregado",
            description: `${servicio.nombre} agregado al carrito`
          };
          return [...prevItems, nuevoItem];
      } catch (error) {
        toastMessage = {
          title: "Error",
          description: "No se pudo agregar el servicio",
          variant: "destructive"
        };
        console.error("Error:", error);
        return prevItems;
      }
    });

    if (toastMessage) {
      setTimeout(() => toast(toastMessage!), 0);
    }
  }, [toast]);

  // Agregar item al carrito
  const agregarItem = useCallback((input: ProductoCarrito | AgregarProductoCarrito) => {
    let toastMessage: { title: string; description: string; variant?: "destructive" } | null = null;

    setItems((prevItems) => {
      try {
        let producto: ProductoCarrito;
        let cantidadAAgregar = 1;
        let pesoAAgregar: number | undefined;
        let medidaAAgregar: number | undefined;
        let unidadMedidaAAgregar: string | undefined;
        let precioLibreAAgregar: number | undefined;
        let esCortesiaAAgregar = false;
        let empleadoIdAAgregar: string | undefined;

        if ('producto' in input) {
          producto = input.producto;
          cantidadAAgregar = input.cantidad || 1;
          pesoAAgregar = input.peso;
          medidaAAgregar = input.medida;
          unidadMedidaAAgregar = input.unidadMedida;
          precioLibreAAgregar = input.precioLibre;
          esCortesiaAAgregar = !!input.esCortesia;
          empleadoIdAAgregar = input.empleadoId;
        } else {
          producto = input;
        }

        // Los servicios siempre se agregan como ítems separados (cada empleada puede hacer el mismo servicio)

        // Buscar item existente — SOLO fusionar si coinciden producto Y estado de cortesía
        const indiceExistente = !producto.esServicio 
          ? prevItems.findIndex((item) => item.producto.id === producto.id && !item.producto.esServicio && (!!item.esCortesia === !!esCortesiaAAgregar))
          : -1;

        if (indiceExistente !== -1) {
          // ACTUALIZAR ITEM EXISTENTE
          const itemsActualizados = [...prevItems];
          const item = itemsActualizados[indiceExistente];
          
          // Si el estado de cortesía cambió o se sumó la misma cortesía
          const nuevaCortesia = item.esCortesia || esCortesiaAAgregar;

          let nuevaCantidad = item.cantidad;
          let nuevoPeso = item.peso;
          let nuevaMedida = item.medida;
          let nuevaUnidadMedida = item.unidadMedida;
          let nuevoSubtotal: number;

          if (producto.tipoVenta === "PESO") {
            nuevoPeso = (item.peso || 0) + (pesoAAgregar || 0);
            nuevaUnidadMedida = 'kg';
            nuevoSubtotal = calcularSubtotal(producto, 1, nuevoPeso);
          } else if (producto.tipoVenta === "METRO") {
            nuevaMedida = (item.medida || 0) + (medidaAAgregar || 0);
            nuevaUnidadMedida = 'm';
            nuevoSubtotal = calcularSubtotal(producto, 1, undefined, nuevaMedida);
          } else if (producto.tipoVenta === "LITRO") {
            nuevaMedida = (item.medida || 0) + (medidaAAgregar || 0);
            nuevaUnidadMedida = 'l';
            nuevoSubtotal = calcularSubtotal(producto, 1, undefined, nuevaMedida);
          } else if (producto.tipoVenta === "PRECIO_LIBRE") {
            nuevaCantidad = item.cantidad + cantidadAAgregar;
            const precioLibre = precioLibreAAgregar || item.precioLibre || producto.precio;
            nuevoSubtotal = calcularPrecioConIVA(precioLibre * nuevaCantidad, producto);
          } else {
            nuevaCantidad = item.cantidad + cantidadAAgregar;
            nuevaUnidadMedida = 'ud';

            if (producto.enStock !== undefined && nuevaCantidad > producto.enStock) {
              toastMessage = {
                title: "Stock insuficiente",
                description: `Stock disponible: ${producto.enStock}`,
                variant: "destructive"
              };
              return prevItems;
            }

            nuevoSubtotal = calcularSubtotal(producto, nuevaCantidad, undefined, undefined, nuevaCortesia);
          }

          itemsActualizados[indiceExistente] = {
            ...item,
            cantidad: nuevaCantidad,
            peso: nuevoPeso,
            medida: nuevaMedida,
            unidadMedida: nuevaUnidadMedida,
            subtotal: nuevoSubtotal,
            esCortesia: nuevaCortesia,
            empleadoId: empleadoIdAAgregar || item.empleadoId,
          };

          toastMessage = {
            title: "Producto actualizado",
            description: `${producto.nombre} actualizado`
          };
          return itemsActualizados;
        } else {
          // AGREGAR NUEVO ITEM
          let cantidadFinal: number;
          let pesoFinal: number | undefined;
          let medidaFinal: number | undefined;
          let unidadMedidaFinal: string;
          let nuevoSubtotal: number;

          if (producto.tipoVenta === "PESO") {
            if (!pesoAAgregar || pesoAAgregar <= 0) {
              toastMessage = {
                title: "Error",
                description: "Debes especificar el peso",
                variant: "destructive"
              };
              return prevItems;
            }

            const precioPorKilo = producto.precioPorKilo || producto.precio || 0;
            if (precioPorKilo <= 0) {
              toastMessage = {
                title: "Error",
                description: "Producto sin precio por kilo",
                variant: "destructive"
              };
              return prevItems;
            }

            cantidadFinal = 1;
            pesoFinal = pesoAAgregar;
            unidadMedidaFinal = 'kg';
            nuevoSubtotal = calcularSubtotal(producto, 1, pesoFinal);

          } else if (producto.tipoVenta === "METRO") {
            if (!medidaAAgregar || medidaAAgregar <= 0) {
              toastMessage = {
                title: "Error",
                description: "Debes especificar los metros",
                variant: "destructive"
              };
              return prevItems;
            }

            const precioPorMetro = producto.precioPorMetro || producto.precio || 0;
            if (precioPorMetro <= 0) {
              toastMessage = {
                title: "Error",
                description: "Producto sin precio por metro",
                variant: "destructive"
              };
              return prevItems;
            }

            cantidadFinal = 1;
            medidaFinal = medidaAAgregar;
            unidadMedidaFinal = 'm';
            nuevoSubtotal = calcularSubtotal(producto, 1, undefined, medidaFinal);

          } else if (producto.tipoVenta === "LITRO") {
            if (!medidaAAgregar || medidaAAgregar <= 0) {
              toastMessage = {
                title: "Error",
                description: "Debes especificar los litros",
                variant: "destructive"
              };
              return prevItems;
            }

            const precioPorLitro = producto.precioPorLitro || producto.precio || 0;
            if (precioPorLitro <= 0) {
              toastMessage = {
                title: "Error",
                description: "Producto sin precio por litro",
                variant: "destructive"
              };
              return prevItems;
            }

            cantidadFinal = 1;
            medidaFinal = medidaAAgregar;
            unidadMedidaFinal = 'l';
            nuevoSubtotal = calcularSubtotal(producto, 1, undefined, medidaFinal);

          } else if (producto.tipoVenta === "PRECIO_LIBRE") {
            cantidadFinal = cantidadAAgregar;
            unidadMedidaFinal = 'ud';
            const precioLibre = precioLibreAAgregar || producto.precio;
            nuevoSubtotal = calcularPrecioConIVA(precioLibre * cantidadFinal, producto);

          } else {
            if (producto.enStock !== undefined && producto.enStock <= 0) {
              toastMessage = {
                title: "Sin stock",
                description: `No hay stock para ${producto.nombre}`,
                variant: "destructive"
              };
              return prevItems;
            }

            cantidadFinal = cantidadAAgregar;
            unidadMedidaFinal = 'ud';
            nuevoSubtotal = calcularSubtotal(producto, cantidadFinal);
          }

          if (!esCortesiaAAgregar && (isNaN(nuevoSubtotal) || nuevoSubtotal <= 0)) {
            toastMessage = {
              title: "Error de cálculo",
              description: "No se pudo calcular el precio",
              variant: "destructive"
            };
            return prevItems;
          }

          const itemId = 'id' in input && input.id ? input.id : (producto.esServicio && producto.citaId
            ? `srv_${producto.servicioId || producto.id}_cita_${producto.citaId}`
            : producto.esServicio
            ? `srv_${producto.servicioId || producto.id}_${Date.now()}`
            : `${producto.id}-${Date.now()}`);

          const nuevoItem: ItemCarrito = {
            id: itemId,
            producto: { ...producto },
            cantidad: cantidadFinal,
            peso: pesoFinal,
            medida: medidaFinal,
            unidadMedida: unidadMedidaFinal,
            precioLibre: precioLibreAAgregar,
            subtotal: esCortesiaAAgregar ? 0 : nuevoSubtotal,
            esCortesia: esCortesiaAAgregar,
            empleadoId: empleadoIdAAgregar,
          };

          toastMessage = {
            title: producto.esServicio ? "Servicio agregado" : "Producto agregado",
            description: `${producto.nombre} agregado`
          };
          return [...prevItems, nuevoItem];
        }
      } catch (error) {
        toastMessage = {
          title: "Error",
          description: "No se pudo agregar el producto",
          variant: "destructive"
        };
        console.error("Error:", error);
        return prevItems;
      }
    });

    if (toastMessage) {
      setTimeout(() => toast(toastMessage!), 0);
    }
  }, [toast]);

  const eliminarItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const actualizarCantidad = useCallback((id: string, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarItem(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (item.producto.tipoVenta === "PESO" ||
              item.producto.tipoVenta === "METRO" ||
              item.producto.tipoVenta === "LITRO") {
            return item;
          }

          if (item.producto.enStock !== undefined && cantidad > item.producto.enStock) {
            return item;
          }

          return {
            ...item,
            cantidad,
            subtotal: calcularSubtotal(item.producto, cantidad, undefined, undefined, item.esCortesia),
          };
        }
        return item;
      })
    );
  }, [eliminarItem]);

  const actualizarPeso = useCallback((id: string, valor: number) => {
    if (valor <= 0) {
      eliminarItem(id);
      return;
    }

    setItems((prevItems) => {
      const itemEncontrado = prevItems.find(item => item.id === id);
      if (!itemEncontrado) {
        console.error('❌ Item no encontrado:', id);
        return prevItems;
      }

      return prevItems.map((item) => {
        if (item.id === id) {
          if (item.producto.tipoVenta === "PESO") {
            const nuevoSubtotal = calcularSubtotal(item.producto, 1, valor);
            return {
              ...item,
              peso: valor,
              subtotal: nuevoSubtotal,
            };
          } else if (item.producto.tipoVenta === "METRO" || item.producto.tipoVenta === "LITRO") {
            const nuevoSubtotal = calcularSubtotal(item.producto, 1, undefined, valor);
            return {
              ...item,
              medida: valor,
              subtotal: nuevoSubtotal,
            };
          }
        }
        return item;
      });
    });
  }, [eliminarItem]);

  const actualizarMedida = useCallback((id: string, medida: number) => {
    if (medida <= 0) {
      eliminarItem(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id && (item.producto.tipoVenta === "METRO" || item.producto.tipoVenta === "LITRO")) {
          return {
            ...item,
            medida,
            subtotal: calcularSubtotal(item.producto, 1, undefined, medida),
          };
        }
        return item;
      })
    );
  }, [eliminarItem]);

  const actualizarPrecioLibre = useCallback((id: string, precioLibre: number) => {
    if (precioLibre <= 0) {
      eliminarItem(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id && item.producto.tipoVenta === "PRECIO_LIBRE") {
          return {
            ...item,
            precioLibre,
            subtotal: calcularPrecioConIVA(precioLibre * item.cantidad, item.producto),
          };
        }
        return item;
      })
    );
  }, [eliminarItem]);

  const actualizarTotalPorPeso = useCallback((id: string, total: number) => {
    if (total <= 0) {
      eliminarItem(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id && item.producto.tipoVenta === "PESO") {
          let precioPorKilo = item.producto.precioPorKilo || 0;
          precioPorKilo = calcularPrecioConIVA(precioPorKilo, item.producto);
          const nuevoPeso = total / precioPorKilo;
          
          return {
            ...item,
            peso: nuevoPeso,
            subtotal: total,
          };
        }
        return item;
      })
    );
  }, [eliminarItem]);

  const agregarProductoPrecioLibre = (producto: any, precioLibre: number, cantidad: number = 1) => {
    const itemId = `${producto.id}_${Date.now()}`;
    let subtotal = precioLibre * cantidad;
    
    if (producto.tieneIva && producto.tarifaIva > 0 && !producto.incluyeIva) {
      subtotal = subtotal * (1 + producto.tarifaIva / 100);
    }

    const nuevoItem: ItemCarrito = {
      id: itemId,
      producto,
      cantidad,
      precioLibre,
      subtotal,
    };

    setItems(prevItems => [...prevItems, nuevoItem]);
  };

  const aplicarDescuento = useCallback((monto: number) => {
    setDescuento(monto);
  }, []);

  const vaciarCarrito = useCallback(() => {
    setItems([]);
    setDescuento(0);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_TIMESTAMP_KEY);
  }, []);

  const actualizarCortesia = useCallback((id: string, esCortesia: boolean) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          return { ...item, esCortesia };
        }
        return item;
      })
    );
  }, []);

  useEffect(() => {
    calcularTotales();
  }, [items, descuento, calcularTotales]);

  return {
    items,
    subtotal,
    impuesto,
    descuento,
    total,
    agregarItem,
    agregarServicio,
    eliminarItem,
    actualizarCantidad,
    actualizarPeso,
    actualizarMedida,
    actualizarPrecioLibre,
    actualizarTotalPorPeso,
    aplicarDescuento,
    vaciarCarrito,
    agregarProductoPrecioLibre,
    updateQuantity: actualizarCantidad,
    updateWeight: actualizarPeso,
    updateMeasure: actualizarMedida,
    updateFreePrice: actualizarPrecioLibre,
    updateTotalByWeight: actualizarTotalPorPeso,
    applyDiscount: aplicarDescuento,
    clearCart: vaciarCarrito,
    actualizarCortesia,
    totalItems: items.reduce((sum, item) => sum + item.cantidad, 0),
    isHydrated
  };
};