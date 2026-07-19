'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root error boundary caught error:', error)
    
    // Detectar si es un error de carga de fragmentos (Chunks)
    const errorMsg = error?.message || '';
    if (
      errorMsg.includes('ChunkLoadError') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('dynamically imported module')
    ) {
      console.warn('ChunkLoadError detectado en boundary. Forzando recarga de página...');
      window.location.reload();
    }
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
      <div className="max-w-md space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            Actualización del Sistema
          </h2>
          <p className="text-sm text-slate-400">
            Se ha detectado una actualización del sistema. Presione el botón de abajo para recargar y sincronizar la última versión.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg"
        >
          Recargar y Sincronizar
        </button>
      </div>
    </div>
  )
}
