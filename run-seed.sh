#!/bin/bash
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /www/kannan-pos/sistema_pos

node --input-type=module << 'NODESCRIPT'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const empresaId = 'cmtrr87uq02pamrs74g4v939l';

// Estado del usuario
const usuario = await prisma.usuario.findFirst({
  where: { email: { contains: 'tejiendoconocimientosucre' } },
  select: { id: true, email: true, rol: true, configuracionCompletada: true, activo: true },
});
console.log('USUARIO:', JSON.stringify(usuario, null, 2));

// Si configuracionCompletada es false, corregirlo
if (!usuario.configuracionCompletada) {
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { configuracionCompletada: true },
  });
  console.log('✅ configuracionCompletada → true');
} else {
  console.log('✅ configuracionCompletada ya era true');
}

// Verificar ConfiguracionEmpresa
const config = await prisma.configuracionEmpresa.findUnique({
  where: { empresaId },
});
console.log('CONFIG EMPRESA:', JSON.stringify(config, null, 2));

await prisma.$disconnect();
NODESCRIPT
