import type { TipoNegocio } from "./prisma-types";
// Configuración específica por tipo de negocio
export interface ConfiguracionNegocio {
  tipo: TipoNegocio;
  nombre: string;
  icono: string;
  color: string;
  gradiente: string;
  descripcion?: string;
  funcionalidades: {
    servicios: boolean;
    citas: boolean;
    variantes: boolean;
    recetas: boolean;
    lotes: boolean;
    vencimientos: boolean;
    mascotas: boolean;
    empleadosEspecializados: boolean;
    inventarioAvanzado: boolean;
    facturacionElectronica: boolean;
    // Nuevas funcionalidades para tiendas de barrio colombianas
    ventasPorMayor: boolean;
    sistemaCredito: boolean;
    clientesFrecuentes: boolean;
    controlCajas: boolean;
    ventasMultiples: boolean;
    descuentosEspeciales: boolean;
    reportesAvanzados: boolean;
    integracionContabilidad: boolean;
  };
  camposPOS: {
    mostrarStock: boolean;
    permitirVentaSinStock: boolean;
    ventaPorPeso: boolean;
    ventaPorMedida: boolean;
    requiereCliente: boolean;
    permitirDescuentos: boolean;
    // Nuevos campos específicos para tiendas de barrio
    preciosPorMayor: boolean;
    preciosAlDetal: boolean;
    calculadoraPeso: boolean;
    sistemaFiar: boolean;
    descuentosVolumen: boolean;
    ventaRapida: boolean;
    modificarPrecios: boolean;
    agregarNotas: boolean;
    impresionTickets: boolean;
  };
  navegacion: {
    mostrarMascotas: boolean;
    mostrarServicios: boolean;
    mostrarCitas: boolean;
    mostrarInventarioAvanzado: boolean;
    mostrarReportes: string[];
    // Nuevas secciones de navegación
    mostrarCreditos?: boolean;
    mostrarVentasMayoristas?: boolean;
    mostrarProduccion?: boolean;
    mostrarCalidadControl?: boolean;
    mostrarTurnos?: boolean;
    mostrarMesas?: boolean;
    mostrarDelivery?: boolean;
  };
  recomendaciones: {
    productos: string[];
    servicios: string[];
    configuraciones: string[];
  };
}

