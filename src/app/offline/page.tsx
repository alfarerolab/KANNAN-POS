"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WifiOff, RefreshCw, ShoppingCart, Package, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Esperar un momento antes de redirigir para mostrar el estado
      setTimeout(() => {
        router.push('/dashboard/pos');
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);

    // Intentar recargar la página
    if (navigator.onLine) {
      router.push('/dashboard/pos');
    } else {
      // Mostrar mensaje de que sigue sin conexión
      setTimeout(() => {
        setRetryCount(prev => prev - 1);
      }, 2000);
    }
  };

  const handleGoToPOS = () => {
    router.push('/dashboard/pos');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Estado de conexión */}
        <Card className="text-center border-2">
          <CardHeader className="pb-3">
            <div className="mx-auto mb-4">
              {isOnline ? (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-green-600 animate-spin" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <WifiOff className="h-8 w-8 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">
              {isOnline ? '¡Conectado!' : 'Sin Conexión'}
            </CardTitle>
            <CardDescription>
              {isOnline
                ? 'Redirigiendo al POS...'
                : 'No hay conexión a internet, pero puedes seguir usando el POS offline'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOnline ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Conexión restaurada
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                Modo Offline Activo
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Funcionalidades disponibles offline */}
        {!isOnline && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Funcionalidades Disponibles
              </CardTitle>
              <CardDescription>
                Estas funciones están disponibles sin conexión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Procesar Ventas</p>
                  <p className="text-xs text-muted-foreground">Las ventas se sincronizarán automáticamente</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Ver Productos</p>
                  <p className="text-xs text-muted-foreground">Catálogo guardado localmente</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Gestión de Clientes</p>
                  <p className="text-xs text-muted-foreground">Datos disponibles offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones */}
        <div className="space-y-3">
          <Button
            onClick={handleGoToPOS}
            className="w-full"
            size="lg"
          >
            {isOnline ? 'Ir al POS' : 'Continuar sin Conexión'}
          </Button>

          {!isOnline && (
            <Button
              variant="outline"
              onClick={handleRetry}
              className="w-full"
              disabled={retryCount > 0}
            >
              {retryCount > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Reintentar Conexión'
              )}
            </Button>
          )}
        </div>

        {/* Información adicional */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h4 className="font-medium text-blue-900">💡 Consejos Offline</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Las ventas se guardan localmente</p>
                <p>• Los datos se sincronizan al reconectar</p>
                <p>• Todos los productos están disponibles</p>
                <p>• Puedes imprimir tickets normalmente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información técnica */}
        <div className="text-center text-xs text-muted-foreground">
          <p>POS Avanzado v1.0 - PWA Offline Ready</p>
        </div>
      </div>
    </div>
  );
}
