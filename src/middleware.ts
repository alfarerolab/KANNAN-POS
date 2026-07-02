import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { subscriptionMiddleware } from "@/lib/subscription-middleware";

export async function middleware(request: NextRequest) {
  try {
    // Si estás en Electron, no ejecutar lógica de middleware
    if (process.env.IS_ELECTRON === "true") {
      return NextResponse.next();
    }

    const { pathname, searchParams } = request.nextUrl;

    // Protección básica contra inyecciones SQL en parámetros URL
    const dangerousSqlPatterns = /SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM|UNION\s+SELECT|DROP\s+(TABLE|DATABASE)|EXEC(\s|\+)+(s|x)p\w+/gi;
    
    let isSuspicious = false;
    for (const [key, value] of Array.from(searchParams.entries())) {
      if (dangerousSqlPatterns.test(value)) {
        isSuspicious = true;
        break;
      }
    }

    if (isSuspicious) {
      console.warn(`Bloqueada posible inyección SQL en ruta: ${pathname}`);
      return new NextResponse('Bad Request - Invalid Parameters', { status: 400 });
    }

    // Lista de rutas que NO requieren autenticación
    const rutasExcluidas = [
      '/_next',
      '/api/auth/',
      '/api/registro',
      '/favicon.ico',
      '/logo.png',
      '/iniciar-sesion',
      '/registro',
      '/cuenta-inactiva',
      '/assets',
      '/images',
      '/icons'
    ];

    const esRutaExcluida = rutasExcluidas.some(ruta => {
      if (ruta.endsWith('/')) return pathname.startsWith(ruta);
      return pathname === ruta || pathname.startsWith(ruta + '/');
    });

    if (esRutaExcluida) return NextResponse.next();

    // Manejar ruta raíz "/"
    if (pathname === '/') {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });
      if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
      return NextResponse.redirect(new URL('/iniciar-sesion', request.url));
    }

    // Si NO es una ruta del dashboard o API, dejar pasar
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Obtener token para rutas protegidas
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // Sin token → redirigir a login
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/iniciar-sesion';
      url.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(url);
    }

    // ADMINISTRADOR sin configuración
    if (token.role === 'ADMINISTRADOR' && token.configuracionCompletada === false) {
      const rutasPermitidas = [
        '/dashboard/configuracion-inicial',
        '/cuenta-inactiva',
        '/api/configuracion',
        '/api/configuracion-inicial',
        '/api/empresa',
        '/api/usuarios/configuracion-completada'
      ];
      const esRutaPermitida = rutasPermitidas.some(ruta => pathname.startsWith(ruta));
      if (!esRutaPermitida) {
        return NextResponse.redirect(new URL('/dashboard/configuracion-inicial', request.url));
      }
    }

    if (pathname === '/dashboard/configuracion-inicial') {
      if (token.role !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Middleware de suscripciones (límites de plan, no estado activo/inactivo)
    const verificacionesDeshabilitadas =
      process.env.NODE_ENV === 'development' ||
      process.env.DISABLE_ACCOUNT_CHECKS === 'true';

    if (!verificacionesDeshabilitadas) {
      const subscriptionResponse = await subscriptionMiddleware(request);
      if (subscriptionResponse) return subscriptionResponse;
    }

    // Todo OK
    const response = NextResponse.next();
    
    // Headers para datos de sesión en Edge
    response.headers.set('x-user-id', token.sub || '');
    response.headers.set('x-user-role', token.role || '');
    response.headers.set('x-empresa-id', token.empresaId || '');
    
    // Headers de seguridad (OWASP)
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error) {
    console.error('❌ Error en middleware:', error);
    const response = NextResponse.next();
    response.headers.set('x-middleware-error', 'true');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/).*)',
  ],
};