import { Store, ShoppingCart, BarChart3, TrendingUp } from "lucide-react";
import { FormularioLogin } from "./formulario-login";

export default function PaginaIniciarSesion() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900 override-force-light">
      {/* Container principal con grid */}
      <div className="w-full grid lg:grid-cols-2 min-h-screen">

        {/* Panel izquierdo - Información del sistema con imagen de fondo */}
        <div className="relative hidden lg:flex items-center justify-center p-8">
          {/* Imagen de fondo */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            }}
          />
          
          {/* Overlay con gradiente para mejorar contraste — usando paleta de marca */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/65 via-blue-900/60 to-purple-900/70" />
          
          {/* Contenido sobre la imagen */}
          <div className="relative z-10 space-y-8 max-w-lg">
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 animate-scale-in">
                  <Store className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Sistema POS
                  </h1>
                  <p className="text-indigo-100">Gestión integral para tu negocio</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 animate-fade-in-up stagger-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Punto de Venta Inteligente</h3>
                  <p className="text-sm text-indigo-100">
                    Interfaz moderna y fácil de usar para ventas rápidas y eficientes
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 animate-fade-in-up stagger-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Reportes en Tiempo Real</h3>
                  <p className="text-sm text-indigo-100">
                    Analiza el rendimiento de tu negocio con reportes detallados
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 animate-fade-in-up stagger-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Gestión de Inventario</h3>
                  <p className="text-sm text-indigo-100">
                    Control completo de stock, productos y proveedores
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 animate-fade-in-up stagger-5">
              <p className="text-sm text-indigo-50 italic leading-relaxed">
                "Simplifica la gestión de tu negocio con herramientas diseñadas
                para maximizar tu productividad y crecimiento."
              </p> 
            </div>
          </div>
        </div>

        {/* Panel derecho - Formulario de login */}
        <div className="flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-white to-indigo-50/50">
          <div className="w-full max-w-md animate-slide-up">
            <div className="bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-gray-100">
              {/* Header del formulario */}
              <div className="text-center space-y-3 mb-8">
                {/* Logo móvil */}
                <div className="lg:hidden flex justify-center mb-6">
                  <div className="p-4 brand-gradient-br rounded-xl shadow-lg animate-scale-in">
                    <Store className="h-8 w-8 text-white" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold brand-gradient-text">
                  Bienvenido de vuelta
                </h2>
                <p className="text-gray-600">
                  Ingresa tus credenciales para acceder al sistema
                </p>
              </div>

              {/* Formulario */}
              <FormularioLogin />
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-sm text-gray-500">
              <p>Sistema de Gestión Empresarial © {new Date().getFullYear()}</p>
              <p className="mt-1">Desarrollado con tecnología moderna y segura</p>
            </div>
          </div>
        </div>
      </div>

      {/* Versión móvil - fondo simple */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50 -z-10" />
    </div>
  );
}