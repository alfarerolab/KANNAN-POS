"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Star,
  Loader2,
  Save,
  Search,
  TrendingUp,
  Users,
  Sparkles,
  CalendarDays,
  ToggleLeft,
  Tag,
  Percent,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";

interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion: number;
  color?: string;
  requiereEmpleado: boolean;
  activo: boolean;
  porcentajeNegocio?: number | null;
  porcentajeEmpleado?: number | null;
  categoria?: {
    id: string;
    nombre: string;
  };
  empleadosServicios?: Array<{
    id: string;
    activo: boolean;
    usuario: {
      id: string;
      nombre: string;
      email: string;
    };
  }>;
  _count?: {
    citas: number;
    itemsVenta: number;
  };
}

interface FormularioServicio {
  nombre: string;
  descripcion: string;
  precio: number;
  duracion: number;
  color: string;
  requiereEmpleado: boolean;
  activo: boolean;
  categoriaId: string;
  porcentajeNegocio: number;
  porcentajeEmpleado: number;
}

const COLORES_PREDEFINIDOS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#06B6D4",
  "#6366F1", "#14B8A6", "#F43F5E", "#A855F7",
];

export default function ServiciosPage() {
  const { obtenerTema, estaCargando: configCargando, configuracion } = useConfiguracionEmpresa();
  const tema = obtenerTema();
  const esPeluqueria = configuracion?.tipoNegocio === 'PELUQUERIA' || configuracion?.tipoNegocio === 'SALON_BELLEZA';

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVO" | "INACTIVO">("TODOS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalVerAbierto, setModalVerAbierto] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [servicioAEliminar, setServicioAEliminar] = useState<Servicio | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formulario, setFormulario] = useState<FormularioServicio>({
    nombre: "",
    descripcion: "",
    precio: 0,
    duracion: 30,
    color: "#3B82F6",
    requiereEmpleado: false,
    activo: true,
    categoriaId: "",
    porcentajeNegocio: 50,
    porcentajeEmpleado: 50,
  });
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});

  // ── Data Loading ──────────────────────────────────────────────

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [serviciosRes, categoriasRes] = await Promise.all([
        fetch("/api/servicios", { credentials: 'include' }),
        fetch("/api/categorias", { credentials: 'include' }),
      ]);

      if (serviciosRes.ok) {
        const json = await serviciosRes.json();
        const data = Array.isArray(json) ? json : json?.datos || json?.servicios || [];
        setServicios(data);
      } else {
        toast.error("Error al cargar servicios");
        setServicios([]);
      }

      if (categoriasRes.ok) {
        const json = await categoriasRes.json();
        const data = Array.isArray(json) ? json : json?.datos || json?.categorias || [];
        setCategorias(data);
      } else {
        setCategorias([]);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error de conexión al cargar datos");
      setServicios([]);
      setCategorias([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ── Filtering ─────────────────────────────────────────────────

  const serviciosFiltrados = servicios.filter(s => {
    const matchBusqueda = !busqueda ||
      s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filtroCategoria === "TODOS" || s.categoria?.id === filtroCategoria;
    const matchEstado = filtroEstado === "TODOS" ||
      (filtroEstado === "ACTIVO" && s.activo) ||
      (filtroEstado === "INACTIVO" && !s.activo);
    return matchBusqueda && matchCategoria && matchEstado;
  });

  // ── Stats ─────────────────────────────────────────────────────

  const serviciosActivos = servicios.filter(s => s.activo);
  const totalCitas = servicios.reduce((sum, s) => sum + (s._count?.citas || 0), 0);
  const totalVentas = servicios.reduce((sum, s) => sum + (s._count?.itemsVenta || 0), 0);

  const precioPromedio = (() => {
    const precios = serviciosActivos.map(s => Number(s.precio)).filter(p => !isNaN(p) && p > 0);
    if (precios.length === 0) return 0;
    return precios.reduce((sum, p) => sum + p, 0) / precios.length;
  })();

  const ingresosTotales = servicios.reduce((sum, s) =>
    sum + (s._count?.itemsVenta ? Number(s.precio) * s._count.itemsVenta : 0), 0
  );

  const formatCurrency = (value: number) =>
    value.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  // ── Form Logic ────────────────────────────────────────────────

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "", descripcion: "", precio: 0, duracion: 30,
      color: "#3B82F6", requiereEmpleado: false, activo: true, categoriaId: "",
      porcentajeNegocio: 50, porcentajeEmpleado: 50,
    });
    setErroresFormulario({});
  };

  const validarFormulario = (): boolean => {
    const errores: Record<string, string> = {};
    if (!formulario.nombre.trim()) errores.nombre = "El nombre es requerido";
    if (formulario.precio <= 0) errores.precio = "El precio debe ser mayor a 0";
    if (formulario.duracion <= 0) errores.duracion = "La duración debe ser mayor a 0";
    setErroresFormulario(errores);
    return Object.keys(errores).length === 0;
  };

  const abrirModalCrear = () => {
    limpiarFormulario();
    setModoEdicion(false);
    setServicioSeleccionado(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (servicio: Servicio) => {
    setFormulario({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      precio: Number(servicio.precio),
      duracion: Number(servicio.duracion),
      color: servicio.color || "#3B82F6",
      requiereEmpleado: servicio.requiereEmpleado,
      activo: servicio.activo,
      categoriaId: servicio.categoria?.id || "",
      porcentajeNegocio: servicio.porcentajeNegocio != null ? Number(servicio.porcentajeNegocio) : 50,
      porcentajeEmpleado: servicio.porcentajeEmpleado != null ? Number(servicio.porcentajeEmpleado) : 50,
    });
    setServicioSeleccionado(servicio);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const guardarServicio = async () => {
    if (!validarFormulario()) return;
    setGuardando(true);
    try {
      const url = modoEdicion && servicioSeleccionado
        ? `/api/servicios/${servicioSeleccionado.id}`
        : '/api/servicios';

      const response = await fetch(url, {
        method: modoEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: formulario.nombre,
          descripcion: formulario.descripcion || undefined,
          precio: Number(formulario.precio),
          duracion: Number(formulario.duracion),
          color: formulario.color || undefined,
          requiereEmpleado: formulario.requiereEmpleado,
          activo: formulario.activo,
          categoriaId: formulario.categoriaId || undefined,
          porcentajeNegocio: formulario.porcentajeNegocio != null ? Number(formulario.porcentajeNegocio) : undefined,
          porcentajeEmpleado: formulario.porcentajeEmpleado != null ? Number(formulario.porcentajeEmpleado) : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Error ${response.status}`);
      }

      const servicioGuardado = await response.json();

      if (modoEdicion && servicioSeleccionado) {
        setServicios(prev => prev.map(s => s.id === servicioSeleccionado.id ? servicioGuardado : s));
        toast.success("Servicio actualizado correctamente");
      } else {
        setServicios(prev => [...prev, servicioGuardado]);
        toast.success("Servicio creado correctamente");
      }

      setModalAbierto(false);
      limpiarFormulario();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminarServicio = (servicio: Servicio) => {
    setServicioAEliminar(servicio);
  };

  const ejecutarEliminarServicio = async () => {
    if (!servicioAEliminar) return;
    try {
      const response = await fetch(`/api/servicios/${servicioAEliminar.id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!response.ok) throw new Error("Error al eliminar");
      setServicios(prev => prev.filter(s => s.id !== servicioAEliminar.id));
      toast.success("Servicio eliminado");
    } catch (error) {
      toast.error("Error al eliminar el servicio");
    } finally {
      setServicioAEliminar(null);
    }
  };

  const toggleEstado = async (servicio: Servicio) => {
    try {
      const response = await fetch(`/api/servicios/${servicio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activo: !servicio.activo }),
      });
      if (!response.ok) throw new Error("Error al actualizar");
      const actualizado = await response.json();
      setServicios(prev => prev.map(s => s.id === servicio.id ? actualizado : s));
      toast.success(`Servicio ${!servicio.activo ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error("Error al actualizar el servicio");
    }
  };

  // ── Loading State ─────────────────────────────────────────────

  if (cargando || configCargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Servicios</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Administra los servicios disponibles para tu negocio
            </p>
          </div>
          <Button
            onClick={abrirModalCrear}
            className="flex items-center gap-2 px-4 sm:px-6 h-10 sm:h-11 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 w-full sm:w-auto self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Servicio</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Servicios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{serviciosActivos.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                de {servicios.length} totales
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Precio Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(precioPromedio)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                por servicio
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(ingresosTotales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalVentas} ventas
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{totalCitas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                agendadas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="border-t border-border/60">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between px-6 lg:px-8 py-4 border-b border-border/60">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Catálogo de Servicios
            </h2>
            <p className="text-sm text-muted-foreground">
              {serviciosFiltrados.length === 0 && (busqueda || filtroCategoria !== "TODOS" || filtroEstado !== "TODOS")
                ? "No se encontraron resultados para los filtros aplicados"
                : `${serviciosFiltrados.length} servicio${serviciosFiltrados.length !== 1 ? 's' : ''} ${(busqueda || filtroCategoria !== "TODOS" || filtroEstado !== "TODOS") ? 'encontrado(s)' : 'en total'}`
              }
            </p>
          </div>

          <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-[150px] h-9">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las categorías</SelectItem>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as "TODOS" | "ACTIVO" | "INACTIVO")}>
                <SelectTrigger className="w-full sm:w-[130px] h-9">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ACTIVO">✅ Activos</SelectItem>
                  <SelectItem value="INACTIVO">⬚ Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 bg-muted/10">
              {serviciosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Activity className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    {busqueda || filtroCategoria !== "TODOS" || filtroEstado !== "TODOS"
                      ? "No se encontraron servicios"
                      : "No hay servicios registrados"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {busqueda || filtroCategoria !== "TODOS" || filtroEstado !== "TODOS"
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "Crea tu primer servicio para comenzar"}
                  </p>
                  {!(busqueda || filtroCategoria !== "TODOS" || filtroEstado !== "TODOS") && (
                    <Button variant="outline" onClick={abrirModalCrear}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer servicio
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {serviciosFiltrados.map((servicio) => {
                    const color = servicio.color || "#3B82F6";
                    const isPopular = (servicio._count?.citas || 0) > 10;
                    return (
                      <Card
                        key={servicio.id}
                        className={`group relative overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-200 ${
                          !servicio.activo ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Color indicator bar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: color }}
                        />

                        <CardHeader className="pb-3 pt-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${color}15` }}
                              >
                                <Sparkles className="h-5 w-5" style={{ color }} />
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{servicio.nombre}</CardTitle>
                                {servicio.categoria && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {servicio.categoria.nombre}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPopular && (
                                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-[10px] px-1.5 py-0.5">
                                  <Star className="h-3 w-3 mr-0.5 fill-current" />
                                  Popular
                                </Badge>
                              )}
                              <Badge variant={servicio.activo ? "default" : "secondary"}>
                                {servicio.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pb-4">
                          {servicio.descripcion && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {servicio.descripcion}
                            </p>
                          )}

                          {/* Price & Duration */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-lg font-bold text-foreground">
                                {formatCurrency(Number(servicio.precio))}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-sm">{servicio.duracion} min</span>
                            </div>
                          </div>

                          {/* Metrics */}
                          {servicio._count && (
                            <div className="flex gap-3 mb-4 text-xs text-muted-foreground">
                              <span>Citas: {servicio._count.citas || 0}</span>
                              <span>Ventas: {servicio._count.itemsVenta || 0}</span>
                              {servicio.requiereEmpleado && <span>👤 Empleado</span>}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              onClick={() => {
                                setServicioSeleccionado(servicio);
                                setModalVerAbierto(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              onClick={() => abrirModalEditar(servicio)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 h-8 text-xs transition-all duration-200 ${
                                servicio.activo
                                  ? 'hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-700 dark:text-amber-400'
                                  : 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-green-700 dark:text-green-400'
                              }`}
                              onClick={() => toggleEstado(servicio)}
                            >
                              <ToggleLeft className="h-3.5 w-3.5 mr-1" />
                              {servicio.activo ? 'Desact.' : 'Activar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                              onClick={() => solicitarEliminarServicio(servicio)}
                              title="Eliminar servicio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
        </div>
      </div>

      {/* ── Create/Edit Modal ────────────────────────────────────── */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {modoEdicion ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Servicio *</Label>
                <Input
                  id="nombre"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Corte de cabello"
                  className={erroresFormulario.nombre ? 'border-red-500' : ''}
                />
                {erroresFormulario.nombre && (
                  <p className="text-xs text-red-500">{erroresFormulario.nombre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formulario.categoriaId}
                  onValueChange={(value) => setFormulario(prev => ({ ...prev, categoriaId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formulario.descripcion}
                onChange={(e) => setFormulario(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe el servicio en detalle..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Price, Duration, Color */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio *</Label>
                <Input
                  id="precio"
                  type="text"
                  inputMode="numeric"
                  value={formulario.precio > 0 ? formulario.precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, '');
                    if (raw === '' || /^\d+$/.test(raw)) {
                      setFormulario(prev => ({ ...prev, precio: raw === '' ? 0 : parseInt(raw, 10) }));
                    }
                  }}
                  placeholder="0"
                  className={`font-semibold tracking-wide ${erroresFormulario.precio ? 'border-red-500' : ''}`}
                />
                {erroresFormulario.precio && (
                  <p className="text-xs text-red-500">{erroresFormulario.precio}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracion">Duración (min) *</Label>
                <Input
                  id="duracion"
                  type="number"
                  value={formulario.duracion || ''}
                  onChange={(e) => setFormulario(prev => ({ ...prev, duracion: Number(e.target.value) }))}
                  placeholder="30"
                  className={erroresFormulario.duracion ? 'border-red-500' : ''}
                />
                {erroresFormulario.duracion && (
                  <p className="text-xs text-red-500">{erroresFormulario.duracion}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg">
                  {COLORES_PREDEFINIDOS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormulario(prev => ({ ...prev, color: c }))}
                      className={`h-7 w-7 rounded-md transition-all duration-200 hover:scale-110 ${
                        formulario.color === c
                          ? 'ring-2 ring-offset-2 ring-ring scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Switches */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  id="requiere-empleado"
                  checked={formulario.requiereEmpleado}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, requiereEmpleado: checked }))}
                />
                <div>
                  <Label htmlFor="requiere-empleado" className="text-sm font-medium cursor-pointer">
                    Requiere empleado
                  </Label>
                  <p className="text-xs text-muted-foreground">Asignar empleado específico</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  id="activo"
                  checked={formulario.activo}
                  onCheckedChange={(checked) => setFormulario(prev => ({ ...prev, activo: checked }))}
                />
                <div>
                  <Label htmlFor="activo" className="text-sm font-medium cursor-pointer">
                    Servicio activo
                  </Label>
                  <p className="text-xs text-muted-foreground">Disponible para venta</p>
                </div>
              </div>
            </div>

            {/* Porcentajes de ganancia - solo peluquería/salón */}
            {esPeluqueria && (
              <div className="space-y-3 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold text-primary">Distribución de ganancias</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Define cómo se reparte el precio del servicio entre el negocio y el empleado.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pct-negocio" className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      % Negocio
                    </Label>
                    <div className="relative">
                      <Input
                        id="pct-negocio"
                        type="number"
                        min={0}
                        max={100}
                        value={formulario.porcentajeNegocio}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          setFormulario(prev => ({ ...prev, porcentajeNegocio: val, porcentajeEmpleado: 100 - val }));
                        }}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formulario.precio > 0 ? `≈ ${formatCurrency(formulario.precio * formulario.porcentajeNegocio / 100)}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pct-empleado" className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      % Empleado
                    </Label>
                    <div className="relative">
                      <Input
                        id="pct-empleado"
                        type="number"
                        min={0}
                        max={100}
                        value={formulario.porcentajeEmpleado}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          setFormulario(prev => ({ ...prev, porcentajeEmpleado: val, porcentajeNegocio: 100 - val }));
                        }}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formulario.precio > 0 ? `≈ ${formatCurrency(formulario.precio * formulario.porcentajeEmpleado / 100)}` : ''}
                    </p>
                  </div>
                </div>
                {/* Barra visual de distribución */}
                <div className="h-3 rounded-full overflow-hidden flex mt-1" title={`Negocio: ${formulario.porcentajeNegocio}% | Empleado: ${formulario.porcentajeEmpleado}%`}>
                  <div
                    className="bg-blue-500 transition-all duration-300"
                    style={{ width: `${formulario.porcentajeNegocio}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all duration-300"
                    style={{ width: `${formulario.porcentajeEmpleado}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Negocio {formulario.porcentajeNegocio}%</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Empleado {formulario.porcentajeEmpleado}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setModalAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarServicio}
              disabled={guardando}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {modoEdicion ? 'Actualizar' : 'Crear'} Servicio
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Modal ────────────────────────────────────── */}
      <Dialog open={modalVerAbierto} onOpenChange={setModalVerAbierto}>
        <DialogContent className="max-w-lg">
          {servicioSeleccionado && (() => {
            const color = servicioSeleccionado.color || "#3B82F6";
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Sparkles className="h-6 w-6" style={{ color }} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{servicioSeleccionado.nombre}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {servicioSeleccionado.categoria && (
                          <Badge variant="outline" className="text-xs">
                            {servicioSeleccionado.categoria.nombre}
                          </Badge>
                        )}
                        <Badge variant={servicioSeleccionado.activo ? "default" : "secondary"}>
                          {servicioSeleccionado.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {servicioSeleccionado.descripcion && (
                    <p className="text-muted-foreground text-sm">{servicioSeleccionado.descripcion}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Label className="text-xs text-muted-foreground">Precio</Label>
                      <p className="text-lg font-bold">{formatCurrency(Number(servicioSeleccionado.precio))}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Label className="text-xs text-muted-foreground">Duración</Label>
                      <p className="text-lg font-bold">{servicioSeleccionado.duracion} min</p>
                    </div>
                  </div>

                  {servicioSeleccionado._count && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <Label className="text-xs text-muted-foreground">Total Citas</Label>
                        <p className="text-lg font-bold">{servicioSeleccionado._count.citas || 0}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <Label className="text-xs text-muted-foreground">Total Ventas</Label>
                        <p className="text-lg font-bold">{servicioSeleccionado._count.itemsVenta || 0}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Requiere Empleado</Label>
                      <p className="font-medium">{servicioSeleccionado.requiereEmpleado ? 'Sí' : 'No'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-5 w-5 rounded-md border" style={{ backgroundColor: color }} />
                        <span className="text-sm font-mono text-muted-foreground">{color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Employees */}
                  {servicioSeleccionado.empleadosServicios && servicioSeleccionado.empleadosServicios.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Empleados Asignados</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {servicioSeleccionado.empleadosServicios.map(es => (
                          <Badge key={es.id} variant="outline" className="py-1">
                            {es.usuario.nombre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModalVerAbierto(false)}>
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      setModalVerAbierto(false);
                      abrirModalEditar(servicioSeleccionado);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!servicioAEliminar} onOpenChange={(open) => !open && setServicioAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el servicio <strong>{servicioAEliminar?.nombre}</strong>. Esta acción no se puede deshacer y podría afectar el historial si el servicio ya ha sido utilizado en ventas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarEliminarServicio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}