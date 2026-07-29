# 🛡️ Auditoría de Seguridad — KANNAN POS
> **Fecha de auditoría:** 29 de julio de 2026  
> **Versión del proyecto:** 0.1.0  
> **Stack:** Next.js 15 · Prisma ORM · MySQL · NextAuth v4 · PM2  
> **Auditor:** Análisis estático completo del repositorio `alfarerolab/KANNAN-POS`

---

## 📊 Resumen Ejecutivo

| Severidad | Hallazgos | Estado |
|-----------|-----------|--------|
| 🔴 CRÍTICO | 2 | Sin corregir |
| 🟠 ALTO | 2 | Sin corregir |
| 🟡 MEDIO | 5 | Sin corregir |
| 🟢 BIEN | 11 | Correcto |

**Nivel de exposición global: MEDIO-ALTO**

El sistema tiene una arquitectura de seguridad razonablemente bien concebida  
(autenticación JWT, rol-based access, parameterized queries con Prisma, bcrypt),  
pero presenta vulnerabilidades puntuales que deben corregirse antes de escalar el  
número de clientes o de abrir el sistema a internet sin restricciones adicionales.

---

## 🗂️ Superficie de Ataque — Inventario

```
src/
├── middleware.ts               ← Guardián de rutas (Edge Runtime)
├── lib/
│   ├── auth/auth.ts            ← NextAuth config + JWT callbacks
│   ├── rate-limit.ts           ← Rate limiting en memoria
│   ├── sanitize.ts             ← Sanitización de inputs
│   ├── password-policy.ts      ← Política de contraseñas
│   ├── api-middleware.ts       ← Helpers de autorización por rol
│   ├── subscription-middleware.ts ← Control de suscripciones
│   └── endpoint-validator.ts   ← Validación por funcionalidad de negocio
└── app/
    └── api/                    ← 122 route handlers (30 namespaces)
        ├── registro/           ← Endpoint público
        ├── auth/               ← NextAuth handler
        ├── administrador/      ← Solo SUPERADMIN
        ├── ventas/             ← Core del negocio
        ├── usuarios/           ← Gestión de usuarios
        └── ...28 módulos más

prisma/
├── schema.prisma               ← 1316 líneas · MySQL
└── seed.ts

Archivos de infraestructura:
├── .env                        ← Credenciales locales (NO en Git)
├── deploy.sh                   ← Script de deploy (SÍ en Git)
└── ecosystem.config.js         ← Config PM2
```

---

## 🔴 VULNERABILIDADES CRÍTICAS

---

### [CRIT-01] — `app.zip` con código fuente trackeado en Git

**Archivo afectado:** `src/app/app.zip`  
**Confirmado con:** `git ls-files | grep app.zip` → *encontrado en el repositorio*  
**CVSS estimado:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)

#### Descripción
Un archivo ZIP con el código fuente del directorio `src/app/` fue añadido al repositorio y está siendo trackeado por Git. Cualquier persona con acceso al repositorio puede descargarlo, analizarlo y encontrar lógica de negocio, queries a la BD, o incluso credenciales embebidas temporalmente.

#### Evidencia
```bash
$ git ls-files | grep app.zip
src/app/app.zip   # ← PRESENTE EN EL REPO REMOTO
```

#### Impacto
- Exposición de lógica de negocio a actores externos
- Posible exposición de configuraciones hardcodeadas si alguna vez se incluyeron
- El historial de Git retiene el archivo aunque se borre hoy sin limpiar el historial

#### Remediación (ver Plan de Soporte → CRIT-01)
```bash
# Eliminar del árbol de trabajo y del índice
git rm src/app/app.zip
git commit -m "security: remover app.zip del repositorio"
git push

# Limpiar del historial completo (recomendado)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/app/app.zip" \
  --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

---

### [CRIT-02] — `NEXTAUTH_SECRET` débil en producción

**Archivo afectado:** `.env` (línea 3)  
**CVSS estimado:** 8.1 (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H)

#### Descripción
```
NEXTAUTH_SECRET="f3cd2cf0ae22c83c276329fc6477d9c6"
```
El secret usado para firmar y verificar los JWT de sesión es un hash MD5 de 32 caracteres. Esto es insuficiente por dos razones:

1. **Entropía baja:** Un MD5 tiene un espacio de colisiones conocido. Un secret robusto debería ser al menos 256 bits (64 chars base64) generado de forma criptográficamente segura.
2. **Sin rotación:** No hay evidencia de que este secret se haya rotado desde la creación del proyecto.

Si un atacante obtiene este valor, puede forjar tokens JWT válidos para cualquier usuario, incluyendo SUPERADMIN.

#### Impacto
- Impersonación total de cualquier usuario del sistema
- Acceso a todos los datos de todas las empresas registradas
- Sin capacidad de detección (tokens forjados son indistinguibles de tokens legítimos)

#### Remediación (ver Plan de Soporte → CRIT-02)
```bash
# Generar un secret robusto:
openssl rand -base64 64

