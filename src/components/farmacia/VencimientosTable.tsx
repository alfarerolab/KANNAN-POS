"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  Filter,
  Download,
} from "lucide-react";

interface VencimientoItem {
  productoId: string;
  productoNombre: string;
  sku: string | null;
  codigoBarras: string | null;
  categoria: string;
  lote: string;
  fechaVencimiento: string;
  cantidad: number;
  estado: "vigente" | "proximo" | "vencido";
  diasRestantes: number;
  stockTotal: number;
  stockMinimo: number;
}

interface VencimientosMeta {
  total: number;
  vencidos: number;
  proximos: number;
  vigentes: number;
}

export function VencimientosTable() {
  const [datos, setDatos] = useState<VencimientoItem[]>([]);
  const [meta, setMeta] = useState<VencimientosMeta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [dias, setDias] = useState("30");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await fetch(`/api/farmacia/vencimientos?filtro=${filtro}&dias=${dias}`);
      if (res.ok) {
        const data = await res.json();
        setDatos(data.datos || []);
        setMeta(data.meta || null);
      }
    } catch (error) {
      console.error("Error cargando vencimientos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtro, dias]);

  const datosFiltrados = useMemo(() => {
    if (!busqueda) return datos;
    const term = busqueda.toLowerCase();
    return datos.filter(
      (d) =>
        d.productoNombre.toLowerCase().includes(term) ||
        d.lote.toLowerCase().includes(term) ||
        d.categoria.toLowerCase().includes(term) ||
        (d.sku && d.sku.toLowerCase().includes(term)) ||
        (d.codigoBarras && d.codigoBarras.toLowerCase().includes(term))
    );
  }, [datos, busqueda]);

  const getEstadoBadge = (estado: string, diasRestantes: number) => {
    switch (estado) {
      case "vencido":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Vencido ({Math.abs(diasRestantes)} días)
          </Badge>
        );
      case "proximo":
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
            <Clock className="h-3 w-3" />
            {diasRestantes} días
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300 dark:bg-green-900/30 dark:text-green-400 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {diasRestantes} días
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Control de Vencimientos</h2>
          <p className="text-sm text-muted-foreground">
            Monitoreo de fechas de vencimiento de todos los productos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={cargarDatos}
          disabled={cargando}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats rápidos */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card
            className={`cursor-pointer transition-all ${filtro === "todos" ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"}`}
            onClick={() => setFiltro("todos")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{meta.total}</p>
              <p className="text-xs text-muted-foreground">Todos</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filtro === "vencidos" ? "ring-2 ring-red-500 shadow-md" : "hover:shadow-sm"}`}
            onClick={() => setFiltro("vencidos")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{meta.vencidos}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filtro === "proximos" ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-sm"}`}
            onClick={() => setFiltro("proximos")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{meta.proximos}</p>
              <p className="text-xs text-muted-foreground">Próximos</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filtro === "vigentes" ? "ring-2 ring-green-500 shadow-md" : "hover:shadow-sm"}`}
            onClick={() => setFiltro("vigentes")}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{meta.vigentes}</p>
              <p className="text-xs text-muted-foreground">Vigentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por producto, lote, SKU, código..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dias} onValueChange={setDias}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Próx. 7 días</SelectItem>
                  <SelectItem value="15">Próx. 15 días</SelectItem>
                  <SelectItem value="30">Próx. 30 días</SelectItem>
                  <SelectItem value="60">Próx. 60 días</SelectItem>
                  <SelectItem value="90">Próx. 90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : datosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="font-medium text-lg">Sin resultados</h3>
              <p className="text-sm text-muted-foreground">
                No se encontraron productos con los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datosFiltrados.map((item, idx) => (
                    <TableRow
                      key={`${item.productoId}-${item.lote}-${idx}`}
                      className={
                        item.estado === "vencido"
                          ? "bg-destructive/10/50 dark:bg-red-950/10"
                          : item.estado === "proximo"
                          ? "bg-amber-500/10/50 dark:bg-amber-950/10"
                          : ""
                      }
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.productoNombre}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.categoria}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.lote}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(item.fechaVencimiento)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-sm">{item.cantidad}</span>
                      </TableCell>
                      <TableCell>{getEstadoBadge(item.estado, item.diasRestantes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
