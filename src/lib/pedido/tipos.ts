/** Una línea de la cesta. `precio` es null cuando la pieza es "a consultar". */
export interface Linea {
  id: string;
  slug: string;
  nombre: string;
  url: string;
  imagen: string;
  opciones: Record<string, string>;
  personalizacion?: string;
  precio: number | null;
  cantidad: number;
}

export interface Cliente {
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export interface Pedido {
  lineas: Linea[];
  cliente: Cliente;
  /** Suma de las líneas con precio; las "a consultar" se confirman aparte. */
  total: number;
  hayConsultas: boolean;
}

export interface ResultadoPedido {
  ok: boolean;
  /** Mensaje para el cliente tras enviar. */
  mensaje: string;
  /** Si el método redirige (WhatsApp, email, pasarela), adónde. */
  redirigirA?: string;
}

/**
 * Un método de pedido. Hoy: WhatsApp y email.
 * Para conectar una pasarela (Stripe, Redsys, PayPal…) crea un archivo en ./metodos/
 * que implemente esta interfaz y añádelo a la lista de ./index.ts. Nada más cambia.
 */
export interface MetodoPedido {
  id: string;
  etiqueta: string;
  descripcion: string;
  disponible: () => boolean;
  /** true si el método cobra en línea (una pasarela). Las piezas "a consultar" no se pueden cobrar así. */
  cobraEnLinea: boolean;
  enviar: (pedido: Pedido) => Promise<ResultadoPedido>;
}
