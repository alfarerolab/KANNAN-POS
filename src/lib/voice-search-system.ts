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

interface VoiceSearchCallbacks {
  onSearch: (searchTerm: string) => void;
  onProductSelect: (product: ProductoVoz) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// Definiciones para la API de Web Speech
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    POSVoiceSearchSystem: typeof POSVoiceSearchSystem;
  }
}

type StatusType = "info" | "success" | "warning" | "error" | "listening" | "searching" | "options";

export class POSVoiceSearchSystem {
  private recognition: any = null;
  private isRecording: boolean = false;
  private isListening: boolean = false;
  private searchInput: HTMLInputElement | null = null;
  private voiceButton: HTMLButtonElement | null = null;
  private statusDiv: HTMLDivElement | null = null;
  private onSearchCallback: ((searchTerm: string) => void) | null = null;
  private onProductSelectCallback: ((product: ProductoVoz) => void) | null = null;
  private currentProducts: ProductoVoz[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    // Verificar soporte del navegador
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.error("El navegador no soporta reconocimiento de voz");
      this.showUnsupportedMessage();
      return;
    }

    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.createVoiceInterface();
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configuración optimizada para búsqueda de productos
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "es-ES";
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.isListening = true;
      this.updateVoiceButton();
      this.updateStatus("🎤 Escuchando... Di el nombre del producto", "listening");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.processSearchResults(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Error en reconocimiento de voz:", event.error);
      this.handleError(event.error);
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  private setupEventListeners(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      // F3 para iniciar búsqueda por voz
      if (e.key === "F3") {
        e.preventDefault();
        this.startVoiceSearch();
      }
      // F4 para detener búsqueda por voz
      else if (e.key === "F4") {
        e.preventDefault();
        this.stopListening();
      }
      // Ctrl + Shift + V para búsqueda por voz
      else if (e.ctrlKey && e.shiftKey && e.key === "V") {
        e.preventDefault();
        this.startVoiceSearch();
      }
    });
  }

  private createVoiceInterface(): void {
    // Buscar el input de búsqueda existente con múltiples selectores
    this.searchInput = 
      document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]') ||
      document.querySelector<HTMLInputElement>('input[type="search"]') ||
      document.querySelector<HTMLInputElement>('#searchTerm') ||
      document.querySelector<HTMLInputElement>('input[id*="search"]');

    if (!this.searchInput) {
      return;
    }

    this.createVoiceButton();
    this.createStatusContainer();
  }

  private createVoiceButton(): void {
    // Buscar si ya existe un botón de voz
    this.voiceButton = document.getElementById("voiceSearchButton") as HTMLButtonElement;
    
    if (!this.voiceButton) {
      this.voiceButton = document.createElement("button");
      this.voiceButton.id = "voiceSearchButton";
      this.voiceButton.type = "button";
      this.voiceButton.className = "voice-search-btn";
      this.voiceButton.innerHTML = `
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <path d="M12 19v4"/>
          <path d="M8 23h8"/>
        </svg>
      `;
      this.voiceButton.title = "Búsqueda por voz (F3)";

      // Insertar el botón junto al input de búsqueda
      const searchContainer = this.searchInput!.parentElement;
      if (searchContainer && searchContainer.classList.contains('relative')) {
        this.voiceButton.className += " absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1 rounded cursor-pointer";
        searchContainer.appendChild(this.voiceButton);
      } else {
        // Crear contenedor si no existe
        const wrapper = document.createElement("div");
        wrapper.className = "relative";
        this.searchInput!.parentNode!.insertBefore(wrapper, this.searchInput);
        wrapper.appendChild(this.searchInput!);
        wrapper.appendChild(this.voiceButton);
        this.voiceButton.className += " absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1 rounded cursor-pointer";
      }
    }

    // Event listener para el botón
    this.voiceButton.addEventListener("click", (e: Event) => {
      e.preventDefault();
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startVoiceSearch();
      }
    });
  }

  private createStatusContainer(): void {
    this.statusDiv = document.getElementById("voiceSearchStatus") as HTMLDivElement;
    
    if (!this.statusDiv) {
      this.statusDiv = document.createElement("div");
      this.statusDiv.id = "voiceSearchStatus";
      this.statusDiv.className = "voice-search-status hidden";
      
      // Insertar después del input de búsqueda
      this.searchInput!.parentElement!.insertAdjacentElement('afterend', this.statusDiv);
    }
  }

  // Configurar callbacks desde React
  public setCallbacks(onSearch: (searchTerm: string) => void, onProductSelect: (product: ProductoVoz) => void, products: ProductoVoz[] = []): void {
    this.onSearchCallback = onSearch;
    this.onProductSelectCallback = onProductSelect;
    this.currentProducts = products;
  }

  public startVoiceSearch(): void {
    if (!this.recognition) {
      this.showUnsupportedMessage();
      return;
    }

    if (this.isRecording) {
      this.updateStatus("⚠️ Ya se está grabando", "warning");
      return;
    }

    try {
      // Limpiar búsqueda anterior
      if (this.searchInput) {
        this.searchInput.value = "";
        if (this.onSearchCallback) {
          this.onSearchCallback("");
        }
      }

      this.recognition.start();
      this.updateStatus("🎤 Iniciando búsqueda por voz...", "info");
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      this.updateStatus("❌ Error al iniciar búsqueda por voz", "error");
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }

    this.isRecording = false;
    this.isListening = false;
    this.updateVoiceButton();
    this.updateStatus("⏹️ Búsqueda por voz detenida", "info");
    
    // Ocultar status después de 3 segundos
    setTimeout(() => {
      this.hideStatus();
    }, 3000);
  }

  private processSearchResults(event: SpeechRecognitionEvent): void {
    let interimTranscript = "";
    let finalTranscript = "";

    // Procesar resultados del reconocimiento
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Mostrar transcripción temporal
    if (interimTranscript) {
      this.updateStatus(`🎤 Escuchando: "${interimTranscript}"`, "listening");
      
      // Actualizar búsqueda en tiempo real
      if (this.searchInput && this.onSearchCallback) {
        this.searchInput.value = interimTranscript.trim();
        this.onSearchCallback(interimTranscript.trim());
      }
    }

    // Procesar transcripción final
    if (finalTranscript) {
      this.processVoiceCommand(finalTranscript.trim());
    }
  }

  private processVoiceCommand(transcript: string): void {
    const cleanedTranscript = this.cleanTranscript(transcript);
    
    // Actualizar input de búsqueda
    if (this.searchInput && this.onSearchCallback) {
      this.searchInput.value = cleanedTranscript;
      this.onSearchCallback(cleanedTranscript);
    }

    this.updateStatus(`🔍 Buscando: "${cleanedTranscript}"`, "searching");

    // Esperar un momento para que se actualicen los resultados
    setTimeout(() => {
      this.handleVoiceSearch(cleanedTranscript);
    }, 500);
  }

  private cleanTranscript(text: string): string {
    let cleaned = text.toLowerCase().trim();
    
    // Reemplazos comunes para productos
    const replacements: Record<string, string> = {
      // Números
      'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
      'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
      
      // Palabras comunes
      'por': 'x', 'equis': 'x',
      'kilogramo': 'kg', 'kilo': 'kg', 'gramo': 'g', 'gramos': 'g',
      'litro': 'l', 'litros': 'l', 'mililitro': 'ml', 'mililitros': 'ml',
      'metro': 'm', 'metros': 'm', 'centímetro': 'cm', 'centímetros': 'cm',
      
      // Comandos de acción
      'agregar': '', 'añadir': '', 'buscar': '', 'busca': '', 'encuentra': '',
      'seleccionar': '', 'elegir': '', 'escoger': '',
    };

    // Aplicar reemplazos
    for (const [spoken, written] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${spoken}\\b`, 'gi');
      cleaned = cleaned.replace(regex, written);
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  private handleVoiceSearch(searchTerm: string): void {
    if (this.currentProducts && this.currentProducts.length > 0) {
      const matches = this.findProductMatches(searchTerm);
      
      if (matches.length === 1) {
        this.updateStatus(`✅ Producto encontrado: "${matches[0].nombre}"`, "success");
        this.selectProduct(matches[0]);
      } else if (matches.length > 1) {
        this.updateStatus(`📋 ${matches.length} productos encontrados. Di "seleccionar" + nombre específico`, "info");
        this.showProductOptions(matches);
      } else {
        this.updateStatus(`❌ No se encontraron productos para: "${searchTerm}"`, "warning");
      }
    } else {
      this.updateStatus(`🔍 Búsqueda realizada: "${searchTerm}"`, "info");
    }

    setTimeout(() => {
      if (!this.isListening) {
        this.hideStatus();
      }
    }, 5000);
  }

  private findProductMatches(searchTerm: string): ProductoVoz[] {
    if (!this.currentProducts || this.currentProducts.length === 0) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    
    // Búsqueda exacta primero
    let matches = this.currentProducts.filter(product => 
      product.nombre.toLowerCase().includes(term)
    );

    // Si no hay coincidencias exactas, búsqueda difusa
    if (matches.length === 0) {
      matches = this.currentProducts.filter(product => {
        const productName = product.nombre.toLowerCase();
        const words = term.split(' ');
        return words.some(word => productName.includes(word) && word.length > 2);
      });
    }

    // Ordenar por relevancia
    return matches.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a.nombre.toLowerCase(), term);
      const bScore = this.calculateRelevanceScore(b.nombre.toLowerCase(), term);
      return bScore - aScore;
    }).slice(0, 10);
  }

  private calculateRelevanceScore(productName: string, searchTerm: string): number {
    let score = 0;
    
    if (productName === searchTerm) score += 100;
    if (productName.startsWith(searchTerm)) score += 50;
    if (productName.includes(searchTerm)) score += 30;
    
    const searchWords = searchTerm.split(' ');
    searchWords.forEach(word => {
      if (word.length > 2 && productName.includes(word)) {
        score += 10;
      }
    });
    
    return score;
  }

  private selectProduct(product: ProductoVoz): void {
    if (this.onProductSelectCallback) {
      this.onProductSelectCallback(product);
      this.updateStatus(`✅ "${product.nombre}" agregado al carrito`, "success");
      
      if (this.searchInput) {
        this.searchInput.value = "";
        if (this.onSearchCallback) {
          this.onSearchCallback("");
        }
      }
    }

    setTimeout(() => {
      this.hideStatus();
    }, 3000);
  }

  private showProductOptions(matches: ProductoVoz[]): void {
    const optionsHTML = matches.slice(0, 5).map((product, index) => 
      `<div class="voice-product-option" data-product-id="${product.id}">
        ${index + 1}. ${product.nombre}
      </div>`
    ).join('');

    this.updateStatus(
      `📋 Productos encontrados (di el número o nombre específico):<br>${optionsHTML}`, 
      "options"
    );
  }

  private updateVoiceButton(): void {
    if (!this.voiceButton) return;

    if (this.isListening) {
      this.voiceButton.className = this.voiceButton.className.replace('text-muted-foreground', 'text-red-500 animate-pulse');
      this.voiceButton.title = "Detener búsqueda por voz (F4)";
    } else {
      this.voiceButton.className = this.voiceButton.className.replace('text-red-500 animate-pulse', 'text-muted-foreground');
      this.voiceButton.title = "Búsqueda por voz (F3)";
    }
  }

  private updateStatus(message: string, type: StatusType = "info"): void {
    if (!this.statusDiv) return;

    const typeClasses: Record<StatusType, string> = {
      info: "text-blue-600 bg-blue-50 border-blue-200",
      success: "text-green-600 bg-green-50 border-green-200",
      warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
      error: "text-red-600 bg-red-50 border-red-200",
      listening: "text-purple-600 bg-purple-50 border-purple-200",
      searching: "text-indigo-600 bg-indigo-50 border-indigo-200",
      options: "text-gray-600 bg-gray-50 border-gray-200"
    };

    this.statusDiv.className = `voice-search-status border rounded-lg p-3 mt-2 ${typeClasses[type]}`;
    this.statusDiv.innerHTML = message;
    this.statusDiv.classList.remove('hidden');

  }

  private hideStatus(): void {
    if (this.statusDiv) {
      this.statusDiv.classList.add('hidden');
    }
  }

  private handleError(error: string): void {
    let message = "❌ Error en búsqueda por voz: ";

    switch (error) {
      case "no-speech":
        message += "No se detectó voz. Intenta hablar más claro.";
        break;
      case "audio-capture":
        message += "No se pudo acceder al micrófono.";
        break;
      case "not-allowed":
        message += "Permiso de micrófono denegado.";
        break;
      case "network":
        message += "Error de red. Verifica tu conexión.";
        break;
      default:
        message += error;
    }

    this.updateStatus(message, "error");
    this.stopListening();
  }

  private showUnsupportedMessage(): void {
    const message = "⚠️ Tu navegador no soporta búsqueda por voz. Usa Chrome, Edge o Safari.";
    this.updateStatus(message, "warning");

    if (this.voiceButton) {
      this.voiceButton.disabled = true;
      this.voiceButton.innerHTML = "🚫";
      this.voiceButton.title = "Búsqueda por voz no soportada";
    }
  }

  public updateProducts(products: ProductoVoz[]): void {
    this.currentProducts = products;
  }

  public destroy(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
    
    if (this.voiceButton) {
      this.voiceButton.remove();
    }
    
    if (this.statusDiv) {
      this.statusDiv.remove();
    }
  }
}

// Asegurar que la clase esté disponible globalmente
if (typeof window !== 'undefined') {
  window.POSVoiceSearchSystem = POSVoiceSearchSystem;
}

// CSS para el sistema
const voiceSearchStyles = `
.voice-search-btn {
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  background: transparent;
}

.voice-search-btn:hover {
  transform: scale(1.1);
}

.voice-search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-search-status {
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: all 0.3s ease;
}

.voice-search-status.hidden {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  overflow: hidden;
  padding: 0;
  margin: 0;
  border: none;
}

.voice-product-option {
  padding: 4px 8px;
  margin: 2px 0;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.voice-product-option:hover {
  background: #f3f4f6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

// Inyectar estilos CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = voiceSearchStyles;
  document.head.appendChild(styleSheet);
}