import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from "@/hooks/use-toast";

// Tipos para el hook
interface ProductoVoz {
  id: string | number;
  nombre: string;
  precio: number;
  empresaId: string;
  categoria?: string;
  imagen?: string;
  enStock?: number;
  tipoVenta?: "UNIDAD" | "PESO" | "METRO" | "LITRO" | "TIEMPO" | "PRECIO_LIBRE";
}

interface UseVoiceSearchReturn {
  setupVoiceSearch: (
    onSearch: (searchTerm: string) => void,
    onProductSelect: (product: ProductoVoz) => void,
    products?: ProductoVoz[]
  ) => void;
  updateProducts: (products: ProductoVoz[]) => void;
  startVoiceSearch: () => void;
  stopVoiceSearch: () => void;
  isVoiceAvailable: boolean;
  isListening: boolean;
  error: string | null;
  transcript: string;
}

class POSVoiceSearchSystem {
  private recognition: any = null;
  private isRecording: boolean = false;
  private onSearchCallback: ((searchTerm: string) => void) | null = null;
  private onProductSelectCallback: ((product: ProductoVoz) => void) | null = null;
  private currentProducts: ProductoVoz[] = [];
  private isDestroyed: boolean = false;
  
  // CONFIGURACIÓN MEJORADA DE TIMEOUTS
  private speechTimeout: NodeJS.Timeout | null = null;
  private finalResultTimeout: NodeJS.Timeout | null = null;
  private maxListeningTime: number = 15000; // 15 segundos máximo
  private speechEndDelay: number = 2000;    // 2 segundos de espera tras última palabra
  private finalProcessDelay: number = 1000; // 1 segundo para procesar resultado final
  
  private stateChangeCallbacks: ((isListening: boolean) => void)[] = [];
  private errorCallbacks: ((error: string | null) => void)[] = [];
  private transcriptCallbacks: ((transcript: string) => void)[] = [];
  private lastInterimResult: string = '';

  constructor() {
    this.init();
  }

  private init(): void {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      this.notifyError("Navegador no compatible con reconocimiento de voz");
      return;
    }

