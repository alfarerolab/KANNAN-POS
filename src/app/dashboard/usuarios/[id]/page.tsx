"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, AlertTriangle, Save, X, User, Mail, Phone, Shield, Calendar, Eye, EyeOff, Crown, Scissors, Info, Percent } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { esAdminOGerente } from "@/lib/auth/auth";
import { validatePassword, getPasswordErrorMessage } from "@/lib/password-policy";

// Esquema de validación para el formulario
const usuarioFormSchema = z.object({
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
  contrasena: z
    .string()
    .optional()
    .or(z.literal("")),
  confirmarContrasena: z
    .string()
    .optional()
    .or(z.literal("")),
  rol: z.enum(["ADMINISTRADOR", "GERENTE", "EMPLEADO"]),
  imagen: z
    .string()
    .optional()
    .or(z.literal("")),
})
.refine(
  (data) =>
    !data.contrasena || !data.confirmarContrasena || data.contrasena === data.confirmarContrasena,
  {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContrasena"],
  }
);

type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;

export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params usando React.use()
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const { toast } = useToast();
  const router = useRouter();
  const { session } = useAuth();
  const { configuracion } = useConfiguracionEmpresa();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [esMiUsuario, setEsMiUsuario] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [esEmpleadoOperativo, setEsEmpleadoOperativo] = useState(false);

  const esPeluqueria =
    configuracion?.empresa?.tipoNegocio === "PELUQUERIA" ||
    configuracion?.empresa?.tipoNegocio === "SALON_BELLEZA";

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      contrasena: "",
      confirmarContrasena: "",
      rol: "EMPLEADO",
      imagen: "",
    },
  });

  // Verificar que el usuario tiene permisos para gestionar usuarios
  useEffect(() => {
    if (session && !esAdminOGerente(session.user.role) && session.user.id !== id) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para editar este usuario",
        variant: "destructive",
      });
      router.push("/dashboard/usuarios");
      return;
    }

    // Verificar si el usuario está editando su propio perfil
    if (session?.user.id === id) {
      setEsMiUsuario(true);
    }

    const fetchUsuario = async () => {
      try {
        const response = await fetch(`/api/usuarios/${id}`);
        if (!response.ok) throw new Error("Error al cargar el usuario");
        const data = await response.json();
        setUsuario(data);
        setEsEmpleadoOperativo(data.esEmpleadoOperativo || false);

        // Establecer los valores del formulario
        form.reset({
          nombre: data.nombre,
          email: data.email?.includes("@nologin.interno") ? "" : data.email,
          telefono: data.telefono || "",
          contrasena: "",
          confirmarContrasena: "",
          rol: data.rol,
          imagen: data.imagen || "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        });
        router.push("/dashboard/usuarios");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuario();
  }, [id, form, router, toast, session]);

  async function onSubmit(data: UsuarioFormValues) {
    if (!esEmpleadoOperativo && !data.email) {
      toast({ title: "Error", description: "El email es requerido", variant: "destructive" }); return;
    }
    if (data.contrasena) {
      const passValidation = validatePassword(data.contrasena);
      if (!passValidation.valid) {
        toast({ title: "Contraseña débil", description: getPasswordErrorMessage(passValidation), variant: "destructive" }); return;
      }
    }

    setIsSubmitting(true);

    try {
      // Excluir confirmarContrasena del payload
      const { confirmarContrasena, ...formData } = data;

      const finalPayload: any = { 
        ...formData, 
        esEmpleadoOperativo 
      };

      // Eliminar la contraseña si está vacía
      if (!finalPayload.contrasena) {
        delete finalPayload.contrasena;
      }

      const response = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el usuario");
      }

      // Actualizar los datos del usuario en el estado
      setUsuario({
        ...usuario,
        ...formData,
      });

      toast({
        title: "¡Usuario actualizado exitosamente!",
        description: "La información del usuario ha sido actualizada correctamente",
      });

      // Si el usuario editó su propio perfil y cambió el email o la contraseña,
      // sugerir volver a iniciar sesión
      if (esMiUsuario && (data.email !== usuario.email || data.contrasena)) {
        toast({
          title: "Datos de acceso actualizados",
          description: "Por favor, vuelve a iniciar sesión con tus nuevos datos",
        });
      }
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
    // No permitir eliminar el propio usuario
    if (esMiUsuario) {
      toast({
        title: "Acción no permitida",
        description: "No puedes eliminar tu propio usuario",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar el usuario");

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });

      router.push("/dashboard/usuarios");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Definir qué roles puede asignar el usuario actual
  const availableRoles = session?.user.role === "ADMINISTRADOR"
    ? ["ADMINISTRADOR", "GERENTE", "EMPLEADO"]
    : ["EMPLEADO"];

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

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case "ADMINISTRADOR":
        return <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "GERENTE":
        return <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <User className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/usuarios">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {esMiUsuario ? "Mi Perfil" : "Editar Usuario"}
            </h1>
            <p className="text-muted-foreground">
              {esMiUsuario ? "Actualiza tu información personal" : "Modifica los datos del usuario"}
            </p>
          </div>
        </div>
        {!esMiUsuario && session?.user.role === "ADMINISTRADOR" && (
          <Button 
            variant="destructive" 
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 transition-all duration-200"
          >
            <Trash className="h-4 w-4 mr-2" />
            Eliminar Usuario
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Profile Card */}
        <Card className="border border-border shadow-sm bg-card h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Perfil de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar y nombre */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${getAvatarColor(usuario.nombre)} flex items-center justify-center shadow-sm mb-3`}>
                {usuario.imagen ? (
                  <AvatarImage src={usuario.imagen} alt={usuario.nombre} className="rounded-xl" />
                ) : (
                  <span className="text-primary-foreground text-xl font-bold">
                    {getInitials(usuario.nombre)}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-xl text-foreground">{usuario.nombre}</h3>
              <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                {getRoleIcon(usuario.rol)}
                {usuario.rol}
              </div>
            </div>

            <Separator />

            {/* Información del usuario */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10/50 border border-blue-500/30/50">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900 mb-1">Email</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 truncate">{usuario.email}</p>
                </div>
              </div>

              {usuario.telefono && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10/50 border border-emerald-500/30/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-900 mb-1">Teléfono</p>
                    <p className="text-sm text-green-800 dark:text-green-300">{usuario.telefono}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10/50 border border-orange-500/30/50">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-orange-900 mb-1">Usuario desde</p>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {new Date(usuario.createdAt).toLocaleDateString('es-ES', {
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
                  Datos del Usuario
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">
                  {esMiUsuario ? "Actualiza tu información personal" : "Modifica la información del usuario"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator className="mx-6" />

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  {esPeluqueria && !esMiUsuario && (
                    <div className="bg-muted/50 p-6 rounded-xl border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-purple-500" />
                            Empleado Operativo (Peluquería / Barbería)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Es un empleado que solo realiza servicios, no tiene acceso al sistema.
                          </p>
                        </div>
                        <Switch
                          checked={esEmpleadoOperativo}
                          onCheckedChange={(checked) => {
                            setEsEmpleadoOperativo(checked);
                            if (checked) {
                              form.setValue("rol", "EMPLEADO");
                            }
                          }}
                        />
                      </div>

                    </div>
                  )}

                  {/* Información Personal */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Información Personal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              Nombre completo del usuario tal como aparecerá en el sistema
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {!esEmpleadoOperativo && (
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Correo Electrónico *
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
                                Email para iniciar sesión y recibir notificaciones
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
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
                            Número de contacto del usuario (opcional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Rol y Permisos */}
                  {!esEmpleadoOperativo && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground">Rol y Permisos</h3>
                      <FormField
                        control={form.control}
                        name="rol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Rol del Usuario *
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={esMiUsuario || !availableRoles.includes(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 bg-background border-input focus:border-ring transition-colors duration-200">
                                  <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableRoles.includes("ADMINISTRADOR") && (
                                  <SelectItem value="ADMINISTRADOR">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4" />
                                      Administrador
                                    </div>
                                  </SelectItem>
                                )}
                                {availableRoles.includes("GERENTE") && (
                                  <SelectItem value="GERENTE">
                                    <div className="flex items-center gap-2">
                                      <Crown className="h-4 w-4" />
                                      Gerente
                                    </div>
                                  </SelectItem>
                                )}
                                <SelectItem value="EMPLEADO">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Empleado
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-sm text-muted-foreground">
                              {esMiUsuario ? (
                                "No puedes cambiar tu propio rol"
                              ) : (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span><strong>Administrador:</strong> Acceso completo al sistema</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span><strong>Gerente:</strong> Gestión de productos, ventas y reportes</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span><strong>Empleado:</strong> Solo realizar ventas</span>
                                  </div>
                                </div>
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {!esEmpleadoOperativo && <Separator />}

                  {/* Seguridad */}
                  {!esEmpleadoOperativo && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground">Cambiar Contraseña</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="contrasena"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium text-foreground">
                              Nueva Contraseña
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={mostrarContrasena ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="h-11 bg-background border-input focus:border-ring transition-colors duration-200 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Deja en blanco para mantener la contraseña actual
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmarContrasena"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium text-foreground">
                              Confirmar Contraseña
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={mostrarConfirmar ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="h-11 bg-background border-input focus:border-ring transition-colors duration-200 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {mostrarConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Repite la nueva contraseña para confirmar
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                  <Link href="/dashboard/usuarios">
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
              ¿Estás seguro de que deseas eliminar al usuario{" "}
              <span className="font-semibold text-foreground">
                "{usuario?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y se perderá toda la información asociada al usuario.
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

      {/* Help Section */}
      <Card className="bg-blue-500/10/50 border-blue-500/30/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                {esMiUsuario ? "Editar Mi Perfil" : "Información"}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {esMiUsuario 
                  ? "Los cambios en tu email o contraseña requerirán que vuelvas a iniciar sesión. Tu rol no puede ser modificado por ti mismo."
                  : "Los cambios se guardarán automáticamente cuando presiones 'Guardar Cambios'. Deja la contraseña en blanco si no deseas cambiarla."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}