"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Plus,
  Edit,
  Trash,
  Check,
  X,
  DollarSign,
  Calendar,
  Percent,
  Tag,
  Star,
  Save,
  Loader2,
  TrendingUp
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAutorizacion } from "@/hooks/use-autorizacion";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  meses: number;
  activo: boolean;
  destacado: boolean;
  descuento: number;
  caracteristicas: string[];
  limitesUsuarios?: number | null;
  limitesProductos?: number | null;
  limitesTerminales?: number | null;
  habilitarReportes: boolean;
  habilitarMultiUsuario: boolean;
  habilitarInventario: boolean;
  habilitarServicios: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormularioPlan {
  nombre: string;
  descripcion: string;
  precio: number;
  meses: number;
  activo: boolean;
  destacado: boolean;
  descuento: number;
  caracteristicas: string[];
  limitesUsuarios?: number;
  limitesProductos?: number;
  limitesTerminales?: number;
  habilitarReportes: boolean;
  habilitarMultiUsuario: boolean;
  habilitarInventario: boolean;
  habilitarServicios: boolean;
}

const CARACTERISTICAS_PREDETERMINADAS = [
  "Sistema POS completo",
  "Gestión de inventario",
  "Informes y análisis",
  "Soporte técnico",
  "Actualizaciones automáticas",
  "Backup diario",
  "Múltiples usuarios",
  "Terminal móvil"
];

