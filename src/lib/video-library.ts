// Biblioteca de videos educativos para el sistema POS
export interface VideoTutorial {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  duracion: string;
  categoria: 'POS' | 'INVENTARIO' | 'REPORTES' | 'CONFIGURACION' | 'GENERAL';
  nivel: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
  thumbnail?: string;
  tags: string[];
  orden?: number;
}

export const VIDEO_LIBRARY: VideoTutorial[] = [
  // POS - Punto de Venta
  {
    id: 'pos-basico-introduccion',
    titulo: 'Introducción al Sistema POS - Conceptos Básicos',
    descripcion: 'Aprende los conceptos fundamentales de un sistema de punto de venta, sus componentes principales y cómo puede beneficiar a tu negocio.',
    url: 'https://www.youtube.com/watch?v=BW5Or4pmBj4',
    duracion: '12:45',
    categoria: 'POS',
    nivel: 'BASICO',
    tags: ['introducción', 'conceptos', 'básico', 'negocio'],
    orden: 1
  },
  {
    id: 'pos-realizar-venta',
    titulo: 'Cómo Realizar una Venta Paso a Paso',
    descripcion: 'Tutorial completo sobre cómo procesar una venta desde el inicio hasta el cobro, incluyendo manejo de productos, descuentos y métodos de pago.',
    url: 'https://www.youtube.com/watch?v=Ri4XnyBj2y0',
    duracion: '8:30',
    categoria: 'POS',
    nivel: 'BASICO',
    tags: ['venta', 'proceso', 'cobro', 'productos'],
    orden: 2
  },
  {
    id: 'pos-hardware-configuracion',
    titulo: 'Configuración de Hardware para POS',
    descripcion: 'Guía para configurar impresoras térmicas, cajones de dinero, lectores de códigos de barras y otros dispositivos del punto de venta.',
    url: 'https://www.youtube.com/watch?v=RD0WhPjrc8s',
    duracion: '15:20',
    categoria: 'POS',
    nivel: 'INTERMEDIO',
    tags: ['hardware', 'impresora', 'configuración', 'dispositivos'],
    orden: 3
  },

  // INVENTARIO
  {
    id: 'inventario-gestion-productos',
    titulo: 'Gestión de Productos e Inventario',
    descripcion: 'Aprende a agregar productos, gestionar stock, configurar alertas de inventario bajo y manejar variantes de productos.',
    url: 'https://www.youtube.com/watch?v=m-gj-4mT2E8',
    duracion: '18:45',
    categoria: 'INVENTARIO',
    nivel: 'BASICO',
    tags: ['productos', 'stock', 'alertas', 'variantes'],
    orden: 1
  },
  {
    id: 'inventario-movimientos',
    titulo: 'Control de Movimientos de Inventario',
    descripcion: 'Gestiona entradas, salidas, ajustes de inventario y aprende a realizar conteos físicos efectivos.',
    url: 'https://www.youtube.com/watch?v=example2',
    duracion: '14:30',
    categoria: 'INVENTARIO',
    nivel: 'INTERMEDIO',
    tags: ['movimientos', 'entradas', 'salidas', 'conteos'],
    orden: 2
  },

  // REPORTES
  {
    id: 'reportes-ventas-basicos',
    titulo: 'Reportes de Ventas Esenciales',
    descripcion: 'Descubre los reportes más importantes para analizar el desempeño de tu negocio: ventas diarias, productos más vendidos y tendencias.',
    url: 'https://www.youtube.com/watch?v=FJKCbDOnpb0',
    duracion: '22:15',
    categoria: 'REPORTES',
    nivel: 'BASICO',
    tags: ['reportes', 'ventas', 'análisis', 'tendencias'],
    orden: 1
  },
  {
    id: 'reportes-inventario-avanzados',
    titulo: 'Reportes Avanzados de Inventario',
    descripcion: 'Análisis profundo del inventario: rotación de productos, valorización, productos con bajo movimiento y optimización de stock.',
    url: 'https://www.youtube.com/watch?v=example3',
    duracion: '19:40',
    categoria: 'REPORTES',
    nivel: 'AVANZADO',
    tags: ['reportes', 'inventario', 'rotación', 'valorización'],
    orden: 2
  },

  // CONFIGURACIÓN
  {
    id: 'configuracion-inicial-negocio',
    titulo: 'Configuración Inicial del Sistema',
    descripcion: 'Configura tu sistema por primera vez: datos de la empresa, tipos de negocio, usuarios y permisos básicos.',
    url: 'https://www.youtube.com/watch?v=example4',
    duracion: '16:25',
    categoria: 'CONFIGURACION',
    nivel: 'BASICO',
    tags: ['configuración', 'empresa', 'usuarios', 'permisos'],
    orden: 1
  },
  {
    id: 'configuracion-avanzada-personalizacion',
    titulo: 'Personalización Avanzada del Sistema',
    descripcion: 'Configuraciones avanzadas: temas, formatos de tickets, integración con sistemas externos y automatizaciones.',
    url: 'https://www.youtube.com/watch?v=example5',
    duracion: '25:10',
    categoria: 'CONFIGURACION',
    nivel: 'AVANZADO',
    tags: ['personalización', 'temas', 'tickets', 'integración'],
    orden: 2
  },

  // GENERAL
  {
    id: 'general-mejores-practicas',
    titulo: 'Mejores Prácticas para el Uso del POS',
    descripcion: 'Consejos y trucos para maximizar la eficiencia en el uso diario del sistema POS y evitar errores comunes.',
    url: 'https://www.youtube.com/watch?v=example6',
    duracion: '13:50',
    categoria: 'GENERAL',
    nivel: 'INTERMEDIO',
    tags: ['mejores prácticas', 'eficiencia', 'consejos', 'errores'],
    orden: 1
  },
  {
    id: 'general-seguridad-respaldos',
    titulo: 'Seguridad y Respaldos del Sistema',
    descripcion: 'Aprende a mantener tu sistema seguro, realizar respaldos periódicos y recuperar información en caso de emergencia.',
    url: 'https://www.youtube.com/watch?v=example7',
    duracion: '20:35',
    categoria: 'GENERAL',
    nivel: 'AVANZADO',
    tags: ['seguridad', 'respaldos', 'recuperación', 'emergencia'],
    orden: 2
  }
];

