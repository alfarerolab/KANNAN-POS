import type {
  ValoresFormularioProducto, ValoresFormularioCliente, ValoresFormularioVenta, ValoresFormularioUsuario, ValoresFormularioProveedor,
  ValoresFormularioBodega,ValoresFormularioMovimientoBodega, ValoresFormularioTerminal, ValoresFormularioMascota, ItemCarrito
} from "@/types";

// Utilidades para manejar las respuestas de la API
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorText = "";
    let errorData: any = null;

    try {
      // intentamos parsear JSON
      errorData = await response.json();
    } catch {
      try {
        // si no es JSON, intentamos como texto plano
        errorText = await response.text();
      } catch {
        errorText = "";
      }
    }

    console.error("❌ API Error Response:", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      body: errorData || errorText || "Sin body en respuesta",
    });

    throw new Error(
      errorData?.error ||
      errorData?.message ||
      errorText ||
      `Error ${response.status}: ${response.statusText}`
    );
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}



// PRODUCTOS
export const servicioProductos = {
  // Obtener todos los productos con opciones de filtrado
  obtenerProductos: async ({
    categoriaId, busqueda, activo, stockBajo, pagina = 1, limite = 20,
  }: {
    categoriaId?: string;
    busqueda?: string;
    activo?: boolean;
    stockBajo?: boolean;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (categoriaId) params.append('categoriaId', categoriaId);
    if (busqueda) params.append('busqueda', busqueda);
    if (activo !== undefined) params.append('activo', String(activo));
    if (stockBajo !== undefined) params.append('stockBajo', String(stockBajo));
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));

    const response = await fetch(`/api/productos?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener un producto específico
  obtenerProducto: async (id: string) => {
    const response = await fetch(`/api/productos/${id}`);
    return handleResponse(response);
  },

  // Crear un nuevo producto
  crearProducto: async (productoData: ValoresFormularioProducto) => {
    const response = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productoData),
    });
    return handleResponse(response);
  },

  // Actualizar un producto existente
  actualizarProducto: async (id: string, productoData: Partial<ValoresFormularioProducto>) => {
    const response = await fetch(`/api/productos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productoData),
    });
    return handleResponse(response);
  },

  // Eliminar un producto
  eliminarProducto: async (id: string) => {
    const response = await fetch(`/api/productos/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Ajustar inventario de un producto
  ajustarInventario: async (id: string, datos: {
    cantidad: number;
    tipo: 'incremento' | 'decremento' | 'establecer';
    motivo?: string;
  }) => {
    const response = await fetch(`/api/productos/${id}/inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return handleResponse(response);
  },
};

