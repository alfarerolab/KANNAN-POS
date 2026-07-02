"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, AlertTriangle } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Esquema de validación actualizado con todos los roles
const usuarioFormSchema = z.object({
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
  contrasena: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }) // Cambiado de 8 a 6 para coincidir con la API
    .optional()
    .or(z.literal("")),
  rol: z.enum(["SUPERADMIN", "ADMINISTRADOR", "GERENTE", "EMPLEADO"]),
});

type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;

interface Empresa {
  id: string;
  nombre: string;
}

export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      contrasena: "",
      rol: "EMPLEADO", // Valor por defecto actualizado
    },
  });

  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        // URL corregida para usar la ruta correcta
        const response = await fetch(`/api/usuarios/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al cargar el usuario");
        }
        const data = await response.json();
        setUsuario(data);

        // Cargar información de la empresa si tenemos empresaId
        if (data.empresaId) {
          const empresaResponse = await fetch(`/api/administrador/empresas/${data.empresaId}`);
          if (empresaResponse.ok) {
            const empresaData = await empresaResponse.json();
            setEmpresa(empresaData);
          }
        }

        // Establecer los valores del formulario
        form.reset({
          nombre: data.nombre || "",
          email: data.email || "",
          telefono: data.telefono || "",
          contrasena: "", // No mostrar la contraseña actual
          rol: data.rol || "EMPLEADO",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo cargar la información del usuario",
          variant: "destructive",
        });
        router.push("/dashboard/superadmin/usuarios");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuario();
  }, [id, form, router, toast]);

  async function onSubmit(data: UsuarioFormValues) {
    setIsSubmitting(true);

    try {
      // Preparar datos - solo incluir campos que han cambiado
      const formData: any = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        rol: data.rol,
      };

      // Solo incluir la contraseña si se ha introducido una nueva
      if (data.contrasena && data.contrasena.trim() !== "") {
        formData.contrasena = data.contrasena;
      }

      // URL corregida para usar la ruta correcta
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al actualizar el usuario");
      }

      const usuarioActualizado = await response.json();

      // Actualizar los datos del usuario en el estado
      setUsuario(usuarioActualizado);

      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    try {
      // URL corregida para usar la ruta correcta
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al eliminar el usuario");
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });

      if (usuario?.empresaId) {
        router.push(`/dashboard/superadmin/empresas/${usuario.empresaId}`);
      } else {
        router.push("/dashboard/superadmin");
      }
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Cargando información del usuario...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={usuario?.empresaId ? `/dashboard/superadmin/empresas/${usuario.empresaId}?tab=usuarios` : "/dashboard/superadmin/usuarios"}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
        </div>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash className="h-4 w-4 mr-2" />
          Eliminar Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Usuario</CardTitle>
          <CardDescription>
            Edita la información del usuario{empresa && ` para la empresa ${empresa.nombre}`}
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
                      <FormLabel>Nombre*</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
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
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input placeholder="correo@ejemplo.com" {...field} />
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
                  name="contrasena"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription>
                        Deja este campo en blanco para mantener la contraseña actual
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SUPERADMIN">Super Administrador</SelectItem>
                          <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                          <SelectItem value="GERENTE">Gerente</SelectItem>
                          <SelectItem value="EMPLEADO">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link href={usuario?.empresaId ? `/dashboard/superadmin/empresas/${usuario.empresaId}?tab=usuarios` : "/dashboard/superadmin/"}>
                  <Button variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el usuario{" "}
              <strong>{usuario?.nombre}</strong>? Esta acción no se puede deshacer.
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