// Configuraciones predefinidas por tipo de negocio
export const CONFIGURACIONES_NEGOCIO: Record<string, ConfiguracionNegocio> = {
  TIENDA_BARRIO: {
    tipo: "TIENDA_BARRIO" as TipoNegocio,
    nombre: "Tienda de Barrio",
    icono: "🏪",
    color: "blue",
    gradiente: "from-blue-500 to-cyan-500",
    descripcion: "Tienda de conveniencia con productos básicos y sistema de crédito",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: true,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "clientes", "inventario", "creditos"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Bebidas", "Snacks", "Productos básicos", "Higiene personal", "Productos de limpieza"],
      servicios: ["Recargas telefónicas", "Pago de servicios", "Giros"],
      configuraciones: ["Configurar precios por mayor", "Activar sistema de crédito", "Configurar alertas de vencimiento"]
    }
  },

  FARMACIA: {
    tipo: "FARMACIA" as TipoNegocio,
    nombre: "Farmacia",
    icono: "💊",
    color: "green",
    gradiente: "from-green-500 to-emerald-500",
    descripcion: "Farmacia con control de medicamentos y recetas médicas",
    funcionalidades: {
      servicios: true,
      citas: false,
      variantes: true,
      recetas: true,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: false,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: false,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: false,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "medicamentos", "recetas", "vencimientos", "lotes"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false
    },
    recomendaciones: {
      productos: ["Medicamentos", "Vitaminas", "Productos de higiene", "Productos naturales"],
      servicios: ["Aplicación de inyecciones", "Toma de presión", "Consulta farmacéutica"],
      configuraciones: ["Configurar alertas de vencimiento", "Sistema de recetas", "Control de lotes"]
    }
  },

  VETERINARIA: {
    tipo: "VETERINARIA" as TipoNegocio,
    nombre: "Veterinaria",
    icono: "🐕",
    color: "purple",
    gradiente: "from-purple-500 to-pink-500",
    descripcion: "Clínica veterinaria con gestión de mascotas y citas",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: true,
      recetas: true,
      lotes: true,
      vencimientos: true,
      mascotas: true,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: true,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: false,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: true,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "servicios", "mascotas", "citas", "medicamentos"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false
    },
    recomendaciones: {
      productos: ["Medicamentos veterinarios", "Alimentos", "Accesorios", "Juguetes"],
      servicios: ["Consulta veterinaria", "Vacunación", "Cirugías", "Grooming"],
      configuraciones: ["Registro de mascotas", "Sistema de citas", "Historial clínico"]
    }
  },

  RESTAURANTE: {
    tipo: "RESTAURANTE" as TipoNegocio,
    nombre: "Restaurante",
    icono: "🍽️",
    color: "orange",
    gradiente: "from-orange-500 to-red-500",
    descripcion: "Restaurante con gestión de mesas y órdenes",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "mesas", "empleados"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarMesas: true,
      mostrarDelivery: true
    },
    recomendaciones: {
      productos: ["Platos principales", "Bebidas", "Postres", "Entradas"],
      servicios: ["Delivery", "Reservas", "Eventos"],
      configuraciones: ["Gestión de mesas", "Tiempo de preparación", "Sistema de propinas"]
    }
  },

  BAR: {
    tipo: "BAR" as TipoNegocio,
    nombre: "Bar",
    icono: "🍸",
    color: "violet",
    gradiente: "from-violet-500 to-purple-500",
    descripcion: "Bar con servicio de bebidas, cocteles y barra",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "mesas", "empleados"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarMesas: true,
      mostrarDelivery: false
    },
    recomendaciones: {
      productos: ["Cocteles", "Cervezas", "Vinos", "Licores", "Bebidas sin alcohol", "Snacks de barra"],
      servicios: ["Reservas VIP", "Eventos privados"],
      configuraciones: ["Gestión de mesas y barra", "Recetas de cocteles", "Sistema de propinas"]
    }
  },

  SALON_BELLEZA: {
    tipo: "SALON_BELLEZA" as TipoNegocio,
    nombre: "Salón de Belleza",
    icono: "💄",
    color: "pink",
    gradiente: "from-pink-500 to-rose-500",
    descripcion: "Salón de belleza con servicios personalizados y citas",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: false,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: false,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: false,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: false,
      mostrarReportes: ["ventas", "servicios", "clientes", "empleados"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: ["Productos de belleza", "Accesorios"],
      servicios: ["Corte", "Tinte", "Manicure", "Pedicure", "Tratamientos"],
      configuraciones: ["Duración de servicios", "Sistema de citas", "Comisiones empleados"]
    }
  },

  SUPERMERCADO: {
    tipo: "SUPERMERCADO" as TipoNegocio,
    nombre: "Supermercado",
    icono: "🛒",
    color: "indigo",
    gradiente: "from-indigo-500 to-blue-500",
    descripcion: "Supermercado con amplio inventario y múltiples categorías",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: true,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: false,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: false,
      agregarNotas: false,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "inventario", "proveedores"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Alimentos", "Bebidas", "Higiene", "Limpieza", "Productos frescos"],
      servicios: [],
      configuraciones: ["Múltiples categorías", "Control de vencimientos", "Códigos de barras"]
    }
  },

  FERRETERIA: {
    tipo: "FERRETERIA" as TipoNegocio,
    nombre: "Ferretería",
    icono: "🔧",
    color: "gray",
    gradiente: "from-gray-500 to-slate-500",
    descripcion: "Ferretería con productos por unidad y medida",
    funcionalidades: {
      servicios: true,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: true,
      ventaPorMedida: true,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "clientes", "inventario"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Herramientas", "Materiales de construcción", "Eléctricos", "Plomería"],
      servicios: ["Instalación", "Reparación", "Corte de materiales"],
      configuraciones: ["Venta por metro", "Precios mayorista", "Sistema de crédito"]
    }
  },

  TIENDA_COMIDA: {
    tipo: "TIENDA_COMIDA" as TipoNegocio,
    nombre: "Tienda de Comida",
    icono: "🍞",
    color: "amber",
    gradiente: "from-amber-500 to-yellow-500",
    descripcion: "Tienda de alimentos, panadería o productos comestibles",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: true,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: true,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "inventario", "vencimientos"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true,
      mostrarProduccion: true
    },
    recomendaciones: {
      productos: ["Pan", "Lácteos", "Embutidos", "Bebidas", "Snacks"],
      servicios: ["Domicilios"],
      configuraciones: ["Control de vencimientos", "Precios por mayor", "Sistema de crédito"]
    }
  },

  CAFETERIA: {
    tipo: "CAFETERIA" as TipoNegocio,
    nombre: "Cafetería",
    icono: "☕",
    color: "yellow",
    gradiente: "from-yellow-600 to-amber-500",
    descripcion: "Cafetería con bebidas, snacks y servicio rápido",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: true,
      lotes: false,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "empleados"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarMesas: true
    },
    recomendaciones: {
      productos: ["Café", "Bebidas frías", "Pasteles", "Sándwiches", "Postres"],
      servicios: [],
      configuraciones: ["Venta rápida", "Gestión de mesas", "Recetas de bebidas"]
    }
  },

  ROPA: {
    tipo: "ROPA" as TipoNegocio,
    nombre: "Tienda de Ropa",
    icono: "👗",
    color: "rose",
    gradiente: "from-rose-500 to-pink-500",
    descripcion: "Tienda de ropa y accesorios con tallas, colores y variantes",
    funcionalidades: {
      servicios: false,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: false,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "clientes", "inventario"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Camisetas", "Pantalones", "Vestidos", "Accesorios", "Calzado"],
      servicios: [],
      configuraciones: ["Configurar tallas y colores", "Precios por mayor", "Control de variantes"]
    }
  },

  PELUQUERIA: {
    tipo: "PELUQUERIA" as TipoNegocio,
    nombre: "Peluquería",
    icono: "✂️",
    color: "teal",
    gradiente: "from-teal-500 to-cyan-500",
    descripcion: "Peluquería con servicios de corte y estilismo",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: false,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: false,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: false,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: false,
      mostrarReportes: ["ventas", "servicios", "clientes", "empleados"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: ["Productos capilares", "Tintes", "Accesorios"],
      servicios: ["Corte", "Tinte", "Barba", "Alisado", "Peinado"],
      configuraciones: ["Duración de servicios", "Sistema de citas", "Comisiones empleados"]
    }
  },

  LIBRERIA: {
    tipo: "LIBRERIA" as TipoNegocio,
    nombre: "Librería / Papelería",
    icono: "📚",
    color: "emerald",
    gradiente: "from-emerald-500 to-green-500",
    descripcion: "Librería, papelería o tienda de artículos escolares",
    funcionalidades: {
      servicios: true,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "inventario", "clientes"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Libros", "Cuadernos", "Útiles escolares", "Artículos de oficina"],
      servicios: ["Fotocopias", "Impresiones", "Encuadernación"],
      configuraciones: ["Precios por mayor", "Control de inventario", "Sistema de crédito"]
    }
  },

  ELECTRONICA: {
    tipo: "ELECTRONICA" as TipoNegocio,
    nombre: "Electrónica",
    icono: "📱",
    color: "sky",
    gradiente: "from-sky-500 to-blue-500",
    descripcion: "Tienda de electrónica con garantías y seriales",
    funcionalidades: {
      servicios: true,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: true,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "clientes", "inventario"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true
    },
    recomendaciones: {
      productos: ["Celulares", "Computadores", "Accesorios", "Audio", "Cables"],
      servicios: ["Reparación", "Mantenimiento", "Configuración"],
      configuraciones: ["Control de seriales", "Garantías", "Inventario con lotes"]
    }
  },

  SERVICIOS: {
    tipo: "SERVICIOS" as TipoNegocio,
    nombre: "Servicios Generales",
    icono: "🔨",
    color: "slate",
    gradiente: "from-slate-500 to-gray-500",
    descripcion: "Negocio de servicios generales",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: false,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: false,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: false,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: true,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: false,
      mostrarReportes: ["ventas", "servicios", "clientes", "empleados"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: false,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: [],
      servicios: ["Servicio a domicilio", "Consultoría", "Instalación", "Mantenimiento"],
      configuraciones: ["Duración de servicios", "Sistema de citas", "Facturación por horas"]
    }
  },

  SALUD: {
    tipo: "SALUD" as TipoNegocio,
    nombre: "Salud / Consultorio",
    icono: "🏥",
    color: "red",
    gradiente: "from-red-500 to-rose-500",
    descripcion: "Consultorio médico, óptica o centro de salud",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: true,
      recetas: true,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: false,
      descuentosEspeciales: false,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: false,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: false,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "servicios", "citas", "pacientes"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: ["Medicamentos", "Insumos médicos", "Lentes", "Prótesis"],
      servicios: ["Consulta", "Examen", "Procedimiento", "Control"],
      configuraciones: ["Sistema de citas", "Historial clínico", "Recetas médicas"]
    }
  },

  PROFESIONAL: {
    tipo: "PROFESIONAL" as TipoNegocio,
    nombre: "Servicios Profesionales",
    icono: "💼",
    color: "violet",
    gradiente: "from-violet-500 to-purple-500",
    descripcion: "Consultores, abogados, contadores — facturas de honorarios",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: false,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: false,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: false,
      ventasMultiples: false,
      descuentosEspeciales: false,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: false,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: true,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: true,
      descuentosVolumen: false,
      ventaRapida: false,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: false,
      mostrarReportes: ["ventas", "servicios", "clientes"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: false,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: [],
      servicios: ["Consultoría", "Asesoría", "Representación legal", "Auditoría"],
      configuraciones: ["Facturación por horas", "Sistema de citas", "Gestión de clientes"]
    }
  },

  MIXTO: {
    tipo: "MIXTO" as TipoNegocio,
    nombre: "Negocio Mixto",
    icono: "🏬",
    color: "cyan",
    gradiente: "from-cyan-500 to-blue-500",
    descripcion: "Negocio que combina productos y servicios",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: true,
      recetas: false,
      lotes: true,
      vencimientos: true,
      mascotas: false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: true,
      ventaPorMedida: true,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "servicios", "clientes", "inventario"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true,
      mostrarTurnos: true
    },
    recomendaciones: {
      productos: ["Productos generales", "Insumos"],
      servicios: ["Servicios generales", "Mantenimiento"],
      configuraciones: ["Configurar catálogo", "Sistema de citas", "Inventario avanzado"]
    }
  },

  PERSONALIZADO: {
    tipo: "PERSONALIZADO" as TipoNegocio,
    nombre: "Personalizado",
    icono: "⚙️",
    color: "zinc",
    gradiente: "from-zinc-500 to-gray-500",
    descripcion: "Configuración personalizada — el usuario define sus funcionalidades",
    funcionalidades: {
      servicios: true,
      citas: true,
      variantes: true,
      recetas: true,
      lotes: true,
      vencimientos: true,
      mascotas: true,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: true,
      sistemaCredito: true,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: true
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: true,
      ventaPorMedida: true,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: true,
      preciosAlDetal: true,
      calculadoraPeso: true,
      sistemaFiar: true,
      descuentosVolumen: true,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: true,
      mostrarServicios: true,
      mostrarCitas: true,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "servicios", "clientes", "inventario", "empleados"],
      mostrarCreditos: true,
      mostrarVentasMayoristas: true,
      mostrarProduccion: true,
      mostrarTurnos: true,
      mostrarMesas: true,
      mostrarDelivery: true
    },
    recomendaciones: {
      productos: [],
      servicios: [],
      configuraciones: ["Personalizar funcionalidades", "Configurar catálogo", "Ajustar permisos"]
    }
  },

  OTRO: {
    tipo: "OTRO" as TipoNegocio,
    nombre: "Otro",
    icono: "🏢",
    color: "neutral",
    gradiente: "from-neutral-500 to-gray-500",
    descripcion: "Tipo de negocio general",
    funcionalidades: {
      servicios: true,
      citas: false,
      variantes: true,
      recetas: false,
      lotes: false,
      vencimientos: false,
      mascotas: false,
      empleadosEspecializados: false,
      inventarioAvanzado: true,
      facturacionElectronica: true,
      ventasPorMayor: false,
      sistemaCredito: false,
      clientesFrecuentes: true,
      controlCajas: true,
      ventasMultiples: true,
      descuentosEspeciales: true,
      reportesAvanzados: true,
      integracionContabilidad: false
    },
    camposPOS: {
      mostrarStock: true,
      permitirVentaSinStock: true,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      preciosPorMayor: false,
      preciosAlDetal: true,
      calculadoraPeso: false,
      sistemaFiar: false,
      descuentosVolumen: false,
      ventaRapida: true,
      modificarPrecios: true,
      agregarNotas: true,
      impresionTickets: true
    },
    navegacion: {
      mostrarMascotas: false,
      mostrarServicios: true,
      mostrarCitas: false,
      mostrarInventarioAvanzado: true,
      mostrarReportes: ["ventas", "productos", "clientes", "inventario"],
      mostrarCreditos: false,
      mostrarVentasMayoristas: false
    },
    recomendaciones: {
      productos: ["Productos generales"],
      servicios: ["Servicios generales"],
      configuraciones: ["Configurar catálogo", "Control de inventario"]
    }
  }
};

