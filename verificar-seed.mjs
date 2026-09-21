// verificar-seed.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const usuario = await prisma.usuario.findFirst({
    where: { email: 'ztejiendoconocimientosucre@gmail.com' },
    select: { empresaId: true, nombre: true },
});

const empresaId = usuario.empresaId;
const categorias = await prisma.categoria.count({ where: { empresaId } });
const productos = await prisma.producto.count({ where: { empresaId } });
const movimientos = await prisma.movimientoInventario.count();

console.log(`Usuario: ${usuario.nombre}`);
console.log(`Categorías: ${categorias}`);
console.log(`Productos: ${productos}`);
console.log(`Movimientos inventario: ${movimientos}`);

await prisma.$disconnect();