// CATEGORÍAS
export const servicioCategorias = {
  // Obtener todas las categorías
  obtenerCategorias: async ({
    busqueda,
    pagina = 1,
    limite = 50,
  }: {
    busqueda?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('busqueda', busqueda);
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));

    const response = await fetch(`/api/categorias?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener una categoría específica
  obtenerCategoria: async (id: string) => {
    const response = await fetch(`/api/categorias/${id}`);
    return handleResponse(response);
  },

  // Crear una nueva categoría
  crearCategoria: async (categoriaData: { nombre: string; descripcion?: string }) => {
    const response = await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoriaData),
    });
    return handleResponse(response);
  },

  // Actualizar una categoría existente
  actualizarCategoria: async (id: string, categoriaData: { nombre?: string; descripcion?: string }) => {
    const response = await fetch(`/api/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoriaData),
    });
    return handleResponse(response);
  },

  // Eliminar una categoría
  eliminarCategoria: async (id: string) => {
    const response = await fetch(`/api/categorias/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// CLIENTES
export const servicioClientes = {
  // Obtener todos los clientes
  obtenerClientes: async ({

    busqueda,
    pagina = 1,
    limite = 20,
    empresaId,

  }: {
    busqueda?: string;
    pagina?: number;
    limite?: number;
    empresaId?: string;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('busqueda', busqueda);
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));
    if (empresaId) params.append('empresaId', empresaId);

    const response = await fetch(`/api/clientes?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener un cliente específico
  obtenerCliente: async (id: string) => {
    const response = await fetch(`/api/clientes/${id}`);
    return handleResponse(response);
  },

  // Crear un nuevo cliente
  crearCliente: async (clienteData: ValoresFormularioCliente) => {
    const response = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clienteData),
    });
    return handleResponse(response);
  },

  // Actualizar un cliente existente
  actualizarCliente: async (id: string, clienteData: Partial<ValoresFormularioCliente>) => {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clienteData),
    });
    return handleResponse(response);
  },

  // Eliminar un cliente
  eliminarCliente: async (id: string) => {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// VENTAS
export const servicioVentas = {
  // Obtener todas las ventas
  obtenerVentas: async ({

    clienteId,
    usuarioId,
    fechaInicio,
    fechaFin,
    estado,
    metodoPago,
    pagina = 1,
    limite = 20,
  }: {
    clienteId?: string;
    usuarioId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    estado?: string;
    metodoPago?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (clienteId) params.append('clienteId', clienteId);
    if (usuarioId) params.append('usuarioId', usuarioId);
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (estado) params.append('estado', estado);
    if (metodoPago) params.append('metodoPago', metodoPago);
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));

    const response = await fetch(`/api/ventas?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener una venta específica
  obtenerVenta: async (id: string) => {
    const response = await fetch(`/api/ventas/${id}`);
    return handleResponse(response);
  },

  // Crear una nueva venta
  crearVenta: async (ventaData: ValoresFormularioVenta) => {
    const response = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ventaData),
    });
    return handleResponse(response);
  },

  // Actualizar el estado de una venta
  actualizarVenta: async (id: string, ventaData: {
    estado?: string;
    reciboImpreso?: boolean;
    notas?: string;
  }) => {
    const response = await fetch(`/api/ventas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ventaData),
    });
    return handleResponse(response);
  },

  // Cancelar una venta
  cancelarVenta: async (id: string) => {
    return await servicioVentas.actualizarVenta(id, { estado: 'CANCELADA' });
  },
};

