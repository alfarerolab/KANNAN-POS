"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
import { useAuth } from "@/hooks/use-auth";

// Esquema de validación para el formulario de inicio de sesión
const esquemaLogin = z.object({
  email: z
    .string()
    .min(1, { message: "El email es requerido" })
    .email({ message: "Email inválido" }),
  contrasena: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export function FormularioLogin() {
  const { iniciarSesion, isLoading } = useAuth();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Inicializar el formulario con React Hook Form y Zod
  const form = useForm<z.infer<typeof esquemaLogin>>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: {
      email: "",
      contrasena: "",
    },
  });

  // Función para manejar el envío del formulario
  async function onSubmit(values: z.infer<typeof esquemaLogin>) {
    const datosLogin = {
      email: values.email,
      contrasena: values.contrasena,
    };

    await iniciarSesion(datosLogin);
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="usuario@empresa.com"
                    type="email"
                    className="bg-white text-slate-900 border-gray-300 focus:border-indigo-500 placeholder:text-gray-400"
                    {...field}
                  />
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
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                      <Input
                      placeholder="******"
                      type={mostrarContrasena ? "text" : "password"}
                      {...field}
                      className="pr-10 bg-white text-slate-900 border-gray-300 focus:border-indigo-500 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarContrasena ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full text-white bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={isLoading}>
            {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          ¿No tiene acceso? Contacte al administrador del sistema para obtener
          sus credenciales.
        </p>
        <p className="mt-2">
          Sistema de Gestión Empresarial © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
