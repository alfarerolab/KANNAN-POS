/**
 * Re-exportaciones de tipos y enums de Prisma con nombres amigables.
 * 
 * Prisma genera los nombres de enums basándose en el nombre del schema
 * (e.g., `usuario_rol`, `empresa_tipoNegocio`). Este archivo crea aliases
 * con nombres más legibles para uso en toda la aplicación.
 */

// Re-exportar todos los tipos originales de Prisma
export * from "@prisma/client";

// ============================================================
// Aliases de Enums
// ============================================================

// Roles de usuario
export { usuario_rol as Rol } from "@prisma/client";

// Tipos de negocio
export { empresa_tipoNegocio as TipoNegocio } from "@prisma/client";

// Métodos de pago
export { venta_metodoPago as MetodoPago } from "@prisma/client";

// Estados de venta
export { venta_estado as EstadoVenta } from "@prisma/client";

// Estado de pago fiado
export { venta_estadoPago as EstadoPagoFiado } from "@prisma/client";

// Tipo de movimiento de bodega
export { movimientobodega_tipo as TipoMovimiento } from "@prisma/client";

// Estado de mesa restaurante
export { mesarestaurante_estado as EstadoMesaRestaurante } from "@prisma/client";

// Estado de pedido restaurante
export { pedidorestaurante_estado as EstadoPedidoRestaurante } from "@prisma/client";

// Estación de preparación de pedido
export { pedidorestauranteitem_estacion as EstacionPreparacionRestaurante } from "@prisma/client";

// Estado de preparación de pedido
export { pedidorestauranteitem_estadoPreparacion as EstadoPreparacionRestaurante } from "@prisma/client";

// Método de pago de restaurante (alias para MetodoPago)
export { pagoventa_metodoPago as MetodoPagoRestaurante } from "@prisma/client";

// Estado de cita
export { cita_estado as EstadoCita } from "@prisma/client";

// Tipo de venta de producto
export { producto_tipoVenta as TipoVentaProducto } from "@prisma/client";

// Estado de suscripción
export { suscripcion_estado as EstadoSuscripcion } from "@prisma/client";

// Tipo de unidad de medida
export { unidadmedida_tipo as TipoUnidadMedida } from "@prisma/client";

// Acción de auditoría
export { auditorialog_accion as AccionAuditoria } from "@prisma/client";

// Tipo de métrica de uso
export { metricauso_tipo as TipoMetricaUso } from "@prisma/client";
