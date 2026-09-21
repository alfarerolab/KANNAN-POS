# Deploy KANNAN POS a Producción

## Descripción
Sube los cambios al servidor de producción vía SSH. El servidor corre en Linux con NVM, PM2 y Next.js. El proyecto vive en `/www/kannan-pos/sistema_pos`.

---

## Pasos

### 1. Verificar que no haya errores de TypeScript antes de subir
```bash
npx tsc --noEmit
```

### 2. Hacer commit y push de los cambios al repositorio
```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

### 3. Conectarse al servidor por SSH
```bash
ssh root@[IP_DEL_SERVIDOR]
```
> ⚠️ Reemplaza `[IP_DEL_SERVIDOR]` con la IP real del VPS. Si tienes alias configurado puedes usar `ssh kannan-prod`.

### 4. Ir al directorio del proyecto en el servidor
```bash
cd /www/kannan-pos/sistema_pos
```

### 5. Actualizar el código desde GitHub
```bash
git pull origin main
```

### 6. Ejecutar el script de deploy automático (instala deps, genera Prisma y hace build)
```bash
bash deploy.sh
```
> El script hace: `npm ci` → `npx prisma generate` → `npm run build` → `pm2 restart all`

### 7. Verificar que PM2 esté corriendo correctamente
```bash
pm2 status
pm2 logs sistema-pos --lines 30
```

### 8. Verificar la app en el navegador
Abre `https://[DOMINIO_O_IP]` y comprueba que la app responda correctamente.

---

## Notas importantes
- **Variables de entorno**: El `.env` del servidor **no** se sube por Git. Si agregaste nuevas variables env, debes agregarlas manualmente en el servidor en `/www/kannan-pos/sistema_pos/.env`.
- **Migraciones de base de datos**: Si hay nuevas migraciones de Prisma, ejecuta `npx prisma migrate deploy` en el servidor **antes** de hacer el build.
- **Rollback**: Si algo falla, haz `git revert HEAD` localmente, push, y repite el deploy.
