"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users, TrendingUp, DollarSign, Search, Calendar,
  Download, ChevronDown, ChevronRight, Loader2, Scissors,
  CheckCircle2, Clock, BadgeDollarSign,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ItemEmpleado {
  id: string;
  servicioNombre: string;
  subtotal: number;
  fecha: string;
  comision: number;
  porcentajeAsignado: number;
  pagado: boolean;
}

interface EmpleadoComision {
  empleadoId: string;
  nombre: string;
  imagen: string | null;
  porcentajeComision: number;
  totalServicios: number;
  totalMonto: number;
  montoComision: number;       // pendiente
  montoTotalGenerado?: number; // total generado
  montoPagado?: number;        // ya pagado
  items: ItemEmpleado[];
}

interface Resumen {
  totalEmpleados: number;
  totalServicios: number;
  totalGeneral: number;
  totalComisiones: number;    // pendiente total
  totalPagado?: number;
}

type Periodo = "hoy" | "dia" | "semana" | "mes" | "personalizado";

// ─── Fila empleado ───────────────────────────────────────────────────────────
function FilaEmpleado({
  empleado,
  formatMoneda,
  onPagar,
  guardandoPago
}: {
  empleado: EmpleadoComision;
  formatMoneda: (v: number) => string;
  onPagar: (empleadoId: string, nombre: string, monto: number) => void;
  guardandoPago: boolean;
}) {
  const [expandido, setExpandido] = useState(false);

  const pendiente = empleado.montoComision;
  const pagado = empleado.montoPagado ?? 0;
  const totalGenerado = empleado.montoTotalGenerado ?? 0;
  const todoPagado = pendiente <= 0 && pagado > 0;
  const itemsPendientes = empleado.items.filter(i => !i.pagado);
  const itemsPagados = empleado.items.filter(i => i.pagado);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        {/* Empleado */}
        <TableCell className="py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center font-bold text-sm text-primary shrink-0">
              {empleado.nombre[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{empleado.nombre}</p>
              <p className="text-xs text-muted-foreground">{empleado.totalServicios} servicio{empleado.totalServicios !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </TableCell>

        {/* Servicios */}
        <TableCell className="py-4 px-6 text-center">
          <Badge variant="secondary" className="text-xs font-semibold">
            {empleado.totalServicios}
          </Badge>
        </TableCell>

        {/* Total vendido */}
        <TableCell className="py-4 px-6 text-right font-medium text-sm">
          {formatMoneda(empleado.totalMonto)}
        </TableCell>

        {/* Estado de pago — columna clave */}
        <TableCell className="py-4 px-6">
          <div className="flex flex-col items-end gap-1">
            {/* Total generado */}
            {totalGenerado > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Total: {formatMoneda(totalGenerado)}
              </span>
            )}
            {/* Ya pagado */}
            {pagado > 0 && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Pagado: {formatMoneda(pagado)}
              </span>
            )}
            {/* Pendiente */}
            {pendiente > 0 ? (
              <span className="font-bold text-orange-500 text-sm flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Pendiente: {formatMoneda(pendiente)}
              </span>
            ) : todoPagado ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 text-xs border-0">
                ✓ Todo al día
              </Badge>
            ) : null}
          </div>
        </TableCell>

        {/* Acción */}
        <TableCell className="py-4 px-6">
          <div className="flex items-center justify-end gap-3">
            {pendiente > 0 ? (
              <Button
                size="sm"
                disabled={guardandoPago}
                onClick={(e) => {
                  e.stopPropagation();
                  onPagar(empleado.empleadoId, empleado.nombre, pendiente);
                }}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {guardandoPago
                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  : <BadgeDollarSign className="h-3 w-3 mr-1" />}
                Pagar {formatMoneda(pendiente)}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin pendientes</span>
            )}
            {expandido
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        </TableCell>
      </TableRow>

      {/* Detalle expandido */}
      {expandido && (
        <>
          {/* Servicios PENDIENTES */}
          {itemsPendientes.length > 0 && (
            <>
              <TableRow className="bg-orange-500/5">
                <TableCell colSpan={5} className="py-1.5 px-6 pl-16">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                    Pendientes de pago ({itemsPendientes.length})
                  </span>
                </TableCell>
              </TableRow>
              {itemsPendientes.map((item, i) => (
                <TableRow key={`p-${i}`} className="bg-orange-500/5 text-xs hover:bg-orange-500/10">
                  <TableCell className="py-2 px-6 pl-16 text-foreground/90 font-medium" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3 w-3 opacity-50 shrink-0" />
                      {item.servicioNombre}
                      <span className="text-muted-foreground font-normal">·</span>
                      <span className="text-muted-foreground">{format(new Date(item.fecha), "dd MMM", { locale: es })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-6 text-right text-muted-foreground">{formatMoneda(item.subtotal)}</TableCell>
                  <TableCell className="py-2 px-6 text-right text-orange-600 font-semibold" colSpan={2}>
                    {formatMoneda(item.comision)}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">({item.porcentajeAsignado}%)</span>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}

          {/* Servicios PAGADOS */}
          {itemsPagados.length > 0 && (
            <>
              <TableRow className="bg-muted/10">
                <TableCell colSpan={5} className="py-1.5 px-6 pl-16">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ya pagados ({itemsPagados.length})
                  </span>
                </TableCell>
              </TableRow>
              {itemsPagados.map((item, i) => (
                <TableRow key={`ok-${i}`} className="bg-muted/10 text-xs opacity-60 hover:opacity-80">
                  <TableCell className="py-2 px-6 pl-16 text-muted-foreground line-through" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3 w-3 opacity-50 shrink-0" />
                      {item.servicioNombre}
                      <span className="text-muted-foreground">·</span>
                      {format(new Date(item.fecha), "dd MMM", { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-6 text-right text-muted-foreground line-through">{formatMoneda(item.subtotal)}</TableCell>
                  <TableCell className="py-2 px-6 text-right text-emerald-600/60 line-through" colSpan={2}>
                    {formatMoneda(item.comision)}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">({item.porcentajeAsignado}%)</span>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
function ComisionesPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [empleados, setEmpleados] = useState<EmpleadoComision[]>([]);
  const [listaEmpleados, setListaEmpleados] = useState<any[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [fechaDesde, setFechaDesde] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fechaDia, setFechaDia] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [empleadoFiltro, setEmpleadoFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [guardandoPago, setGuardandoPago] = useState<Record<string, boolean>>({});
  const [pagoConfirmacion, setPagoConfirmacion] = useState<{
    empleadoId: string;
    nombreEmpleado: string;
    montoMaximo: number;
  } | null>(null);
  const [montoPagar, setMontoPagar] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");

  const solicitarPago = (empleadoId: string, nombreEmpleado: string, monto: number) => {
    setPagoConfirmacion({ empleadoId, nombreEmpleado, montoMaximo: monto });
    setMontoPagar(monto); // Por defecto el monto total pendiente
    setMetodoPago("EFECTIVO");
  };

  // Cargar lista completa de empleados
  useEffect(() => {
    const cargarListaEmpleados = async () => {
      try {
        const res = await fetch("/api/pos/empleados");
        if (res.ok) {
          const data = await res.json();
          setListaEmpleados(data || []);
        }
      } catch (e) {
        console.error("Error al cargar lista de empleados:", e);
      }
    };
    if (session) {
      cargarListaEmpleados();
    }
  }, [session]);

  // Inicializar estados desde URL si existen
  useEffect(() => {
    const p = searchParams.get("periodo");
    const d = searchParams.get("desde");
    const h = searchParams.get("hasta");
    const emp = searchParams.get("empleadoId");

    if (p && ["hoy", "dia", "semana", "mes", "personalizado"].includes(p)) {
      setPeriodo(p as Periodo);
    }
    if (d) {
      setFechaDesde(d);
      setFechaDia(d);
    }
    if (h) setFechaHasta(h);
    if (emp) setEmpleadoFiltro(emp);
  }, [searchParams]);

  // Sincronizar filtros a URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      params.set("periodo", periodo);
      if (periodo === "personalizado") {
        if (fechaDesde) params.set("desde", fechaDesde);
        if (fechaHasta) params.set("hasta", fechaHasta);
      } else if (periodo === "dia") {
        if (fechaDia) params.set("desde", fechaDia);
      }
      if (empleadoFiltro !== "todos") {
        params.set("empleadoId", empleadoFiltro);
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [periodo, fechaDesde, fechaHasta, fechaDia, empleadoFiltro]);

  const calcularRango = useCallback((): { desde: Date; hasta: Date } => {
    const ahora = new Date();
    const obtenerFechaLocalISO = (date: Date, hora: string) => {
      const yyyymmdd = format(date, "yyyy-MM-dd");
      return `${yyyymmdd}T${hora}-05:00`;
    };

    if (periodo === "hoy") {
      return {
        desde: new Date(obtenerFechaLocalISO(ahora, "00:00:00")),
        hasta: new Date(obtenerFechaLocalISO(ahora, "23:59:59.999"))
      };
    }
    if (periodo === "dia") {
      return {
        desde: new Date(`${fechaDia}T00:00:00-05:00`),
        hasta: new Date(`${fechaDia}T23:59:59.999-05:00`)
      };
    }
    if (periodo === "semana") {
      return {
        desde: new Date(obtenerFechaLocalISO(startOfWeek(ahora, { weekStartsOn: 1 }), "00:00:00")),
        hasta: new Date(obtenerFechaLocalISO(ahora, "23:59:59.999"))
      };
    }
    if (periodo === "mes") {
      return {
        desde: new Date(obtenerFechaLocalISO(startOfMonth(ahora), "00:00:00")),
        hasta: new Date(obtenerFechaLocalISO(endOfMonth(ahora), "23:59:59.999"))
      };
    }
    // personalizado
    return {
      desde: new Date(`${fechaDesde}T00:00:00-05:00`),
      hasta: new Date(`${fechaHasta}T23:59:59.999-05:00`)
    };
  }, [periodo, fechaDesde, fechaHasta, fechaDia]);

  const cargar = useCallback(async () => {
    if (periodo === "personalizado" && (!fechaDesde || !fechaHasta)) return;
    if (periodo === "dia" && !fechaDia) return;
    setCargando(true);
    try {
      const { desde, hasta } = calcularRango();
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });
      if (empleadoFiltro !== "todos") params.set("empleadoId", empleadoFiltro);

      const res = await fetch(`/api/peluqueria/comisiones?${params}`);
      if (!res.ok) throw new Error("Error al cargar comisiones");
      const data = await res.json();
      setEmpleados(data.empleados || []);
      setResumen(data.resumen || null);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las comisiones", variant: "destructive" });
    } finally {
      setCargando(false);
    }
  }, [calcularRango, empleadoFiltro, periodo, fechaDesde, fechaHasta, fechaDia, toast]);

  const ejecutarPago = async () => {
    if (!pagoConfirmacion) return;
    const { empleadoId, nombreEmpleado } = pagoConfirmacion;
    setPagoConfirmacion(null);
    setGuardandoPago((prev) => ({ ...prev, [empleadoId]: true }));
    try {
      const { desde, hasta } = calcularRango();
      const res = await fetch("/api/peluqueria/comisiones/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleadoId,
          nombreEmpleado,
          monto: montoPagar,
          metodoPago: metodoPago,
          notas: `Periodo: ${periodo}`,
          desde: desde.toISOString(),
          hasta: hasta.toISOString()
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar el pago");
      }

      toast({ title: "✅ Pago registrado", description: `Comisión de ${nombreEmpleado} liquidada correctamente.` });
      cargar();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardandoPago((prev) => ({ ...prev, [empleadoId]: false }));
    }
  };

  // Auth
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role as string)) {
      toast({ title: "Sin permisos", variant: "destructive" });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  useEffect(() => { if (session) cargar(); }, [cargar, session]);

  const exportarCSV = () => {
    if (!empleados.length) return;

    const periodoLabel =
      periodo === "hoy" ? "Hoy" :
      periodo === "dia" ? `Día ${fechaDia}` :
      periodo === "semana" ? "Esta Semana" :
      periodo === "mes" ? "Este Mes" :
      `${fechaDesde} al ${fechaHasta}`;

    // Construir SpreadsheetML XML para formato profesional
    const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:CharSet="0" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1B5E20"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#555555"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#388E3C" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="$#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="Percent">
   <NumberFormat ss:Format="0.0%"/>
   <Alignment ss:Horizontal="Right"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="SubtotalRow">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#1B5E20"/>
   <Interior ss:Color="#E8F5E9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#388E3C"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#388E3C"/>
   </Borders>
  </Style>
  <Style ss:ID="SubtotalCurrency">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#1B5E20"/>
   <Interior ss:Color="#E8F5E9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="$#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#388E3C"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#388E3C"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B5E20" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCurrency">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B5E20" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="$#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Liquidaciones">
  <Table>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="150"/>
   <Column ss:Width="80"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
`;

    let xmlRows = "";
    xmlRows += `   <Row ss:Height="24">
    <Cell ss:StyleID="Title"><Data ss:Type="String">REPORTE DE LIQUIDACIÓN DE COMISIONES</Data></Cell>
   </Row>\n`;
    xmlRows += `   <Row ss:Height="18">
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">Período: ${periodoLabel.toUpperCase()} | Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}</Data></Cell>
   </Row>\n`;
    xmlRows += `   <Row><Cell></Cell></Row>\n`;

    // Headers
    xmlRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Empleada</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Servicio Prestado</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Valor del Servicio</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">% Comisión</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Comisión a Pagar</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Estado</Data></Cell>
   </Row>\n`;

    let totalValorServicios = 0;
    let totalComisiones = 0;

    for (const emp of empleados) {
      for (const item of emp.items) {
        const fechaItem = format(new Date(item.fecha), "yyyy-MM-dd");
        const estado = item.pagado ? "Pagado" : "Pendiente";
        const porcentajeDec = item.porcentajeAsignado / 100;

        xmlRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${emp.nombre}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${item.servicioNombre}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${fechaItem}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${item.subtotal}</Data></Cell>
    <Cell ss:StyleID="Percent"><Data ss:Type="Number">${porcentajeDec}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${item.comision}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${estado}</Data></Cell>
   </Row>\n`;

        totalValorServicios += item.subtotal;
        totalComisiones += item.comision;
      }

      // Fila de subtotal por empleada
      xmlRows += `   <Row ss:Height="20">
    <Cell ss:StyleID="SubtotalRow"><Data ss:Type="String">SUBTOTAL — ${emp.nombre}</Data></Cell>
    <Cell ss:StyleID="SubtotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="SubtotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="SubtotalCurrency"><Data ss:Type="Number">${emp.totalMonto}</Data></Cell>
    <Cell ss:StyleID="SubtotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="SubtotalCurrency"><Data ss:Type="Number">${emp.montoTotalGenerado ?? 0}</Data></Cell>
    <Cell ss:StyleID="SubtotalRow"><Data ss:Type="String"></Data></Cell>
   </Row>\n`;
      xmlRows += `   <Row><Cell></Cell></Row>\n`; // Fila vacía entre empleados
    }

    // Fila de total general
    xmlRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL GENERAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalValorServicios}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${totalComisiones}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
   </Row>\n`;

    const xmlFooter = `  </Table>
 </Worksheet>
</Workbook>`;

    const completeXml = xmlHeader + xmlRows + xmlFooter;
    const blob = new Blob([completeXml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comisiones-desglose-${format(new Date(), "yyyy-MM-dd")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMoneda = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const empleadosFiltrados = empleados.filter((e) =>
    busqueda ? e.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
  );

  const totalPendiente = empleados.reduce((s, e) => s + e.montoComision, 0);
  const totalPagado = empleados.reduce((s, e) => s + (e.montoPagado ?? 0), 0);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Liquidaciones</h1>
          <p className="text-base text-muted-foreground">
            Comisiones por empleado — lo pagado y lo que falta
          </p>
        </div>
        <Button variant="outline" onClick={exportarCSV} disabled={!empleados.length} className="flex items-center gap-2 h-10 px-5">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row flex-wrap gap-3 items-start md:items-center w-full">
        <div className="grid grid-cols-2 md:flex gap-1 bg-muted rounded-xl p-1 w-full md:w-auto">
          {(["hoy", "dia", "semana", "mes", "personalizado"] as Periodo[]).map((op) => (
            <button
              key={op}
              onClick={() => setPeriodo(op)}
              className={`px-2 md:px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all duration-200 ${
                periodo === op ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {op === "hoy" ? "Hoy" : op === "dia" ? "Día" : op === "personalizado" ? "Personalizado" : op === "semana" ? "Esta Semana" : "Este Mes"}
            </button>
          ))}
        </div>

        {periodo === "dia" && (
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Input type="date" value={fechaDia} onChange={(e) => setFechaDia(e.target.value)} className="w-full md:w-40 h-9" />
            <Button size="sm" onClick={cargar} variant="outline" className="w-full md:w-auto">
              Aplicar
            </Button>
          </div>
        )}

        {periodo === "personalizado" && (
          <div className="flex flex-wrap md:flex-nowrap gap-2 items-center w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto">
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="flex-1 md:w-36 h-9" />
              <span className="text-muted-foreground flex items-center justify-center">—</span>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="flex-1 md:w-36 h-9" />
            </div>
            <Button size="sm" onClick={cargar} variant="outline" className="w-full md:w-auto mt-1 md:mt-0">
              Aplicar
            </Button>
          </div>
        )}

        <div className="w-full md:w-auto">
          <Select value={empleadoFiltro} onValueChange={setEmpleadoFiltro}>
            <SelectTrigger className="w-full md:w-48 h-9 text-sm">
              <SelectValue placeholder="Todos los empleados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los empleados</SelectItem>
              {listaEmpleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Empleados", value: resumen?.totalEmpleados ?? "—", icon: Users, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
          { label: "Servicios", value: resumen?.totalServicios ?? "—", icon: Scissors, colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500/10" },
          { label: "Total Vendido", value: resumen ? formatMoneda(resumen.totalGeneral) : "—", icon: TrendingUp, colorClass: "text-foreground", bgClass: "bg-muted" },
          { label: "Total Comisiones", value: resumen ? formatMoneda(resumen.totalComisiones) : "—", icon: DollarSign, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
          <Card key={label} className="border border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${colorClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner de resumen Pagado / Pendiente */}
      {(totalPagado > 0 || totalPendiente > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {totalPagado > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Comisiones pagadas</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatMoneda(totalPagado)}</p>
              </div>
            </div>
          )}
          {totalPendiente > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Clock className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pendiente por pagar</p>
                <p className="font-bold text-orange-600">{formatMoneda(totalPendiente)}</p>
              </div>
            </div>
          )}
          {totalPendiente === 0 && totalPagado > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">¡Todo pagado en este período! ✓</p>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Desglose por Empleado</CardTitle>
              <CardDescription>Expande cada empleado para ver sus servicios pendientes y pagados</CardDescription>
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
              <p className="font-medium">No hay servicios registrados en este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead className="py-3 px-6 font-semibold">Empleado</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-center">Servicios</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">Total Vendido</TableHead>
                  <TableHead className="py-3 px-6 font-semibold">Estado de Pago</TableHead>
                  <TableHead className="py-3 px-6 font-semibold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleadosFiltrados.map((emp) => (
                  <FilaEmpleado
                    key={emp.empleadoId}
                    empleado={emp}
                    formatMoneda={formatMoneda}
                    onPagar={solicitarPago}
                    guardandoPago={guardandoPago[emp.empleadoId] || false}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pagoConfirmacion} onOpenChange={(open) => !open && setPagoConfirmacion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Registrar Pago a Empleado?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-4 text-foreground">
                <p>
                  Vas a registrar un pago para <strong>{pagoConfirmacion?.nombreEmpleado}</strong>.
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Comisión pendiente actual: <strong className="text-orange-600">{pagoConfirmacion && formatMoneda(pagoConfirmacion.montoMaximo)}</strong>
                  </span>
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Monto a Pagar</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        value={montoPagar || ''} 
                        onChange={(e) => setMontoPagar(Number(e.target.value))}
                        className="pl-9 font-semibold text-lg"
                        min={1}
                        max={pagoConfirmacion?.montoMaximo}
                      />
                    </div>
                    {/* Feedback de pago parcial */}
                    {montoPagar > 0 && pagoConfirmacion && montoPagar < pagoConfirmacion.montoMaximo && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        ⚠️ Pago parcial — quedará pendiente: <strong>{formatMoneda(pagoConfirmacion.montoMaximo - montoPagar)}</strong>
                      </p>
                    )}
                    {montoPagar > 0 && pagoConfirmacion && montoPagar >= pagoConfirmacion.montoMaximo && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        ✓ Cubre todo el monto pendiente
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Método de Pago</label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia / Nequi</SelectItem>
                        <SelectItem value="TARJETA_CREDITO">Tarjeta</SelectItem>
                        <SelectItem value="MIXTO">Mixto (efectivo + transferencia)</SelectItem>
                        <SelectItem value="CREDITO">A Crédito / Descuento de nómina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg border border-border">
                  💡 Puedes ingresar un monto menor para hacer un <strong>pago parcial</strong>. Los ítems más antiguos se marcan pagados primero (FIFO). Si usas <strong>Crédito</strong>, se registra como descuento de nómina sin salida de caja inmediata.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={ejecutarPago} 
              disabled={!montoPagar || montoPagar <= 0 || (pagoConfirmacion ? montoPagar > pagoConfirmacion.montoMaximo : false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Registrar Pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ComisionesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ComisionesPageContent />
    </Suspense>
  );
}
