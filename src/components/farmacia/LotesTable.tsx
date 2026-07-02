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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface LoteItem {
  productoId: string;
  productoNombre: string;
  sku: string | null;
  categoria: string;
  lote: string;
  fechaVencimiento: string;
  cantidad: number;
  estado: "vigente" | "proximo" | "vencido";
  diasRestantes: number;
  stockTotal: number;
}

interface ProductoAgrupado {
  productoId: string;
  productoNombre: string;
  sku: string | null;
  categoria: string;
  stockTotal: number;
  lotes: LoteItem[];
  totalLotes: number;
  lotesVencidos: number;
  lotesProximos: number;
}

export function LotesTable() {
  const [datos, setDatos] = useState<LoteItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/farmacia/vencimientos?filtro=todos&dias=365");
      if (res.ok) {
        const data = await res.json();
        setDatos(data.datos || []);
      }
    } catch (error) {
      console.error("Error cargando lotes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Agrupar por producto
  const productosAgrupados = useMemo(() => {
    const grupos: Record<string, ProductoAgrupado> = {};
    for (const item of datos) {
      if (!grupos[item.productoId]) {
        grupos[item.productoId] = {
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          sku: item.sku,
          categoria: item.categoria,
          stockTotal: item.stockTotal,
          lotes: [],
          totalLotes: 0,
          lotesVencidos: 0,
          lotesProximos: 0,
        };
      }
      grupos[item.productoId].lotes.push(item);
      grupos[item.productoId].totalLotes++;
      if (item.estado === "vencido") grupos[item.productoId].lotesVencidos++;
      if (item.estado === "proximo") grupos[item.productoId].lotesProximos++;
    }
    return Object.values(grupos);
  }, [datos]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productosAgrupados;
    const term = busqueda.toLowerCase();
    return productosAgrupados.filter(
      (p) =>
        p.productoNombre.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        p.lotes.some((l) => l.lote.toLowerCase().includes(term))
    );
  }, [productosAgrupados, busqueda]);

  const toggleExpand = (productoId: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(productoId)) {
        next.delete(productoId);
      } else {
        next.add(productoId);
      }
      return next;
    });
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
          <h2 className="text-2xl font-bold text-foreground">Gestión de Lotes</h2>
          <p className="text-sm text-muted-foreground">
            Trazabilidad de lotes agrupados por producto
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

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por producto, lote, SKU, categoría..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{productosAgrupados.length}</p>
            <p className="text-xs text-muted-foreground">Productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{datos.length}</p>
            <p className="text-xs text-muted-foreground">Lotes Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {productosAgrupados.reduce((sum, p) => sum + p.lotesVencidos, 0)}
            </p>
            <p className="text-xs text-muted-foreground text-red-600 dark:text-red-400">Lotes Vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Productos con Lotes */}
      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando lotes...</span>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/70 mb-3" />
              <h3 className="font-medium text-lg">Sin lotes registrados</h3>
              <p className="text-sm text-muted-foreground">
                Activa el control de vencimientos en tus productos para gestionar lotes
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {productosFiltrados.map((producto) => (
                <div key={producto.productoId}>
                  {/* Row del producto */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(producto.productoId)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    {expandidos.has(producto.productoId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{producto.productoNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {producto.categoria} {producto.sku ? `· SKU: ${producto.sku}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">{producto.totalLotes} lotes</Badge>
                      {producto.lotesVencidos > 0 && (
                        <Badge variant="destructive">{producto.lotesVencidos} vencidos</Badge>
                      )}
                      {producto.lotesProximos > 0 && (
                        <Badge className="bg-amber-500/15 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {producto.lotesProximos} prontos
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Lotes expandidos */}
                  {expandidos.has(producto.productoId) && (
                    <div className="bg-muted/30 px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lote</TableHead>
                            <TableHead>Fecha Vencimiento</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Días Restantes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {producto.lotes.map((lote, idx) => (
                            <TableRow
                              key={`${lote.lote}-${idx}`}
                              className={
                                lote.estado === "vencido"
                                  ? "bg-destructive/10/50 dark:bg-red-950/10"
                                  : lote.estado === "proximo"
                                  ? "bg-amber-500/10/50 dark:bg-amber-950/10"
                                  : ""
                              }
                            >
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {lote.lote}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(lote.fechaVencimiento)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">
                                {lote.cantidad}
                              </TableCell>
                              <TableCell>
                                {lote.estado === "vencido" ? (
                                  <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <XCircle className="h-3 w-3" /> Vencido
                                  </span>
                                ) : lote.estado === "proximo" ? (
                                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3 w-3" /> Próximo
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3" /> Vigente
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {lote.estado === "vencido"
                                  ? `Hace ${Math.abs(lote.diasRestantes)} días`
                                  : `${lote.diasRestantes} días`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