    try {
      this.setupSpeechRecognition();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error inicializando sistema de voz:", error);
      this.notifyError("Error al inicializar el sistema de voz");
    }
  }

  private setupSpeechRecognition(): void {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // CONFIGURACIÓN MEJORADA PARA MEJOR RECONOCIMIENTO
      this.recognition.continuous = true;        
      this.recognition.interimResults = true;    
      this.recognition.lang = "es-ES";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        if (this.isDestroyed) return;
        this.isRecording = true;
        this.notifyStateChange(true);
        this.notifyError(null);
        this.notifyTranscript('');
        this.lastInterimResult = '';
        this.startMaxListeningTimer();
      };

      this.recognition.onresult = (event: any) => {
        if (this.isDestroyed) return;
        try {
          this.handleSpeechResult(event);
        } catch (error) {
          console.error("Error procesando resultados:", error);
          this.notifyError("Error procesando comando de voz");
        }
      };

      this.recognition.onspeechstart = () => {
        if (this.isDestroyed) return;
        this.clearAllTimeouts();
      };

      this.recognition.onspeechend = () => {
        if (this.isDestroyed) return;
        this.startSpeechEndTimer();
      };

      this.recognition.onerror = (event: any) => {
        if (this.isDestroyed) return;
        console.error("Error en reconocimiento:", event.error);
        this.handleVoiceError(event.error);
      };

      this.recognition.onend = () => {
        if (this.isDestroyed) return;
        this.handleStopListening();
      };

    } catch (error) {
      console.error("Error configurando reconocimiento:", error);
      this.notifyError("Error configurando reconocimiento de voz");
    }
  }

  // MEJORADO: Manejar resultados con mejor procesamiento
  private handleSpeechResult(event: any): void {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim();

      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript + " ";
      }
    }

    // Actualizar transcript mostrado
    const currentTranscript = (finalTranscript + interimTranscript).trim();
    if (currentTranscript) {
      this.notifyTranscript(currentTranscript);
      this.lastInterimResult = currentTranscript;
    }

    // Procesar resultado final INMEDIATAMENTE
    if (finalTranscript.trim()) {
      this.clearAllTimeouts();
      
      // PROCESAMIENTO INMEDIATO - AQUÍ ESTÁ LA CLAVE
      this.processVoiceCommandImmediate(finalTranscript.trim());
    } else if (interimTranscript.trim()) {
      // Reiniciar timer para resultados interinos
      this.startSpeechEndTimer();
    }
  }

  // NUEVA FUNCIÓN: Procesamiento inmediato sin delays
  private processVoiceCommandImmediate(transcript: string): void {
    if (this.isDestroyed || !transcript) return;

    try {
      const cleanedTranscript = this.cleanTranscript(transcript);
      const lowerTranscript = cleanedTranscript.toLowerCase();
      
      const isAddCommand = this.detectAddCommand(lowerTranscript);
      const searchTerm = this.extractSearchTerm(lowerTranscript);
      
      if (searchTerm) {
        // EJECUTAR INMEDIATAMENTE
        if (isAddCommand) {
          this.executeAddCommand(searchTerm);
        } else {
          this.executeSearchCommand(searchTerm);
        }
        
        // Detener después de ejecutar
        setTimeout(() => this.stopListening(), 1000);
      } else {
        this.notifyError("No se entendió el comando");
      }
    } catch (error) {
      console.error("Error procesando comando:", error);
      this.notifyError("Error procesando comando de voz");
    }
  }

  // NUEVA FUNCIÓN: Ejecutar búsqueda de forma directa y garantizada
  private executeSearchCommand(searchTerm: string): void {
    try {
      // MÉTODO 1: Callback directo (MÁS CONFIABLE)
      if (this.onSearchCallback) {
        // Ejecutar en el siguiente tick para asegurar que React esté listo
        setTimeout(() => {
          if (!this.isDestroyed && this.onSearchCallback) {
            this.onSearchCallback(searchTerm);
          }
        }, 0);
      }

      // MÉTODO 2: Actualizar input como respaldo
      this.updateSearchInput(searchTerm);
      
    } catch (error) {
      console.error("Error ejecutando búsqueda:", error);
    }
  }

  // NUEVA FUNCIÓN: Ejecutar comando de agregar
  private executeAddCommand(searchTerm: string): void {
    try {
      // Primero ejecutar búsqueda
      this.executeSearchCommand(searchTerm);
      
      // Luego intentar agregar el producto
      const matches = this.findProductMatches(searchTerm);
      
      if (matches.length > 0 && this.onProductSelectCallback) {
        const productToAdd = matches[0];
        setTimeout(() => {
          if (!this.isDestroyed && this.onProductSelectCallback) {
            this.onProductSelectCallback(productToAdd);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error ejecutando comando agregar:", error);
    }
  }

  // FUNCIÓN MEJORADA: Actualizar input de búsqueda
  private updateSearchInput(searchTerm: string): void {
    try {
      // Buscar input de múltiples maneras
      const possibleInputs = [
        document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]'),
        document.querySelector<HTMLInputElement>('input[placeholder*="buscar"]'),
        document.querySelector<HTMLInputElement>('input[type="search"]'),
        document.querySelector<HTMLInputElement>('input[type="text"]'),
        document.querySelector<HTMLInputElement>('#searchTerm'),
        document.querySelector<HTMLInputElement>('[data-testid*="search"]'),
        document.querySelector<HTMLInputElement>('.search-input')
      ].filter(Boolean);

      if (possibleInputs.length > 0) {
        const input = possibleInputs[0] as HTMLInputElement;
        // Crear un descriptor de propiedad nativo
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, searchTerm);
        } else {
          input.value = searchTerm;
        }

        // Disparar eventos en secuencia
        const events = [
          new Event('input', { bubbles: true }),
          new Event('change', { bubbles: true }),
          new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' })
        ];

        events.forEach(event => {
          input.dispatchEvent(event);
        });
        
        // Focus en el input
        input.focus();
      } else {
      }
    } catch (error) {
      console.error("Error actualizando input:", error);
    }
  }

  private startMaxListeningTimer(): void {
    this.clearAllTimeouts();
    this.speechTimeout = setTimeout(() => {
      if (this.isRecording && !this.isDestroyed) {
        if (this.lastInterimResult.trim()) {
          this.processVoiceCommandImmediate(this.lastInterimResult.trim());
        }
        
        setTimeout(() => this.stopListening(), 500);
      }
    }, this.maxListeningTime);
  }

  private startSpeechEndTimer(): void {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
    }
    
    this.speechTimeout = setTimeout(() => {
      if (this.isRecording && !this.isDestroyed) {
        if (this.lastInterimResult.trim()) {
          this.processVoiceCommandImmediate(this.lastInterimResult.trim());
        }
        
        setTimeout(() => this.stopListening(), 500);
      }
    }, this.speechEndDelay);
  }

  private clearAllTimeouts(): void {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    if (this.finalResultTimeout) {
      clearTimeout(this.finalResultTimeout);
      this.finalResultTimeout = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.hasEventListeners) {
      document.addEventListener("keydown", this.handleKeydown);
      this.hasEventListeners = true;
    }
  }

  private hasEventListeners = false;

  private handleKeydown = (e: KeyboardEvent) => {
    if (this.isDestroyed) return;
    
    try {
      if (e.key === "F3") {
        e.preventDefault();
        this.startVoiceSearch();
      } else if (e.key === "F4") {
        e.preventDefault();
        this.stopListening();
      }
    } catch (error) {
      console.error("Error en event listener:", error);
    }
  };

  // Funciones de utilidad (sin cambios significativos)
  private detectAddCommand(text: string): boolean {
    const addKeywords = [
      'agregar', 'añadir', 'agrega', 'añade', 'agregá',
      'agregame', 'añádeme', 'ponme', 'pon'
    ];
    
    return addKeywords.some(keyword => text.includes(keyword));
  }

  private extractSearchTerm(text: string): string {
    const commandKeywords = [
      'agregar', 'añadir', 'agrega', 'añade', 'agregá', 'agregame', 'añádeme',
      'buscar', 'busca', 'buscá', 'encontrar', 'encuentra',
      'mostrar', 'muestra', 'muéstrame', 'ver',
      'pon', 'ponme', 'el', 'la', 'los', 'las', 'un', 'una'
    ];
    
    let cleanTerm = text.toLowerCase().trim();
    
    commandKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleanTerm = cleanTerm.replace(regex, '');
    });
    
    return cleanTerm.replace(/\s+/g, ' ').trim();
  }

  private cleanTranscript(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private findProductMatches(searchTerm: string): ProductoVoz[] {
    try {
      if (!this.currentProducts || this.currentProducts.length === 0) {
        return [];
      }

      const term = searchTerm.toLowerCase();
      
      const matches = this.currentProducts.filter(product => {
        const productName = product.nombre.toLowerCase();
        return productName.includes(term);
      });

      return matches.slice(0, 5);
    } catch (error) {
      console.error("Error buscando productos:", error);
      return [];
    }
  }

  // Callbacks y gestión de estado
  public onStateChange(callback: (isListening: boolean) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  public onError(callback: (error: string | null) => void): void {
    this.errorCallbacks.push(callback);
  }

  public onTranscript(callback: (transcript: string) => void): void {
    this.transcriptCallbacks.push(callback);
  }

  private notifyStateChange(isListening: boolean): void {
    this.stateChangeCallbacks.forEach(cb => {
      try {
        cb(isListening);
      } catch (error) {
        console.error("Error en callback de estado:", error);
      }
    });
  }

  private notifyError(error: string | null): void {
    this.errorCallbacks.forEach(cb => {
      try {
        cb(error);
      } catch (error) {
        console.error("Error en callback de error:", error);
      }
    });
  }

  private notifyTranscript(transcript: string): void {
    this.transcriptCallbacks.forEach(cb => {
      try {
        cb(transcript);
      } catch (error) {
        console.error("Error en callback de transcript:", error);
      }
    });
  }

  public setCallbacks(
    onSearch: (searchTerm: string) => void, 
    onProductSelect: (product: ProductoVoz) => void, 
    products: ProductoVoz[] = []
  ): void {
    if (this.isDestroyed) return;
    
    this.onSearchCallback = onSearch;
    this.onProductSelectCallback = onProductSelect;
    this.currentProducts = products || [];
  }

  public startVoiceSearch(): void {
    if (this.isDestroyed || !this.recognition) {
      this.notifyError("Sistema de voz no disponible");
      return;
    }

    if (this.isRecording) {
      return;
    }

    try {
      this.notifyError(null);
      this.clearAllTimeouts();
      this.lastInterimResult = '';
      this.recognition.start();
    } catch (error: any) {
      console.error("Error iniciando:", error);
      this.notifyError("Error al iniciar búsqueda por voz");
    }
  }

  public stopListening(): void {
    if (this.isDestroyed) return;

    this.clearAllTimeouts();

    try {
      if (this.recognition && this.isRecording) {
        this.recognition.stop();
      }
    } catch (error) {
      console.error("Error deteniendo:", error);
    }

    this.handleStopListening();
  }

  private handleStopListening(): void {
    this.isRecording = false;
    this.notifyStateChange(false);
    this.clearAllTimeouts();
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.notifyTranscript('');
        this.lastInterimResult = '';
      }
    }, 1000);
  }

  private handleVoiceError(error: string): void {
    if (this.isDestroyed) return;

    const errorMessages: Record<string, string> = {
      "no-speech": "No se detectó voz - intenta hablar más claro",
      "audio-capture": "No se pudo acceder al micrófono",
      "not-allowed": "Permiso de micrófono denegado",
      "network": "Error de red",
      "aborted": "Búsqueda cancelada",
      "service-not-allowed": "Servicio no permitido"
    };

    const message = errorMessages[error] || `Error: ${error}`;
    
    this.notifyError(message);
    this.stopListening();
  }

  public updateProducts(products: ProductoVoz[]): void {
    if (this.isDestroyed) return;
    
    this.currentProducts = Array.isArray(products) ? products : [];
    if (this.currentProducts.length > 0) {
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.clearAllTimeouts();

    try {
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      
      if (this.hasEventListeners) {
        document.removeEventListener("keydown", this.handleKeydown);
        this.hasEventListeners = false;
      }

      this.onSearchCallback = null;
      this.onProductSelectCallback = null;
      this.currentProducts = [];
      this.stateChangeCallbacks = [];
      this.errorCallbacks = [];
      this.transcriptCallbacks = [];
    } catch (error) {
      console.error("Error en destructor:", error);
    }
  }
}

