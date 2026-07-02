"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  AlertTriangle,
  Calendar,
  Package,
  Clock,
  User,
  X,
  Settings,
  Check,
  Trash2,
  Eye,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { useSession } from "next-auth/react";
import { toast as sonnerToast } from "sonner";

interface Notificacion {
  id: string;
  tipo: 'stock_bajo' | 'cita_proxima' | 'vencimiento' | 'nueva_venta' | 'sistema' | 'mascota' | 'servicio';
  titulo: string;
  mensaje: string;
  fechaCreacion: Date;
  leida: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  datos?: any;
  empresaId: string;
  usuarioId?: string;
}

interface ConfiguracionNotificaciones {
  stockBajo: boolean;
  citasProximas: boolean;
  vencimientos: boolean;
  nuevasVentas: boolean;
  sistemaGeneral: boolean;
  notificacionesSonido: boolean;
  intervaloCheck: number; // en minutos
}

export function SistemaNotificaciones() {
  const { data: session } = useSession();
  const { esVeterinaria, tieneLotes, tieneVencimientos, tieneCitas } = useConfiguracionEmpresa();
  const { toast } = useToast();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [configuracionOpen, setConfiguracionOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [configuracion, setConfiguracionNotif] = useState<ConfiguracionNotificaciones>({
    stockBajo: true,
    citasProximas: true,
    vencimientos: true,
    nuevasVentas: false,
    sistemaGeneral: true,
    notificacionesSonido: true,
    intervaloCheck: 5
  });

  const empresaId = session?.user?.empresaId;
  const usuarioId = session?.user?.id;

  // Verificar notificaciones periódicamente
  const verificarNotificaciones = useCallback(async () => {
    if (!empresaId) return;

    try {
      // Verificar stock bajo
      if (configuracion.stockBajo) {
        await verificarStockBajo();
      }

      // Verificar citas próximas
      if (configuracion.citasProximas && tieneCitas()) {
        await verificarCitasProximas();
      }

      // Verificar vencimientos
      if (configuracion.vencimientos && tieneVencimientos()) {
        await verificarVencimientos();
      }

      // Verificar productos sin rotar (para farmacias)
      if (tieneLotes()) {
        await verificarProductosSinRotar();
      }

    } catch (error) {
      console.error("Error al verificar notificaciones:", error);
    }
  }, [empresaId, configuracion, tieneCitas, tieneVencimientos, tieneLotes]);

  // Verificar stock bajo
  const verificarStockBajo = async () => {
    try {
      const response = await fetch('/api/productos?stockBajo=true');
      if (response.ok) {
        const data = await response.json();
        const productosStockBajo = data.datos || [];

        productosStockBajo.forEach((producto: any) => {
          if (producto.enStock <= producto.stockMinimo) {
            crearNotificacion({
              tipo: 'stock_bajo',
              titulo: 'Stock Bajo',
              mensaje: `${producto.nombre} tiene stock bajo (${producto.enStock} unidades)`,
              prioridad: producto.enStock === 0 ? 'critica' : 'alta',
              datos: { producto }
            });
          }
        });
      }
    } catch (error) {
      console.error("Error al verificar stock:", error);
    }
  };

  // Verificar citas próximas
  const verificarCitasProximas = async () => {
    try {
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const response = await fetch(`/api/citas?fechaInicio=${hoy.toISOString()}&fechaFin=${manana.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        const citasProximas = data.datos || [];

        citasProximas.forEach((cita: any) => {
          const fechaCita = new Date(cita.fechaHora);
          const horasRestantes = Math.ceil((fechaCita.getTime() - hoy.getTime()) / (1000 * 60 * 60));

          if (horasRestantes <= 2 && horasRestantes > 0) {
            crearNotificacion({
              tipo: 'cita_proxima',
              titulo: 'Cita Próxima',
              mensaje: `Cita con ${cita.cliente?.nombre} en ${horasRestantes} hora(s)`,
              prioridad: horasRestantes <= 1 ? 'alta' : 'media',
              datos: { cita }
            });
          }
        });
      }
    } catch (error) {
      console.error("Error al verificar citas:", error);
    }
  };

  // Verificar vencimientos
  const verificarVencimientos = async () => {
    try {
      const hoy = new Date();
      const fechaLimite = new Date(hoy);
      fechaLimite.setDate(fechaLimite.getDate() + 30); // Próximos 30 días

      // Esta función requeriría un endpoint específico para vencimientos
      // Por ahora simulamos algunos productos próximos a vencer
      const productosVencimiento = [
        {
          id: '1',
          nombre: 'Medicamento A',
          lote: 'LOT001',
          fechaVencimiento: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días
          cantidad: 25
        },
        {
          id: '2',
          nombre: 'Medicamento B',
          lote: 'LOT002',
          fechaVencimiento: new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 días
          cantidad: 15
        }
      ];

      productosVencimiento.forEach((producto) => {
        const diasRestantes = Math.ceil((producto.fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 7) {
          crearNotificacion({
            tipo: 'vencimiento',
            titulo: 'Producto Próximo a Vencer',
            mensaje: `${producto.nombre} (${producto.lote}) vence en ${diasRestantes} días`,
            prioridad: diasRestantes <= 3 ? 'critica' : 'alta',
            datos: { producto }
          });
        }
      });
    } catch (error) {
      console.error("Error al verificar vencimientos:", error);
    }
  };

  // Verificar productos sin rotar
  const verificarProductosSinRotar = async () => {
    // Simulación de productos sin movimiento en 30 días
    const productosSinMovimiento = [
      { id: '1', nombre: 'Producto X', ultimoMovimiento: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
      { id: '2', nombre: 'Producto Y', ultimoMovimiento: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) }
    ];

    productosSinMovimiento.forEach((producto) => {
      const diasSinMovimiento = Math.ceil((Date.now() - producto.ultimoMovimiento.getTime()) / (1000 * 60 * 60 * 24));

      if (diasSinMovimiento >= 30) {
        crearNotificacion({
          tipo: 'stock_bajo',
          titulo: 'Producto Sin Rotación',
          mensaje: `${producto.nombre} sin movimiento por ${diasSinMovimiento} días`,
          prioridad: 'media',
          datos: { producto }
        });
      }
    });
  };

  // Crear nueva notificación
  const crearNotificacion = (datos: Omit<Notificacion, 'id' | 'fechaCreacion' | 'leida' | 'empresaId' | 'usuarioId'>) => {
    if (!empresaId) return;

    const nuevaNotificacion: Notificacion = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fechaCreacion: new Date(),
      leida: false,
      empresaId,
      usuarioId,
      ...datos
    };

    // Verificar si ya existe una notificación similar (evitar spam)
    const existe = notificaciones.some(n =>
      n.tipo === nuevaNotificacion.tipo &&
      n.titulo === nuevaNotificacion.titulo &&
      !n.leida &&
      (Date.now() - n.fechaCreacion.getTime()) < 60000 * 10 // 10 minutos
    );

    if (!existe) {
      setNotificaciones(prev => [nuevaNotificacion, ...prev.slice(0, 49)]); // Máximo 50 notificaciones

      // Mostrar toast para notificaciones importantes
      if (datos.prioridad === 'alta' || datos.prioridad === 'critica') {
        sonnerToast(datos.titulo, {
          icon: getIconoTipo(datos.tipo),
          duration: datos.prioridad === 'critica' ? 8000 : 4000,
        });

        // Reproducir sonido si está habilitado
        if (configuracion.notificacionesSonido) {
          reproducirSonidoNotificacion();
        }
      }
    }
  };

  // Obtener icono según tipo de notificación
  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'stock_bajo': return '📦';
      case 'cita_proxima': return '📅';
      case 'vencimiento': return '⚠️';
      case 'nueva_venta': return '💰';
      case 'mascota': return '🐾';
      case 'servicio': return '✂️';
      default: return '🔔';
    }
  };

  // Reproducir sonido de notificación
  const reproducirSonidoNotificacion = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DqumYdBjiS2O++a2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DqumYdBjiS2O++');
      audio.play().catch(() => {}); // Ignorar errores de reproducción
    } catch (error) {
      // Sonido no disponible
    }
  };

  // Marcar notificación como leída
  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev =>
      prev.map(n => ({ ...n, leida: true }))
    );
  };

  // Eliminar notificación
  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  // Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtroTipo === "todas") return true;
    if (filtroTipo === "no_leidas") return !n.leida;
    return n.tipo === filtroTipo;
  });

  // Calcular notificaciones no leídas
  useEffect(() => {
    setNotificacionesNoLeidas(notificaciones.filter(n => !n.leida).length);
  }, [notificaciones]);

  // Configurar verificación periódica
  useEffect(() => {
    const intervalo = setInterval(verificarNotificaciones, configuracion.intervaloCheck * 60 * 1000);

    // Verificación inicial
    verificarNotificaciones();

    return () => clearInterval(intervalo);
  }, [verificarNotificaciones, configuracion.intervaloCheck]);

  // Generar notificaciones de prueba para demostración
  useEffect(() => {
    if (notificaciones.length === 0) {
      setTimeout(() => {
        crearNotificacion({
          tipo: 'stock_bajo',
          titulo: 'Stock Bajo Detectado',
          mensaje: 'Producto "Shampoo Canino" tiene solo 3 unidades en stock',
          prioridad: 'alta'
        });

        if (esVeterinaria()) {
          crearNotificacion({
            tipo: 'cita_proxima',
            titulo: 'Cita en 1 hora',
            mensaje: 'Cita con mascota "Max" a las 3:00 PM',
            prioridad: 'media'
          });
        }

        if (tieneVencimientos()) {
          crearNotificacion({
            tipo: 'vencimiento',
            titulo: 'Medicamento por vencer',
            mensaje: 'Antibiótico XYZ vence en 2 días',
            prioridad: 'critica'
          });
        }
      }, 2000);
    }
  }, [esVeterinaria, tieneVencimientos]);

  return (
    <>
      {/* Botón de notificaciones */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPanelAbierto(true)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {notificacionesNoLeidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 text-xs flex items-center justify-center p-0"
            >
              {notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas}
            </Badge>
          )}
        </Button>
      </div>

      {/* Panel de notificaciones */}
      <Dialog open={panelAbierto} onOpenChange={setPanelAbierto}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <DialogTitle>Notificaciones</DialogTitle>
                {notificacionesNoLeidas > 0 && (
                  <Badge variant="destructive">{notificacionesNoLeidas} sin leer</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfiguracionOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={marcarTodasComoLeidas}
                  disabled={notificacionesNoLeidas === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Marcar todas
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todas" onClick={() => setFiltroTipo("todas")}>
                Todas
              </TabsTrigger>
              <TabsTrigger value="no_leidas" onClick={() => setFiltroTipo("no_leidas")}>
                Sin leer
              </TabsTrigger>
              <TabsTrigger value="stock_bajo" onClick={() => setFiltroTipo("stock_bajo")}>
                Stock
              </TabsTrigger>
              <TabsTrigger value="cita_proxima" onClick={() => setFiltroTipo("cita_proxima")}>
                Citas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {notificacionesFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificacionesFiltradas.map((notificacion) => (
                      <Card
                        key={notificacion.id}
                        className={`transition-all ${!notificacion.leida ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getIconoTipo(notificacion.tipo)}</span>
                                <h4 className="font-medium">{notificacion.titulo}</h4>
                                <Badge
                                  variant={
                                    notificacion.prioridad === 'critica' ? 'destructive' :
                                    notificacion.prioridad === 'alta' ? 'default' :
                                    notificacion.prioridad === 'media' ? 'secondary' : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {notificacion.prioridad}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notificacion.mensaje}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {notificacion.fechaCreacion.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {!notificacion.leida && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => marcarComoLeida(notificacion.id)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarNotificacion(notificacion.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Panel de configuración */}
      <Dialog open={configuracionOpen} onOpenChange={setConfiguracionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de Notificaciones</DialogTitle>
            <DialogDescription>
              Personaliza qué notificaciones quieres recibir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="stock-bajo"
                checked={configuracion.stockBajo}
                onCheckedChange={(checked) =>
                  setConfiguracionNotif(prev => ({ ...prev, stockBajo: checked }))
                }
              />
              <Label htmlFor="stock-bajo">Alertas de stock bajo</Label>
            </div>

            {tieneCitas() && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="citas-proximas"
                  checked={configuracion.citasProximas}
                  onCheckedChange={(checked) =>
                    setConfiguracionNotif(prev => ({ ...prev, citasProximas: checked }))
                  }
                />
                <Label htmlFor="citas-proximas">Recordatorios de citas</Label>
              </div>
            )}

            {tieneVencimientos() && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="vencimientos"
                  checked={configuracion.vencimientos}
                  onCheckedChange={(checked) =>
                    setConfiguracionNotif(prev => ({ ...prev, vencimientos: checked }))
                  }
                />
                <Label htmlFor="vencimientos">Alertas de vencimiento</Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="nuevas-ventas"
                checked={configuracion.nuevasVentas}
                onCheckedChange={(checked) =>
                  setConfiguracionNotif(prev => ({ ...prev, nuevasVentas: checked }))
                }
              />
              <Label htmlFor="nuevas-ventas">Notificaciones de nuevas ventas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sonido"
                checked={configuracion.notificacionesSonido}
                onCheckedChange={(checked) =>
                  setConfiguracionNotif(prev => ({ ...prev, notificacionesSonido: checked }))
                }
              />
              <Label htmlFor="sonido">Sonido de notificaciones</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfiguracionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setConfiguracionOpen(false);
              toast({
                title: "Configuración guardada",
                description: "Las preferencias de notificaciones han sido actualizadas"
              });
            }}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
