"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CuentaInactiva() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [empresa, setEmpresa] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [reactivando, setReactivando] = useState(false);

  // Si es superadmin, redirigir al dashboard
  useEffect(() => {
    if (session?.user?.role === "SUPERADMIN") {
      router.push("/dashboard");
    }
  }, [session?.user?.role, router]);

  // ─────────────────────────────────────────────────────────────
  // Carga inicial: SOLO muestra info, NO redirige nunca.
  // La redirección al dashboard es únicamente manual (botón).
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.empresaId) return;

    const cargarInfoEmpresa = async () => {
      setCargando(true);
      try {
        const res = await fetch("/api/empresa/estado");
        if (res.ok) {
          const data = await res.json();

          let sinSuscripcion = true;
          if (data.fechaVencimiento) {
            const diasRestantes = Math.ceil(
              (new Date(data.fechaVencimiento).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );
            sinSuscripcion = diasRestantes <= 0;
          }

          setEmpresa({
            ...data,
            nombre:
              data.empresa?.nombre ||
              session?.user?.nombre ||
              "Mi Empresa",
            notaDesactivacion:
              sinSuscripcion && data.activa
                ? "El tiempo de uso ha expirado"
                : data.notaDesactivacion,
          });
        }
      } catch {
        setEmpresa({
          nombre: session?.user?.nombre || "Empresa no disponible",
          notaDesactivacion: "Cuenta suspendida - contacte al administrador",
        });
      } finally {
        setCargando(false);
      }
    };

    cargarInfoEmpresa();
    // Solo al montar — no se re-ejecuta si la sesión cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.empresaId]);

  // ─────────────────────────────────────────────────────────────
  // Verificación MANUAL — único punto donde se puede redirigir
  // al dashboard. El usuario debe pulsar el botón.
  // ─────────────────────────────────────────────────────────────
  const verificarEstadoActual = async () => {
    if (!session?.user?.empresaId) return;
    setVerificando(true);

    try {
      const res = await fetch("/api/empresa/estado");
      if (!res.ok) throw new Error("Error al consultar el estado");

      const data = await res.json();

      let sinSuscripcion = true;
      if (data.fechaVencimiento) {
        const diasRestantes = Math.ceil(
          (new Date(data.fechaVencimiento).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        );
        sinSuscripcion = diasRestantes <= 0;
      }

      // Cuenta ya activa → actualizar token y navegar
      if (data.activa && (!sinSuscripcion || data.suscripcionActiva === true)) {
        setVerificando(false);
        setReactivando(true);

        toast({
          title: "¡Cuenta Reactivada!",
          description: "Actualizando tu sesión, un momento por favor...",
        });

        // Limpiar empresaInactiva del JWT
        await updateSession();

        // Esperar que la cookie nueva se propague antes de navegar
        await new Promise((res) => setTimeout(res, 1000));

        router.push("/dashboard");
        return;
      }

      // Sigue inactiva — actualizar info en pantalla
      setEmpresa({
        ...data,
        nombre:
          data.empresa?.nombre || session?.user?.nombre || "Mi Empresa",
        notaDesactivacion:
          sinSuscripcion && data.activa
            ? "El tiempo de uso ha expirado"
            : data.notaDesactivacion,
      });

      toast({
        title: "Cuenta aún inactiva",
        description: "La cuenta sigue sin acceso. Contacta al administrador.",
        variant: "destructive",
      });
    } catch {
      toast({
        title: "Error al verificar",
        description: "No se pudo comprobar el estado. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setVerificando(false);
    }
  };

  const handleCerrarSesion = async () => {
    await signOut({ callbackUrl: "/iniciar-sesion" });
  };

  // Pantalla de transición mientras se actualiza el token
  if (reactivando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[450px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-600">
              ¡Cuenta Reactivada!
            </CardTitle>
            <CardDescription>
              Actualizando tu sesión, espera un momento...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <RefreshCw className="h-10 w-10 animate-spin text-green-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[450px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            Cuenta Inactiva
          </CardTitle>
          <CardDescription>
            Su cuenta ha sido desactivada temporalmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cargando ? (
            <p className="text-center">Cargando información...</p>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="font-medium">Información de la cuenta:</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p>
                    <span className="font-medium">Empresa:</span>{" "}
                    {empresa?.nombre || "No disponible"}
                  </p>
                  {empresa?.notaDesactivacion && (
                    <p className="mt-2 text-red-600 font-semibold">
                      <span className="font-medium">Motivo:</span>{" "}
                      {empresa.notaDesactivacion}
                    </p>
                  )}
                  {empresa?.fechaVencimiento && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Vencimiento:</span>{" "}
                      {new Date(empresa.fechaVencimiento).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h3 className="font-medium text-amber-800">
                  ¿Por qué está inactiva mi cuenta?
                </h3>
                <ul className="list-disc list-inside mt-2 text-amber-700 text-sm">
                  <li>Falta de pago de la suscripción</li>
                  <li>La suscripción ha expirado</li>
                  <li>La cuenta ha sido suspendida por el administrador</li>
                </ul>
              </div>
            </>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              Si ya realizaste el pago o el administrador ya reactivó tu cuenta,
              haz clic en el botón de abajo para verificar.
            </p>
          </div>

          <Button
            onClick={verificarEstadoActual}
            disabled={verificando || cargando}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${verificando ? "animate-spin" : ""}`}
            />
            {verificando ? "Verificando..." : "Verificar Estado Ahora"}
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={handleCerrarSesion}
            className="w-full"
            variant="outline"
          >
            Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}