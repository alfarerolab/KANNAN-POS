const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// @ts-expect-error Autofix Next15 o tipos implícitos
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra temporal (Seed) para validar APIs...');

  try {
    // 1. Crear empresa de prueba
    console.log('🏢 Creando empresa...');
    const empresa = await prisma.empresa.upsert({
      where: { nit: '999999999-9' },
      update: {},
      create: {
        nombre: 'TechStore POS Test',
        email: 'test@techstore.pos',
        telefono: '3000000000',
        direccion: 'Calle Falsa 123',
        tipoNegocio: 'TIENDA_BARRIO',
        nit: '999999999-9',
        activa: true,
      },
    });

    // 1.1 Configuración de la empresa
    await prisma.configuracionEmpresa.upsert({
      where: { empresaId: empresa.id },
      update: {},
      create: {
        empresaId: empresa.id,
        tipoNegocio: 'TIENDA_BARRIO',
        habilitarServicios: true,
        habilitarCitas: true,
        habilitarVariantes: true,
        habilitarInventarioAvanzado: true,
      },
    });

    // 2. Crear administrador de prueba
    console.log('👤 Creando usuario administrador...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const usuarioId = 'usr_admin_' + Date.now();
    
    // We cannot upsert directly by email without knowing if there are duplicates easily, but we'll try:
    const admin = await prisma.usuario.upsert({
      where: { email: 'admin@techstore.pos' },
      update: {},
      create: {
        nombre: 'Admin Tester',
        email: 'admin@techstore.pos',
        contrasena: adminPassword,
        rol: 'ADMIN',
        empresaId: empresa.id,
        activo: true,
      },
    });

    // 3. Crear bodega de prueba
    console.log('📦 Creando bodega...');
    const bodega = await prisma.bodega.create({
      data: {
        nombre: 'Bodega Central Test',
        descripcion: 'Bodega de pruebas',
        empresaId: empresa.id,
        activa: true,
      },
    });

    // 4. Crear categorías
    console.log('📂 Creando categorías...');
    const categoria = await prisma.categoria.create({
      data: {
        nombre: 'Electrónica',
        descripcion: 'Productos electrónicos variados',
        empresaId: empresa.id,
      },
    });

    // 5. Crear proveedor
    console.log('🚚 Creando proveedor...');
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: 'SuperTech Distribuidores',
        contacto: 'Juan Pérez',
        email: 'ventas@supertech.pos',
        empresaId: empresa.id,
      },
    });

    // 6. Crear un producto de prueba
    console.log('📱 Creando producto...');
    const producto = await prisma.producto.create({
      data: {
        nombre: 'Smartphone XYZ 128GB',
        descripcion: 'Teléfono inteligente de prueba',
        precio: 1200000,
        precioCosto: 900000,
        tipoVenta: 'UNIDAD',
        codigoBarras: '7701234567890' + Date.now(), // para asegurar unicidad
        enStock: 15,
        stockMinimo: 5,
        categoriaId: categoria.id,
        proveedorId: proveedor.id,
        empresaId: empresa.id,
        activo: true,
        incluyeIva: true,
        tarifaIva: 19,
      },
    });

    // 7. Crear cliente de prueba
    console.log('🧑‍🤝‍🧑 Creando cliente...');
    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente de Prueba',
        telefono: '3111111111',
        email: 'cliente@prueba.pos',
        empresaId: empresa.id,
      },
    });

    // 8. Crear terminal de venta
    console.log('💻 Creando terminal...');
    const terminal = await prisma.terminal.create({
      data: {
        nombre: 'Caja 1',
        activo: true,
        empresaId: empresa.id,
        esTerminalPrincipal: true,
      },
    });

    // 9. Crear mascota (para probar APIs cruzadas)
    console.log('🐶 Creando mascota...');
    await prisma.mascota.create({
      data: {
        nombre: 'Firulais',
        especie: 'Perro',
        raza: 'Labrador',
        clienteId: cliente.id,
        empresaId: empresa.id,
      },
    });

    console.log('✅ ¡Seed ejecutado correctamente! Los datos temporales están listos para validar las APIs.');
    console.log('--- Resumen ---');
    console.log(`🔑 Login Email: admin@techstore.pos`);
    console.log(`🔐 Password: admin123`);

  } catch (error) {
    console.error('❌ Error ejecutando el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
