"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/iniciar-sesion");
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50">
      <div className="text-center">
        {/* Logo con animación */}
        <div className="animate-scale-in mb-6">
          <div className="inline-flex p-5 rounded-2xl brand-gradient-br shadow-xl animate-glow-pulse">
            <Store className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Nombre del producto */}
        <h1 className="text-3xl font-bold brand-gradient-text animate-fade-in-up stagger-2 mb-2">
          Sistema POS
        </h1>
        <p className="text-gray-500 animate-fade-in-up stagger-3 mb-8">
          Gestión integral para tu negocio
        </p>

        {/* Spinner elegante */}
        <div className="animate-fade-in stagger-4">
          <div className="relative inline-flex">
            <div className="h-10 w-10 rounded-full border-[3px] border-indigo-100"></div>
            <div className="absolute inset-0 h-10 w-10 rounded-full border-[3px] border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-400 animate-fade-in stagger-5">
          Cargando...
        </p>
      </div>
    </div>
  );
}