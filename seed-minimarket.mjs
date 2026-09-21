// seed-minimarket.mjs
// Carga categorías y productos demo para mini market
// Uso: node seed-minimarket.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Buscar el usuario demo y su empresaId
    const usuario = await prisma.usuario.findFirst({
        where: { email: 'ztejiendoconocimientosucre@gmail.com' },
        select: { id: true, nombre: true, empresaId: true },
    });

    if (!usuario) {
        console.error('❌ Usuario demo no encontrado');
        process.exit(1);
    }

    const empresaId = usuario.empresaId;
    const usuarioId = usuario.id;
    console.log(`✅ Usuario: ${usuario.nombre} | empresaId: ${empresaId}`);

    // 2. Crear proveedor genérico
    const proveedor = await prisma.proveedor.upsert({
        where: { id: 'proveedor-demo-minimarket' },
        update: {},
        create: {
            id: 'proveedor-demo-minimarket',
            nombre: 'Proveedor General Demo',
            empresa: 'Distribuidora Demo S.A.S',
            telefono: '3001234567',
            empresaId,
        },
    });
    console.log(`✅ Proveedor: ${proveedor.nombre}`);

    // 3. Definir categorías
    const categoriasData = [
        { nombre: 'Bebidas Refrescantes', descripcion: 'Gaseosas, jugos, aguas y refrescos' },
        { nombre: 'Bebidas Hidratantes', descripcion: 'Bebidas deportivas e hidratantes' },
        { nombre: 'Bebidas Alcohólicas', descripcion: 'Cervezas, licores y vinos' },
        { nombre: 'Lácteos y Refrigerados', descripcion: 'Leche, yogurt, queso y derivados lácteos' },
        { nombre: 'Abarrotes y Despensa', descripcion: 'Arroz, aceite, azúcar, conservas y más' },
        { nombre: 'Snacks y Dulces', descripcion: 'Papas fritas, chocolatinas y meriendas' },
        { nombre: 'Confitería', descripcion: 'Caramelos, chicles, paletas y galletas' },
        { nombre: 'Aseo Personal', descripcion: 'Higiene y cuidado personal' },
        { nombre: 'Aseo del Hogar', descripcion: 'Detergentes, desinfectantes y limpieza' },
        { nombre: 'Granel', descripcion: 'Productos vendidos a granel o por porción' },
        { nombre: 'Embutidos y Carnes Frías', descripcion: 'Salchichas, jamón, chorizo y mortadela' },
    ];

    // 4. Crear categorías
    const categorias = {};
    for (const cat of categoriasData) {
        const existente = await prisma.categoria.findFirst({
            where: { nombre: cat.nombre, empresaId },
        });
        if (existente) {
            categorias[cat.nombre] = existente;
            console.log(`⏭️  Categoría ya existe: ${cat.nombre}`);
        } else {
            const nueva = await prisma.categoria.create({
                data: { ...cat, empresaId },
            });
            categorias[cat.nombre] = nueva;
            console.log(`✅ Categoría creada: ${cat.nombre}`);
        }
    }

    // 5. Definir productos
    const productosData = [
        // Bebidas Refrescantes
        { nombre: 'Coca-Cola 250ml', categoria: 'Bebidas Refrescantes', precio: 2000, costo: 1400, stock: 48 },
        { nombre: 'Coca-Cola 400ml', categoria: 'Bebidas Refrescantes', precio: 2500, costo: 1800, stock: 36 },
        { nombre: 'Coca-Cola 1.5L', categoria: 'Bebidas Refrescantes', precio: 5500, costo: 4000, stock: 24 },
        { nombre: 'Pepsi 250ml', categoria: 'Bebidas Refrescantes', precio: 1800, costo: 1200, stock: 36 },
        { nombre: 'Sprite 250ml', categoria: 'Bebidas Refrescantes', precio: 2000, costo: 1400, stock: 36 },
        { nombre: 'Fanta Naranja 250ml', categoria: 'Bebidas Refrescantes', precio: 2000, costo: 1400, stock: 24 },
        { nombre: 'Hit Naranja 200ml', categoria: 'Bebidas Refrescantes', precio: 1500, costo: 1000, stock: 48 },
        { nombre: 'Hit Manzana 200ml', categoria: 'Bebidas Refrescantes', precio: 1500, costo: 1000, stock: 48 },
        { nombre: 'Jugo Tampico 250ml', categoria: 'Bebidas Refrescantes', precio: 2000, costo: 1400, stock: 36 },
        { nombre: 'Agua Brisa 600ml', categoria: 'Bebidas Refrescantes', precio: 1500, costo: 900, stock: 60 },
        { nombre: 'Agua Cristal 600ml', categoria: 'Bebidas Refrescantes', precio: 1500, costo: 900, stock: 60 },
        { nombre: 'Té Hatsu Verde 400ml', categoria: 'Bebidas Refrescantes', precio: 3500, costo: 2500, stock: 24 },

        // Bebidas Hidratantes
        { nombre: 'Gatorade Naranja 500ml', categoria: 'Bebidas Hidratantes', precio: 3500, costo: 2500, stock: 24 },
        { nombre: 'Gatorade Limón 500ml', categoria: 'Bebidas Hidratantes', precio: 3500, costo: 2500, stock: 24 },
        { nombre: 'Powerade Mora 500ml', categoria: 'Bebidas Hidratantes', precio: 3000, costo: 2200, stock: 24 },
        { nombre: 'Powerade Naranja 500ml', categoria: 'Bebidas Hidratantes', precio: 3000, costo: 2200, stock: 24 },
        { nombre: 'Squash Naranja 500ml', categoria: 'Bebidas Hidratantes', precio: 2500, costo: 1800, stock: 20 },

        // Bebidas Alcohólicas
        { nombre: 'Aguardiente Antioqueño 375ml', categoria: 'Bebidas Alcohólicas', precio: 12000, costo: 9000, stock: 12 },
        { nombre: 'Aguardiente Néctar 375ml', categoria: 'Bebidas Alcohólicas', precio: 11000, costo: 8500, stock: 12 },
        { nombre: 'Ron Medellín Añejo 375ml', categoria: 'Bebidas Alcohólicas', precio: 13000, costo: 10000, stock: 10 },
        { nombre: 'Cerveza Águila 330ml', categoria: 'Bebidas Alcohólicas', precio: 2800, costo: 2000, stock: 48 },
        { nombre: 'Cerveza Club Colombia 330ml', categoria: 'Bebidas Alcohólicas', precio: 3500, costo: 2600, stock: 36 },
        { nombre: 'Cerveza Póker 330ml', categoria: 'Bebidas Alcohólicas', precio: 2500, costo: 1800, stock: 48 },
        { nombre: 'Cerveza Corona 330ml', categoria: 'Bebidas Alcohólicas', precio: 5000, costo: 3800, stock: 24 },
        { nombre: 'Vino Santa Helena Blanco 187ml', categoria: 'Bebidas Alcohólicas', precio: 6000, costo: 4500, stock: 12 },

        // Lácteos y Refrigerados
        { nombre: 'Leche Alquería Entera 1L', categoria: 'Lácteos y Refrigerados', precio: 3800, costo: 2900, stock: 30 },
        { nombre: 'Leche Alquería Deslactosada 1L', categoria: 'Lácteos y Refrigerados', precio: 4200, costo: 3200, stock: 20 },
        { nombre: 'Yogurt Alpina Fresa 150g', categoria: 'Lácteos y Refrigerados', precio: 2500, costo: 1800, stock: 24 },
        { nombre: 'Avena Alpina 250ml', categoria: 'Lácteos y Refrigerados', precio: 2800, costo: 2000, stock: 24 },
        { nombre: 'Queso Campesino 250g', categoria: 'Lácteos y Refrigerados', precio: 5500, costo: 4000, stock: 15 },
        { nombre: 'Mantequilla La Fina 125g', categoria: 'Lácteos y Refrigerados', precio: 4000, costo: 3000, stock: 15 },
        { nombre: 'Kumis Alpina 200ml', categoria: 'Lácteos y Refrigerados', precio: 2200, costo: 1600, stock: 20 },

        // Abarrotes y Despensa
        { nombre: 'Arroz Diana 500g', categoria: 'Abarrotes y Despensa', precio: 2500, costo: 1800, stock: 30 },
        { nombre: 'Arroz Diana 1kg', categoria: 'Abarrotes y Despensa', precio: 4800, costo: 3500, stock: 20 },
        { nombre: 'Aceite Canola 500ml', categoria: 'Abarrotes y Despensa', precio: 7500, costo: 5800, stock: 20 },
        { nombre: 'Aceite Girasol 1L', categoria: 'Abarrotes y Despensa', precio: 13000, costo: 10000, stock: 12 },
        { nombre: 'Azúcar Manuelita 500g', categoria: 'Abarrotes y Despensa', precio: 2800, costo: 2000, stock: 25 },
        { nombre: 'Azúcar Manuelita 1kg', categoria: 'Abarrotes y Despensa', precio: 5200, costo: 3800, stock: 15 },
        { nombre: 'Sal Refisal 500g', categoria: 'Abarrotes y Despensa', precio: 1500, costo: 1000, stock: 20 },
        { nombre: 'Pasta Doria 250g', categoria: 'Abarrotes y Despensa', precio: 2200, costo: 1600, stock: 24 },
        { nombre: 'Sopa Maggi Gallina 83g', categoria: 'Abarrotes y Despensa', precio: 2000, costo: 1400, stock: 30 },
        { nombre: 'Frijol Colpaz 500g', categoria: 'Abarrotes y Despensa', precio: 3500, costo: 2600, stock: 20 },
        { nombre: 'Lenteja 500g', categoria: 'Abarrotes y Despensa', precio: 3200, costo: 2400, stock: 20 },
        { nombre: 'Atún Van Camps 80g', categoria: 'Abarrotes y Despensa', precio: 3200, costo: 2400, stock: 30 },
        { nombre: 'Sardinas Colfarina 155g', categoria: 'Abarrotes y Despensa', precio: 3500, costo: 2600, stock: 20 },
        { nombre: 'Mayonesa Fruco 200g', categoria: 'Abarrotes y Despensa', precio: 4500, costo: 3300, stock: 15 },
        { nombre: 'Salsa de Tomate Fruco 200g', categoria: 'Abarrotes y Despensa', precio: 3500, costo: 2600, stock: 15 },
        { nombre: 'Café Colcafé Tarro 50g', categoria: 'Abarrotes y Despensa', precio: 5500, costo: 4000, stock: 15 },
        { nombre: 'Panela Redonda 500g', categoria: 'Abarrotes y Despensa', precio: 2500, costo: 1800, stock: 20 },

        // Snacks y Dulces
        { nombre: 'Papas Margarita 30g', categoria: 'Snacks y Dulces', precio: 1500, costo: 1000, stock: 48 },
        { nombre: 'Papas Margarita 50g', categoria: 'Snacks y Dulces', precio: 2500, costo: 1700, stock: 36 },
        { nombre: 'Doritos 40g', categoria: 'Snacks y Dulces', precio: 2500, costo: 1700, stock: 36 },
        { nombre: 'Chitos 30g', categoria: 'Snacks y Dulces', precio: 1500, costo: 1000, stock: 48 },
        { nombre: 'Chocolatina Jet 16g', categoria: 'Snacks y Dulces', precio: 1500, costo: 1000, stock: 60 },
        { nombre: 'Chocolatina Jet Grande', categoria: 'Snacks y Dulces', precio: 3500, costo: 2500, stock: 24 },
        { nombre: 'Nucita 24g', categoria: 'Snacks y Dulces', precio: 1500, costo: 1000, stock: 48 },
        { nombre: 'Maní Frito El Maizal 30g', categoria: 'Snacks y Dulces', precio: 1500, costo: 1000, stock: 48 },

        // Confitería
        { nombre: 'Bon Bon Bum Fresa', categoria: 'Confitería', precio: 500, costo: 350, stock: 100 },
        { nombre: 'Bon Bon Bum Mora', categoria: 'Confitería', precio: 500, costo: 350, stock: 100 },
        { nombre: 'Bon Bon Bum Maracuyá', categoria: 'Confitería', precio: 500, costo: 350, stock: 100 },
        { nombre: 'Halls Mentol', categoria: 'Confitería', precio: 500, costo: 350, stock: 100 },
        { nombre: 'Chicle Orbit Menta', categoria: 'Confitería', precio: 500, costo: 350, stock: 80 },
        { nombre: 'Trident Menta', categoria: 'Confitería', precio: 500, costo: 350, stock: 80 },
        { nombre: 'Paleta Colombina', categoria: 'Confitería', precio: 500, costo: 350, stock: 100 },
        { nombre: 'Galleta Oreo 36g', categoria: 'Confitería', precio: 2000, costo: 1400, stock: 48 },
        { nombre: 'Galleta Ducales 100g', categoria: 'Confitería', precio: 2800, costo: 2000, stock: 36 },

        // Aseo Personal
        { nombre: 'Papel Higiénico Familia x4', categoria: 'Aseo Personal', precio: 7000, costo: 5200, stock: 20 },
        { nombre: 'Shampoo Savital 350ml', categoria: 'Aseo Personal', precio: 8500, costo: 6500, stock: 12 },
        { nombre: 'Jabón Rey 400g', categoria: 'Aseo Personal', precio: 3500, costo: 2600, stock: 20 },
        { nombre: 'Cepillo Dental Colgate', categoria: 'Aseo Personal', precio: 4500, costo: 3300, stock: 15 },
        { nombre: 'Crema Dental Colgate 75ml', categoria: 'Aseo Personal', precio: 5500, costo: 4000, stock: 15 },
        { nombre: 'Desodorante Mennen 65g', categoria: 'Aseo Personal', precio: 8000, costo: 6000, stock: 12 },
        { nombre: 'Toallas Húmedas x20', categoria: 'Aseo Personal', precio: 5000, costo: 3800, stock: 15 },

        // Aseo del Hogar
        { nombre: 'Detergente FAB 250g', categoria: 'Aseo del Hogar', precio: 3000, costo: 2200, stock: 20 },
        { nombre: 'Detergente Ariel 250g', categoria: 'Aseo del Hogar', precio: 4500, costo: 3300, stock: 15 },
        { nombre: 'Suavizante Aromatel 200ml', categoria: 'Aseo del Hogar', precio: 4000, costo: 2900, stock: 15 },
        { nombre: 'Axión Lava Vajillas 250g', categoria: 'Aseo del Hogar', precio: 3500, costo: 2600, stock: 20 },
        { nombre: 'Blanqueador Límpido 400ml', categoria: 'Aseo del Hogar', precio: 3000, costo: 2200, stock: 15 },

        // Granel
        { nombre: 'Maíz Trillado 500g', categoria: 'Granel', precio: 2000, costo: 1400, stock: 30 },
        { nombre: 'Frijol Rojo 500g', categoria: 'Granel', precio: 3800, costo: 2800, stock: 25 },
        { nombre: 'Arveja Seca 500g', categoria: 'Granel', precio: 3000, costo: 2200, stock: 25 },
        { nombre: 'Harina de Maíz 500g', categoria: 'Granel', precio: 2500, costo: 1800, stock: 25 },

        // Embutidos y Carnes Frías
        { nombre: 'Salchicha Zenú x6', categoria: 'Embutidos y Carnes Frías', precio: 4500, costo: 3300, stock: 20 },
        { nombre: 'Jamón Pie trán 100g', categoria: 'Embutidos y Carnes Frías', precio: 3500, costo: 2600, stock: 20 },
        { nombre: 'Chorizo Zenú x4', categoria: 'Embutidos y Carnes Frías', precio: 5000, costo: 3800, stock: 15 },
        { nombre: 'Mortadela Ranchera 100g', categoria: 'Embutidos y Carnes Frías', precio: 3000, costo: 2200, stock: 20 },
    ];

    // 6. Crear productos
    let creados = 0;
    let omitidos = 0;
    for (const p of productosData) {
        const cat = categorias[p.categoria];
        if (!cat) {
            console.warn(`⚠️  Categoría no encontrada: ${p.categoria}`);
            continue;
        }

        const existente = await prisma.producto.findFirst({
            where: { nombre: p.nombre, empresaId },
        });

        if (existente) {
            omitidos++;
            continue;
        }

        await prisma.producto.create({
            data: {
                nombre: p.nombre,
                precio: p.precio,
                precioCosto: p.costo,
                enStock: p.stock,
                stockMinimo: 5,
                empresaId,
                categoriaId: cat.id,
                proveedorId: proveedor.id,
                activo: true,
                tipoVenta: 'UNIDAD',
                incluyeIva: true,
                tarifaIva: 19,
                esExentoIva: false,
            },
        });

        // Registrar movimiento de inventario (entrada inicial)
        const prod = await prisma.producto.findFirst({
            where: { nombre: p.nombre, empresaId },
        });
        if (prod) {
            await prisma.movimientoInventario.create({
                data: {
                    productoId: prod.id,
                    usuarioId,
                    cantidad: p.stock,
                    tipo: 'ENTRADA',
                    stockPrevio: 0,
                    stockNuevo: p.stock,
                    motivo: 'Inventario inicial - carga demo mini market',
                },
            });
        }

        creados++;
        process.stdout.write(`\r✅ Productos creados: ${creados} / ${productosData.length}`);
    }

    console.log(`\n\n📦 Resumen:`);
    console.log(`   Categorías: ${Object.keys(categorias).length}`);
    console.log(`   Productos creados: ${creados}`);
    console.log(`   Productos omitidos (ya existían): ${omitidos}`);
    console.log(`\n🎉 ¡Listo! El mini market demo está cargado.`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