// USUARIOS
export const servicioUsuarios = {
  // Obtener todos los usuarios
  obtenerUsuarios: async ({

    busqueda,
    rol,
    pagina = 1,
    limite = 20,
  }: {
    busqueda?: string;
    rol?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('busqueda', busqueda);
    if (rol) params.append('rol', rol);
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));

    const response = await fetch(`/api/usuarios?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener un usuario específico
  obtenerUsuario: async (id: string) => {
    const response = await fetch(`/api/usuarios/${id}`);
    return handleResponse(response);
  },

  // Crear un nuevo usuario
  crearUsuario: async (usuarioData: ValoresFormularioUsuario) => {
    const response = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData),
    });
    return handleResponse(response);
  },

  // Actualizar un usuario existente
  actualizarUsuario: async (id: string, usuarioData: Partial<ValoresFormularioUsuario>) => {
    const response = await fetch(`/api/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData),
    });
    return handleResponse(response);
  },

  // Eliminar un usuario
  eliminarUsuario: async (id: string) => {
    const response = await fetch(`/api/usuarios/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// AUTENTICACIÓN
export const servicioAuth = {
  // Obtener información del usuario actual
  obtenerUsuarioActual: async () => {
    const response = await fetch('/api/auth');
    return handleResponse(response);
  },

  // Iniciar sesión (alternativa a NextAuth)
  login: async (credentials: { email: string; contrasena: string }) => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },
};

// REGISTRO
export const servicioRegistro = {
  // Registrar nueva empresa y usuario administrador
  registrar: async (datos: {
    nombreEmpresa: string;
    emailEmpresa: string;
    telefonoEmpresa?: string;
    direccionEmpresa?: string;
    nombreUsuario: string;
    emailUsuario: string;
    telefonoUsuario?: string;
    contrasena: string;
  }) => {
    const response = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return handleResponse(response);
  },
};


export const servicioDashboard = {
  async obtenerEstadisticas(periodo: 'hoy' | 'semana' | 'mes' | 'año' = 'hoy') {
    try {
      const response = await fetch(`/api/dashboard/estadisticas?periodo=${periodo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener estadísticas: ${response.status}`);
      }

      const data = await response.json();

      // Transformar datos para el dashboard
      return {
        // Ventas del día
        ventasHoy: data.ventas?.cantidad || 0,
        totalVentasHoy: data.ventas?.total || 0,
        cambioVentas: data.ventas?.cambio || 0,

        // Ventas de la semana (calcular desde el gráfico)
        ventasSemana: data.grafico?.ventasPorDia?.reduce((acc: number, dia: any) => acc + (dia.cantidad || 0), 0) || 0,
        totalVentasSemana: data.grafico?.ventasPorDia?.reduce((acc: number, dia: any) => acc + (dia.total || 0), 0) || 0,

        // Productos
        totalProductos: data.productos?.activos || 0,
        productosStockBajo: data.productos?.pocoStock || 0,

        // Clientes
        totalClientes: data.clientes?.total || 0,

        // Citas (si aplica)
        citasHoy: data.citas?.hoy || 0,

        // Datos para gráficos
        graficoVentas: data.grafico?.ventasPorDia || [],

        // Datos adicionales que obtendremos de otras APIs
        ventasRecientes: [],
        productosMasVendidos: [],
        citasProximas: [],
        alertas: []
      };
    } catch (error) {
      console.error('Error en servicioDashboard.obtenerEstadisticas:', error);
      throw error;
    }
  },

  async obtenerVentasRecientes(limite = 10) {
    try {
      const response = await fetch(`/api/ventas?limite=${limite}&ordenar=createdAt&direccion=desc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener ventas recientes:', error);
      return [];
    }
  },

  async obtenerProductosPopulares(limite = 5) {
    try {
      const response = await fetch(`/api/reportes/productos?limite=${limite}&ordenar=ventas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener productos populares:', error);
      return [];
    }
  },

  async obtenerCitasProximas(limite = 5) {
    try {
      const response = await fetch(`/api/citas?limite=${limite}&futuras=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener citas próximas:', error);
      return [];
    }
  },

  async obtenerEstadisticasCompletas(periodo: 'hoy' | 'semana' | 'mes' | 'año' = 'hoy') {
    try {
      // Obtener estadísticas principales
      const estadisticasBase = await this.obtenerEstadisticas(periodo);

      // Obtener datos adicionales en paralelo
      const [ventasRecientes, productosPopulares, citasProximas] = await Promise.all([
        this.obtenerVentasRecientes(10),
        this.obtenerProductosPopulares(5),
        this.obtenerCitasProximas(5)
      ]);

      // Combinar todos los datos
      return {
        ...estadisticasBase,
        ventasRecientes,
        productosMasVendidos: productosPopulares,
        citasProximas,
        alertas: this.generarAlertas(estadisticasBase, productosPopulares)
      };
    } catch (error) {
      console.error('Error al obtener estadísticas completas:', error);
      throw error;
    }
  },

  generarAlertas(estadisticas: any, productos: any[] = []) {
    const alertas = [];

    // Alerta de stock bajo
    if (estadisticas.productosStockBajo > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `${estadisticas.productosStockBajo} productos con stock bajo`,
        accion: '/dashboard/inventario',
        icono: 'AlertTriangle'
      });
    }

    // Alerta de productos sin ventas
    const productosSinVentas = productos.filter((p: any) => (p.cantidadVendida || 0) === 0);
    if (productosSinVentas.length > 0) {
      alertas.push({
        tipo: 'info',
        mensaje: `${productosSinVentas.length} productos sin ventas este mes`,
        accion: '/dashboard/productos',
        icono: 'Info'
      });
    }

    // Alerta de crecimiento en ventas
    if (estadisticas.cambioVentas > 20) {
      alertas.push({
        tipo: 'success',
        mensaje: `¡Ventas han aumentado ${estadisticas.cambioVentas.toFixed(1)}%!`,
        accion: '/dashboard/ventas',
        icono: 'TrendingUp'
      });
    }

    return alertas;
  }
};

