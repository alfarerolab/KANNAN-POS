'use client'

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/hooks/use-theme"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1)) {
        console.warn('ChunkLoadError detectado. Recargando página...');
        window.location.reload();
      }
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && (e.reason.name === 'ChunkLoadError' || (e.reason.message && e.reason.message.indexOf('Loading chunk') !== -1))) {
        console.warn('Unhandled ChunkLoadError detectado. Recargando página...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  )
}
