// Función de Vercel: manda un aviso al móvil del administrador cuando entra un pedido o un encargo.
// La web la llama justo después de guardar el pedido en Firestore. Para que nadie pueda mandar avisos falsos,
// aquí se comprueba que el pedido existe de verdad, que es de los últimos minutos y que no se avisó ya.
// Necesita la variable de entorno FIREBASE_SERVICE_ACCOUNT en Vercel (la clave privada de Firebase, en JSON).
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

const MAX_MINUTOS = 15;
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const referencia = (id: string) => id.slice(0, 6).toUpperCase();
const corto = (s: unknown, n: number) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function app(): App {
  return getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
}

/** Manda el aviso a todos los móviles del administrador y borra los que ya no existen. */
async function enviar(db: Firestore, data: Record<string, string>) {
  const ref = db.doc('ajustes/avisos');
  const tokens: string[] = (await ref.get()).get('tokens') ?? [];
  if (!tokens.length) return { enviados: 0, fallidos: 0, motivo: 'sin-moviles' };
  const r = await getMessaging(app()).sendEachForMulticast({
    tokens,
    data,
    webpush: { headers: { Urgency: 'high', TTL: String(24 * 3600) } },
  });
  const caducados = r.responses
    .map((x, i) => (!x.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(x.error?.code ?? '') ? tokens[i] : null))
    .filter((t): t is string => Boolean(t));
  if (caducados.length) await ref.update({ tokens: FieldValue.arrayRemove(...caducados) });
  return { enviados: r.successCount, fallidos: r.failureCount };
}

function textoPedido(id: string, p: any) {
  const lineas: any[] = p.lineas ?? [];
  const piezas = lineas.reduce((n, l) => n + (Number(l.cantidad) || 1), 0);
  const personal = lineas.some((l) => l.slug === 'funko-personalizado' || l.personalizacion);
  const total = p.hayConsultas ? `${eur.format(p.total ?? 0)} + a consultar` : eur.format(p.total ?? 0);
  const que = lineas.length === 1 ? corto(lineas[0].nombre, 40) : `${piezas} piezas`;
  return {
    titulo: `${personal ? 'Nuevo pedido personalizado' : 'Nuevo pedido'} ${referencia(id)}`,
    cuerpo: `${corto(p.cliente?.nombre, 30)} · ${que} · ${total}`,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(503).json({ error: 'Falta FIREBASE_SERVICE_ACCOUNT en Vercel.' });
  let body: any = req.body ?? {};
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'JSON no válido.' }); } }

  const coleccion = String(body.coleccion ?? '');
  const id = String(body.id ?? '');
  if (!body.prueba && (!['pedidos', 'encargos'].includes(coleccion) || !/^[A-Za-z0-9]{10,40}$/.test(id))) return res.status(400).json({ error: 'Datos no válidos.' });

  try {
    const db = getFirestore(app());

    // Aviso de prueba desde el panel: solo para administradores
    if (body.prueba) {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const { uid } = await getAuth(app()).verifyIdToken(token).catch(() => ({ uid: '' }));
      if (!uid || !(await db.doc(`admins/${uid}`).get()).exists) return res.status(403).json({ error: 'Solo administradores.' });
      const r = await enviar(db, { titulo: 'Avisos activados', cuerpo: 'Así te llegarán los pedidos nuevos.', url: '/admin', id: 'prueba' });
      return res.status(200).json(r);
    }

    const snap = await db.collection(coleccion).doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'No existe.' });
    const x = snap.data()!;
    const creado = x.creado?.toMillis?.() ?? 0;
    if (Date.now() - creado > MAX_MINUTOS * 60 * 1000) return res.status(200).json({ enviados: 0, motivo: 'antiguo' });

    // Un solo aviso por pedido aunque la página llame dos veces
    try { await db.collection('avisos').doc(`${coleccion}_${id}`).create({ creado: FieldValue.serverTimestamp() }); }
    catch (e: any) { if (e?.code === 6 || /already exists/i.test(e?.message ?? '')) return res.status(200).json({ enviados: 0, motivo: 'repetido' }); throw e; }

    const t = coleccion === 'pedidos'
      ? textoPedido(id, x)
      : { titulo: `Nuevo encargo a medida ${referencia(id)}`, cuerpo: `${corto(x.nombre, 30)}: ${corto(x.descripcion, 90)}` };
    const r = await enviar(db, { ...t, url: '/admin', id: `${coleccion}-${id}` });
    return res.status(200).json(r);
  } catch (e: any) {
    console.error('avisar-pedido', e);
    return res.status(500).json({ error: 'No se pudo mandar el aviso.' });
  }
}
