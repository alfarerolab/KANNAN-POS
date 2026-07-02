"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash, AlertTriangle } from "lucide-react";

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

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  createdAt: string;
}

interface ApiResponse {
  datos: Categoria[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true; 

    const fetchCategorias = async () => {
      try {
        const response = await fetch("/api/categorias");
        if (!response.ok) {
          let errorDetails = "";
          try {
            errorDetails = await response.text();
          } catch (textError) {
            console.error("Error al leer detalles del error:", textError);
          }
          console.error(`Error al cargar categorías: ${response.status} ${response.statusText}`, errorDetails);
          throw new Error(`Error al cargar categorías (${response.status})`);
        }
        
        const data: ApiResponse = await response.json();
        if (isMounted) {
          if (data && Array.isArray(data.datos)) {
            setCategorias(data.datos);
          } else if (Array.isArray(data)) {
            setCategorias(data as unknown as Categoria[]);
          } else {
            console.error("Estructura de datos inesperada:", data);
            setCategorias([]); 
            toast({
              title: "Error de Datos",
              description: "La respuesta del servidor para las categorías no fue la esperada.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error al obtener categorías:", error);
        if (isMounted) {
          setCategorias([]);
          toast({
            title: "Error",
            description: "No se pudieron cargar las categorías. Intenta de nuevo más tarde.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); 
        }
      }
    };

    fetchCategorias();

    return () => {
      isMounted = false;
    };
  }, [toast]); 

  const handleDeleteClick = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategoria) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categorias/${selectedCategoria.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar la categoría");
      }

      setCategorias(categorias.filter((c) => c.id !== selectedCategoria.id));
      toast({
        title: "Categoría eliminada",
        description: `${selectedCategoria.nombre} ha sido eliminada correctamente`,
      });
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedCategoria(null); 
    }
  };

  const filteredCategorias = categorias.filter(
    (categoria) =>
      categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (categoria.descripcion && categoria.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  
  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Categorías</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona y organiza las categorías de tus productos
            </p>
          </div>
          <Link href="/dashboard/categorias/nueva">
            <Button className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nueva Categoría
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground">Listado de Categorías</p>
            <p className="text-sm text-muted-foreground">
              {filteredCategorias.length === 0 && searchTerm
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredCategorias.length} ${filteredCategorias.length === 1 ? 'categoría' : 'categorías'} ${searchTerm ? 'encontrada(s)' : 'en total'}`
              }
            </p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorías..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="px-6 lg:px-8 pb-8 pt-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Nombre
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Descripción
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Fecha de Creación
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground py-4 px-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {searchTerm
                              ? "No se encontraron categorías"
                              : "No hay categorías registradas"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm
                              ? "Intenta con otros términos de búsqueda"
                              : "Crea tu primera categoría para comenzar"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <Link href="/dashboard/categorias/nueva">
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Registrar primera categoría
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => (
                    <TableRow 
                      key={categoria.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <TableCell className="py-4 px-6">
                        <span className="font-semibold text-foreground">
                          {categoria.nombre}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-muted-foreground font-medium">
                          {categoria.descripcion || "Sin descripción"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(categoria.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(categoria.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/categorias/${categoria.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              title="Editar categoría"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(categoria)}
                            className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                            title="Eliminar categoría"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              ¿Estás seguro de que deseas eliminar la categoría{" "}
              <span className="font-semibold text-foreground">
                "{selectedCategoria?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y podría afectar los productos asociados a esta categoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700"
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
  );
}