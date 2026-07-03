"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Esquema de validación para el formulario
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
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
  rol: z.enum(["ADMINISTRADOR", "GERENTE", "EMPLEADO"]),
  empresaId: z.string().min(1, { message: "Debes seleccionar una empresa" }),
});

type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;

interface Empresa {
  id: string;
  nombre: string;
}

export default function NuevoUsuarioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresaIdParam = searchParams.get("empresaId");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const generarContrasena = () => {
    const minLongitud = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let newPassword = "";
    
    // Asegurar al menos uno de cada tipo
    newPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    newPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    newPassword += "0123456789"[Math.floor(Math.random() * 10)];
    newPassword += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    
    for (let i = 4; i < minLongitud; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        newPassword += charset[randomIndex];
    }
    
    // Shuffle
    newPassword = newPassword.split('').sort(() => 0.5 - Math.random()).join('');

    form.setValue("contrasena", newPassword, { shouldValidate: true });
    setShowPassword(true);
    
    toast({
      title: "Contraseña generada",
      description: "Se ha generado una contraseña segura automáticamente.",
    });
  };

  // Definir valores por defecto para el formulario
  const defaultValues: Partial<UsuarioFormValues> = {
    nombre: "",
    email: "",
    telefono: "",
    contrasena: "",
    rol: "ADMINISTRADOR",
    empresaId: empresaIdParam || "",
  };

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues,
  });

  useEffect(() => {
    // Cargar listado de empresas
    const fetchEmpresas = async () => {
      setIsLoadingEmpresas(true);
      try {
        const response = await fetch("/api/administrador/empresas");
        
        // Verificar el status de la respuesta
       
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        
        // Verificar que data sea un array
        if (Array.isArray(data.datos)) {
          setEmpresas(data.datos);

          if (empresaIdParam) {
            const empresa = data.datos.find((emp: Empresa) => emp.id === empresaIdParam);
            if (empresa) {
              setEmpresaSeleccionada(empresa);
              form.setValue("empresaId", empresaIdParam);
            }
          }
        } else {
          console.error("La respuesta de la API no es un array:", data);
          setEmpresas([]);
        }
      } catch (error) {
        console.error("Error:", error);
        // Asegurar que empresas siempre sea un array
        setEmpresas([]);
        setEmpresaSeleccionada(null);
        toast({
          title: "Error",
          description: "No se pudieron cargar las empresas",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEmpresas(false);
      }
    };

    fetchEmpresas();
  }, [empresaIdParam, form, toast]);

  async function onSubmit(data: UsuarioFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/administrador/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear el usuario");
      }

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      });

      // Redireccionar al listado de empresas o a la vista de edición de la empresa
      if (empresaIdParam) {
        router.push(`/dashboard/superadmin/empresas/${empresaIdParam}?tab=usuarios`);
      } else {
        router.push("/dashboard/superadmin");
      }
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href={empresaIdParam ? `/dashboard/superadmin/empresas/${empresaIdParam}?tab=usuarios` : "/dashboard/superadmin"}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nuevo Usuario</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Usuario</CardTitle>
          <CardDescription>
            Ingresa la información del nuevo usuario para la empresa {empresaSeleccionada?.nombre || ""}
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
                      <div className="flex justify-between items-center">
                        <FormLabel>Contraseña*</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                          onClick={() => generarContrasena()}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Generar segura
                        </Button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="pr-10"
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
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
                          <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                          <SelectItem value="GERENTE">Gerente</SelectItem>
                          <SelectItem value="EMPLEADO">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="empresaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!empresaIdParam || isLoadingEmpresas}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isLoadingEmpresas 
                                ? "Cargando empresas..." 
                                : "Selecciona una empresa"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {empresas && Array.isArray(empresas) && empresas.length > 0 
                            ? empresas.map((empresa) => (
                                <SelectItem key={empresa.id} value={empresa.id}>
                                  {empresa.nombre}
                                </SelectItem>
                              ))
                            : (
                                <SelectItem value="no-companies" disabled>
                                  {isLoadingEmpresas ? "Cargando..." : "No hay empresas disponibles"}
                                </SelectItem>
                              )
                          }
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link href={empresaIdParam ? `/dashboard/superadmin/empresas/${empresaIdParam}?tab=usuarios` : "/dashboard/superadmin"}>
                  <Button variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}