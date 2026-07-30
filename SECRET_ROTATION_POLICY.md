# 🔐 Política de Rotación de Secrets y Credenciales
> **Frecuencia Recomendada:** Cada 90 días o inmediatamente tras un incidente de seguridad (filtración confirmada o sospecha).

## 1. NEXTAUTH_SECRET (Firma de JWT)
El secret de NextAuth se utiliza para generar y verificar todos los tokens de sesión.
* **Comando para generar nuevo secret seguro:** `openssl rand -base64 64`
* **Procedimiento:**
  1. Generar nuevo string.
  2. Modificar el `.env` del servidor en `/www/kannan-pos/sistema_pos/.env`.
  3. Reiniciar PM2: `pm2 restart all`.
* **Impacto al rotar:** Todos los usuarios activos serán cerrados de su sesión y tendrán que loguearse nuevamente. Hazlo fuera de horas operativas pico.

## 2. Contraseña MySQL (alfarero_pos)
Es crítica para la interacción del ORM Prisma con la Base de Datos.
* **Procedimiento:**
  1. Conectarse al servidor MySQL mediante root o admin.
  2. Ejecutar comando: `ALTER USER 'alfarero_pos'@'localhost' IDENTIFIED BY '<nueva-contraseña-segura>'; FLUSH PRIVILEGES;`
  3. Actualizar la variable `DATABASE_URL` en `.env` manteniendo la sintaxis de Prisma (`mysql://...`).
  4. Reiniciar PM2: `pm2 restart all`.
* **Impacto al rotar:** Interrupción del sistema de microsegundos mientras reinicia la conexión. De no actualizar `.env`, el sistema se cae.

## 3. Claves SSH del VPS (200.7.101.154)
Para el acceso `root` o cualquier acceso privilegiado al servidor físico.
* **Rotación obligatoria cuando:** Un miembro del equipo (desarrollador o admin sys) deja la organización o pierde un dispositivo autenticado.
* **Procedimiento:**
  1. Eliminar llaves públicas antiguas en `~/.ssh/authorized_keys`.
  2. Emitir nuevos pares `ssh-keygen -t ed25519`.
  3. Cambiar adicionalmente la contraseña general de admin/root si aplica con comando `passwd`.

## 4. Redis (Opcional)
Si Redis comienza a aceptar conexiones no locales en el futuro, configurar `--requirepass` en `redis.conf` y actualizar `REDIS_URL` correspondientemente. Cada 180 días.