# Actualizar en .env (local y servidor):
NEXTAUTH_SECRET="<output_del_comando_anterior>"

# También cambiar la contraseña de MySQL:
# DATABASE_URL contiene: alfarerolab2025
# → Cambiar vía panel de MySQL/phpMyAdmin en el VPS
```

---

## 🟠 VULNERABILIDADES ALTAS

---

### [HIGH-01] — Paginación sin límite máximo en múltiples endpoints

**Archivos afectados:**

| Endpoint | Líneas | Límite actual |
|----------|--------|---------------|
| `api/ventas/route.ts` | 34–35 | Sin techo |
| `api/usuarios/route.ts` | 33–34 | Sin techo |
| `api/inventario/movimientos/route.ts` | 23–24 | Sin techo |
| `api/reportes/ventas/route.ts` | Sin paginación | Carga **todas** las ventas |
| `api/categorias/route.ts` | 21–22 | Sin techo |

**CVSS estimado:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H)

#### Descripción
```typescript
// Ejemplo en api/ventas/route.ts — SIN LÍMITE MÁXIMO
const pagina = parseInt(searchParams.get("pagina") || "1");
const limite = parseInt(searchParams.get("limite") || "20"); // ← puede ser 999999
```

Un usuario autenticado (incluso con rol EMPLEADO) puede enviar `?limite=999999` a cualquiera de estos endpoints. El servidor intentará cargar todos los registros en memoria, provocando:
- Saturación de RAM del servidor
- Queries lentas que bloquean la BD
- Posible crash de PM2 (que luego se auto-reinicia, reseteando el rate-limiting)

El endpoint `api/reportes/ventas/route.ts` es el más grave: no tiene paginación en absoluto y carga **todas** las ventas de la empresa en un solo request.

#### Remediación
```typescript
// ✅ Patrón correcto — usar en TODOS los endpoints con paginación
const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1") || 1);
const limite = Math.min(100, Math.max(1, parseInt(searchParams.get("limite") || "20") || 20));
```

---

### [HIGH-02] — `ignoreBuildErrors: true` enmascara bugs de seguridad

**Archivo afectado:** `next.config.js` (líneas 11, 14)  
**CVSS estimado:** 4.0 (AV:L/AC:H/PR:H/UI:N/S:U/C:L/I:L/A:N)

#### Descripción
```javascript
typescript: {
  ignoreBuildErrors: true,    // ← Los errores de tipos se ignoran en producción
},
eslint: {
  ignoreDuringBuilds: true,   // ← Las reglas de linting no bloquean el deploy
},
```

El código tiene decenas de `// @ts-expect-error` y casteos con `as any`. Al ignorar los errores en build, es imposible detectar si una modificación rompió un tipo crítico. Por ejemplo:

```typescript
// api/administrador/empresas/route.ts:204
tipoNegocio: tipoNegocio as any, // ← typo aquí pasaría a producción sin warning
```

Aunque no es una vulnerabilidad directa, es una **deuda de seguridad**: un cambio inadvertido en un tipo podría omitir una validación de `empresaId` o `rol` y pasar desapercibido.

---

## 🟡 VULNERABILIDADES MEDIAS

---

### [MED-01] — Rate Limiting en memoria, no persistente

**Archivo afectado:** `src/lib/rate-limit.ts` (línea 13)

#### Descripción
```typescript
// El store se pierde en cada restart de PM2
const stores = new Map<string, Map<string, RateLimitEntry>>();
```

El rate limiting del login (5 intentos/min por IP, 10/hora por email) se almacena en memoria del proceso Node.js. Cuando PM2 ejecuta `pm2 restart all` (que ocurre en cada deploy con `deploy.sh`), el contador se resetea.

**Escenario de ataque:**
1. Atacante intenta 4 veces con un email objetivo
2. Admin hace un deploy normal → PM2 reinicia → contadores a cero
3. Atacante continúa el brute-force sin restricción

---

