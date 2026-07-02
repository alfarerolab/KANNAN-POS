// hooks/useBarcodeScanner.ts
import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeThreshold?: number;
  enabled?: boolean;
}

/**
 * Hook para detectar escaneo automático de códigos de barras
 * Diferencia entre escribir manualmente y escanear por la velocidad
 */
export function useBarcodeScanner({
  onScan,
  minLength = 8,
  timeThreshold = 100,
  enabled = true
}: BarcodeScannerOptions) {
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetBuffer = useCallback(() => {
    barcodeBuffer.current = '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;

      // Ignorar teclas modificadoras
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Ignorar si está escribiendo en inputs (excepto búsqueda)
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputField) {
        // Solo procesar en campos de búsqueda
        const isSearchField = 
          target.id?.includes('search') || 
          target.id?.includes('busqueda') ||
          target.className?.includes('barcode');
        
        if (!isSearchField) {
          return;
        }
      }

      // Si es Enter, procesar el código acumulado
      if (event.key === 'Enter') {
        if (barcodeBuffer.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          
          const codigo = barcodeBuffer.current;
          barcodeBuffer.current = '';
          onScan(codigo);
        }
        return;
      }

      // Resetear buffer si pasó mucho tiempo
      if (timeDiff > timeThreshold && barcodeBuffer.current.length > 0) {
        barcodeBuffer.current = '';
      }

      // Acumular solo caracteres válidos
      if (/^[0-9a-zA-Z\-_]$/.test(event.key)) {
        barcodeBuffer.current += event.key;
        lastKeyTime.current = currentTime;

        // Limpiar timeout anterior
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Auto-procesar después de un breve período de inactividad
        timeoutRef.current = setTimeout(() => {
          if (barcodeBuffer.current.length >= minLength) {
            const codigo = barcodeBuffer.current;
            barcodeBuffer.current = '';
            onScan(codigo);
          } else {
            barcodeBuffer.current = '';
          }
        }, timeThreshold * 2);
      }
    };

    // Agregar listener global con capture
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, minLength, timeThreshold, onScan]);

  return { resetBuffer };
}