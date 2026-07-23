const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMovimientos() {
    try {
        const empresaId = (await prisma.empresa.findFirst()).id;
        const fechaFiltro = new Date().toISOString().split('T')[0];
        const inicio = new Date(`${fechaFiltro}T00:00:00-05:00`);
        const fin = new Date(`${fechaFiltro}T23:59:59.999-05:00`);

        const ventas = await prisma.venta.findMany({
            where: {
                empresaId,
                estado: "COMPLETADA",
                createdAt: { gte: inicio, lte: fin },
            },
            include: {
                cliente: true,
                usuario: true,
                terminal: true,
                pagos: true,
                caja: true,
            },
        });

        console.log(`Encontradas ${ventas.length} ventas directas hoy`);

        // Simulate the exact code from route.ts
        const movimientos = [];
        const ventasDirectas = ventas.filter(v => !v.esVentaFiada);
        for (const v of ventasDirectas) {
            if (v.metodoPago === "MIXTO" && v.pagos && v.pagos.length > 0) {
                for (const [index, pago] of v.pagos.entries()) {
                    movimientos.push({
                        id: `v-${v.id}-${index}`,
                        en: pago.metodoPago
                    });
                }
            } else {
                movimientos.push({
                    id: `v-${v.id}`,
                    en: v.metodoPago
                });
            }
        }
        console.log('Movimientos armados:', movimientos.length);
        console.log('Todo el bucle de movimientos no arrojó errores! JS está de acuerdo.');
    } catch (error) {
        console.error('ERROR EN BUCLE:', error);
    } finally {
        await prisma.$disconnect();
    }
}
testMovimientos();