### [MED-02] — `IS_ELECTRON=true` bypasea TODA la autenticación

**Archivo afectado:** `src/middleware.ts` (líneas 8–10)

#### Descripción
```typescript
if (process.env.IS_ELECTRON === "true") {
  return NextResponse.next(); // ← Sin autenticación, sin roles, sin nada
}
```

Si esta variable de entorno se define en el servidor de producción (por error, por un script de configuración, o por un atacante con acceso al sistema), **cualquier request HTTP pasa directamente sin ninguna verificación**. El paquete `electron` está en devDependencies, pero la variable de entorno puede activarse desde cualquier contexto.

---

### [MED-03] — Sin Content-Security-Policy (CSP)

**Archivos afectados:** `next.config.js`, `src/middleware.ts`

#### Descripción
El sistema implementa varios security headers correctamente:
```
✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
✅ X-Frame-Options: SAMEORIGIN / DENY
✅ X-Content-Type-Options: nosniff
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: origin-when-cross-origin
✅ Permissions-Policy: camera=(), microphone=(), geolocation=()
❌ Content-Security-Policy: (NO CONFIGURADO)
```

La ausencia de CSP permite que si algún XSS se filtra (por ejemplo en los campos de notas de ventas o direcciones de clientes que se renderizan en el frontend), el atacante puede ejecutar scripts arbitrarios, exfiltrar datos, o robar tokens de sesión.

---

### [MED-04] — JWT de 30 días sin mecanismo de revocación real

**Archivo afectado:** `src/lib/auth/auth.ts` (línea 43)

#### Descripción
```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 días
},
```

Los JWT son stateless: una vez emitido, no puede invalidarse hasta que expire. Existen mitigaciones parciales:
- El JWT callback revalida activo/inactivo desde la BD cada 30 segundos
- Cambiar la contraseña de un usuario **no invalida tokens existentes**
- Un logout solo elimina la cookie en ese dispositivo; el token sigue siendo válido si fue capturado

Si un empleado es despedido y se desactiva su cuenta, tiene hasta 30 segundos de acceso residual (aceptable), pero si el token JWT fue roobado antes, el atacante tiene acceso indefinido hasta que expire el token.

---

### [MED-05] — `DISABLE_ACCOUNT_CHECKS` como variable de entorno controlable

**Archivo afectado:** `src/middleware.ts` (línea 106)

#### Descripción
```typescript
const verificacionesDeshabilitadas =
  process.env.NODE_ENV === 'development' ||
  process.env.DISABLE_ACCOUNT_CHECKS === 'true'; // ← Variable de emergencia
```

Esta variable fue pensada para emergencias de desarrollo pero si queda activa en producción (o si un atacante con acceso al servidor la establece), **el middleware de suscripciones se desactiva completamente**. Cualquier empresa vencida o inactiva podría seguir operando sin restricciones.

---

## ✅ LO QUE ESTÁ BIEN — Defensa Sólida

| # | Control | Detalle |
|---|---------|---------|
| 1 | **Prisma ORM** | Parameterized queries por defecto. Sin SQL injection directo posible |
| 2 | **bcrypt 12 rounds** | Passwords correctamente hasheados. Costo computacional adecuado |
| 3 | **Rate limiting en login** | 5 req/min por IP + 10/hora por email |
| 4 | **Política de contraseñas** | Mínimo 8 chars, mayúscula, minúscula, número, especial |
| 5 | **`empresaId` desde token** | Nunca del cuerpo del request. Aislamiento multi-tenant correcto |
| 6 | **`.env` fuera de Git** | Correctamente ignorado en `.gitignore` y no trackeado |
| 7 | **Headers OWASP** | HSTS, X-Frame-Options, X-Content-Type-Options configurados |
| 8 | **Revalidación JWT** | Estado de usuario/empresa verificado en BD cada 30 segundos |
| 9 | **Sanitización de inputs** | `sanitizeInput()`, `sanitizeSearchQuery()`, `validateId()` disponibles |
| 10 | **SUPERADMIN verificado en servidor** | `session.user.role !== "SUPERADMIN"` siempre desde `getServerSession` |
| 11 | **Transacciones atómicas** | Creación de empresa+usuario, ventas+stock: `db.$transaction()` |
| 12 | **AuditoriaLog** | Modelo de auditoría en BD para acciones críticas |
| 13 | **Empleados operativos aislados** | No tienen email real, no pueden hacer login al sistema web |

---

