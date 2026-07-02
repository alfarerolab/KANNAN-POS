"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus, TrendingDown, Receipt, Tag, Calendar, Search,
  Trash2, Edit, ChevronDown, Download, Loader2, AlertTriangle,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GastoDialog } from "@/components/gastos/GastoDialog";

interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  metodoPago: string | null;
  categoria: { id: string; nombre: string };
  registradoPor: { id: string; nombre: string };
  createdAt: string;
}

interface Resumen {
  totalMonto: number;
  totalGastos: number;
  categoriaMasFrecuente: string | null;
}

type Periodo = "hoy" | "semana" | "mes" | "personalizado";

const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "personalizado", label: "Personalizado" },
];

function calcularRangoPeriodo(periodo: Periodo): { desde: Date; hasta: Date } {
  const ahora = new Date();
  switch (periodo) {
    case "hoy":
      return { desde: startOfDay(ahora), hasta: endOfDay(ahora) };
    case "semana":
      return { desde: startOfWeek(ahora, { weekStartsOn: 1 }), hasta: endOfWeek(ahora, { weekStartsOn: 1 }) };
    case "mes":
    default:
      return { desde: startOfMonth(ahora), hasta: endOfMonth(ahora) };
  }
}

export default function GastosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [gastoEditar, setGastoEditar] = useState<any>(null);
  const [eliminarDialogo, setEliminarDialogo] = useState(false);
  const [gastoEliminar, setGastoEliminar] = useState<Gasto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Verificar permisos
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role as string)) {
      toast({ title: "Sin permisos", description: "Solo administradores y gerentes pueden ver los gastos", variant: "destructive" });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  const cargarGastos = useCallback(async () => {
    setCargando(true);
    try {
      let desde: Date, hasta: Date;
      if (periodo === "personalizado" && fechaDesde && fechaHasta) {
        desde = new Date(fechaDesde);
        hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59);
      } else if (periodo !== "personalizado") {
        const rango = calcularRangoPeriodo(periodo);
        desde = rango.desde;
        hasta = rango.hasta;
      } else return;

      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });

      const res = await fetch(`/api/gastos?${params}`);
      if (!res.ok) throw new Error("Error al cargar gastos");
      const data = await res.json();
      setGastos(data.gastos || []);
      setResumen(data.resumen || null);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron cargar los gastos", variant: "destructive" });
    } finally {
      setCargando(false);
    }
  }, [periodo, fechaDesde, fechaHasta, toast]);

  useEffect(() => {
    if (session) cargarGastos();
  }, [cargarGastos, session]);

  const handleEliminar = async () => {
    if (!gastoEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/gastos/${gastoEliminar.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast({ title: "Gasto eliminado", description: gastoEliminar.concepto });
      cargarGastos();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el gasto", variant: "destructive" });
    } finally {
      setEliminando(false);
      setEliminarDialogo(false);
      setGastoEliminar(null);
    }
  };

  const esAdmin = ["ADMINISTRADOR", "SUPERADMIN"].includes(session?.user?.role as string);

  const gastosFiltrados = gastos.filter((g) =>
    busqueda ? g.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.categoria.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
  );

  const formatMoneda = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const formatFecha = (f: string) =>
    format(new Date(f), "dd MMM yyyy", { locale: es });

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">

      {/* Banner header — línea de color arriba, sin borde propio */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gastos Operativos</h1>
            <p className="text-sm text-muted-foreground">
              Registra y controla los gastos del negocio
            </p>
          </div>
          <Button
            onClick={() => { setGastoEditar(null); setDialogoAbierto(true); }}
            className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="flex flex-wrap gap-3 items-center px-6 lg:px-8 py-4 border-b border-border/60">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {PERIODO_OPTIONS.map((op) => (
            <button
              key={op.value}
              onClick={() => setPeriodo(op.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                periodo === op.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {periodo === "personalizado" && (
          <div className="flex gap-2 items-center">
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-36 h-9" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-36 h-9" />
            <Button size="sm" onClick={cargarGastos} variant="outline">Aplicar</Button>
          </div>
        )}
      </div>

      {/* Stats de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 border-b border-border/60">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Gastado</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {resumen ? formatMoneda(resumen.totalMonto) : "—"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nº de Gastos</p>
              <p className="text-2xl font-bold mt-1">{resumen?.totalGastos ?? "—"}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categoría Principal</p>
              <p className="text-lg font-bold mt-1 truncate">
                {resumen?.categoriaMasFrecuente || "—"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Tag className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="px-6 lg:px-8 pb-8 pt-4">
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border/80 bg-card">
            <div>
              <p className="font-semibold text-foreground">Listado de Gastos</p>
              <p className="text-sm text-muted-foreground">
                {gastosFiltrados.length} gasto{gastosFiltrados.length !== 1 ? "s" : ""} en el período
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar gasto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Receipt className="h-12 w-12 opacity-30" />
              <p className="font-medium">No hay gastos registrados en este período</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setGastoEditar(null); setDialogoAbierto(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar primer gasto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                  <TableHead className="py-3 px-6 font-semibold">Fecha</TableHead>
                  <TableHead className="py-3 px-6 font-semibold">Concepto</TableHead>
                  <TableHead className="py-3 px-6 font-semibold">Categoría</TableHead>
                  <TableHead className="py-3 px-6 font-semibold">Método</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">Monto</TableHead>
                  <TableHead className="py-3 px-6 font-semibold">Registrado por</TableHead>
                  {esAdmin && <TableHead className="py-3 px-6 font-semibold text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosFiltrados.map((gasto) => (
                  <TableRow key={gasto.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="py-4 px-6 text-sm font-medium text-foreground whitespace-nowrap">
                      {formatFecha(gasto.fecha)}
                    </TableCell>
                    <TableCell className="py-4 px-6 font-medium max-w-xs text-foreground">
                      <p className="truncate">{gasto.concepto}</p>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
                        {gasto.categoria.nombre}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-sm text-muted-foreground font-medium">
                      {gasto.metodoPago || "Efectivo"}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatMoneda(gasto.monto)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-sm text-muted-foreground font-medium">
                      {gasto.registradoPor.nombre}
                    </TableCell>
                    {esAdmin && (
                      <TableCell className="py-4 px-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                            title="Editar"
                            onClick={() => {
                              setGastoEditar({
                                id: gasto.id,
                                concepto: gasto.concepto,
                                monto: gasto.monto,
                                categoriaId: gasto.categoria.id,
                                metodoPago: gasto.metodoPago || "EFECTIVO",
                                fecha: gasto.fecha,
                              });
                              setDialogoAbierto(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Eliminar"
                            onClick={() => { setGastoEliminar(gasto); setEliminarDialogo(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Dialog de registro/edición */}
      <GastoDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        onSuccess={cargarGastos}
        gastoEditar={gastoEditar}
      />

      {/* Dialog confirmación eliminación */}
      <Dialog open={eliminarDialogo} onOpenChange={setEliminarDialogo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Eliminar Gasto
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el gasto{" "}
              <span className="font-semibold text-foreground">"{gastoEliminar?.concepto}"</span>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setEliminarDialogo(false)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar} disabled={eliminando}>
              {eliminando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
