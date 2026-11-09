// Guarda pedidos y encargos en Firestore. Los campos tienen que coincidir con firestore.rules.
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage, firebaseActivo, conLimite } from '../firebase';
import type { Pedido } from './tipos';

/** Quita los `undefined` (Firestore no los admite). */
const limpio = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** Referencia corta y legible para el cliente (los 6 primeros caracteres del id). */
export const referencia = (id: string) => id.slice(0, 6).toUpperCase();

export async function guardarPedido(p: Pedido, metodo: string): Promise<string | null> {
  if (!firebaseActivo) return null;
  const r = doc(collection(db(), 'pedidos'));
  await conLimite(setDoc(r, {
    uid: auth().currentUser?.uid ?? null,
    cliente: limpio({ nombre: p.cliente.nombre, telefono: p.cliente.telefono, email: p.cliente.email, notas: p.cliente.notas }),
    lineas: p.lineas.map((l) => limpio({
      slug: l.slug, nombre: l.nombre, url: l.url, opciones: l.opciones,
      personalizacion: l.personalizacion, precio: l.precio, cantidad: l.cantidad,
    })),
    total: p.total,
    hayConsultas: p.hayConsultas,
    metodo,
    estado: 'nuevo',
    creado: serverTimestamp(),
  }), 8000);
  return r.id;
}

export interface Encargo { descripcion: string; medidas: string; nombre: string; contacto: string; archivo?: File | null }

export async function guardarEncargo(e: Encargo): Promise<{ id: string; archivoSubido: boolean } | null> {
  if (!firebaseActivo) return null;
  const r = doc(collection(db(), 'encargos'));
  let archivo: { nombre: string; ruta: string; tamano: number } | null = null;
  let archivoSubido = false;
  if (e.archivo) {
    // Nombre seguro: sin rutas ni caracteres raros
    const nombre = e.archivo.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const ruta = `encargos/${r.id}/${nombre}`;
    try {
      await conLimite(uploadBytes(ref(storage(), ruta), e.archivo, { contentType: e.archivo.type || 'application/octet-stream' }), 60000);
      archivo = { nombre, ruta, tamano: e.archivo.size };
      archivoSubido = true;
    } catch (err) {
      console.warn('No se pudo subir el archivo del encargo', err); // el encargo se guarda igual; el archivo irá por WhatsApp
    }
  }
  await conLimite(setDoc(r, {
    uid: auth().currentUser?.uid ?? null,
    descripcion: e.descripcion,
    medidas: e.medidas,
    nombre: e.nombre,
    contacto: e.contacto,
    archivo,
    estado: 'nuevo',
    creado: serverTimestamp(),
  }), 10000);
  return { id: r.id, archivoSubido };
}
