const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function crearSuperAdmin() {
  try {
    console.log('🚀 Iniciando creación de SuperAdmin...\n');

    // Verificar si ya existe la empresa
    const empresaExistente = await prisma.empresa.findFirst({
      where: { email: 'admin@alfarerolab.co' }
    });

    if (empresaExistente) {
      console.log('⚠️  La empresa ya existe. Eliminando datos anteriores...');
      await prisma.usuario.deleteMany({
        where: { empresaId: empresaExistente.id }
      });
      await prisma.empresa.delete({
        where: { id: empresaExistente.id }
      });
      console.log('✅ Datos anteriores eliminados\n');
    }

    // 1. Crear la empresa
    console.log('📋 Creando empresa...');
    const empresa = await prisma.empresa.create({
      data: {
        nombre: 'Alfarero Lab',
        nombreComercial: 'Alfarero Lab',
        email: 'admin@alfarerolab.co',
        telefono: '3001234567',
        direccion: 'Calle Principal #123',
        ciudad: 'Sincelejo',
        departamento: 'Sucre',
        pais: 'Colombia',
        tipoNegocio: 'OTRO',
        activa: true,
        bodegaHabilitada: true,
        nit: '900123456-7'
      }
    });

    console.log('✅ Empresa creada:', empresa.nombre);
    console.log('   ID:', empresa.id);
    console.log('   Email:', empresa.email);
    console.log('');

    // 2. Crear configuración de la empresa
    console.log('⚙️  Creando configuración...');
    const configuracion = await prisma.configuracionEmpresa.create({
      data: {
        empresaId: empresa.id,
        tipoNegocio: 'OTRO',
        habilitarServicios: true,
        habilitarCitas: true,
        habilitarVariantes: true,
        habilitarRecetas: false,
        habilitarLotes: false,
        habilitarVencimientos: false,
        habilitarMascotas: false,
        habilitarInventarioAvanzado: true,
        habilitarReportes: true,
        habilitarMultiUsuarios: true,
        metaDiariaVentas: 500000,
        metaSemanalVentas: 3000000,
        metaMensualVentas: 12000000
      }
    });

    console.log('✅ Configuración creada');
    console.log('');

    // 3. Hashear contraseña
    const password = 'Admin2025!'; // 🔑 CAMBIA ESTA CONTRASEÑA
    console.log('🔒 Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Contraseña hasheada');
    console.log('');

    // 4. Crear usuario SuperAdmin
    console.log('👤 Creando usuario SuperAdmin...');
    const usuario = await prisma.usuario.create({
      data: {
        nombre: 'Super Admin',
        email: 'admin@alfarerolab.co',
        telefono: '3001234567',
        contrasena: hashedPassword,
        rol: 'SUPERADMIN',
        empresaId: empresa.id,
        activo: true,
        emailVerificado: new Date(),
        configuracionCompletada: true
      }
    });

    console.log('✅ Usuario SuperAdmin creado:', usuario.email);
    console.log('   ID:', usuario.id);
    console.log('   Nombre:', usuario.nombre);
    console.log('   Rol:', usuario.rol);
    console.log('');

    // 5. Crear una categoría por defecto
    console.log('📁 Creando categoría por defecto...');
    const categoria = await prisma.categoria.create({
      data: {
        nombre: 'General',
        descripcion: 'Categoría general para productos',
        empresaId: empresa.id
      }
    });

    console.log('✅ Categoría creada:', categoria.nombre);
    console.log('');

    // 6. Crear terminal principal
    console.log('🖥️  Creando terminal principal...');
    const terminal = await prisma.terminal.create({
      data: {
        nombre: 'Terminal Principal',
        descripcion: 'Terminal principal de ventas',
        ubicacion: 'Mostrador',
        esTerminalPrincipal: true,
        activo: true,
        empresaId: empresa.id
      }
    });

    console.log('✅ Terminal creado:', terminal.nombre);
    console.log('');

    // Resumen final
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 ¡CREACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('📊 DATOS CREADOS:');
    console.log('   • Empresa:', empresa.nombre);
    console.log('   • Configuración: Completa');
    console.log('   • Usuario: SuperAdmin');
    console.log('   • Categoría: General');
    console.log('   • Terminal: Principal');
    console.log('');
    console.log('🔐 CREDENCIALES DE ACCESO:');
    console.log('   Email:', usuario.email);
    console.log('   Contraseña:', password);
    console.log('');
    console.log('🌐 ACCESO:');
    console.log('   http://pos.alfarerolab.co/iniciar-sesion');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════');
    console.error('❌ ERROR AL CREAR SUPERADMIN');
    console.error('═══════════════════════════════════════════════');
    console.error('Mensaje:', error.message);
    
    if (error.code === 'P2002') {
      console.error('');
      console.error('⚠️  Ya existe un registro con esos datos únicos');
      console.error('   Verifica que no exista un usuario con ese email');
    }
    
    console.error('');
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════════');
    
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
crearSuperAdmin();