// Función para obtener configuración por tipo
export function obtenerConfiguracionNegocio(tipo: string): ConfiguracionNegocio | null {
  return CONFIGURACIONES_NEGOCIO[tipo] || null;
}

// Función para obtener todos los tipos disponibles
export function obtenerTiposNegocio(): ConfiguracionNegocio[] {
  return Object.values(CONFIGURACIONES_NEGOCIO);
}

// Función para aplicar configuración automática
export function aplicarConfiguracionAutomatica(
  tipo: string,
  configuracionActual: any
): any {
  const config = obtenerConfiguracionNegocio(tipo);
  if (!config) return configuracionActual;

  return {
    ...configuracionActual,
    // Aplicar funcionalidades
    habilitarServicios: config.funcionalidades.servicios,
    habilitarCitas: config.funcionalidades.citas,
    habilitarVariantes: config.funcionalidades.variantes,
    habilitarRecetas: config.funcionalidades.recetas,
    habilitarLotes: config.funcionalidades.lotes,
    habilitarVencimientos: config.funcionalidades.vencimientos,
    habilitarMascotas: config.funcionalidades.mascotas,
    habilitarEmpleadosEspecializados: config.funcionalidades.empleadosEspecializados,
    habilitarInventarioAvanzado: config.funcionalidades.inventarioAvanzado,
    habilitarFacturacionElectronica: config.funcionalidades.facturacionElectronica,
    habilitarVentasPorMayor: config.funcionalidades.ventasPorMayor,
    habilitarSistemaCredito: config.funcionalidades.sistemaCredito,
    habilitarClientesFrecuentes: config.funcionalidades.clientesFrecuentes,

    // Aplicar configuración POS
    pos: {
      ...configuracionActual.pos,
      mostrarStock: config.camposPOS.mostrarStock,
      permitirVentaSinStock: config.camposPOS.permitirVentaSinStock,
      ventaPorPeso: config.camposPOS.ventaPorPeso,
      ventaPorMedida: config.camposPOS.ventaPorMedida,
      requiereCliente: config.camposPOS.requiereCliente,
      permitirDescuentos: config.camposPOS.permitirDescuentos,
      preciosPorMayor: config.camposPOS.preciosPorMayor,
      preciosAlDetal: config.camposPOS.preciosAlDetal,
      calculadoraPeso: config.camposPOS.calculadoraPeso,
      sistemaFiar: config.camposPOS.sistemaFiar,
      descuentosVolumen: config.camposPOS.descuentosVolumen,
      ventaRapida: config.camposPOS.ventaRapida,
      modificarPrecios: config.camposPOS.modificarPrecios,
      agregarNotas: config.camposPOS.agregarNotas,
      impresionTickets: config.camposPOS.impresionTickets
    },

    // Aplicar navegación
    navegacion: {
      ...configuracionActual.navegacion,
      mostrarMascotas: config.navegacion.mostrarMascotas,
      mostrarServicios: config.navegacion.mostrarServicios,
      mostrarCitas: config.navegacion.mostrarCitas,
      mostrarInventarioAvanzado: config.navegacion.mostrarInventarioAvanzado,
      mostrarReportes: config.navegacion.mostrarReportes,
      mostrarCreditos: config.navegacion.mostrarCreditos,
      mostrarVentasMayoristas: config.navegacion.mostrarVentasMayoristas,
      mostrarProduccion: config.navegacion.mostrarProduccion,
      mostrarCalidadControl: config.navegacion.mostrarCalidadControl,
      mostrarTurnos: config.navegacion.mostrarTurnos,
      mostrarMesas: config.navegacion.mostrarMesas,
      mostrarDelivery: config.navegacion.mostrarDelivery
    }
  };
}

// Función para generar recomendaciones
export function generarRecomendaciones(tipo: string): {
  productos: string[];
  servicios: string[];
  configuraciones: string[];
} {
  const config = obtenerConfiguracionNegocio(tipo);
  if (!config) {
    return {
      productos: [],
      servicios: [],
      configuraciones: []
    };
  }

  return config.recomendaciones;
}

// Función para validar si una funcionalidad está habilitada para un tipo de negocio
export function validarFuncionalidad(
  tipo: TipoNegocio | string,
  funcionalidad: string
): boolean {
  const config = obtenerConfiguracionNegocio(tipo as string);
  if (!config) return false;

  const funcionalidades = config.funcionalidades as Record<string, boolean>;
  return funcionalidades[funcionalidad] ?? false;
}
