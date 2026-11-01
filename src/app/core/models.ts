/** Modelos que reflejan exactamente lo que responde el backend del bazar. */

export type NivelStock = 'verde' | 'amarillo' | 'rojo';
export type MetodoPago = 'Efectivo' | 'Yape' | 'Plin'| 'Fiado' | 'Tarjeta';
export type MetodoCobro = 'Efectivo' | 'Yape' | 'Plin'|'Tarjeta';
export type EstadoProducto = 'Disponible' | 'Agotado' | 'Inactivo';
export type Rol = 'tendera' | 'admin';

export interface Presentacion {
  id_presentacion: number;
  nombre: string;
  unidades: number;
}

export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  codigo_barras: string | null;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  estado: EstadoProducto;
  es_favorito: boolean;
  imagen_url: string | null;
  nivel_stock: NivelStock;
  origen?: 'fijado' | 'mas_vendido';
  presentaciones?: Presentacion[];
}

export interface ProductoForm {
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  stock_actual?: number;
  stock_minimo: number;
  unidad_medida: string;
  codigo_barras: string | null;
  es_favorito: boolean;
  imagen_url: string | null;
}

export interface MovimientoStock {
  id_movimiento: number;
  tipo: 'INICIAL' | 'VENTA' | 'ANULACION' | 'COMPRA' | 'AJUSTE';
  cantidad: number;
  stock_resultante: number;
  id_referencia: number | null;
  motivo: string | null;
  fecha_hora: string;
}

export interface Cliente {
  id_cliente: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  limite_credito: number;
  saldo_deudor: number;
  fecha_registro: string;
}

export interface MovimientoFiado {
  id_movimiento: number;
  id_venta: number | null;
  tipo_movimiento: 'DEUDA' | 'PAGO';
  monto: number;
  metodo_pago: MetodoCobro | null;
  saldo_anterior: number;
  saldo_nuevo: number;
  fecha_hora: string;
  observacion: string | null;
}

export interface ClienteDetalle extends Cliente {
  movimientos: MovimientoFiado[];
}

export interface PagoResultado {
  id_cliente: number;
  nombre: string;
  monto_pagado: number;
  metodo_pago: MetodoCobro;
  saldo_deudor: number;
}

export interface ItemVentaEnvio {
  id_producto: number;
  cantidad: number;
}

export interface VentaEnvio {
  items: ItemVentaEnvio[];
  metodo_pago: MetodoPago;
  id_cliente?: number;
  uuid_cliente?: string;
}

export interface VentaItem {
  id_producto: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export type EstadoVenta = 'Completada' | 'Pendiente' | 'Anulada';

export interface VentaDetalle {
  id_venta: number;
  fecha_hora: string;
  monto_total: number;
  metodo_pago: MetodoPago;
  estado_venta: EstadoVenta;
  observaciones: string | null;
  cliente: { id_cliente: number; nombre: string; saldo_deudor: number } | null;
  items: VentaItem[];
  repetida?: boolean;
}

export interface VentaResumen {
  id_venta: number;
  fecha_hora: string;
  monto_total: number;
  metodo_pago: MetodoPago;
  estado_venta: EstadoVenta;
  id_cliente: number | null;
  cliente: string;
  unidades: number;
}

export interface TopProducto {
  id_producto: number;
  nombre: string;
  unidades: number;
  ingresos: number;
  ganancia: number;
}

export interface ReporteDia {
  fecha: string;
  cerrado: boolean;
  cierre_hora: string | null;
  num_ventas: number;
  total_vendido: number;
  ventas: { efectivo: number; yape: number; plin: number; tarjeta: number; fiado: number };
  cobros_deuda: { efectivo: number; yape: number; plin: number; tarjeta: number; digital: number; total: number };
  efectivo_en_gaveta: number;
  recaudacion: number;
  fiado_generado: number;
  cobranza_deudas: number;
  deuda_total_pendiente: { total: number; vecinos: number };
  ganancia_estimada: number;
  producto_estrella: TopProducto | null;
  top_productos: TopProducto[];
}

export interface Inicio {
  hoy: ReporteDia;
  stock: { agotados: number; por_agotarse: number };
  fiados: { total_por_cobrar: number; vecinos_con_deuda: number };
}

export interface CierreHistorial {
  fecha: string;
  num_ventas: number;
  total_vendido: number;
  ventas_efectivo: number;
  ventas_yape: number;
  ventas_plin: number;
  ventas_tarjeta: number;
  ventas_fiado: number;
  cobros_efectivo: number;
  cobros_digital: number;
  efectivo_en_gaveta: number;
  recaudacion: number;
  ganancia_estimada: number;
  producto_estrella: string | null;
  fecha_hora_cierre: string;
}

export interface CompraItemEnvio {
  id_producto: number;
  cantidad: number;
  id_presentacion?: number;
  costo?: number;
  precio_venta?: number;
}

export interface CompraResumen {
  id_compra: number;
  proveedor: string | null;
  fecha_hora: string;
  total_costo: number;
  observaciones: string | null;
  lineas: number;
}

export interface CompraDetalle {
  id_compra: number;
  proveedor: string | null;
  fecha_hora: string;
  total_costo: number;
  observaciones: string | null;
  items: {
    id_producto: number;
    nombre: string;
    presentacion: string | null;
    cantidad_comprada: number;
    unidades_ingresadas: number;
    costo_unitario: number;
    costo_total: number;
  }[];
}

export interface Tienda {
  id_usuario: number;
  id_admin?: number;
  nombre_tienda: string;
  telefono: string;
  usuario_login: string;
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO';
  fecha_creacion?: string;
}

export interface LoginTiendaRespuesta {
  token: string;
  tienda: Tienda;
}

export interface LoginAdminRespuesta {
  token: string;
  admin: { id_admin: number; nombre: string; correo: string };
}

export interface Sesion {
  token: string;
  rol: Rol;
  id: number;
  /** Nombre de la tienda (tendera) o del administrador. */
  nombre: string;
  telefono?: string;
  usuario?: string;
}