## 📋 PLAN DE SOPORTE Y REMEDIACIÓN

> Prioridad basada en impacto real y facilidad de explotación.  
> Cada tarea incluye el archivo a modificar, el cambio exacto y el criterio de cierre.

---

### 🔴 SEMANA 1 — Críticos (Bloquean producción segura)

---

#### TAREA [CRIT-01] — Eliminar `app.zip` del repositorio

**Tiempo estimado:** 20 minutos  
**Responsable:** Dev lead / quien tenga acceso de push

```bash
# Paso 1: Eliminar el archivo del árbol
git rm "src/app/app.zip"

# Paso 2: Commit
git commit -m "security: eliminar app.zip del repositorio [CRIT-01]"

# Paso 3: Push normal
git push origin main

# Paso 4 (RECOMENDADO): Limpiar del historial de Git
# OJO: Esto reescribe el historial. Avisar a todo el equipo primero.
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/app/app.zip" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
git push origin --force --tags

# Paso 5: Todos los colaboradores deben hacer:
git fetch --all
git reset --hard origin/main
```

**Criterio de cierre:** `git ls-files | grep app.zip` → sin output

---

#### TAREA [CRIT-02] — Regenerar `NEXTAUTH_SECRET` y cambiar contraseña MySQL

**Tiempo estimado:** 30 minutos

**Parte A — Nuevo secret:**
```bash
# En la máquina local o en el servidor:
openssl rand -base64 64
# Copiar el output (ejemplo): 
# xK9mP2qR7vL4nJ8wX5tY1uF3oE6iC0aB/dG+hI=...

# En el servidor de producción:
nano /www/kannan-pos/sistema_pos/.env
# Cambiar:
NEXTAUTH_SECRET="<output_del_comando_openssl>"
```

**Parte B — Nueva contraseña MySQL:**
```sql
-- Conectar como root a MySQL en el VPS
ALTER USER 'alfarero_pos'@'localhost' IDENTIFIED BY '<nueva_contraseña_segura>';
FLUSH PRIVILEGES;
```

```bash
# Actualizar DATABASE_URL en .env del servidor:
DATABASE_URL="mysql://alfarero_pos:<nueva_contraseña>@127.0.0.1:3307/alfarero_pos"
```

**Parte C — Reiniciar el servidor:**
```bash
pm2 restart all
```

> ⚠️ Al cambiar `NEXTAUTH_SECRET`, **todos los usuarios activos serán deslogueados** automáticamente. Planificar para fuera de horario pico.

**Criterio de cierre:** `openssl rand -base64 64` fue usado como fuente del secret. Secret tiene 64+ caracteres.

---

### 🟠 SEMANA 2 — Altos (Pueden causar DoS o ocultar bugs)

---

#### TAREA [HIGH-01] — Agregar límite máximo a paginación

**Tiempo estimado:** 1–2 horas  
**Archivos a modificar:**

**1. `src/app/api/ventas/route.ts` — Líneas 34–35:**
```typescript
// ANTES:
const pagina = parseInt(searchParams.get("pagina") || "1");
const limite = parseInt(searchParams.get("limite") || "20");

// DESPUÉS:
const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1") || 1);
const limite = Math.min(100, Math.max(1, parseInt(searchParams.get("limite") || "20") || 20));
```

**2. `src/app/api/usuarios/route.ts` — Líneas 33–34:** (mismo cambio)

**3. `src/app/api/inventario/movimientos/route.ts` — Líneas 23–24:** (mismo cambio, max 100)

**4. `src/app/api/reportes/ventas/route.ts` — Agregar paginación:**
```typescript
// Este endpoint carga TODAS las ventas. Agregar límite de fecha obligatorio o paginación:
const limite = Math.min(500, Math.max(1, parseInt(searchParams.get("limite") || "100") || 100));

// Si no se especifica fecha, limitar a los últimos 30 días por defecto:
if (!fechaInicio && !fechaFin) {
  const treintaDiasAtras = new Date();
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);
  whereClause.createdAt = { gte: treintaDiasAtras };
}
```

**5. Todos los demás endpoints con `parseInt(searchParams...`:**  
Buscar con: `grep -r "parseInt(searchParams" src/app/api/` y aplicar el mismo patrón.

**Criterio de cierre:** No existe ningún endpoint de listado que acepte `?limite=` sin una cota máxima de 100–500.

---

#### TAREA [HIGH-02] — Activar validación TypeScript en builds

