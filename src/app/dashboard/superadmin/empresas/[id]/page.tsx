"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building, Plus, Trash, AlertTriangle } from "lucide-react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Esquema de validación para el formulario
const empresaFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede tener más de 100 caracteres" }),
  email: z
    .string()
    .email({ message: "Debe ser un correo electrónico válido" }),
  telefono: z
    .string()
    .min(7, { message: "El teléfono debe tener al menos 7 dígitos" })
    .max(15, { message: "El teléfono no puede tener más de 15 dígitos" })
    .optional()
    .or(z.literal("")),
  direccion: z
    .string()
    .max(200, { message: "La dirección no puede tener más de 200 caracteres" })
    .optional()
    .or(z.literal("")),
  activa: z.boolean(),
  fechaVencimiento: z
    .string()
    .optional()
    .or(z.literal("")),
});

type EmpresaFormValues = z.infer<typeof empresaFormSchema>;

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  telefono: string | null;
}

export default function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [empresa, setEmpresa] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
      activa: true,
      fechaVencimiento: "",
    },
  });

  useEffect(() => {
  const fetchEmpresaYUsuarios = async () => {
    try {
      const response = await fetch(`/api/administrador/empresas/${id}`);
      if (!response.ok) throw new Error("Error al cargar la empresa");
      const data = await response.json();
      setEmpresa(data);

      form.reset({
        nombre: data.nombre || "",
        email: data.email || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
        activa: data.activa ?? true,
        fechaVencimiento: data.fechaVencimiento
          ? new Date(data.fechaVencimiento).toISOString().split('T')[0]
          : "",
      });

      // 🚀 cargar usuarios inmediatamente
      const usersResponse = await fetch(`/api/administrador/empresas/${id}/usuarios`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsuarios(Array.isArray(usersData) ? usersData : usersData.usuarios || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la empresa",
        variant: "destructive",
      });
      router.push("/dashboard/superadmin/empresas");
    } finally {
      setIsLoading(false);
    }
  };

  fetchEmpresaYUsuarios();
}, [id, form, router, toast]);

  // Función separada para cargar usuarios
  const cargarUsuarios = async () => {
    try {
      setUsuariosLoading(true);
      const usersResponse = await fetch(`/api/administrador/empresas/${id}/usuarios`);
      
      if (!usersResponse.ok) {
        throw new Error(`Error ${usersResponse.status}: ${usersResponse.statusText}`);
      }
      
      const usersData = await usersResponse.json();
      
      // Validar que la respuesta sea un array o tenga un array
      let usuariosArray: Usuario[] = [];
      
      if (Array.isArray(usersData)) {
        usuariosArray = usersData;
      } else if (usersData && Array.isArray(usersData.usuarios)) {
        usuariosArray = usersData.usuarios;
      } else if (usersData && Array.isArray(usersData.data)) {
        usuariosArray = usersData.data;
      } else {
        usuariosArray = [];
      }
      
      setUsuarios(usuariosArray);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios de la empresa",
        variant: "destructive",
      });
      setUsuarios([]); // Asegurar que sea un array vacío
    } finally {
      setUsuariosLoading(false);
    }
  };

  // Cargar usuarios cuando se selecciona la tab
  useEffect(() => {
    if (activeTab === "usuarios" && !isLoading) {
      cargarUsuarios();
    }
  }, [activeTab, isLoading, id]);

  async function onSubmit(data: EmpresaFormValues) {
    setIsSubmitting(true);

    try {
      // Formatear la fecha de vencimiento
      const formattedData = {
        ...data,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento).toISOString() : null,
      };

      const response = await fetch(`/api/administrador/empresas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar la empresa");
      }

      // Actualizar los datos de la empresa en el estado
      setEmpresa({
        ...empresa,
        ...formattedData,
      });

      toast({
        title: "Empresa actualizada",
        description: "La información de la empresa ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la empresa",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/administrador/empresas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar la empresa");

      toast({
        title: "Empresa eliminada",
        description: "La empresa ha sido eliminada correctamente",
      });

      router.push("/dashboard/superadmin/empresas");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/superadmin/empresas">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Editar Empresa</h1>
        </div>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash className="h-4 w-4 mr-2" />
          Eliminar Empresa
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="usuarios">
            Usuarios ({Array.isArray(usuarios) ? usuarios.length : 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Empresa</CardTitle>
              <CardDescription>
                Edita la información de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Empresa*</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre de la empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email de Contacto*</FormLabel>
                          <FormControl>
                            <Input placeholder="contacto@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="Teléfono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="direccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input placeholder="Dirección" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Estado y Suscripción</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="activa"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Empresa Activa
                              </FormLabel>
                              <CardDescription>
                                Si está desactivada, los usuarios no podrán acceder al sistema
                              </CardDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fechaVencimiento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Vencimiento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usuarios de la Empresa</CardTitle>
                <CardDescription>
                  Administra los usuarios que tienen acceso al sistema
                </CardDescription>
              </div>
              <Link href={`/dashboard/superadmin/usuarios/nuevo?empresaId=${id}`}>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Nuevo Usuario</span>
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {usuariosLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!Array.isArray(usuarios) || usuarios.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                            {!Array.isArray(usuarios) 
                              ? "Error al cargar usuarios" 
                              : "No hay usuarios registrados para esta empresa"
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        usuarios.map((usuario) => (
                          <TableRow key={usuario.id}>
                            <TableCell className="font-medium">{usuario.nombre || 'Sin nombre'}</TableCell>
                            <TableCell>{usuario.email || 'Sin email'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  usuario.rol === "ADMINISTRADOR"
                                    ? "default"
                                    : usuario.rol === "GERENTE"
                                    ? "outline"
                                    : "secondary"
                                }
                              >
                                {usuario.rol || 'Sin rol'}
                              </Badge>
                            </TableCell>
                            <TableCell>{usuario.telefono || "--"}</TableCell>
                            <TableCell className="text-right">
                              <Link href={`/dashboard/superadmin/usuarios/${usuario.id}`}>
                                <Button variant="outline" size="sm">
                                  Editar
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la empresa{" "}
              <strong>{empresa?.nombre}</strong>? Esta acción no se puede deshacer y eliminará todos los datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}