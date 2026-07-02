export interface MetaVenta {
  id: string;
  empresaId: string;
  periodo: 'diaria' | 'semanal' | 'mensual' | 'anual';
  tipo: 'ingresos' | 'cantidad_ventas' | 'clientes_nuevos' | 'ticket_promedio';
  objetivo: number;
  actual: number;
  progreso: number;
  fechaInicio: Date;
  fechaFin: Date;
  activa: boolean;
  descripcion?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearMetaRequest {
  periodo: 'diaria' | 'semanal' | 'mensual' | 'anual';
  tipo: 'ingresos' | 'cantidad_ventas' | 'clientes_nuevos' | 'ticket_promedio';
  objetivo: number;
  descripcion?: string;
  fechaInicio?: Date;
}