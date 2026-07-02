import type { Rol, TipoNegocio } from "../lib/prisma-types";
import type { User } from "next-auth";

// Interfaz para variantes de producto
export interface VarianteProducto {
  id: string;
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  precio?: number;
  enStock: number;
  activo: boolean;
  talla?: string;
  color?: string;
  material?: string;
  atributosExtra?: Record<string, unknown>;
}

// Extender el tipo User para incluir detalles de la empresa y el rol
export interface UsuarioExtendido extends User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  empresaId: string;
}

// Definir el tipo de sesión
export interface InterfazSesion {
  user: UsuarioExtendido;
}

// Tipos para formularios de autenticación
export interface ValoresFormularioLogin {
  email: string;
  contrasena: string;
}

export interface ValoresFormularioRegistro {
  nombre: string;
  email: string;
  contrasena: string;
  confirmarContrasena: string;
  nombreEmpresa: string;
}

// Tipos para la gestión de la empresa
export interface ValoresFormularioEmpresa {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  logo?: string;
}

// Tipos para la gestión de productos
export interface ValoresFormularioProducto {
  nombre: string;
  descripcion?: string;
  precio: number;
  precioCosto?: number;
  tipoVenta: string;

  // Precios por unidad de medida
  precioPorKilo?: number;
  precioPorGramo?: number;
  precioPorMetro?: number;
  precioPorLitro?: number;

  // Configuración de unidades
  unidadBase?: string;
  unidadVenta?: string;
  factorConversion?: number;
  requiereBalanza?: boolean;
  pesoAproximado?: number;

  codigoBarras?: string;
  sku?: string;
  enStock: number;
  stockMinimo: number;
  activo: boolean;
  categoriaId?: string;
  proveedorId?: string;
  imagen?: string;
}

// Tipos para categorías
export interface ValoresFormularioCategoria {
  nombre: string;
  descripcion?: string;
}

// Tipos para clientes
export interface ValoresFormularioCliente {
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

// Tipo para productos en el carrito (actualizado)
export interface ProductoCarrito {
  id: string;
  nombre: string;
  precio: number;
  tipoVenta: string;

  // Precios por unidad de medida
  precioPorKilo?: number;
  precioPorGramo?: number;
  precioPorMetro?: number;
  precioPorLitro?: number;

  // Configuración de IVA
  esExentoIva?: boolean;
  tarifaIva?: number; // Porcentaje de IVA (ej: 19 para 19%)
  incluyeIva?: boolean; // Si el precio ya incluye IVA o no


  // Configuración de unidades
  unidadBase?: string;
  unidadVenta?: string;
  factorConversion?: number;
  requiereBalanza?: boolean;
  pesoAproximado?: number;

  imagen?: string;
  enStock?: number;
  empresaId: string;
  categoria?: string | {
    id: string;
    nombre: string;
  };
  
  // Campos específicos por tipo de negocio
  variante?: VarianteProducto; // Para tiendas de ropa
  lote?: string; // Para farmacias
  fechaVencimiento?: string; // Para farmacias
  esServicio?: boolean; // Para servicios
  duracion?: number; // Para servicios en minutos
  
  // Campos adicionales para servicios
  servicioId?: string; // ID original del servicio
  requiereEmpleado?: boolean;
  color?: string;
  descripcion?: string;


  servicioOriginal?: {
    id: string;
    empresaId: string | null;
  };
  
  // Campos para citas y clientes asociados
  citaId?: string;
  clienteAsociado?: {
    id: string;
    nombre: string;
    empresaId: string;
  };
  
  // Campos específicos para veterinarias
  mascota?: {
    id: string;
    nombre: string;
    especie: string;
    raza?: string;
  };
  diagnostico?: string;
  tratamiento?: string;
  proximaCita?: string;
}


// Tipos para ventas
export interface ItemCarrito {
  id: string;
  producto: ProductoCarrito;
  cantidad: number;
  peso?: number; // Para productos por peso en kg
  medida?: number; // Para productos por metros, litros, etc.
  unidadMedida?: string; // kg, g, l, ml, m, cm, etc.
  precioLibre?: number; // Para productos con precio libre
  subtotal: number;
  citaId?: string;
  esCortesia?: boolean;
  empleadoId?: string; // Para comisiones de peluquería
  empleado?: {
    id: string;
    nombre: string;
  };
}

export interface ValoresFormularioVenta {
  clienteId?: string;
  metodoPago: string;
  notas?: string;
  items: ItemCarrito[];
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
}

// Tipos para usuarios
export interface ValoresFormularioUsuario {
  nombre: string;
  email: string;
  contrasena?: string;
  confirmarContrasena?: string;
  rol: Rol;
  telefono?: string;
  imagen?: string;
}

// Tipo para agregar producto al carrito - permite flexibilidad en el input
export interface AgregarProductoCarrito {
  id?: string;
  producto: ProductoCarrito;
  cantidad?: number; // Opcional, por defecto será 1
  peso?: number; // Para productos por peso en kg
  medida?: number; // Para productos por metros, litros, etc.
  unidadMedida?: string; // Unidad específica usada
  precioLibre?: number; // Para productos con precio libre
  esCortesia?: boolean; // Flag to add item as cortesia
  empleadoId?: string; // Para comisiones
}

// Tipos para proveedores
export interface ValoresFormularioProveedor {
  nombre: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  contacto?: string;
  notas?: string;
  activo: boolean;
}

// Tipos para bodegas
export interface ValoresFormularioBodega {
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  activa: boolean;
}

// Tipos para movimientos de bodega
export interface ValoresFormularioMovimientoBodega {
  tipo: string;
  cantidad: number;
  peso?: number;
  motivo: string;
  observaciones?: string;
  productoId: string;
  bodegaId: string;
}

// Tipos para terminales
export interface ValoresFormularioTerminal {
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  numeracion?: string;
  activo: boolean;
  esTerminalPrincipal: boolean;
}

export interface Terminal {
  id: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  numeracion?: string;
  activo: boolean;
  esTerminalPrincipal: boolean;
  empresaId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsuarioTerminal {
  id: string;
  usuarioId: string;
  terminalId: string;
  activo: boolean;
  fechaAsignacion: Date;
}

// Tipos para mascotas (veterinarias)
export interface ValoresFormularioMascota {
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
}

export interface Mascota {
  id: string;
  nombre: string;
  especie: string;
  raza?: string;
  edad?: number;
  peso?: number;
  sexo?: string;
  color?: string;
  microchip?: string;
  historialMedico?: string;
  alergias?: string;
  medicamentos?: string;
  observaciones?: string;
  activo: boolean;
  clienteId: string;
  empresaId: string;
  createdAt: Date;
  updatedAt: Date;
  cliente?: {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
  };
}
