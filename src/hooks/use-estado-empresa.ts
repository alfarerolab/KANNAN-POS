"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const INTERVALO_MS = 30_000; // 30 segundos

export function useEstadoEmpresa() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const redirigidoRef = useRef(false);

  // Contador de checks consecutivos con cuenta inactiva
  // Solo redirigimos si 2 checks seguidos confirman inactividad
  // Esto evita falsos positivos por errores de red o timeouts
  const checksFallidosRef = useRef(0);

  useEffect(() => {
    if (!session?.user?.empresaId || session.user.role === "SUPERADMIN") return;
    if (pathname === "/cuenta-inactiva") return;

    redirigidoRef.current = false;
    checksFallidosRef.current = 0;

    const verificar = async () => {
      if (redirigidoRef.current) return;
      if (window.location.pathname === "/cuenta-inactiva") return;

      try {
        const res = await fetch("/api/empresa/estado");

        // Si la respuesta no es ok (error de red, 500, etc.) 
        // resetear contador y no hacer nada — no es inactividad real
        if (!res.ok) {
          checksFallidosRef.current = 0;
          return;
        }

        const data = await res.json();

        let sinSuscripcion = true;
        if (data.fechaVencimiento) {
          const dias = Math.ceil(
            (new Date(data.fechaVencimiento).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          sinSuscripcion = dias <= 0;
        }

        const cuentaInactiva = !data.activa || sinSuscripcion;

        if (cuentaInactiva) {
          checksFallidosRef.current += 1;

          // Solo redirigir si 2 checks consecutivos confirman inactividad
          if (checksFallidosRef.current >= 2) {
            redirigidoRef.current = true;
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            await updateSession();
            router.push("/cuenta-inactiva");
          }
        } else {
          // Cuenta activa — resetear contador
          checksFallidosRef.current = 0;
        }
      } catch {
        // Error de red — resetear contador, no redirigir
        checksFallidosRef.current = 0;
      }
    };

    verificar();
    intervaloRef.current = setInterval(verificar, INTERVALO_MS);

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [session?.user?.empresaId, session?.user?.role, pathname]);
}