"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, AlertTriangle, Save, X, User, Mail, Phone, MapPin, Calendar } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Esquema de validación para el formulario
const clienteFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede tener más de 100 caracteres" }),
  email: z
    .string()
    .email({ message: "Debe ser un correo electrónico válido" })
    .optional()
    .or(z.literal("")),
  telefono: z
    .string()
    .max(15, { message: "El teléfono no puede tener más de 15 caracteres" })
    .optional()
    .or(z.literal("")),
  direccion: z
    .string()
    .max(200, { message: "La dirección no puede tener más de 200 caracteres" })
    .optional()
    .or(z.literal("")),
});

type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cliente, setCliente] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
    },
  });

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await fetch(`/api/clientes/${resolvedParams.id}`);
        if (!response.ok) throw new Error("Error al cargar el cliente");
        const data = await response.json();
        setCliente(data);

        // Establecer los valores del formulario
        form.reset({
          nombre: data.nombre,
          email: data.email || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información del cliente",
          variant: "destructive",
        });
        router.push("/dashboard/clientes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCliente();
  }, [resolvedParams.id, form, router, toast]);

  async function onSubmit(data: ClienteFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clientes/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: data.nombre,
          email: data.email || undefined,
          telefono: data.telefono || undefined,
          direccion: data.direccion || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el cliente");
      }

      // Actualizar los datos del cliente en el estado
      setCliente({
        ...cliente,
        ...data,
      });

      toast({
        title: "¡Cliente actualizado exitosamente!",
        description: "La información del cliente ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el cliente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clientes/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar el cliente");

      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });

      router.push("/dashboard/clientes");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Función para generar las iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-green-500 to-emerald-600", 
      "from-purple-500 to-violet-600",
      "from-orange-500 to-red-600",
      "from-pink-500 to-rose-600",
      "from-cyan-500 to-blue-600"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando información del cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clientes">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Editar Cliente</h1>
            <p className="text-muted-foreground">
              Actualiza la información del cliente
            </p>
          </div>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 transition-all duration-200"
        >
          <Trash className="h-4 w-4 mr-2" />
          Eliminar Cliente
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Profile Card */}
        <Card className="border border-border shadow-sm bg-card h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Perfil del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar y nombre */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${getAvatarColor(cliente.nombre)} flex items-center justify-center shadow-sm mb-3`}>
                <span className="text-primary-foreground text-xl font-bold">
                  {getInitials(cliente.nombre)}
                </span>
              </div>
              <h3 className="font-bold text-xl text-foreground">{cliente.nombre}</h3>
            </div>

            <Separator />

            {/* Información del cliente */}
            <div className="space-y-4">
              {cliente.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10/50 border border-blue-500/30/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-900 mb-1">Email</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 truncate">{cliente.email}</p>
                  </div>
                </div>
              )}

              {cliente.telefono && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10/50 border border-emerald-500/30/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-900 mb-1">Teléfono</p>
                    <p className="text-sm text-green-800 dark:text-green-300">{cliente.telefono}</p>
                  </div>
                </div>
              )}

              {cliente.direccion && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10/50 border border-purple-500/30/50">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center mt-0.5">
                    <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-purple-900 mb-1">Dirección</p>
                    <p className="text-sm text-purple-800 leading-relaxed">{cliente.direccion}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10/50 border border-orange-500/30/50">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-orange-900 mb-1">Cliente desde</p>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {new Date(cliente.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl font-semibold text-card-foreground">
                  Datos del Cliente
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">
                  Actualiza la información del cliente
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator className="mx-6" />

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  {/* Nombre - Campo obligatorio */}
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nombre Completo *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nombre completo"
                            className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">
                          Nombre completo del cliente tal como deseas que aparezca en los registros
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Información de Contacto */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Información de Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Correo Electrónico
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="correo@ejemplo.com"
                                type="email"
                                className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Email para comunicaciones y facturas electrónicas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="telefono"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Teléfono
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Teléfono de contacto"
                                className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Número de contacto principal del cliente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Dirección */}
                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Dirección
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Dirección completa"
                            className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">
                          Dirección completa para entregas o visitas (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                  <Link href="/dashboard/clientes">
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
      </div>

      
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
              ¿Estás seguro de que deseas eliminar al cliente{" "}
              <span className="font-semibold text-foreground">
                "{cliente?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y se perderá toda la información asociada al cliente.
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

      
      <Card className="bg-blue-500/10/50 border-blue-500/30/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Información
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Los cambios se guardarán automáticamente cuando presiones "Guardar Cambios". 
                Asegúrate de verificar todos los datos antes de confirmar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}