// Hook principal sin cambios
export function useVoiceSearch(options: { lang: string; continuous: boolean; }): UseVoiceSearchReturn {
  const voiceSystemRef = useRef<POSVoiceSearchSystem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeVoiceSystem = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (isMounted && !voiceSystemRef.current) {
          voiceSystemRef.current = new POSVoiceSearchSystem();
          
          voiceSystemRef.current.onStateChange((listening) => {
            if (isMounted) setIsListening(listening);
          });

          voiceSystemRef.current.onError((err) => {
            if (isMounted) setError(err);
          });

          voiceSystemRef.current.onTranscript((text) => {
            if (isMounted) setTranscript(text);
          });
        }
      } catch (error) {
        console.error('Error inicializando sistema de voz:', error);
        if (isMounted) setError('Error inicializando sistema de voz');
      }
    };

    initializeVoiceSystem();

    return () => {
      isMounted = false;
      if (voiceSystemRef.current) {
        try {
          voiceSystemRef.current.destroy();
        } catch (error) {
          console.error('Error destruyendo sistema:', error);
        } finally {
          voiceSystemRef.current = null;
        }
      }
    };
  }, []);

  const setupVoiceSearch = useCallback((
    onSearch: (searchTerm: string) => void,
    onProductSelect: (product: ProductoVoz) => void,
    products: ProductoVoz[] = []
  ) => {
    if (!voiceSystemRef.current) return;

    try {
      voiceSystemRef.current.setCallbacks(onSearch, onProductSelect, products);
    } catch (error) {
      console.error('Error configurando callbacks:', error);
      setError('Error configurando búsqueda por voz');
    }
  }, []);

  const updateProducts = useCallback((products: ProductoVoz[]) => {
    if (!voiceSystemRef.current) return;

    try {
      voiceSystemRef.current.updateProducts(products);
    } catch (error) {
      console.error('Error actualizando productos:', error);
    }
  }, []);

  const startVoiceSearch = useCallback(() => {
    if (!voiceSystemRef.current) {
      setError("Sistema de voz no disponible");
      return;
    }

    try {
      setError(null);
      setTranscript('');
      voiceSystemRef.current.startVoiceSearch();
    } catch (error) {
      console.error('Error iniciando búsqueda por voz:', error);
      setError('Error iniciando búsqueda por voz');
    }
  }, []);

  const stopVoiceSearch = useCallback(() => {
    if (!voiceSystemRef.current) return;

    try {
      voiceSystemRef.current.stopListening();
    } catch (error) {
      console.error('Error deteniendo búsqueda por voz:', error);
    }
  }, []);

  const isVoiceAvailable = Boolean(
    typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );

  return {
    setupVoiceSearch,
    updateProducts,
    startVoiceSearch,
    stopVoiceSearch,
    isVoiceAvailable,
    isListening,
    error,
    transcript
  };
}