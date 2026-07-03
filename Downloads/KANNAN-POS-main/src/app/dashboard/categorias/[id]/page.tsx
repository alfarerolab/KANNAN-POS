"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, AlertTriangle, Save, X, Edit } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Esquema de validación para el formulario
const categoriaFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(50, { message: "El nombre no puede tener más de 50 caracteres" }),
  descripcion: z
    .string()
    .max(200, { message: "La descripción no puede tener más de 200 caracteres" })
    .optional()
    .or(z.literal("")),
});

type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;

export default function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categoria, setCategoria] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
    },
  });

  useEffect(() => {
    const fetchCategoria = async () => {
      try {
        const response = await fetch(`/api/categorias/${resolvedParams.id}`);
        if (!response.ok) throw new Error("Error al cargar la categoría");
        const data = await response.json();
        setCategoria(data);

        // Establecer los valores del formulario
        form.reset({
          nombre: data.nombre,
          descripcion: data.descripcion || "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la categoría",
          variant: "destructive",
        });
        router.push("/dashboard/categorias");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoria();
  }, [resolvedParams.id, form, router, toast]);

  async function onSubmit(data: CategoriaFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/categorias/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar la categoría");
      }

      // Actualizar los datos de la categoría en el estado
      setCategoria({
        ...categoria,
        ...data,
      });

      toast({
        title: "¡Categoría actualizada!",
        description: "La información de la categoría ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la categoría",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categorias/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar la categoría");

      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente",
      });

      router.push("/dashboard/categorias");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando información de la categoría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/categorias">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Editar Categoría</h1>
            <p className="text-muted-foreground">
              Actualiza la información de "{categoria?.nombre}"
            </p>
          </div>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full sm:w-auto h-11 px-6 bg-red-600 hover:bg-red-700 transition-all duration-200"
        >
          <Trash className="h-4 w-4 mr-2" />
          Eliminar Categoría
        </Button>
      </div>

      {/* Main Form Card */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm">
              <Edit className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Información de la Categoría
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Modifica los campos que necesites actualizar
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground">
                        Nombre de la Categoría *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre de la categoría"
                          className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Este será el nombre visible para organizar tus productos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground">
                        Descripción
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción de la categoría (opcional)"
                          className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Información adicional que ayude a identificar el propósito de la categoría
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Link href="/dashboard/categorias">
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full sm:w-auto h-11 px-8 border-input hover:bg-muted transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Guardar Cambios
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-amber-500/10/50 border-amber-500/30/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900">
                Información importante
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Los cambios en el nombre de la categoría se reflejarán en todos los productos asociados. 
                Eliminar la categoría podría afectar la organización de tus productos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
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
                "{categoria?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y podría afectar todos los productos asociados a esta categoría.
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
              onClick={handleDelete}
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