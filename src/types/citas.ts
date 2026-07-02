export interface EstadoCita {
  label: string;
  color: string;
  darkColor: string;
  variant: "default" | "secondary" | "destructive";
  nextAction?: {
    state: string;
    label: string;
    color: string;
    special?: boolean;
  };
}

export interface Cita {
  id: string;
  fechaHora: string;
  duracion: number;
  estado: keyof typeof ESTADOS_CITAS;
  notas?: string;
  cliente: {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
  };
  servicio: {
    id: string;
    nombre: string;
    precio: number;
    duracion: number;
    color?: string;
    categoria?: string;
  };
  empleado?: {
    id: string;
    nombre: string;
    email?: string;
    imagen?: string;
  };
  venta?: {
    id: string;
    total: number;
    estado: string;
  };
  empresaId?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  color?: string;
  categoria?: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  email?: string;
  imagen?: string;
  rol: string;
}

export interface FormCita {
  fechaHora: string;
  clienteId: string;
  servicioId: string;
  empleadoId?: string;
  notas?: string;
}

export interface ClienteFormValues {
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export const VALOR_SIN_EMPLEADO = "SIN_EMPLEADO";
export const VALOR_NUEVO_CLIENTE = "NUEVO_CLIENTE";

export const ESTADOS_CITAS: Record<string, EstadoCita> = {
  PROGRAMADA: { 
    label: "Programada", 
    color: "bg-blue-50 text-blue-700 border-blue-200", 
    darkColor: "dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    variant: "default" as const,
    nextAction: { state: 'CONFIRMADA', label: 'Confirmar', color: 'bg-blue-600 hover:bg-blue-700' }
  },
  CONFIRMADA: { 
    label: "Confirmada", 
    color: "bg-green-50 text-green-700 border-green-200", 
    darkColor: "dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    variant: "default" as const,
    nextAction: { state: 'EN_PROCESO', label: 'Iniciar', color: 'bg-amber-600 hover:bg-amber-700' }
  },
  EN_PROCESO: { 
    label: "En Proceso", 
    color: "bg-amber-50 text-amber-700 border-amber-200", 
    darkColor: "dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    variant: "secondary" as const,
    nextAction: { state: 'COMPLETADA', label: 'Completar', color: 'bg-emerald-600 hover:bg-emerald-700' }
  },
  COMPLETADA: { 
    label: "Completada", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    darkColor: "dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    variant: "default" as const,
    nextAction: { 
      state: 'COBRAR', 
      label: 'Cobrar Servicio', 
      color: 'bg-green-600 hover:bg-green-700', 
      special: true 
    }
  },
  FACTURADA: { 
    label: "Facturada", 
    color: "bg-purple-50 text-purple-700 border-purple-200", 
    darkColor: "dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    variant: "default" as const
  },
  CANCELADA: { 
    label: "Cancelada", 
    color: "bg-red-50 text-red-700 border-red-200", 
    darkColor: "dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    variant: "destructive" as const
  },
  NO_ASISTIO: { 
    label: "No Asistió", 
    color: "bg-gray-50 text-gray-700 border-gray-200", 
    darkColor: "dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    variant: "secondary" as const
  },
};