"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, X, UserPlus, Mail, Phone, Shield,
  Eye, EyeOff, Scissors, Info, Percent,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { esAdminOGerente } from "@/lib/auth/auth";
import { validatePassword, getPasswordErrorMessage } from "@/lib/password-policy";

interface UsuarioFormValues {
  nombre: string;
  email: string;
  telefono: string;
  contrasena: string;
  confirmarContrasena: string;
  rol: string;
}

export default function NuevoUsuarioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { session } = useAuth();
  const { configuracion } = useConfiguracionEmpresa();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [esEmpleadoOperativo, setEsEmpleadoOperativo] = useState(false);

  const esPeluqueria =
    configuracion?.empresa?.tipoNegocio === "PELUQUERIA" ||
    configuracion?.empresa?.tipoNegocio === "SALON_BELLEZA";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      contrasena: "",
      confirmarContrasena: "",
      rol: "EMPLEADO",
    },
  });

  const rolValue = watch("rol");
  const contrasenaValue = watch("contrasena");

  // Verificar permisos
  useEffect(() => {
    if (session && !esAdminOGerente(session.user.role)) {
      toast({ title: "Acceso denegado", description: "No tienes permisos para crear usuarios", variant: "destructive" });
      router.push("/dashboard/usuarios");
    }
  }, [session, router, toast]);

  const availableRoles = session?.user.role === "ADMINISTRADOR"
    ? ["ADMINISTRADOR", "GERENTE", "EMPLEADO"]
    : ["EMPLEADO"];

  async function onSubmit(data: UsuarioFormValues) {
    // Validar contraseñas solo si NO es empleado operativo
    if (!esEmpleadoOperativo) {
      if (!data.email) {
        toast({ title: "Error", description: "El email es requerido", variant: "destructive" }); return;
      }
      
      const passValidation = validatePassword(data.contrasena);
      if (!passValidation.valid) {
        toast({ title: "Contraseña débil", description: getPasswordErrorMessage(passValidation), variant: "destructive" }); return;
      }

      if (data.contrasena !== data.confirmarContrasena) {
        toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" }); return;
      }
    }

    if (!data.nombre || data.nombre.trim().length < 2) {
      toast({ title: "Error", description: "El nombre debe tener al menos 2 caracteres", variant: "destructive" }); return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        nombre: data.nombre.trim(),
        telefono: data.telefono || undefined,
        rol: data.rol,
        esEmpleadoOperativo,
      };

      if (!esEmpleadoOperativo) {
        payload.email = data.email;
        payload.contrasena = data.contrasena;
      }

      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.mensaje || resData.message || "Error al crear el usuario");

      toast({
        title: esEmpleadoOperativo ? "✅ Empleado operativo creado" : "✅ Usuario creado exitosamente",
        description: `${data.nombre} ha sido agregado al sistema`,
      });
      router.push("/dashboard/usuarios");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el usuario",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/usuarios">
          <Button variant="outline" size="icon" className="h-10 w-10 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Usuario</h1>
          <p className="text-muted-foreground">Crea una nueva cuenta o empleado para el sistema</p>
        </div>
      </div>

      {/* Toggle empleado operativo — solo peluquerías */}
      {esPeluqueria && (
        <Card className={`border-2 transition-all duration-200 ${
          esEmpleadoOperativo
            ? "border-violet-400/50 bg-violet-50/50 dark:bg-violet-950/20"
            : "border-border"
        }`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  esEmpleadoOperativo ? "bg-violet-500/15" : "bg-muted"
                }`}>
                  <Scissors className={`h-5 w-5 ${esEmpleadoOperativo ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Empleado Operativo (sin acceso al sistema)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Solo para asignación de servicios y cálculo de comisiones. No podrá iniciar sesión.
                  </p>
                </div>
              </div>
              <Switch
                checked={esEmpleadoOperativo}
                onCheckedChange={setEsEmpleadoOperativo}
                id="toggle-operativo"
                className="data-[state=checked]:bg-violet-500"
              />
            </div>

            {esEmpleadoOperativo && (
              <div className="mt-4 flex items-start gap-2 text-xs text-violet-700 dark:text-violet-400 bg-violet-100/70 dark:bg-violet-900/20 px-3 py-2.5 rounded-lg border border-violet-200/60 dark:border-violet-800/40">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Los campos de email y contraseña no son requeridos para empleados operativos.
                  El sistema generará credenciales internas automáticamente.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Información del Usuario</CardTitle>
              <CardDescription className="text-base mt-1">
                {esEmpleadoOperativo
                  ? "Solo se requiere nombre y teléfono para empleados operativos"
                  : "Completa todos los datos para crear la cuenta"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label htmlFor="nombre-usuario" className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Nombre Completo *
                  </Label>
                  <Input
                    id="nombre-usuario"
                    placeholder="Ej: Juan Pérez González"
                    className="h-11"
                    {...register("nombre")}
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <Label htmlFor="telefono-usuario" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Teléfono
                  </Label>
                  <Input
                    id="telefono-usuario"
                    placeholder="Ej: +57 300 123 4567"
                    className="h-11"
                    {...register("telefono")}
                  />
                </div>
              </div>

              {/* Email y contraseña — ocultos para empleados operativos */}
              {!esEmpleadoOperativo && (
                <div className="space-y-1.5">
                  <Label htmlFor="email-usuario" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Correo Electrónico *
                  </Label>
                  <Input
                    id="email-usuario"
                    type="email"
                    placeholder="usuario@empresa.com"
                    className="h-11"
                    {...register("email")}
                  />
                  <p className="text-xs text-muted-foreground">Email para iniciar sesión</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Rol y comisión */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Rol y Permisos</h3>
              <div className={`grid grid-cols-1 gap-6 ${esPeluqueria ? "md:grid-cols-2" : ""}`}>
                <div className="space-y-1.5">
                  <Label htmlFor="rol-usuario" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Rol del Usuario *
                  </Label>
                  <Select
                    value={rolValue}
                    onValueChange={(v) => setValue("rol", v)}
                    disabled={esEmpleadoOperativo} // Operativos siempre EMPLEADO
                  >
                    <SelectTrigger id="rol-usuario" className="h-11">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.includes("ADMINISTRADOR") && (
                        <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                      )}
                      {availableRoles.includes("GERENTE") && (
                        <SelectItem value="GERENTE">Gerente</SelectItem>
                      )}
                      <SelectItem value="EMPLEADO">Empleado</SelectItem>
                    </SelectContent>
                  </Select>
                  {esEmpleadoOperativo && (
                    <p className="text-xs text-muted-foreground">Los empleados operativos tienen rol Empleado por defecto</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seguridad — solo usuarios con login */}
            {!esEmpleadoOperativo && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Seguridad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="pass-usuario" className="text-sm font-medium">Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="pass-usuario"
                          type={mostrarContrasena ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pr-10"
                          {...register("contrasena")}
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarContrasena((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-pass-usuario" className="text-sm font-medium">Confirmar Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="confirm-pass-usuario"
                          type={mostrarConfirmar ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pr-10"
                          {...register("confirmarContrasena")}
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmar((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {mostrarConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Repite la contraseña para confirmar</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <Link href="/dashboard/usuarios">
                <Button variant="outline" type="button" className="w-full sm:w-auto h-11 px-8">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 shadow-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {esEmpleadoOperativo ? "Crear Empleado" : "Crear Usuario"}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}