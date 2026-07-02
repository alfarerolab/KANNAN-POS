"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, DollarSign, Scissors, Search, Calendar,
  ChevronDown, ChevronRight, Loader2, Building2,
  Clock, TrendingUp, Percent, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ItemDia {
  origen: "comanda" | "venta";
  servicioNombre: string;
  servicioColor: string;
  monto: number;
  porcentajeEmpleadoServicio: number;
  porcentajeNegocioServicio: number;
  gananciaEmpleado: number;
  gananciaNegocio: number;
  hora: string;
  estado?: string;
}

interface EmpleadoDia {
  empleadoId: string;
  nombre: string;
  imagen: string | null;
  porcentajeComision: number;
  totalServicios: number;
  totalMonto: number;
  gananciaEmpleado: number;
  gananciaNegocio: number;
  items: ItemDia[];
}

interface Resumen {
  totalEmpleados: number;
  totalServicios: number;
  totalGeneral: number;
  totalGananciaEmpleados: number;
  totalGananciaNegocio: number;
}

// ─── Componente fila empleado ─────────────────────────────────────────────────
function FilaEmpleado({
  empleado,
  formatMoneda,
}: {
  empleado: EmpleadoDia;
  formatMoneda: (v: number) => string;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        {/* Empleado */}
        <TableCell className="py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center font-bold text-sm text-primary shrink-0">
              {empleado.nombre[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{empleado.nombre}</p>
              <p className="text-xs text-muted-foreground">{empleado.totalServicios} servicio{empleado.totalServicios !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </TableCell>

        {/* Total servicios */}
        <TableCell className="py-4 px-6 text-center">
          <Badge variant="secondary" className="font-semibold">
            {empleado.totalServicios}
          </Badge>
        </TableCell>

        {/* Total vendido */}
        <TableCell className="py-4 px-6 text-right font-medium">
          {formatMoneda(empleado.totalMonto)}
        </TableCell>

        {/* Ganancia negocio */}
        <TableCell className="py-4 px-6 text-right">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatMoneda(empleado.gananciaNegocio)}
          </span>
        </TableCell>

        {/* Lo que debe recibir el empleado */}
        <TableCell className="py-4 px-6 text-right">
          <div className="flex flex-col items-end">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
              {formatMoneda(empleado.gananciaEmpleado)}
            </span>
            {empleado.porcentajeComision > 0 && (
              <span className="text-xs text-amber-500">
                +{formatMoneda(empleado.totalMonto * empleado.porcentajeComision / 100)} comisión
              </span>
            )}
          </div>
        </TableCell>

        {/* Expand */}
        <TableCell className="py-4 px-6">
          {expandido
            ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          }
        </TableCell>
      </TableRow>

      {/* Filas de detalle */}
      {expandido && empleado.items.map((item, i) => (
        <TableRow key={i} className="bg-muted/20 text-xs hover:bg-muted/30">
          <TableCell className="py-2 px-6 pl-16 text-muted-foreground" colSpan={1}>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.servicioColor }}
              />
              <span className="font-medium text-foreground">{item.servicioNombre}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {item.origen === "venta" ? "Walk-in" : "Comanda"}
              </Badge>
            </div>
          </TableCell>
          <TableCell className="py-2 px-6 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.hora), "HH:mm", { locale: es })}
            </div>
          </TableCell>
          <TableCell className="py-2 px-6 text-right text-muted-foreground">
            {formatMoneda(item.monto)}
          </TableCell>
          <TableCell className="py-2 px-6 text-right text-blue-500/80">
            <span title={`${item.porcentajeNegocioServicio}% negocio`}>
              {formatMoneda(item.gananciaNegocio)}
            </span>
          </TableCell>
          <TableCell className="py-2 px-6 text-right text-emerald-600/80 dark:text-emerald-400/80">
            <span title={`${item.porcentajeEmpleadoServicio}% empleado`}>
              {formatMoneda(item.gananciaEmpleado)}
            </span>
          </TableCell>
          <TableCell className="py-2 px-6 text-right text-muted-foreground whitespace-nowrap">
            <Badge variant="outline" className="text-[10px] px-1.5">
              {item.porcentajeEmpleadoServicio}%
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EmpleadosDiaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [empleados, setEmpleados] = useState<EmpleadoDia[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busqueda, setBusqueda] = useState("");

  // Verificar permisos
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role as string)) {
      toast({ title: "Sin permisos", variant: "destructive" });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/peluqueria/empleados-dia?fecha=${fecha}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      const data = await res.json();
      setEmpleados(data.empleados || []);
      setResumen(data.resumen || null);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los datos del día", variant: "destructive" });
    } finally {
      setCargando(false);
    }
  }, [fecha, toast]);

  useEffect(() => {
    if (session) cargar();
  }, [cargar, session]);

  const formatMoneda = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const empleadosFiltrados = empleados.filter((e) =>
    busqueda ? e.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
  );

  const esHoy = fecha === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Trabajos del Día</h1>
          <p className="text-base text-muted-foreground">
            Servicios realizados y ganancias por empleado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-44 h-9"
            />
          </div>
          <Button size="sm" variant="outline" onClick={cargar} disabled={cargando} className="h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Indicador de fecha */}
      {esHoy && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Mostrando datos de hoy — {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </div>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Empleados", value: resumen?.totalEmpleados ?? "—", icon: Users, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
          { label: "Servicios", value: resumen?.totalServicios ?? "—", icon: Scissors, colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500/10" },
          { label: "Total del Día", value: resumen ? formatMoneda(resumen.totalGeneral) : "—", icon: TrendingUp, colorClass: "text-foreground", bgClass: "bg-muted" },
          { label: "Para el Negocio", value: resumen ? formatMoneda(resumen.totalGananciaNegocio) : "—", icon: Building2, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
          { label: "Para Empleados", value: resumen ? formatMoneda(resumen.totalGananciaEmpleados) : "—", icon: DollarSign, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10" },
        ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
          <Card key={label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
                  <p className={`text-lg font-bold mt-0.5 truncate ${colorClass}`}>{value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Desglose por Empleado</CardTitle>
              <CardDescription>
                Haz clic en una fila para ver el detalle de los servicios realizados
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : empleadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Scissors className="h-12 w-12 opacity-30" />
              <p className="font-medium">No hay servicios registrados en esta fecha</p>
              <p className="text-sm opacity-70">
                {esHoy ? "Los servicios aparecerán aquí cuando se registren" : "No se realizaron servicios este día"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead className="py-3 px-6 font-semibold">Empleado</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-center">Servicios</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">Total Vendido</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      Negocio
                    </span>
                  </TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">
                    <span className="flex items-center justify-end gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      A Pagar Empleado
                    </span>
                  </TableHead>
                  <TableHead className="py-3 px-6 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosFiltrados.map((emp) => (
                  <FilaEmpleado key={emp.empleadoId} empleado={emp} formatMoneda={formatMoneda} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Nota sobre comisiones adicionales */}
      {resumen && resumen.totalGananciaEmpleados > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          <Percent className="h-3 w-3 inline mr-1" />
          Las comisiones adicionales por empleado se muestran en <strong>Comisiones</strong> y no están incluidas en este resumen.
        </p>
      )}
    </div>
  );
}
