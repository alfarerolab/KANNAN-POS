const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ventas = await prisma.venta.findMany({
        where: { metodoPago: 'OTRO', estado: 'COMPLETADA' },
        include: { pagos: true }
    });
    let count = 0;
    for (const v of ventas) {
        if (v.pagos && v.pagos.length > 0) {
            const isMixto = v.pagos.length > 1; // Un pago múltiple de la misma empresa puede tener 2 pagos, o 1 pago fiado. Pero si tiene pagos, era MIXTO o FIADO.
            await prisma.venta.update({
                where: { id: v.id },
                data: { metodoPago: 'MIXTO' }
            });
            count++;
        }
    }
    console.log('Fixed:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