**Tiempo estimado:** 4–8 horas (más tiempo por corrección de errores reales)  
**Archivo:** `next.config.js`

```javascript
// ANTES:
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ...
};

// DESPUÉS:
const nextConfig = {
  // typescript: ignoreBuildErrors removido (ahora bloquea el build si hay errores)
  // eslint: ignoreDuringBuilds removido (ahora bloquea el build si hay warnings)
  // ...
};
```

**Luego correr:**
```bash
npm run build
# Resolver todos los errores TypeScript que aparezcan.
# Los @ts-expect-error deben revisarse uno a uno y corregirse o documentarse.
```

> 💡 Tip: Hacer esto en una rama separada `feat/fix-type-errors` para no bloquear deploys mientras se corrigen.

**Criterio de cierre:** `npm run build` completa sin errores ni warnings de TypeScript/ESLint.

---

### 🟡 SEMANA 3 — Medios (Mejoran la postura defensiva)

---

#### TAREA [MED-01] — Migrar Rate Limiting a Redis (o persistir en BD)

**Tiempo estimado:** 3–4 horas  
**Opción A (Recomendada): Redis con `ioredis`**

```bash
npm install ioredis
# En el VPS: sudo apt install redis-server
```

```typescript
// src/lib/rate-limit-redis.ts (nuevo archivo)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export async function checkRateLimitRedis(
  name: string, 
  key: string, 
  limit: number, 
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redisKey = `rl:${name}:${key}`;
  const current = await redis.incr(redisKey);
  
  if (current === 1) {
    await redis.expire(redisKey, windowSec);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current)
  };
}
```

**Opción B (Sin Redis): Guardar en BD**
```typescript
// Usar el modelo MetricaUso existente para registrar intentos de login fallidos
// Consultar la BD antes de permitir el intento
```

**Agregar a `.env`:**
```env
REDIS_URL="redis://127.0.0.1:6379"
```

**Criterio de cierre:** Reiniciar PM2 no resetea los contadores de rate limiting.

---

#### TAREA [MED-02] — Proteger variable `IS_ELECTRON` en producción

**Tiempo estimado:** 30 minutos  
**Archivo:** `src/middleware.ts`

```typescript
// ANTES — líneas 7–10:
if (process.env.IS_ELECTRON === "true") {
  return NextResponse.next();
}

// DESPUÉS — Solo permitir en entorno de desarrollo:
if (process.env.IS_ELECTRON === "true" && process.env.NODE_ENV !== "production") {
  return NextResponse.next();
}
```

**Verificar en el servidor:**
```bash
# En el VPS, el .env de producción NO debe tener IS_ELECTRON:
grep "IS_ELECTRON" /www/kannan-pos/sistema_pos/.env
# → No debe retornar nada
```

**Criterio de cierre:** La variable `IS_ELECTRON=true` no tiene efecto en `NODE_ENV=production`.

---

#### TAREA [MED-03] — Implementar Content-Security-Policy

**Tiempo estimado:** 2–3 horas (testing incluido)  
**Archivo:** `next.config.js`

```javascript
// Agregar a la función headers() existente:
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        // ... headers existentes ...
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe por Next.js — mejorar gradualmente
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
          ].join('; ')
        },
      ],
    },
  ];
},
```

> ⚠️ Empezar con `Content-Security-Policy-Report-Only` para detectar violaciones sin bloquear nada, y luego migrar a `Content-Security-Policy` una vez validado.

**Criterio de cierre:** Header CSP presente en todas las respuestas. Sin errores de consola en el navegador por violaciones de CSP en uso normal.

---

#### TAREA [MED-04] — Reducir `maxAge` del JWT y agregar rotación

**Tiempo estimado:** 1 hora  
**Archivo:** `src/lib/auth/auth.ts`

```typescript
// ANTES:
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 días
},

// DESPUÉS:
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60,       // 8 horas (jornada laboral)
  updateAge: 60 * 60,         // Renovar el token cada hora de actividad
},
```

> 💡 Alternativa menos disruptiva: mantener 30 días pero agregar un campo `tokenVersion` en la BD del usuario. Al invalidar, incrementar `tokenVersion`. El JWT callback verifica que el token tenga la versión correcta.

**Criterio de cierre:** Un token capturado expira en 8 horas máximo.

---

#### TAREA [MED-05] — Auditar y restringir `DISABLE_ACCOUNT_CHECKS`

**Tiempo estimado:** 30 minutos  
**Archivo:** `src/middleware.ts`

