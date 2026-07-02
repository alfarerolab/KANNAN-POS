"use client";

import { useState, useEffect, useCallback } from 'react';

interface OfflineSale {
  id: string;
  timestamp: number;
  data: any;
  synced: boolean;
}

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Detectar estado de conexión
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manejar instalación de PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Cargar ventas offline al inicializar
  useEffect(() => {
    loadOfflineSales();
  }, []);

  // Registrar service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          // Escuchar actualizaciones del SW
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nueva versión disponible
                  if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Funciones para manejar IndexedDB
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('POS-OfflineDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
      };
    });
  }, []);

  // Guardar venta offline
  const saveOfflineSale = useCallback(async (saleData: any) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');

      const offlineSale: OfflineSale = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        data: saleData,
        synced: false
      };

      await store.add(offlineSale);
      await loadOfflineSales();

      return offlineSale.id;
    } catch (error) {
      console.error('Error saving offline sale:', error);
      throw error;
    }
  }, [openDB]);

  // Cargar ventas offline
  const loadOfflineSales = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['sales'], 'readonly');
      const store = transaction.objectStore('sales');

      return new Promise<void>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          setOfflineSales(request.result.filter((sale: OfflineSale) => !sale.synced));
          resolve();
        };
      });
    } catch (error) {
      console.error('Error loading offline sales:', error);
    }
  }, [openDB]);

  // Sincronizar ventas offline
  const syncOfflineSales = useCallback(async () => {
    if (!isOnline || syncInProgress || offlineSales.length === 0) {
      return;
    }

    setSyncInProgress(true);

    try {
      const db = await openDB();
      const transaction = db.transaction(['sales'], 'readwrite');
      const store = transaction.objectStore('sales');

      for (const sale of offlineSales) {
        try {
          const response = await fetch('/api/pos/ventas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sale.data)
          });

          if (response.ok) {
            // Marcar como sincronizada
            const updatedSale = { ...sale, synced: true };
            await store.put(updatedSale);
          }
        } catch (error) {
          console.error('Error syncing sale:', sale.id, error);
        }
      }

      await loadOfflineSales();
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline, syncInProgress, offlineSales, openDB]);

  // Cachear productos para uso offline
  const cacheProductsForOffline = useCallback(async (products: any[]) => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_PRODUCTOS',
          productos: products
        });
      }

      // También guardar en IndexedDB
      const db = await openDB();
      const transaction = db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');

      for (const product of products) {
        await store.put(product);
      }

    } catch (error) {
      console.error('Error caching products:', error);
    }
  }, [openDB]);

  // Obtener productos desde cache offline
  const getOfflineProducts = useCallback(async (): Promise<any[]> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');

      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });
    } catch (error) {
      console.error('Error getting offline products:', error);
      return [];
    }
  }, [openDB]);

  // Instalar PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Verificar si está instalado como PWA
  const isPWAInstalled = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  return {
    isOnline,
    isInstallable,
    isPWAInstalled: isPWAInstalled(),
    offlineSales,
    syncInProgress,
    saveOfflineSale,
    syncOfflineSales,
    cacheProductsForOffline,
    getOfflineProducts,
    installPWA,
    loadOfflineSales
  };
};
