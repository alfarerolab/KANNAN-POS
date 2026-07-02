"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Edit, Trash, AlertTriangle, Filter, SlidersHorizontal, Package, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";


interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precioCosto: number | null;
  codigoBarras: string | null;
  sku: string | null;
  imagen: string | null;
  enStock: number;
  stockMinimo: number;
  activo: boolean;
  categoriaId: string | null;
  categoria: {
    id: string;
    nombre: string;
  } | null;
  proveedor?: {
    id: string;
    nombre: string;
    empresa?: string;
  } | null;
  createdAt: string;
}


interface Categoria {
  id: string;
  nombre: string;
}

interface ApiResponse<T> {
  datos: T[];
  meta?: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export default function ProductsPage() {
  const { toast } = useToast();
  const { configuracion } = useConfiguracionEmpresa();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroStock, setFiltroStock] = useState<string>("todos");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productosResponse, categoriasResponse] = await Promise.all([
          fetch("/api/productos"),
          fetch("/api/categorias")
        ]);

        if (!productosResponse.ok) {
          throw new Error(`Error al cargar productos: ${productosResponse.status}`);
        }
        if (!categoriasResponse.ok) {
          throw new Error(`Error al cargar categorías: ${categoriasResponse.status}`);
        }

        const productosData = await productosResponse.json();
        const categoriasData = await categoriasResponse.json();

        if (!isMounted) return;

        // Procesamiento más robusto de productos
        let productosArray: Producto[] = [];
        if (productosData) {
          if (Array.isArray(productosData.datos)) {
            productosArray = productosData.datos;
          } else if (Array.isArray(productosData)) {
            productosArray = productosData;
          } else if (productosData.productos && Array.isArray(productosData.productos)) {
            productosArray = productosData.productos;
          } else {
            productosArray = [];
          }
        }

        // Procesamiento más robusto de categorías
        let categoriasArray: Categoria[] = [];
        if (categoriasData) {
          if (Array.isArray(categoriasData.datos)) {
            categoriasArray = categoriasData.datos;
          } else if (Array.isArray(categoriasData)) {
            categoriasArray = categoriasData;
          } else if (categoriasData.categorias && Array.isArray(categoriasData.categorias)) {
            categoriasArray = categoriasData.categorias;
          } else {
            categoriasArray = [];
          }
        }

        // Validar y limpiar datos de productos
        const productosValidados = productosArray.map(producto => ({
          ...producto,
          enStock: Number(producto.enStock) || 0,
          stockMinimo: Number(producto.stockMinimo) || 0,
          precio: Number(producto.precio) || 0,
          precioCosto: producto.precioCosto ? Number(producto.precioCosto) : null,
        }));

        setProductos(productosValidados);
        setCategorias(categoriasArray);

        // Debug de stock
        const stockStats = {
          total: productosValidados.length,
          bajoStock: productosValidados.filter(p => p.enStock < p.stockMinimo).length,
          agotados: productosValidados.filter(p => p.enStock === 0).length,
          disponibles: productosValidados.filter(p => p.enStock > 0).length,
        };
      } catch (error) {
        console.error("❌ Error al cargar datos:", error);
        if (isMounted) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "No se pudieron cargar los datos. Intenta de nuevo más tarde.",
            variant: "destructive",
          });
          setProductos([]);
          setCategorias([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleDeleteClick = (producto: Producto) => {
    setSelectedProducto(producto);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProducto) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/productos/${selectedProducto.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar el producto");

      setProductos(prevProductos =>
        prevProductos.filter((p) => p.id !== selectedProducto.id)
      );

      toast({
        title: "Producto eliminado",
        description: `${selectedProducto.nombre} ha sido eliminado correctamente`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedProducto(null);
    }
  };

  // Función para generar PDF de productos
  const generateProductsPDF = async (productsToExport: Producto[]) => {
    setIsGeneratingPDF(true);
    try {
      // Crear un nuevo documento PDF usando jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');

      // Configuración inicial
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 8;
      let currentY = margin;

      // Función para agregar nueva página si es necesario
      const checkNewPage = (neededSpace: number) => {
        if (currentY + neededSpace > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Encabezado del documento
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CATÁLOGO DE PRODUCTOS", pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generado el: ${fecha}`, pageWidth / 2, currentY, { align: 'center' });
      doc.text(`Total de productos: ${productsToExport.length}`, pageWidth / 2, currentY + 4, { align: 'center' });
      currentY += 15;

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // Recorrer productos
      for (let i = 0; i < productsToExport.length; i++) {
        const producto = productsToExport[i];
        checkNewPage(35); // Espacio mínimo necesario para un producto

        // Nombre del producto
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(producto.nombre, margin, currentY);
        currentY += lineHeight;

        // Información básica
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        const info = [
          `SKU: ${producto.sku || 'No definido'}`,
          `Código de Barras: ${producto.codigoBarras || 'No definido'}`,
          `Precio: ${formatCurrency(producto.precio)}`,
          `Stock: ${producto.enStock} unidades`,
          `Categoría: ${producto.categoria?.nombre || 'Sin categoría'}`
        ];

        info.forEach((text) => {
          doc.text(text, margin + 5, currentY);
          currentY += 5;
        });

        // Descripción si existe
        if (producto.descripcion) {
          doc.setFont("helvetica", "italic");
          // Dividir descripción en líneas si es muy larga
          const descripcionLines = doc.splitTextToSize(producto.descripcion, pageWidth - (margin * 2) - 10);
          doc.text(descripcionLines, margin + 5, currentY);
          currentY += descripcionLines.length * 4;
        }

        // Separador entre productos
        if (i < productsToExport.length - 1) {
          currentY += 3;
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 8;
        }
      }

      // Pie de página en la última página
      currentY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(128, 128, 128);
      doc.text("Documento generado automáticamente desde el sistema de inventario", pageWidth / 2, currentY, { align: 'center' });

      // Descargar el PDF
      const fileName = `productos_catalogo_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Generado",
        description: `Se ha descargado el catálogo con ${productsToExport.length} productos`,
      });

    } catch (error) {
      console.error("Error generando PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Función mejorada para filtrar productos
  const getFilteredProductos = () => {
    if (!Array.isArray(productos)) {
      return [];
    }

    return productos.filter((producto) => {
      // Filtro de búsqueda
      const searchMatch = !searchTerm ||
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (producto.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (producto.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de categoría
      const categoriaMatch = filtroCategoria === "todas" ||
        producto.categoriaId === filtroCategoria;

      // Filtro de stock mejorado
      const stockMatch = (() => {
        switch (filtroStock) {
          case "bajo":
            return producto.enStock < producto.stockMinimo && producto.enStock > 0;
          case "agotado":
            return producto.enStock === 0;
          case "disponible":
            return producto.enStock > 0;
          case "todos":
          default:
            return true;
        }
      })();

      return searchMatch && categoriaMatch && stockMatch;
    });
  };

  const filteredProductos = getFilteredProductos();

  // Cálculos de estadísticas
  const estadisticas = {
    total: productos.length,
    activos: productos.filter(p => p.activo).length,
    bajoStock: productos.filter(p => p.enStock > 0 && p.enStock < p.stockMinimo).length,
    agotados: productos.filter(p => p.enStock === 0).length,
    disponibles: productos.filter(p => p.enStock > p.stockMinimo).length,
  };

  // Función para determinar el estado del stock
  const getStockStatus = (producto: Producto) => {
    if (producto.enStock === 0) {
      return { text: "Agotado", color: "text-red-600 dark:text-red-400", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" };
    }
    if (producto.enStock < producto.stockMinimo) {
      return { text: "Bajo stock", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" };
    }
    return { text: "Disponible", color: "text-green-600 dark:text-green-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header Section */}
          <div className="products-header flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Productos</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gestiona tu inventario y productos de manera eficiente
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-4 sm:px-6 h-10 sm:h-11 shadow-sm hover:bg-muted transition-all duration-200"
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="hidden sm:inline">Generando PDF...</span>
                        <span className="sm:hidden">Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Descargar PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => generateProductsPDF(productos)}
                    disabled={productos.length === 0 || isGeneratingPDF}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Todos los productos</span>
                      <span className="text-xs text-muted-foreground">
                        {productos.length} productos
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => generateProductsPDF(filteredProductos)}
                    disabled={filteredProductos.length === 0 || isGeneratingPDF}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Productos filtrados</span>
                      <span className="text-xs text-muted-foreground">
                        {filteredProductos.length} productos
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => generateProductsPDF(productos.filter(p => p.enStock < p.stockMinimo))}
                    disabled={productos.filter(p => p.enStock < p.stockMinimo).length === 0 || isGeneratingPDF}
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Productos con bajo stock</span>
                      <span className="text-xs text-muted-foreground">
                        {productos.filter(p => p.enStock < p.stockMinimo).length} productos
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
                <Link href="/dashboard/productos/nuevo" className="w-full sm:w-auto">
                  <Button className="new-product-button flex items-center justify-center gap-2 px-4 sm:px-6 h-10 sm:h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 w-full">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo Producto</span>
                    <span className="sm:hidden">Producto</span>
                  </Button>
                </Link>
                
                {configuracion?.tipoNegocio === 'RESTAURANTE' || configuracion?.tipoNegocio === 'BAR' ? (
                  <Link href="/dashboard/productos/combos/nuevo" className="w-full sm:w-auto">
                    <Button variant="secondary" className="flex items-center justify-center gap-2 px-4 sm:px-6 h-10 sm:h-11 shadow-sm bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-200 border border-orange-500/30 transition-all duration-200 w-full">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Crear Combo</span>
                      <span className="sm:hidden">Combo</span>
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{estadisticas.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {estadisticas.activos} activos
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {estadisticas.disponibles}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock suficiente
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Bajo Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {estadisticas.bajoStock}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por debajo del mínimo
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Agotados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {estadisticas.agotados}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sin stock
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Products Card */}
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="px-4 sm:px-6 pb-4 sm:pb-6 border-b border-border/50">
              <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground">
                    Inventario de Productos
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground">
                    {filteredProductos.length === 0 && (searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos")
                      ? "No se encontraron resultados para los filtros aplicados"
                      : `${filteredProductos.length} ${filteredProductos.length === 1 ? 'producto' : 'productos'} ${(searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos") ? 'encontrado(s)' : 'en total'}`
                    }
                  </CardDescription>
                </div>

                <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-3">
                  <div className="flex w-full lg:w-auto max-w-sm">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar productos..."
                        className="search-products pl-10 h-10 sm:h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las categorías</SelectItem>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 sm:h-11 w-10 sm:w-11">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Filtrar por stock</h4>
                          <Select value={filtroStock} onValueChange={setFiltroStock}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Estado de stock" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos los estados</SelectItem>
                              <SelectItem value="disponible">✅ Disponibles</SelectItem>
                              <SelectItem value="bajo">⚠️ Bajo stock</SelectItem>
                              <SelectItem value="agotado">❌ Agotados</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-hidden">
                {/* Vista de tabla para desktop */}
                <div className="products-table hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/50 bg-muted/30 hover:bg-muted/40">
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4">Producto</TableHead>
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4">Precio</TableHead>
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4">Stock</TableHead>
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4 hidden xl:table-cell">Stock Mínimo</TableHead>
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4 hidden xl:table-cell">Categoría</TableHead>
                        <TableHead className="font-semibold text-foreground py-3 px-2 lg:px-4 hidden 2xl:table-cell">Estado</TableHead>
                        <TableHead className="text-right font-semibold text-foreground py-3 px-2 lg:px-4">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProductos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-32 px-4">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                  {searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos"
                                    ? "No se encontraron productos"
                                    : "No hay productos registrados"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos"
                                    ? "Intenta ajustar los filtros de búsqueda"
                                    : "Crea tu primer producto para comenzar"}
                                </p>
                              </div>
                              {!searchTerm && filtroCategoria === "todas" && filtroStock === "todos" && (
                                <Link href="/dashboard/productos/nuevo">
                                  <Button variant="outline" className="mt-2">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear primer producto
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProductos.map((producto, index) => {
                          const stockStatus = getStockStatus(producto);
                          return (
                            <TableRow
                              key={producto.id}
                              className="border-b border-border/50 hover:bg-muted/20 transition-colors duration-150"
                            >
                              <TableCell className="py-2 px-2 lg:px-4">
                                <div className="flex items-center gap-2 lg:gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-muted relative overflow-hidden shadow-sm flex-shrink-0">
                                    {producto.imagen ? (
                                      <Image
                                        src={producto.imagen}
                                        alt={producto.nombre}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-muted-foreground">
                                        <span className="text-xs font-semibold">
                                          {producto.nombre.substring(0, 2).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-foreground truncate max-w-[120px] lg:max-w-[200px]" title={producto.nombre}>{producto.nombre}</span>
                                    <span className="text-xs text-muted-foreground truncate" title={producto.sku || producto.codigoBarras || "Sin código"}>
                                      {producto.sku || producto.codigoBarras || "Sin código"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono py-2 px-2 lg:px-4">
                                <span className="font-semibold text-foreground text-sm">
                                  {formatCurrency(producto.precio)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 px-2 lg:px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-base ${
                                    producto.enStock === 0 ? "text-red-600 dark:text-red-400" :
                                    producto.enStock < producto.stockMinimo ? "text-amber-600 dark:text-amber-400" :
                                    "text-green-600 dark:text-green-400"
                                  }`}>
                                    {producto.enStock}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`${stockStatus.color} ${stockStatus.bgColor} ${stockStatus.borderColor} border font-medium text-[10px] uppercase tracking-wider px-2 py-0 h-5 hidden sm:inline-flex whitespace-nowrap`}
                                  >
                                    {stockStatus.text}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 px-2 lg:px-4 hidden xl:table-cell">
                                <span className="text-muted-foreground font-medium text-sm">
                                  {producto.stockMinimo}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 px-2 lg:px-4 hidden xl:table-cell text-sm">
                                {producto.categoria?.nombre ||
                                  <span className="text-muted-foreground">Sin categoría</span>
                                }
                              </TableCell>
                              <TableCell className="py-2 px-2 lg:px-4 hidden 2xl:table-cell">
                                <Badge variant={producto.activo ? "default" : "secondary"} className="text-xs">
                                  {producto.activo ? "Activo" : "Inactivo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-2 px-2 lg:px-4">
                                <div className="product-actions flex justify-end gap-1">
                                  <Link href={`/dashboard/productos/${producto.id}`}>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                                      title="Editar producto"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteClick(producto)}
                                    className="h-8 w-8 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                                    title="Eliminar producto"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Vista de cards para móvil y tablet */}
                <div className="lg:hidden">
                  {filteredProductos.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos"
                              ? "No se encontraron productos"
                              : "No hay productos registrados"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm || filtroCategoria !== "todas" || filtroStock !== "todos"
                              ? "Intenta ajustar los filtros de búsqueda"
                              : "Crea tu primer producto para comenzar"}
                          </p>
                        </div>
                        {!searchTerm && filtroCategoria === "todas" && filtroStock === "todos" && (
                          <Link href="/dashboard/productos/nuevo">
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Crear primer producto
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {filteredProductos.map((producto) => {
                        const stockStatus = getStockStatus(producto);
                        return (
                          <Card key={producto.id} className="border border-border/50 hover:shadow-md transition-all duration-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="h-16 w-16 rounded-lg bg-muted relative overflow-hidden shadow-sm flex-shrink-0">
                                  {producto.imagen ? (
                                    <Image
                                      src={producto.imagen}
                                      alt={producto.nombre}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-muted-foreground">
                                      <span className="text-sm font-semibold">
                                        {producto.nombre.substring(0, 2).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-foreground text-sm truncate">
                                      {producto.nombre}
                                    </h3>
                                    <div className="flex gap-1 ml-2">
                                      <Link href={`/dashboard/productos/${producto.id}`}>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                                          title="Editar producto"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </Link>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDeleteClick(producto)}
                                        className="h-8 w-8 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                                        title="Eliminar producto"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Precio:</span>
                                      <span className="font-semibold text-sm">{formatCurrency(producto.precio)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Stock:</span>
                                      <span className={`font-semibold text-sm ${
                                        producto.enStock === 0 ? "text-red-600 dark:text-red-400" :
                                        producto.enStock < producto.stockMinimo ? "text-amber-600 dark:text-amber-400" :
                                        "text-green-600 dark:text-green-400"
                                      }`}>
                                        {producto.enStock} / {producto.stockMinimo}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Estado:</span>
                                      <Badge
                                        variant="outline"
                                        className={`${stockStatus.color} ${stockStatus.bgColor} ${stockStatus.borderColor} border text-xs`}
                                      >
                                        {stockStatus.text}
                                      </Badge>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Categoría:</span>
                                      <span className="text-xs">
                                        {producto.categoria?.nombre ||
                                          <span className="text-muted-foreground">Sin categoría</span>
                                        }
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">SKU:</span>
                                      <span className="text-xs font-mono">
                                        {producto.sku || producto.codigoBarras || "Sin código"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md mx-4">
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  Confirmar eliminación
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed pt-2">
                  ¿Estás seguro de que deseas eliminar el producto{" "}
                  <span className="font-semibold text-foreground">
                    "{selectedProducto?.nombre}"
                  </span>?
                  <br /><br />
                  Esta acción no se puede deshacer y se perderán todos los datos del producto.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-3 pt-6 flex-col sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </div>
                  ) : (
                    "Eliminar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
