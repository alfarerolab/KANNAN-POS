# Plan de Acción: Módulo de Facturación Electrónica (Colombia)

Este documento sirve como guía paso a paso para la implementación del módulo independiente de facturación electrónica en KANNAN POS. Este archivo nos ayudará a mantenernos en contexto si regresamos al desarrollo en otra sesión o fecha.

---

## Fase 1: Frontend e Interfaz Gráfica (UI)
- [x] **Paso 1.1 - Menú Lateral (Sidebar):** Añadir el enlace "Facturación Electrónica" en el menú principal izquierdo, haciéndolo visible de manera general pero condicionado en el futuro.
- [x] **Paso 1.2 - Vistas del Módulo Base:** Crear la estructura de rutas (`/dashboard/facturacion-electronica`) con una navegación por pestañas (Tabs):
  - [x] Pestaña: Historial de Documentos (Facturas emitidas, estado DIAN, cliente, total).
  - [x] Pestaña: Notas de Crédito / Devoluciones.
  - [x] Pestaña: Configuración (Campos para ingresar tokens, certificado, resoluciones, etc).
- [x] **Paso 1.3 - Pantalla de Bloqueo:** Implementar una UI amigable tipo "Módulo Inactivo / Premium" en esa ruta. Si el cliente no tiene el módulo otorgado por el Super Admin, verá un mensaje explicando que debe contactar a soporte para activarlo.

## Fase 2: Backend y Estructura de Seguridad
- [x] **Paso 2.1 - Modelo de Permisos (schema.prisma):** Modificar la base de datos para agregar permisos a nivel Empresa o Suscripción asignables por el dueño de la app (ej. `activaFacturacionElectronica: Boolean`, por defecto `false`).
- [x] **Paso 2.2 - UI del Super Admin:** Crear o modificar la interfaz de administración de Tenants (Super Admin) para integrar un "ON/OFF" que habilite el módulo para un cliente específico.
- [x] **Paso 2.3 - Estructura de Facturas de Venta:** Modificar el esquema `Venta` u orquestar una nueva tabla en `schema.prisma`. Deben existir los campos oficiales:
  - `cufe` (Código Único de Factura Electrónica).
  - `codigoQR` (Texto cifrado para mostrar el QR gráfico).
  - `urlXml` y `urlPdf` (Enlaces del comprobante).
  - `estadoDian` (Aprobado, Rechazado, Procesando).
- [ ] **Paso 2.4 - DB Sync:** Ejecutar una migración (`prisma migrate` o `db push`) y actualizar los tipos de TypeScript.

## Fase 3: Integración en el POS (Flujo de Caja)
- [ ] **Paso 3.1 - Switch en el Diálogo de Pago:** En la vista de cobrar del POS (Checkout), validar si la empresa tiene el módulo. Si lo tiene, mostrar el toggle: *"¿Generar Factura Electrónica ante la DIAN?"*.
- [ ] **Paso 3.2 - Validación de Datos Legales:** Si el toggle está en "SÍ", establecer comprobaciones obligatorias que impidan concretar la venta si falta el NIT/Cédula, Nombre completo del comprador y Correo Electrónico.
- [ ] **Paso 3.3 - Preparación de "Payload" Genérico:** Justo antes de crear la venta en la DB, extraer cada ítem del carrito, calcular los impuestos (IVA/INC) y empaquetar en un formato estandarizado JSON listo para exportarse a cualquier API.

## Fase 4: Conexión Final (API del Proveedor Tecnológico)
- [ ] **Paso 4.1 - Microservicio de Billing:** Crear la capa lógica `src/lib/billing` dedicada exclusivamente a comunicarse con la API del proveedor elegido por el cliente (ej. Alegra, Siigo).
- [ ] **Paso 4.2 - Llamada API Real:** Añadir la lógica que transmite el JSON de venta armado en el Paso 3.3 a la API, aguanta la respuesta asíncrona, y guarda el CUFE devuelto en nuestra DB.
- [ ] **Paso 4.3 - Manejo de Rechazos:** Implementar la lógica para atrapar errores devueltos por la DIAN (p.ej. NIT no existe, timeout). Dar la posibilidad al usuario en el Historial de "Reintentar Envío".
- [ ] **Paso 4.4 - Modificación del Ticket Impreso:** Actualizar el componente/librería que imprime térmicamente para que inyecte y dibuje un `<QRCode>` real si la venta tiene un CUFE asociado.
