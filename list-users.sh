#!/bin/bash
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /www/kannan-pos/sistema_pos

node --input-type=module << 'NODESCRIPT'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const us = await prisma.usuario.findMany({select:{email:true, empresaId:true}, orderBy: {createdAt: 'desc'}, take: 10});
console.log('USUARIOS:', JSON.stringify(us, null, 2));

const prodsByEmp = await prisma.producto.groupBy({
  by: ['empresaId'],
  _count: {id: true}
});
console.log('PRODS POR EMPRESA:', JSON.stringify(prodsByEmp, null, 2));
await prisma.$disconnect();
NODESCRIPT