export const servicioPOS = {

  obtenerProductos: async (opciones: {
    busqueda?: string;
    categoriaId?: string;
    soloDisponibles?: boolean;
    limite?: number;
    pagina?: number;
  }) => {
    try {
      // Construir la URL con los parámetros
      const params = new URLSearchParams();

      if (opciones.busqueda) {
        params.append("busqueda", opciones.busqueda);
      }

      if (opciones.categoriaId) {
        params.append("categoriaId", opciones.categoriaId);
      }

      if (opciones.soloDisponibles !== undefined) {
        params.append("soloDisponibles", opciones.soloDisponibles.toString());
      }

      if (opciones.limite) {
        params.append("limite", opciones.limite.toString());
      }

      if (opciones.pagina) {
        params.append("pagina", opciones.pagina.toString());
      }

      const url = `/api/pos/productos?${params.toString()}`;
      const response = await fetch(url);
      return handleResponse(response);
    } catch (error) {
      console.error("Error en servicioPOS.obtenerProductos:", error);
      throw error;
    }
  },

  buscarProductoPorCodigo: async (codigo: string) => {
    try {
      const termino = codigo.trim();

      if (!termino) {
        throw new Error("Debes escanear un código válido");
      }

      const respuesta = await servicioPOS.obtenerProductos({
        busqueda: termino,
        limite: 25,
        pagina: 1,
      });
      const productos = Array.isArray(respuesta?.datos) ? respuesta.datos : [];
      const producto = productos.find((item: any) => {
        const codigoBarras = typeof item?.codigoBarras === "string" ? item.codigoBarras.trim() : "";
        const sku = typeof item?.sku === "string" ? item.sku.trim() : "";
        return codigoBarras === termino || sku === termino;
      });

      if (!producto) {
        throw new Error("No se encontró un producto para el código escaneado");
      }

      return producto;
    } catch (error) {
      console.error("Error en servicioPOS.buscarProductoPorCodigo:", error);
      throw error;
    }
  },

  // ACTUALIZADO: Ahora soporta pagos múltiples
  procesarVenta: async (datos: {
    items: ItemCarrito[];
    clienteId?: string;
    metodoPago: string;
    notas?: string;
    subtotal: number;
    impuesto: number;
    descuento: number;
    total: number;
    // Campos opcionales para pagos múltiples
    pagosMultiples?: boolean;
    pagos?: Array<{
      metodoPago: string;
      monto: number;
      referencia?: string;
    }>;
    // Campos adicionales opcionales
    empresaId?: string;
    tipoNegocio?: string;
  }) => {
    try {
      const response = await fetch("/api/pos/ventas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Error en servicioPOS.procesarVenta:", error);
      throw error;
    }
  },

  obtenerTicket: async (ventaId: string) => {
    try {
      const response = await fetch(`/api/pos/ventas/${ventaId}/ticket`);
      return handleResponse(response);
    } catch (error) {
      console.error("Error en servicioPOS.obtenerTicket:", error);
      throw error;
    }
  }
};
// PROVEEDORES
export const servicioProveedores = {
  // Obtener todos los proveedores
  obtenerProveedores: async ({

    busqueda,
    activo,
    pagina = 1,
    limite = 20,
  }: {
    busqueda?: string;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('search', busqueda);
    if (activo !== undefined) params.append('activo', String(activo));
    params.append('page', String(pagina));
    params.append('limit', String(limite));

    const response = await fetch(`/api/proveedores?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener un proveedor específico
  obtenerProveedor: async (id: string) => {
    const response = await fetch(`/api/proveedores/${id}`);
    return handleResponse(response);
  },

  // Crear un nuevo proveedor
  crearProveedor: async (proveedorData: ValoresFormularioProveedor) => {
    const response = await fetch('/api/proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proveedorData),
    });
    return handleResponse(response);
  },

  // Actualizar un proveedor existente
  actualizarProveedor: async (id: string, proveedorData: Partial<ValoresFormularioProveedor>) => {
    const response = await fetch(`/api/proveedores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proveedorData),
    });
    return handleResponse(response);
  },

  // Eliminar un proveedor
  eliminarProveedor: async (id: string) => {
    const response = await fetch(`/api/proveedores/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// BODEGAS
export const servicioBodegas = {
  // Obtener todas las bodegas
  obtenerBodegas: async ({

    busqueda,
    activa,
    pagina = 1,
    limite = 20,
  }: {
    busqueda?: string;
    activa?: boolean;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('search', busqueda);
    if (activa !== undefined) params.append('activa', String(activa));
    params.append('page', String(pagina));
    params.append('limit', String(limite));

    const response = await fetch(`/api/bodegas?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener una bodega específica
  obtenerBodega: async (id: string) => {
    const response = await fetch(`/api/bodegas/${id}`);
    return handleResponse(response);
  },

  // Crear una nueva bodega
  crearBodega: async (bodegaData: ValoresFormularioBodega) => {
    const response = await fetch('/api/bodegas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodegaData),
    });
    return handleResponse(response);
  },

  // Actualizar una bodega existente
  actualizarBodega: async (id: string, bodegaData: Partial<ValoresFormularioBodega>) => {
    const response = await fetch(`/api/bodegas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodegaData),
    });
    return handleResponse(response);
  },

  // Eliminar una bodega
  eliminarBodega: async (id: string) => {
    const response = await fetch(`/api/bodegas/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Obtener movimientos de una bodega
  obtenerMovimientos: async (bodegaId: string, {
    tipo,
    productoId,
    pagina = 1,
    limite = 20,
  }: {
    tipo?: string;
    productoId?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (tipo) params.append('tipo', tipo);
    if (productoId) params.append('productoId', productoId);
    params.append('page', String(pagina));
    params.append('limit', String(limite));

    const response = await fetch(`/api/bodegas/${bodegaId}/movimientos?${params.toString()}`);
    return handleResponse(response);
  },

  // Crear un movimiento de bodega
  crearMovimiento: async (bodegaId: string, movimientoData: ValoresFormularioMovimientoBodega) => {
    const response = await fetch(`/api/bodegas/${bodegaId}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movimientoData),
    });
    return handleResponse(response);
  },
};

// TERMINALES
export const servicioTerminales = {
  // Obtener todos los terminales
  obtenerTerminales: async () => {
    try {
      const response = await fetch('/api/terminales');
      return handleResponse(response);
    } catch (error) {
      console.error('Error al obtener terminales:', error);
      throw error;
    }
  },

  // Obtener un terminal específico
  obtenerTerminal: async (id: string) => {
    try {
      const response = await fetch(`/api/terminales/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error al obtener terminal:', error);
      throw error;
    }
  },

  // Crear un nuevo terminal
  crearTerminal: async (terminalData: ValoresFormularioTerminal) => {
    try {
      const response = await fetch('/api/terminales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terminalData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error al crear terminal:', error);
      throw error;
    }
  },

  // Actualizar un terminal
  actualizarTerminal: async (id: string, terminalData: Partial<ValoresFormularioTerminal>) => {
    try {
      const response = await fetch(`/api/terminales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terminalData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error al actualizar terminal:', error);
      throw error;
    }
  },

  // Eliminar un terminal
  eliminarTerminal: async (id: string) => {
    try {
      const response = await fetch(`/api/terminales/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error al eliminar terminal:', error);
      throw error;
    }
  },

  // Asignar usuario a terminal
  asignarUsuario: async (terminalId: string, usuarioId: string) => {
    try {
      const response = await fetch(`/api/terminales/${terminalId}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error al asignar usuario:', error);
      throw error;
    }
  },

  // Desasignar usuario de terminal
  desasignarUsuario: async (terminalId: string, usuarioId: string) => {
    try {
      const response = await fetch(`/api/terminales/${terminalId}/usuarios?usuarioId=${usuarioId}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error al desasignar usuario:', error);
      throw error;
    }
  },
};

// EMPRESAS (superadmin)
export const servicioEmpresas = {
  // Obtener todas las empresas (solo superadmin)
  obtenerEmpresas: async ({

    busqueda,
    estado,
    pagina = 1,
    limite = 20,
  }: {
    busqueda?: string;
    estado?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('search', busqueda);
    if (estado) params.append('estado', estado);
    params.append('page', String(pagina));
    params.append('limit', String(limite));

    const response = await fetch(`/api/administrador/empresas?${params.toString()}`);
    return handleResponse(response);
  },

  // Obtener una empresa específica
  obtenerEmpresa: async (id: string) => {
    const response = await fetch(`/api/administrador/empresas/${id}`);
    return handleResponse(response);
  },

  // Crear una nueva empresa
  crearEmpresa: async (empresaData: {
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
    logo?: string;
    tipoNegocio: string;
    fechaVencimiento?: string;
    nombreAdmin: string;
    emailAdmin: string;
    contrasenaAdmin: string;
    telefonoAdmin?: string;
    planId?: string;
    planMeses?: number;
  }) => {
    const response = await fetch('/api/administrador/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empresaData),
    });
    return handleResponse(response);
  },

  // Actualizar estado de una empresa
  actualizarEmpresa: async (id: string, empresaData: {
    activa?: boolean;
    fechaVencimiento?: string;
    notaDesactivacion?: string;
  }) => {
    const response = await fetch('/api/administrador/empresas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...empresaData }),
    });
    return handleResponse(response);
  },

  // Obtener usuarios de una empresa
  obtenerUsuariosEmpresa: async (id: string) => {
    const response = await fetch(`/api/administrador/empresas/${id}/usuarios`);
    return handleResponse(response);
  },
};

// MASCOTAS (para veterinarias)
export const servicioMascotas = {
  // Obtener todas las mascotas
  obtenerMascotas: async (opciones: {
    clienteId?: string;
    busqueda?: string;
    pagina?: number;
    limite?: number;
  } = {}) => {
    try {
      const params = new URLSearchParams();

      if (opciones.clienteId) {
        params.append('clienteId', opciones.clienteId);
      }

      if (opciones.busqueda) {
        params.append('busqueda', opciones.busqueda);
      }

      if (opciones.pagina) {
        params.append('pagina', opciones.pagina.toString());
      }

      if (opciones.limite) {
        params.append('limite', opciones.limite.toString());
      }

      const url = `/api/mascotas?${params.toString()}`;
      const response = await fetch(url);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMascotas.obtenerMascotas:', error);
      throw error;
    }
  },

  // Obtener una mascota específica
  obtenerMascota: async (id: string) => {
    try {
      const response = await fetch(`/api/mascotas/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMascotas.obtenerMascota:', error);
      throw error;
    }
  },

  // Crear una nueva mascota
  crearMascota: async (mascotaData: {
    nombre: string;
    especie: string;
    raza?: string;
    edad?: number;
    peso?: number;
    sexo?: 'MACHO' | 'HEMBRA';
    color?: string;
    microchip?: string;
    historialMedico?: string;
    alergias?: string;
    medicamentos?: string;
    observaciones?: string;
    clienteId: string;
  }) => {
    try {
      const response = await fetch('/api/mascotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mascotaData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMascotas.crearMascota:', error);
      throw error;
    }
  },

  // Actualizar una mascota existente
  actualizarMascota: async (id: string, mascotaData: Partial<ValoresFormularioMascota>) => {
    try {
      const response = await fetch(`/api/mascotas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mascotaData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMascotas.actualizarMascota:', error);
      throw error;
    }
  },

  // Eliminar (desactivar) una mascota
  eliminarMascota: async (id: string) => {
    try {
      const response = await fetch(`/api/mascotas/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMascotas.eliminarMascota:', error);
      throw error;
    }
  },
};

export const servicioServicios = {
  // Obtener todos los servicios
  obtenerServicios: async ({

    busqueda,
    categoriaId,
    activos = true,
    pagina = 1,
    limite = 50,
  }: {
    busqueda?: string;
    categoriaId?: string;
    activos?: boolean;
    pagina?: number;
    limite?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (busqueda) params.append('busqueda', busqueda);
    if (categoriaId && categoriaId !== 'TODOS') params.append('categoriaId', categoriaId);
    if (activos !== undefined) params.append('includeInactive', (!activos).toString());
    params.append('pagina', String(pagina));
    params.append('limite', String(limite));

    const response = await fetch(`/api/servicios?${params.toString()}`);
    const data = await handleResponse(response);

    if (Array.isArray(data)) {
      return {
        datos: data,
        paginacion: {
          total: data.length,
          pagina: 1,
          limite: data.length,
          totalPaginas: 1
        }
      };
    }

    return data;
  },

  obtenerServicio: async (id: string) => {
    const response = await fetch(`/api/servicios/${id}`);
    return handleResponse(response);
  },

  crearServicio: async (servicioData: {
    nombre: string;
    descripcion?: string;
    precio: number;
    duracion: number;
    color?: string;
    requiereEmpleado: boolean;
    activo: boolean;
    categoriaId?: string;
  }) => {
    const response = await fetch('/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servicioData),
    });
    return handleResponse(response);
  },

  actualizarServicio: async (id: string, servicioData: any) => {
    const response = await fetch(`/api/servicios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servicioData),
    });
    return handleResponse(response);
  },

  eliminarServicio: async (id: string) => {
    const response = await fetch(`/api/servicios/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

export const servicioReportes = {
  // Reporte general de ventas
  obtenerReporteVentas: async (filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    clienteId?: string;
    usuarioId?: string;
    estado?: string;
    metodoPago?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
    if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
    if (filtros.clienteId) params.append("clienteId", filtros.clienteId);
    if (filtros.usuarioId) params.append("usuarioId", filtros.usuarioId);
    if (filtros.estado) params.append("estado", filtros.estado);
    if (filtros.metodoPago) params.append("metodoPago", filtros.metodoPago);

    const response = await fetch(`/api/reportes/ventas?${params.toString()}`);
    return handleResponse(response);
  },

  // Reporte de productos
  obtenerReporteProductos: async () => {
    const response = await fetch(`/api/reportes/productos`);
    return handleResponse(response);
  },

  // Reporte de ventas por usuario
  obtenerReporteVentasPorUsuario: async (filtros: {
    fechaInicio?: string;
    fechaFin?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
    if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);

    const response = await fetch(`/api/reportes/ventas-por-usuario?${params.toString()}`);
    return handleResponse(response);
  },

  // Reporte de ventas por cliente
  obtenerReporteVentasPorCliente: async (filtros: {
    fechaInicio?: string;
    fechaFin?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
    if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);

    const response = await fetch(`/api/reportes/ventas-por-cliente?${params.toString()}`);
    return handleResponse(response);
  },

  // Cuentas por cobrar (ventas fiadas)
  obtenerCuentasPorCobrar: async (filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    clienteId?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
    if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
    if (filtros.clienteId) params.append("clienteId", filtros.clienteId);

    const response = await fetch(`/api/reportes/cuentas-por-cobrar?${params.toString()}`);
    return handleResponse(response);
  },

  // Exportar CSV
  exportarReporteCSV: async (tipo: string, filtros: any = {}) => {
    const params = new URLSearchParams(filtros);
    const response = await fetch(`/api/reportes/${tipo}/exportar?${params.toString()}`);
    return handleResponse(response);
  },

  obtenerReportesAvanzados: async (filtros: {
    periodo?: string;
  } = {}) => {
    const params = new URLSearchParams();

    if (filtros.periodo) {
      params.append("periodo", filtros.periodo);
    }

    const response = await fetch(`/api/reportes/avanzados?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al obtener reportes avanzados");
    }

    return await response.json();
  },
};

// Agregar al archivo api-service.ts existente

export const servicioMetas = {
  // Obtener todas las metas de la empresa
  obtenerMetas: async () => {
    try {
      const response = await fetch('/api/metas');
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.obtenerMetas:', error);
      throw error;
    }
  },

  // Obtener una meta específica por período
  obtenerMetaPorPeriodo: async (periodo: 'diaria' | 'semanal' | 'mensual') => {
    try {
      const response = await fetch(`/api/metas/${periodo}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.obtenerMetaPorPeriodo:', error);
      throw error;
    }
  },

  // Crear o actualizar una meta
  configurarMeta: async (metaData: {
    periodo: 'diaria' | 'semanal' | 'mensual';
    objetivo: number;
    tipo?: 'ventas' | 'ingresos';
    activa?: boolean;
  }) => {
    try {
      const response = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.configurarMeta:', error);
      throw error;
    }
  },

  // Actualizar una meta existente
  actualizarMeta: async (periodo: string, metaData: {
    objetivo?: number;
    activa?: boolean;
    tipo?: 'ventas' | 'ingresos';
  }) => {
    try {
      const response = await fetch(`/api/metas/${periodo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaData),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.actualizarMeta:', error);
      throw error;
    }
  },

  // Eliminar una meta
  eliminarMeta: async (periodo: string) => {
    try {
      const response = await fetch(`/api/metas/${periodo}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.eliminarMeta:', error);
      throw error;
    }
  },

  // Obtener progreso de metas con estadísticas
  obtenerProgresoMetas: async (fechaInicio?: string, fechaFin?: string) => {
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      const response = await fetch(`/api/metas/progreso?${params.toString()}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.obtenerProgresoMetas:', error);
      throw error;
    }
  },

  // Obtener historial de cumplimiento de metas
  obtenerHistorialMetas: async (periodo?: string, limite?: number) => {
    try {
      const params = new URLSearchParams();
      if (periodo) params.append('periodo', periodo);
      if (limite) params.append('limite', limite.toString());

      const response = await fetch(`/api/metas/historial?${params.toString()}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.obtenerHistorialMetas:', error);
      throw error;
    }
  },

  // Configurar múltiples metas a la vez
  configurarMetasMultiples: async (metas: Array<{
    periodo: 'diaria' | 'semanal' | 'mensual';
    objetivo: number;
    tipo?: 'ventas' | 'ingresos';
    activa?: boolean;
  }>) => {
    try {
      const response = await fetch('/api/metas/multiples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metas }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioMetas.configurarMetasMultiples:', error);
      throw error;
    }
  }
};

export const servicioTiempoReal = {
  // Obtener datos en tiempo real
  obtenerDatosTiempoReal: async () => {
    try {
      const response = await fetch('/api/ventas/tiempo-real', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioTiempoReal.obtenerDatosTiempoReal:', error);
      throw error;
    }
  },

  // Registrar actividad del usuario
  registrarActividad: async (accion: string, detalles: any = {}) => {
    try {
      const response = await fetch('/api/ventas/tiempo-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'registrar_actividad',
          datos: { accion, detalles }
        })
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioTiempoReal.registrarActividad:', error);
      throw error;
    }
  },

  // Obtener métricas específicas
  obtenerMetricas: async (filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    incluirAlertas?: boolean;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros?.incluirAlertas !== undefined) params.append('incluirAlertas', String(filtros.incluirAlertas));

      const url = `/api/ventas/tiempo-real/metricas${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioTiempoReal.obtenerMetricas:', error);
      throw error;
    }
  },

  // Obtener estado del sistema
  obtenerEstadoSistema: async () => {
    try {
      const response = await fetch('/api/ventas/tiempo-real/estado');
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioTiempoReal.obtenerEstadoSistema:', error);
      throw error;
    }
  },

  // Configurar notificaciones
  configurarNotificaciones: async (configuracion: {
    alertasStock?: boolean;
    alertasVentas?: boolean;
    alertasSistema?: boolean;
    intervaloActualizacion?: number;
  }) => {
    try {
      const response = await fetch('/api/ventas/tiempo-real/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracion)
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error en servicioTiempoReal.configurarNotificaciones:', error);
      throw error;
    }
  }
};


// Exportar todos los servicios
export default {
  servicioProductos,
  servicioCategorias,
  servicioClientes,
  servicioVentas,
  servicioUsuarios,
  servicioAuth,
  servicioRegistro,
  servicioReportes,
  servicioDashboard,
  servicioPOS,
  servicioProveedores,
  servicioBodegas,
  servicioTerminales,
  servicioEmpresas,
  servicioMascotas,
  servicioServicios,
  servicioTiempoReal,
};