```typescript
// ANTES:
const verificacionesDeshabilitadas =
  process.env.NODE_ENV === 'development' ||
  process.env.DISABLE_ACCOUNT_CHECKS === 'true';

// DESPUÉS — Eliminar la variable de entorno; solo desactivar en desarrollo:
const verificacionesDeshabilitadas =
  process.env.NODE_ENV === 'development';
```

**Y verificar en el servidor:**
```bash
grep "DISABLE_ACCOUNT_CHECKS" /www/kannan-pos/sistema_pos/.env
# → No debe estar definida en producción
```

**Criterio de cierre:** La variable `DISABLE_ACCOUNT_CHECKS` no existe en `.env` de producción y fue eliminada del código.

---

### 🔵 SEMANA 4 — Mejoras proactivas (no vulnerabilidades, pero mejoran la postura)

---

#### TAREA [PRO-01] — Implementar logging de seguridad estructurado

Actualmente los logs son `console.error()` sin estructura. Implementar logging en el `AuditoriaLog` para:
- Intentos de login fallidos
- Accesos a rutas protegidas denegados
- Cambios de rol o estado de usuarios

```typescript
// Ejemplo en api/auth:
await db.auditoriaLog.create({
  data: {
    tabla: 'Auth',
    registroId: credentials.email,
    accion: 'LOGIN_FALLIDO',
    usuarioEmail: credentials.email,
    direccionIP: clientIp,
    notas: 'Contraseña incorrecta',
    empresaId: null,
  }
});
```

---

#### TAREA [PRO-02] — Establecer política de rotación de secrets

Documentar y programar rotación periódica:

| Secret | Frecuencia recomendada |
|--------|------------------------|
| `NEXTAUTH_SECRET` | Cada 90 días o tras incidente |
| Contraseña MySQL | Cada 90 días o tras incidente |
| Claves SSH del VPS | Al cambiar personal |

---

#### TAREA [PRO-03] — Agregar `.env.example` al repositorio

```bash
# Crear src/.env.example (sin valores reales):
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-64"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
REDIS_URL="redis://127.0.0.1:6379"
```

---

## 📅 Cronograma Consolidado

```
SEMANA 1 (29 jul – 4 ago 2026)
  [CRIT-01] ✅ Eliminar app.zip del repo y limpiar historial de Git
  [CRIT-02] ✅ Regenerar NEXTAUTH_SECRET + cambiar contraseña MySQL

SEMANA 2 (5 – 11 ago 2026)
  [HIGH-01] ✅ Agregar Math.min()/Math.max() a todos los endpoints de paginación
  [HIGH-02] ✅ Quitar ignoreBuildErrors y corregir errores TypeScript reales

SEMANA 3 (12 – 18 ago 2026)
  [MED-01]  ✅ Migrar rate-limit a Redis
  [MED-02]  ✅ Bloquear IS_ELECTRON en producción
  [MED-03]  ✅ Implementar Content-Security-Policy
  [MED-04]  ✅ Reducir JWT maxAge a 8 horas
  [MED-05]  ✅ Eliminar DISABLE_ACCOUNT_CHECKS del código

SEMANA 4 (19 – 25 ago 2026)
  [PRO-01]  ✅ Logging de seguridad estructurado en AuditoriaLog
  [PRO-02]  ✅ Política documentada de rotación de secrets
  [PRO-03]  ✅ Agregar .env.example al repositorio
```

---

## 🔍 Comandos de Verificación Post-Remediación

```bash
# Verificar que app.zip no está en Git:
git ls-files | grep "\.zip"
# → Sin output esperado

# Verificar longitud del NEXTAUTH_SECRET:
grep NEXTAUTH_SECRET .env | awk -F'"' '{print length($2)}'
# → Debe ser >= 64

# Verificar headers de seguridad en producción:
curl -I https://tu-dominio.com | grep -E "Content-Security|X-Frame|Strict-Transport"

# Verificar que paginación tiene techo:
curl "https://tu-dominio.com/api/ventas?limite=999999" -H "Authorization: Bearer TOKEN"
# → Debe retornar máximo 100 registros

# Verificar que IS_ELECTRON no bypasea en producción:
IS_ELECTRON=true curl "https://tu-dominio.com/api/ventas"
# → Debe retornar 401 (no autorizado)
```

---

## 📚 Referencias

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/getting-started/introduction#security)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection-prevention)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

*Documento generado el 29 de julio de 2026. Revisar y actualizar tras cada remediación completada.*