export default function PlanesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin, estaCargando: sesionCargando } = useAutorizacion();

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formulario, setFormulario] = useState<FormularioPlan>({
    nombre: "",
    descripcion: "",
    precio: 0,
    meses: 1,
    activo: true,
    destacado: false,
    descuento: 0,
    caracteristicas: [...CARACTERISTICAS_PREDETERMINADAS],
    habilitarReportes: false,
    habilitarMultiUsuario: false,
    habilitarInventario: true,
    habilitarServicios: false,
  });

  // Función para calcular precio mensual
  const calcularPrecioMensual = (precio: number, meses: number) => {
    return Math.round((precio / meses) * 100) / 100;
  };

  // Función para calcular el precio con descuento
  const calcularPrecioConDescuento = (precio: number, descuento: number) => {
    return precio - (precio * descuento / 100);
  };

  // Función para obtener el promedio de precios
  const obtenerPromedioPrecios = () => {
    if (planes.length === 0) return 0;
    const suma = planes.reduce((total, plan) => total + plan.precio, 0);
    return suma / planes.length;
  };

  const cargarPlanes = useCallback(async () => {
    // No bloquear si la sesión está cargando todavía
    if (sesionCargando) return;
    if (!esSuperAdmin) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/administrador/planes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Evitar cache para obtener datos frescos
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al cargar planes');
      }

      const data = await response.json();

      // Validar y transformar los datos si es necesario
      const planesValidados = data.map((plan: any) => ({
        ...plan,
        caracteristicas: Array.isArray(plan.caracteristicas) 
          ? plan.caracteristicas.filter(Boolean) // Filtrar elementos vacíos
          : [],
        descripcion: plan.descripcion || "",
        limitesUsuarios: plan.limitesUsuarios || null,
        limitesProductos: plan.limitesProductos || null,
        limitesTerminales: plan.limitesTerminales || null,
      }));

      setPlanes(planesValidados);
    } catch (error) {
      console.error("Error al cargar planes:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los planes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [esSuperAdmin, sesionCargando, toast]);

  useEffect(() => {
    // Esperar a que la sesión termine de cargar antes de redirigir
    if (sesionCargando) return;
    if (!esSuperAdmin) {
      router.push("/dashboard");
      return;
    }
    cargarPlanes();
  }, [esSuperAdmin, sesionCargando, router, cargarPlanes]);

  const abrirDialogo = (plan?: Plan) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormulario({
        nombre: plan.nombre,
        descripcion: plan.descripcion || "",
        precio: plan.precio,
        meses: plan.meses,
        activo: plan.activo,
        destacado: plan.destacado,
        descuento: plan.descuento,
        caracteristicas: [...(plan.caracteristicas || [])],
        limitesUsuarios: plan.limitesUsuarios || undefined,
        limitesProductos: plan.limitesProductos || undefined,
        limitesTerminales: plan.limitesTerminales || undefined,
        habilitarReportes: plan.habilitarReportes,
        habilitarMultiUsuario: plan.habilitarMultiUsuario,
        habilitarInventario: plan.habilitarInventario,
        habilitarServicios: plan.habilitarServicios,
      });
    } else {
      setSelectedPlan(null);
      setFormulario({
        nombre: "",
        descripcion: "",
        precio: 0,
        meses: 1,
        activo: true,
        destacado: false,
        descuento: 0,
        caracteristicas: [...CARACTERISTICAS_PREDETERMINADAS],
        habilitarReportes: false,
        habilitarMultiUsuario: false,
        habilitarInventario: true,
        habilitarServicios: false,
      });
    }
    setDialogOpen(true);
  };

  const cerrarDialogo = () => {
    setDialogOpen(false);
    setSelectedPlan(null);
  };

  const guardarPlan = async () => {
    try {
      setIsSubmitting(true);

      if (!formulario.nombre?.trim() || formulario.precio <= 0 || formulario.meses <= 0) {
        toast({
          title: "Error de validación",
          description: "Por favor complete todos los campos requeridos",
          variant: "destructive",
        });
        return;
      }

      // Filtrar características vacías
      const caracteristicasLimpias = formulario.caracteristicas.filter(c => c.trim().length > 0);

      const method = selectedPlan ? 'PUT' : 'POST';
      const body = selectedPlan
        ? { id: selectedPlan.id, ...formulario, caracteristicas: caracteristicasLimpias }
        : { ...formulario, caracteristicas: caracteristicasLimpias };

      const response = await fetch('/api/administrador/planes', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al guardar plan');
      }

      const planGuardado = await response.json();

      if (selectedPlan) {
        setPlanes(prev => prev.map(p => p.id === selectedPlan.id ? planGuardado : p));
        toast({
          title: "✅ Plan actualizado",
          description: "El plan ha sido actualizado correctamente",
        });
      } else {
        setPlanes(prev => [...prev, planGuardado]);
        toast({
          title: "✅ Plan creado",
          description: "El plan ha sido creado correctamente",
        });
      }

      cerrarDialogo();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el plan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const eliminarPlan = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/administrador/planes?id=${selectedPlan.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al eliminar plan');
      }

      setPlanes(prev => prev.filter(p => p.id !== selectedPlan.id));
      toast({
        title: "✅ Plan eliminado",
        description: "El plan ha sido eliminado correctamente",
      });
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el plan",
        variant: "destructive",
      });
    }
  };

  const toggleEstadoPlan = async (plan: Plan) => {
    try {
      const response = await fetch('/api/administrador/planes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...plan,
          activo: !plan.activo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al cambiar estado del plan');
      }

      const planActualizado = await response.json();
      setPlanes(prev => prev.map(p => p.id === plan.id ? planActualizado : p));

      toast({
        title: plan.activo ? "Plan desactivado" : "Plan activado",
        description: `El plan ${plan.nombre} ha sido ${plan.activo ? "desactivado" : "activado"}`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cambiar el estado del plan",
        variant: "destructive",
      });
    }
  };

  const agregarCaracteristica = () => {
    setFormulario(prev => ({
      ...prev,
      caracteristicas: [...prev.caracteristicas, ""]
    }));
  };

  const actualizarCaracteristica = (index: number, valor: string) => {
    setFormulario(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.map((c, i) => i === index ? valor : c)
    }));
  };

  const eliminarCaracteristica = (index: number) => {
    setFormulario(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.filter((_, i) => i !== index)
    }));
  };

  if (sesionCargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!esSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Acceso denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Gestión de Planes
          </h1>
          <p className="text-muted-foreground">
            Administra los planes de suscripción del sistema SaaS
          </p>
        </div>
        <Button onClick={() => abrirDialogo()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Métricas de planes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Planes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Activos</CardTitle>
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {planes.filter(p => p.activo).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Destacado</CardTitle>
            <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {planes.filter(p => p.destacado).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(obtenerPromedioPrecios())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando planes...</p>
            </div>
          </div>
        ) : planes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay planes creados</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primer plan de suscripción para empezar
            </p>
            <Button onClick={() => abrirDialogo()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer plan
            </Button>
          </div>
        ) : (
          planes.map((plan) => {
            const precioConDescuento = calcularPrecioConDescuento(plan.precio, plan.descuento);
            const precioMensual = calcularPrecioMensual(precioConDescuento, plan.meses);
            
            return (
              <Card key={plan.id} className={`relative ${plan.destacado ? 'ring-2 ring-yellow-400' : ''}`}>
                {plan.destacado && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Destacado
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.nombre}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.activo ? "default" : "secondary"}>
                        {plan.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                  {plan.descripcion && (
                    <CardDescription>{plan.descripcion}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="space-y-1">
                      {plan.descuento > 0 && (
                        <div className="text-sm text-muted-foreground line-through">
                          {formatCurrency(plan.precio)}
                        </div>
                      )}
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(precioConDescuento)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(precioMensual)}/mes
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1 mt-2">
                      <Calendar className="h-3 w-3" />
                      {plan.meses} {plan.meses === 1 ? 'mes' : 'meses'}
                    </div>
                    {plan.descuento > 0 && (
                      <Badge variant="outline" className="mt-2 text-green-600 dark:text-green-400 border-green-600">
                        <Percent className="h-3 w-3 mr-1" />
                        {plan.descuento}% descuento
                      </Badge>
                    )}
                  </div>

                  {plan.caracteristicas && plan.caracteristicas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Características:</h4>
                      <div className="space-y-1">
                        {plan.caracteristicas.slice(0, 4).map((caracteristica, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="line-clamp-1">{caracteristica}</span>
                          </div>
                        ))}
                        {plan.caracteristicas.length > 4 && (
                          <div className="text-xs text-muted-foreground">
                            +{plan.caracteristicas.length - 4} más...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEstadoPlan(plan)}
                      className="flex-1"
                      title={plan.activo ? "Desactivar plan" : "Activar plan"}
                    >
                      {plan.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirDialogo(plan)}
                      className="flex-1"
                      title="Editar plan"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-destructive/10"
                      title="Eliminar plan"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Diálogo de edición/creación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan
                ? 'Modifica los detalles del plan de suscripción'
                : 'Crea un nuevo plan de suscripción para tus clientes'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Plan *</Label>
                <Input
                  id="nombre"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Plan Anual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meses">Duración (meses) *</Label>
                <Input
                  id="meses"
                  type="number"
                  min="1"
                  value={formulario.meses}
                  onChange={(e) => setFormulario(prev => ({ ...prev, meses: Number.parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio">Precio Total (COP) *</Label>
                <div className="relative">
                  <DollarSign className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.precio}
                    onChange={(e) => setFormulario(prev => ({ ...prev, precio: Number.parseFloat(e.target.value) || 0 }))}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descuento">Descuento (%)</Label>
                <div className="relative">
                  <Percent className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="descuento"
                    type="number"
                    min="0"
                    max="100"
                    value={formulario.descuento}
                    onChange={(e) => setFormulario(prev => ({ ...prev, descuento: Number.parseInt(e.target.value) || 0 }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formulario.descripcion}
                onChange={(e) => setFormulario(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción del plan..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formulario.activo}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, activo: checked }))}
                />
                <Label htmlFor="activo">Plan activo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="destacado"
                  checked={formulario.destacado}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, destacado: checked }))}
                />
                <Label htmlFor="destacado">Plan destacado</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitarReportes"
                  checked={formulario.habilitarReportes}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, habilitarReportes: checked }))}
                />
                <Label htmlFor="habilitarReportes">Reportes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitarMultiUsuario"
                  checked={formulario.habilitarMultiUsuario}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, habilitarMultiUsuario: checked }))}
                />
                <Label htmlFor="habilitarMultiUsuario">Multi-usuario</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitarInventario"
                  checked={formulario.habilitarInventario}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, habilitarInventario: checked }))}
                />
                <Label htmlFor="habilitarInventario">Inventario</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitarServicios"
                  checked={formulario.habilitarServicios}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, habilitarServicios: checked }))}
                />
                <Label htmlFor="habilitarServicios">Servicios</Label>
              </div>
            </div>

            {/* Límites del plan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="limitesUsuarios">Límite de Usuarios</Label>
                <Input
                  id="limitesUsuarios"
                  type="number"
                  min="0"
                  value={formulario.limitesUsuarios || ""}
                  onChange={(e) => setFormulario(prev => ({ 
                    ...prev, 
                    limitesUsuarios: e.target.value ? Number.parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Sin límite"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitesProductos">Límite de Productos</Label>
                <Input
                  id="limitesProductos"
                  type="number"
                  min="0"
                  value={formulario.limitesProductos || ""}
                  onChange={(e) => setFormulario(prev => ({ 
                    ...prev, 
                    limitesProductos: e.target.value ? Number.parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Sin límite"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitesTerminales">Límite de Terminales</Label>
                <Input
                  id="limitesTerminales"
                  type="number"
                  min="0"
                  value={formulario.limitesTerminales || ""}
                  onChange={(e) => setFormulario(prev => ({ 
                    ...prev, 
                    limitesTerminales: e.target.value ? Number.parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Características</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarCaracteristica}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formulario.caracteristicas.map((caracteristica, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={caracteristica}
                      onChange={(e) => actualizarCaracteristica(index, e.target.value)}
                      placeholder="Característica del plan..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarCaracteristica(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {formulario.precio > 0 && formulario.meses > 0 && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-medium mb-3 text-blue-900 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Resumen del Plan:
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Precio base:</span>
                    <span className="font-medium">{formatCurrency(formulario.precio)}</span>
                  </div>
                  
                  {formulario.descuento > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                        <span>Descuento ({formulario.descuento}%):</span>
                        <span className="font-medium">-{formatCurrency(formulario.precio * formulario.descuento / 100)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400 border-t pt-2">
                        <span>Precio final:</span>
                        <span>{formatCurrency(calcularPrecioConDescuento(formulario.precio, formulario.descuento))}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span>Precio mensual:</span>
                    <span className="font-medium">
                      {formatCurrency(calcularPrecioMensual(
                        calcularPrecioConDescuento(formulario.precio, formulario.descuento), 
                        formulario.meses
                      ))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Duración:</span>
                    <span className="font-medium">
                      {formulario.meses} {formulario.meses === 1 ? 'mes' : 'meses'}
                    </span>
                  </div>
                  
                  {formulario.descuento > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                      💰 Ahorro total: {formatCurrency(formulario.precio * formulario.descuento / 100)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={guardarPlan} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {selectedPlan ? 'Actualizar' : 'Crear'} Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-red-600 dark:text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar el plan "{selectedPlan?.nombre}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={eliminarPlan}>
              <Trash className="h-4 w-4 mr-2" />
              Eliminar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}