"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
  Play,
  RefreshCw,
  Calendar,
  Users,
  AlertCircle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAutorizacion } from "@/hooks/use-autorizacion";

interface EmpresaProximaVencer {
  id: string;
  nombre: string;
  email: string;
  fechaVencimiento: string;
  tipoNegocio: string;
  diasRestantes: number;
  adminPrincipal: {
    nombre: string;
    email: string;
  } | null;
}

interface Notificacion {
  id: string;
  evento: string;
  datos: any;
  fecha: string;
  empresa: {
    nombre: string;
    email: string;
  };
}

interface Estadisticas {
  totalEmpresas: number;
  empresasActivas: number;
  empresasVencidas: number;
  empresasProximasVencer: number;
  notificacionesEnviadas: number;
}

export default function NotificacionesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin } = useAutorizacion();

  const [empresasProximasVencer, setEmpresasProximasVencer] = useState<EmpresaProximaVencer[]>([]);
  const [notificacionesRecientes, setNotificacionesRecientes] = useState<Notificacion[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      if (!session) {
        setIsAuthorized(null);
        return;
      }

      if (session.user.role !== "SUPERADMIN" || !esSuperAdmin) {
        setIsAuthorized(false);
        router.push("/dashboard");
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [session, esSuperAdmin, router]);

  useEffect(() => {
    if (isAuthorized !== true) return;
    cargarDatos();
  }, [isAuthorized]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);

      const [proximasVencer, notificaciones, stats] = await Promise.all([
        fetch("/api/administrador/notificaciones?accion=proximas_vencer").then(r => r.json()),
        fetch("/api/administrador/notificaciones?accion=notificaciones_recientes").then(r => r.json()),
        fetch("/api/administrador/notificaciones?accion=estadisticas").then(r => r.json())
      ]);

      setEmpresasProximasVencer(proximasVencer.empresasProximasVencer || []);
      setNotificacionesRecientes(notificaciones.notificacionesRecientes || []);
      setEstadisticas(stats.estadisticas || null);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ejecutarTareasAutomaticas = async () => {
    try {
      setIsExecuting(true);

      const response = await fetch("/api/administrador/notificaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "ejecutar_tareas_automaticas"
        }),
      });

      if (!response.ok) throw new Error("Error al ejecutar tareas automáticas");

      const result = await response.json();

      toast({
        title: "Tareas ejecutadas",
        description: `${result.resultado.empresasSuspendidas} empresas suspendidas, ${result.resultado.notificacionesCreadas} notificaciones creadas`,
      });

      // Recargar datos
      await cargarDatos();

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudieron ejecutar las tareas automáticas",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      setConfirmDialogOpen(false);
    }
  };

  const getUrgenciaBadge = (diasRestantes: number) => {
    if (diasRestantes <= 3) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Crítico ({diasRestantes}d)
      </Badge>;
    } else if (diasRestantes <= 7) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Urgente ({diasRestantes}d)
      </Badge>;
    } else {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Advertencia ({diasRestantes}d)
      </Badge>;
    }
  };

  const getTipoNotificacion = (evento: string) => {
    switch (evento) {
      case 'vencimiento_warning':
        return { tipo: 'Advertencia', color: 'text-yellow-600 dark:text-yellow-400' };
      case 'vencimiento_urgent':
        return { tipo: 'Urgente', color: 'text-orange-600 dark:text-orange-400' };
      case 'vencimiento_expired':
        return { tipo: 'Vencida', color: 'text-red-600 dark:text-red-400' };
      default:
        return { tipo: 'Información', color: 'text-blue-600 dark:text-blue-400' };
    }
  };

  // Función helper para formatear tipo de negocio de forma segura
  const formatTipoNegocio = (tipoNegocio: string | null | undefined): string => {
    if (!tipoNegocio) return 'Sin especificar';
    return tipoNegocio.replace(/_/g, ' ');
  };

  if (isAuthorized === null || (isAuthorized && isLoading)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Centro de Notificaciones</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarDatos} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => setConfirmDialogOpen(true)}
            disabled={isExecuting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExecuting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Ejecutar Tareas
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Total Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.totalEmpresas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.empresasActivas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.empresasVencidas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                Por Vencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.empresasProximasVencer}</div>
              <p className="text-xs text-muted-foreground">Próximos 30 días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Bell className="h-4 w-4 mr-2 text-blue-500" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.notificacionesEnviadas}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="proximas-vencer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proximas-vencer">Próximas a Vencer</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones Recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="proximas-vencer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empresas Próximas a Vencer</CardTitle>
              <CardDescription>
                Empresas que requieren renovación en los próximos 15 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Tipo de Negocio</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Administrador</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresasProximasVencer.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          No hay empresas próximas a vencer
                        </TableCell>
                      </TableRow>
                    ) : (
                      empresasProximasVencer.map((empresa) => (
                        <TableRow key={empresa.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{empresa.nombre || 'Sin nombre'}</div>
                              <div className="text-sm text-muted-foreground">{empresa.email || 'Sin email'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatTipoNegocio(empresa.tipoNegocio)}</TableCell>
                          <TableCell>
                            {empresa.fechaVencimiento 
                              ? new Date(empresa.fechaVencimiento).toLocaleDateString()
                              : 'Fecha no disponible'
                            }
                          </TableCell>
                          <TableCell>{getUrgenciaBadge(empresa.diasRestantes || 0)}</TableCell>
                          <TableCell>
                            {empresa.adminPrincipal ? (
                              <div>
                                <div className="text-sm">{empresa.adminPrincipal.nombre}</div>
                                <div className="text-xs text-muted-foreground">{empresa.adminPrincipal.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin admin</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/superadmin/empresas/${empresa.id}`)}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Gestionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Recientes</CardTitle>
              <CardDescription>
                Historial de notificaciones enviadas en los últimos 7 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificacionesRecientes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          No hay notificaciones recientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      notificacionesRecientes.map((notificacion) => {
                        const tipoInfo = getTipoNotificacion(notificacion.evento);
                        return (
                          <TableRow key={notificacion.id}>
                            <TableCell>
                              {notificacion.fecha 
                                ? new Date(notificacion.fecha).toLocaleString()
                                : 'Fecha no disponible'
                              }
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{notificacion.empresa?.nombre || 'Sin nombre'}</div>
                                <div className="text-sm text-muted-foreground">{notificacion.empresa?.email || 'Sin email'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${tipoInfo.color}`}>
                                {tipoInfo.tipo}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                {notificacion.datos?.mensaje || 'Sin mensaje'}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación para ejecutar tareas automáticas */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Ejecutar Tareas Automáticas
            </DialogTitle>
            <DialogDescription>
              Esto ejecutará las siguientes tareas:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Verificar y suspender cuentas vencidas</li>
                <li>Generar notificaciones para empresas próximas a vencer</li>
                <li>Actualizar métricas del sistema</li>
              </ul>
              <p className="mt-3 text-sm font-medium">
                ¿Está seguro de que desea continuar?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={ejecutarTareasAutomaticas}
              disabled={isExecuting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isExecuting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ejecutar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}