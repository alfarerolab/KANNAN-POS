#!/bin/bash
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /www/kannan-pos/sistema_pos

node --input-type=module << 'NODESCRIPT'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const c = await prisma.producto.count({where:{empresaId:'cmtrr87uq02pamrs74g4v939l'}});
console.log('COUNT REAL EN DB:', c);
await prisma.$disconnect();
NODESCRIPT
