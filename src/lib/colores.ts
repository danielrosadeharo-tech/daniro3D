// Muestra de color para cada nombre usado en "colores" de productos.json.
// Si añades un color nuevo, añade aquí su tono (si no, sale gris).
const mapa: Record<string, string> = {
  Amarillo: '#f2c230',
  Azul: '#2c5aa0',
  Blanco: '#ffffff',
  Dorado: 'linear-gradient(135deg,#f6dd8a,#c49a2c)',
  Multicolor: 'conic-gradient(#e94b3c,#f2c230,#3fae5a,#2c5aa0,#e94b3c)',
  Negro: '#1d1d1b',
  Plata: 'linear-gradient(135deg,#f1f1f1,#a9a9a9)',
  Rojo: '#d1342b',
  Verde: '#2f8a4c',
};
export const colorHex = (nombre: string) => mapa[nombre] ?? '#9a958a';