// Funciones auxiliares para trabajar con la biblioteca de videos
export const getVideosByCategory = (categoria: VideoTutorial['categoria']) => {
  return VIDEO_LIBRARY.filter(video => video.categoria === categoria)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
};

export const getVideosByLevel = (nivel: VideoTutorial['nivel']) => {
  return VIDEO_LIBRARY.filter(video => video.nivel === nivel);
};

export const getVideoById = (id: string) => {
  return VIDEO_LIBRARY.find(video => video.id === id);
};

export const searchVideos = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return VIDEO_LIBRARY.filter(video =>
    video.titulo.toLowerCase().includes(lowercaseQuery) ||
    video.descripcion.toLowerCase().includes(lowercaseQuery) ||
    video.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getRecommendedVideos = (categoria?: VideoTutorial['categoria'], nivel: VideoTutorial['nivel'] = 'BASICO') => {
  let videos = VIDEO_LIBRARY;

  if (categoria) {
    videos = videos.filter(video => video.categoria === categoria);
  }

  // Priorizar videos básicos para principiantes
  return videos
    .filter(video => video.nivel === nivel)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .slice(0, 3);
};

// Configuración de categorías con metadatos
export const CATEGORY_METADATA = {
  POS: {
    name: 'Punto de Venta',
    description: 'Aprende a usar el sistema POS para procesar ventas eficientemente',
    icon: '🛒',
    color: 'from-green-500 to-emerald-500'
  },
  INVENTARIO: {
    name: 'Inventario',
    description: 'Gestiona tu stock, productos y movimientos de inventario',
    icon: '📦',
    color: 'from-blue-500 to-cyan-500'
  },
  REPORTES: {
    name: 'Reportes',
    description: 'Analiza el desempeño de tu negocio con reportes detallados',
    icon: '📊',
    color: 'from-purple-500 to-pink-500'
  },
  CONFIGURACION: {
    name: 'Configuración',
    description: 'Personaliza y configura tu sistema según tus necesidades',
    icon: '⚙️',
    color: 'from-orange-500 to-red-500'
  },
  GENERAL: {
    name: 'General',
    description: 'Consejos generales y mejores prácticas del sistema',
    icon: '🎯',
    color: 'from-gray-500 to-slate-500'
  }
};
