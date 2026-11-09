// Panel de administración: pedidos, encargos, productos y publicación.
// Todo lo protege firestore.rules: solo los UID que estén en la colección "admins" pueden leer y escribir aquí.
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseActivo, auth, db, storage, mensajeError } from '../lib/firebase';
import { textoFecha, esc } from '../lib/estados';
import { referencia } from '../lib/pedido/guardar';

type Foto = { archivo: string; alt: string; url?: string; preview?: string };
type Prod = Record<string, any> & { slug: string; nombre: string; galeria: Foto[] };

const root = document.querySelector<HTMLElement>('[data-admin]')!;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
const cfg = JSON.parse($('[data-config]').textContent!) as { cats: { slug: string; nombre: string }[]; estados: { id: string; txt: string }[] };
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const nombreCat = (s: string) => cfg.cats.find((c) => c.slug === s)?.nombre ?? s;
const selEstado = (actual: string, attr: string) =>
  `<select class="select" ${attr} aria-label="Estado">${cfg.estados.map((e) => `<option value="${e.id}" ${e.id === actual ? 'selected' : ''}>${e.txt}</option>`).join('')}</select>`;

const mostrar = (sel: string, on: boolean) => ($(sel).hidden = !on);

if (!firebaseActivo) {
  mostrar('[data-estado-carga]', false);
  mostrar('[data-sin-firebase]', true);
} else {
  iniciar();
}

function iniciar() {
  // ---- Acceso ----
  $<HTMLFormElement>('[data-login]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try { await signInWithEmailAndPassword(auth(), String(fd.get('email')), String(fd.get('pass'))); }
    catch (err) { $('[data-login-error]').textContent = mensajeError(err); }
  });
  $('[data-google]').addEventListener('click', async () => {
    try { await signInWithPopup(auth(), new GoogleAuthProvider()); } catch (err) { $('[data-login-error]').textContent = mensajeError(err); }
  });
  $('[data-salir]').addEventListener('click', () => signOut(auth()));
  $('[data-copiar-uid]').addEventListener('click', () => navigator.clipboard?.writeText($('[data-uid]').textContent ?? ''));

  onAuthStateChanged(auth(), async (u) => {
    mostrar('[data-estado-carga]', false);
    mostrar('[data-user]', Boolean(u));
    mostrar('[data-login]', !u);
    mostrar('[data-no-admin]', false);
    mostrar('[data-app]', false);
    if (!u) return;
    $('[data-user-email]').textContent = u.email ?? '';
    let admin = false;
    try { admin = (await getDoc(doc(db(), 'admins', u.uid))).exists(); } catch { admin = false; }
    if (!admin) { $('[data-uid]').textContent = u.uid; mostrar('[data-no-admin]', true); return; }
    mostrar('[data-app]', true);
    cargarTodo();
  });

  // ---- Pestañas ----
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1; });
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
  }));
  root.querySelectorAll('[data-recargar]').forEach((b) => b.addEventListener('click', cargarTodo));
  $('[data-filtro-pedidos]').addEventListener('change', pintarPedidos);
  $('[data-filtro-encargos]').addEventListener('change', pintarEncargos);
  $('[data-buscar-producto]').addEventListener('input', pintarProductos);
  conectarEditor();
  conectarPublicar();
}

let pedidos: any[] = [], encargos: any[] = [], productos: Prod[] = [];
let previews = new Map<string, string>(); // "slug/archivo" -> miniatura de las fotos del repositorio
let catalogoInicial: Prod[] = [];

async function cargarTodo() {
  try {
    const [ps, es, pr, ini] = await Promise.all([
      getDocs(query(collection(db(), 'pedidos'), orderBy('creado', 'desc'), limit(300))),
      getDocs(query(collection(db(), 'encargos'), orderBy('creado', 'desc'), limit(300))),
      getDocs(collection(db(), 'productos')),
      fetch('/admin/catalogo-inicial.json').then((r) => r.json()).catch(() => ({ productos: [] })),
    ]);
    pedidos = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
    encargos = es.docs.map((d) => ({ id: d.id, ...d.data() }));
    productos = pr.docs.map((d) => ({ ...(d.data() as Prod), slug: d.id })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    catalogoInicial = ini.productos ?? [];
    previews = new Map(catalogoInicial.flatMap((p) => p.galeria.map((g) => [`${p.slug}/${g.archivo}`, g.preview ?? ''] as [string, string])));
    pintarPedidos(); pintarEncargos(); pintarProductos();
  } catch (err) {
    $('[data-lista-pedidos]').innerHTML = `<li class="error">${esc(mensajeError(err))}</li>`;
  }
}

// ---- Pedidos ----
function pintarPedidos() {
  const f = $<HTMLSelectElement>('[data-filtro-pedidos]').value;
  const ls = pedidos.filter((p) => !f || p.estado === f);
  $('[data-n-pedidos]').textContent = String(pedidos.filter((p) => p.estado === 'nuevo').length || '');
  $('[data-lista-pedidos]').innerHTML = ls.map((p) => `
    <li data-id="${esc(p.id)}">
      <div class="fila"><span class="ref">Pedido ${esc(referencia(p.id))}</span>${selEstado(p.estado, 'data-estado-pedido')}</div>
      <div class="meta">${esc(textoFecha(p.creado))} · ${esc(p.metodo)}${p.uid ? ' · con cuenta' : ''}</div>
      <div><strong>${esc(p.cliente?.nombre)}</strong>${p.cliente?.telefono ? ` · <a href="https://wa.me/34${esc(String(p.cliente.telefono).replace(/\D/g, '').slice(-9))}" target="_blank" rel="noopener">${esc(p.cliente.telefono)}</a>` : ''}${p.cliente?.email ? ` · <a href="mailto:${esc(p.cliente.email)}">${esc(p.cliente.email)}</a>` : ''}</div>
      ${p.cliente?.notas ? `<div class="meta">Notas: ${esc(p.cliente.notas)}</div>` : ''}
      <ul class="lineas">${(p.lineas ?? []).map((l: any) => `<li>${esc(l.nombre)} × ${esc(l.cantidad)} — ${l.precio == null ? 'a consultar' : eur.format(l.precio * l.cantidad)}${l.opciones && Object.keys(l.opciones).length ? ` · ${esc(Object.entries(l.opciones).map(([k, v]) => `${k}: ${v}`).join(' · '))}` : ''}${l.personalizacion ? ` · <em>${esc(l.personalizacion)}</em>` : ''}</li>`).join('')}</ul>
      <div class="fila"><strong>Total: ${eur.format(p.total ?? 0)}${p.hayConsultas ? ' + piezas a consultar' : ''}</strong></div>
    </li>`).join('') || '<li class="meta">No hay pedidos.</li>';
  root.querySelectorAll<HTMLSelectElement>('[data-estado-pedido]').forEach((s) => s.addEventListener('change', async () => {
    const id = s.closest<HTMLElement>('li')!.dataset.id!;
    try { await updateDoc(doc(db(), 'pedidos', id), { estado: s.value }); pedidos.find((p) => p.id === id)!.estado = s.value; $('[data-n-pedidos]').textContent = String(pedidos.filter((p) => p.estado === 'nuevo').length || ''); }
    catch (err) { alert(mensajeError(err)); }
  }));
}

// ---- Encargos ----
function pintarEncargos() {
  const f = $<HTMLSelectElement>('[data-filtro-encargos]').value;
  const ls = encargos.filter((x) => !f || x.estado === f);
  $('[data-n-encargos]').textContent = String(encargos.filter((x) => x.estado === 'nuevo').length || '');
  $('[data-lista-encargos]').innerHTML = ls.map((x) => `
    <li data-id="${esc(x.id)}">
      <div class="fila"><span class="ref">Encargo ${esc(referencia(x.id))}</span>${selEstado(x.estado, 'data-estado-encargo')}</div>
      <div class="meta">${esc(textoFecha(x.creado))}${x.uid ? ' · con cuenta' : ''}</div>
      <div><strong>${esc(x.nombre)}</strong> · ${esc(x.contacto)}</div>
      <p>${esc(x.descripcion)}</p>
      ${x.medidas ? `<div class="meta">Medidas: ${esc(x.medidas)}</div>` : ''}
      ${x.archivo ? `<div><button type="button" class="btn btn--secondary btn--sm" data-descargar="${esc(x.archivo.ruta)}">Descargar ${esc(x.archivo.nombre)}</button></div>` : ''}
      <label class="meta" for="resp-${esc(x.id)}">Respuesta para el cliente (la ve en "Mi cuenta")</label>
      <textarea class="textarea" id="resp-${esc(x.id)}" data-respuesta>${esc(x.respuesta ?? '')}</textarea>
      <div><button type="button" class="btn btn--sm" data-guardar-respuesta>Guardar respuesta</button></div>
    </li>`).join('') || '<li class="meta">No hay encargos.</li>';
  const lista = $('[data-lista-encargos]');
  lista.querySelectorAll<HTMLSelectElement>('[data-estado-encargo]').forEach((s) => s.addEventListener('change', async () => {
    const id = s.closest<HTMLElement>('li')!.dataset.id!;
    try { await updateDoc(doc(db(), 'encargos', id), { estado: s.value }); encargos.find((x) => x.id === id)!.estado = s.value; }
    catch (err) { alert(mensajeError(err)); }
  }));
  lista.querySelectorAll<HTMLButtonElement>('[data-guardar-respuesta]').forEach((b) => b.addEventListener('click', async () => {
    const li = b.closest<HTMLElement>('li')!;
    const txt = li.querySelector<HTMLTextAreaElement>('[data-respuesta]')!.value.trim();
    try { await updateDoc(doc(db(), 'encargos', li.dataset.id!), { respuesta: txt }); b.textContent = 'Guardada'; setTimeout(() => (b.textContent = 'Guardar respuesta'), 1500); }
    catch (err) { alert(mensajeError(err)); }
  }));
  lista.querySelectorAll<HTMLButtonElement>('[data-descargar]').forEach((b) => b.addEventListener('click', async () => {
    try { window.open(await getDownloadURL(ref(storage(), b.dataset.descargar!)), '_blank'); } catch (err) { alert(mensajeError(err)); }
  }));
}

// ---- Productos ----
const miniatura = (p: Prod) => {
  const g = p.galeria?.[0];
  return g ? g.url || previews.get(`${p.slug}/${g.archivo}`) || '' : '';
};
const precioTxt = (p: Prod) => p.precio?.tipo === 'consultar' || !p.precio ? 'A consultar' : `${p.precio.tipo === 'desde' ? 'Desde ' : ''}${eur.format(p.precio.importe)}`;

function pintarProductos() {
  const q = $<HTMLInputElement>('[data-buscar-producto]').value.toLowerCase().trim();
  $('[data-n-productos]').textContent = String(productos.length || '');
  mostrar('[data-importar]', productos.length === 0);
  const ls = productos.filter((p) => !q || `${p.nombre} ${p.slug} ${nombreCat(p.categoria)}`.toLowerCase().includes(q));
  $('[data-lista-productos]').innerHTML = ls.map((p) => `
    <li>
      <img src="${esc(miniatura(p))}" alt="" loading="lazy" />
      <div><div class="p-nombre">${esc(p.nombre)}</div><div class="p-meta">${esc(nombreCat(p.categoria))} · ${esc(precioTxt(p))}${p.ejemplo ? ' · encargo hecho' : ''}${p.destacado ? ' · destacado' : ''}</div></div>
      <button type="button" class="btn btn--secondary btn--sm" data-editar="${esc(p.slug)}">Editar</button>
    </li>`).join('');
  root.querySelectorAll<HTMLButtonElement>('[data-editar]').forEach((b) => b.addEventListener('click', () => abrirEditor(productos.find((p) => p.slug === b.dataset.editar)!)));
}

// Importar productos.json a Firestore (una vez)
document.addEventListener('click', async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-importar-btn]');
  if (!b || !catalogoInicial.length) return;
  if (!confirm(`Se van a crear ${catalogoInicial.length} productos en Firestore. ¿Seguir?`)) return;
  b.disabled = true; b.textContent = 'Importando…';
  try {
    const batch = writeBatch(db());
    for (const p of catalogoInicial) {
      const { slug, ...resto } = p;
      batch.set(doc(db(), 'productos', slug), { ...resto, slug, galeria: p.galeria.map(({ preview, ...g }) => g) });
    }
    await batch.commit();
    await cargarTodo();
  } catch (err) { alert(mensajeError(err)); b.disabled = false; b.textContent = 'Importar el catálogo actual'; }
});

let editando: Prod | null = null;
let fotos: Foto[] = [];

function conectarEditor() {
  const dlg = $<HTMLDialogElement>('[data-editor]');
  const form = $<HTMLFormElement>('[data-form-producto]');
  $('[data-nuevo]').addEventListener('click', () => abrirEditor(null));
  $('[data-cerrar-editor]').addEventListener('click', () => dlg.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-ed-error]'); err.textContent = '';
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) ?? '').trim();
    const lista = (k: string) => s(k).split(',').map((x) => x.trim()).filter(Boolean);
    const slug = (editando?.slug ?? s('slug')).toLowerCase();
    if (!s('nombre')) { err.textContent = 'Falta el nombre.'; return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { err.textContent = 'El slug solo puede tener minúsculas, números y guiones.'; return; }
    if (!editando && productos.some((p) => p.slug === slug)) { err.textContent = 'Ya hay un producto con ese slug.'; return; }
    if (!fotos.length) { err.textContent = 'Sube al menos una foto.'; return; }
    const tipo = s('precioTipo');
    const importe = Number(s('precioImporte'));
    if (tipo !== 'consultar' && !(importe >= 0 && s('precioImporte'))) { err.textContent = 'Pon el importe del precio o elige "A consultar".'; return; }
    const variantes = s('variantes').split('\n').map((l) => l.split('=').map((x) => x.trim())).filter(([n]) => n)
      .map(([nombre, pr]) => ({ nombre, precio: !pr || /consult/i.test(pr) ? null : Number(pr.replace(',', '.')) }));
    const precio = tipo === 'consultar' ? { tipo } : { tipo, importe, ...(s('precioUnidad') ? { unidad: s('precioUnidad') } : {}) };
    const datos: Prod = {
      ...(editando ?? {}),
      slug, nombre: s('nombre'), categoria: s('categoria'),
      etiquetas: lista('etiquetas'), descripcionCorta: s('descripcionCorta'), descripcionLarga: s('descripcionLarga') || s('descripcionCorta'),
      precio, variantes, materiales: lista('materiales'), colores: lista('colores'),
      dimensiones: s('dimensiones') || null, tiempoFabricacion: s('tiempoFabricacion') || null,
      personalizacion: { disponible: fd.get('persDisponible') === 'on', notas: s('persNotas') || null },
      destacado: fd.get('destacado') === 'on', colorAElegir: fd.get('colorAElegir') === 'on', ejemplo: fd.get('ejemplo') === 'on',
      composicion: s('composicion') || null,
      fechaAlta: s('fechaAlta') || new Date().toISOString().slice(0, 10),
      galeria: fotos.map(({ preview, ...g }) => g),
      actualizado: serverTimestamp(),
    };
    try {
      await setDoc(doc(db(), 'productos', slug), datos);
      dlg.close();
      await cargarTodo();
    } catch (e2) { err.textContent = mensajeError(e2); }
  });

  $('[data-borrar-producto]').addEventListener('click', async () => {
    if (!editando || !confirm(`¿Borrar "${editando.nombre}"? Desaparecerá de la web en la próxima publicación.`)) return;
    try { await deleteDoc(doc(db(), 'productos', editando.slug)); dlg.close(); await cargarTodo(); }
    catch (err) { $('[data-ed-error]').textContent = mensajeError(err); }
  });

  // Subir fotos a Storage: productos/<slug>/<fecha>-<nombre>
  $<HTMLInputElement>('[data-subir]').addEventListener('change', async (e) => {
    const input = e.currentTarget as HTMLInputElement;
    const estado = $('[data-subir-estado]');
    const slug = (editando?.slug ?? $<HTMLInputElement>('#p-slug').value.trim()).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) { estado.textContent = 'Escribe primero un slug válido.'; input.value = ''; return; }
    const files = [...(input.files ?? [])];
    for (const [i, f] of files.entries()) {
      estado.textContent = `Subiendo ${i + 1} de ${files.length}…`;
      try {
        const nombre = `${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`.toLowerCase();
        const r = ref(storage(), `productos/${slug}/${nombre}`);
        await uploadBytes(r, f, { contentType: f.type });
        const url = await getDownloadURL(r);
        fotos.push({ archivo: nombre, alt: $<HTMLInputElement>('#p-nombre').value || slug, url });
        pintarFotos();
      } catch (err) { estado.textContent = mensajeError(err); input.value = ''; return; }
    }
    estado.textContent = 'Fotos subidas. Recuerda pulsar Guardar.';
    input.value = '';
  });

  $('[data-fotos]').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-f]');
    if (!b) return;
    const i = Number(b.closest<HTMLElement>('li')!.dataset.i);
    if (b.dataset.f === 'subir' && i > 0) [fotos[i - 1], fotos[i]] = [fotos[i], fotos[i - 1]];
    if (b.dataset.f === 'bajar' && i < fotos.length - 1) [fotos[i + 1], fotos[i]] = [fotos[i], fotos[i + 1]];
    if (b.dataset.f === 'quitar') fotos.splice(i, 1);
    pintarFotos();
  });
  $('[data-fotos]').addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.alt != null) fotos[Number(t.closest<HTMLElement>('li')!.dataset.i)].alt = t.value;
  });
}

function pintarFotos() {
  const slug = editando?.slug ?? '';
  $('[data-fotos]').innerHTML = fotos.map((g, i) => `
    <li data-i="${i}">
      <img src="${esc(g.url || g.preview || previews.get(`${slug}/${g.archivo}`) || '')}" alt="" />
      <input class="input" data-alt value="${esc(g.alt)}" aria-label="Descripción de la foto ${i + 1}" />
      <div class="acciones">
        <button type="button" data-f="subir" aria-label="Subir foto">↑</button>
        <button type="button" data-f="bajar" aria-label="Bajar foto">↓</button>
        <button type="button" data-f="quitar" aria-label="Quitar foto">✕</button>
      </div>
    </li>`).join('') || '<li class="hint">Sin fotos todavía.</li>';
}

function abrirEditor(p: Prod | null) {
  editando = p;
  fotos = p ? p.galeria.map((g) => ({ ...g })) : [];
  const form = $<HTMLFormElement>('[data-form-producto]');
  form.reset();
  $('[data-ed-error]').textContent = '';
  $('[data-ed-titulo]').textContent = p ? `Editar: ${p.nombre}` : 'Nuevo producto';
  $('[data-borrar-producto]').hidden = !p;
  const set = (name: string, v: unknown) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | null;
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(v); else el.value = v == null ? '' : String(v);
  };
  const slugInput = $<HTMLInputElement>('#p-slug');
  slugInput.readOnly = Boolean(p);
  if (p) {
    set('nombre', p.nombre); set('slug', p.slug); set('categoria', p.categoria); set('fechaAlta', p.fechaAlta);
    set('descripcionCorta', p.descripcionCorta); set('descripcionLarga', p.descripcionLarga);
    set('precioTipo', p.precio?.tipo ?? 'consultar'); set('precioImporte', p.precio?.importe); set('precioUnidad', p.precio?.unidad);
    set('variantes', (p.variantes ?? []).map((v: any) => `${v.nombre} = ${v.precio ?? 'consultar'}`).join('\n'));
    set('materiales', (p.materiales ?? []).join(', ')); set('colores', (p.colores ?? []).join(', '));
    set('dimensiones', p.dimensiones); set('tiempoFabricacion', p.tiempoFabricacion);
    set('etiquetas', (p.etiquetas ?? []).join(', ')); set('composicion', p.composicion);
    set('persNotas', p.personalizacion?.notas); set('persDisponible', p.personalizacion?.disponible);
    set('destacado', p.destacado); set('colorAElegir', p.colorAElegir); set('ejemplo', p.ejemplo);
  } else {
    set('fechaAlta', new Date().toISOString().slice(0, 10)); set('materiales', 'PLA');
    // El slug se propone a partir del nombre
    $<HTMLInputElement>('#p-nombre').oninput = (e) => {
      slugInput.value = (e.target as HTMLInputElement).value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    };
  }
  if (p) $<HTMLInputElement>('#p-nombre').oninput = null;
  pintarFotos();
  $<HTMLDialogElement>('[data-editor]').showModal();
}

// ---- Publicar (Deploy Hook de Vercel) ----
function conectarPublicar() {
  const hookInput = $<HTMLInputElement>('[data-hook]');
  const estado = $('[data-publicar-estado]');
  const ajustes = () => doc(db(), 'ajustes', 'publicacion');
  getDoc(ajustes()).then((d) => {
    const a = d.data() ?? {};
    hookInput.value = a.deployHook ?? '';
    if (a.ultima) estado.textContent = `Última publicación: ${textoFecha(a.ultima)}`;
  }).catch(() => {});
  $('[data-guardar-hook]').addEventListener('click', async () => {
    const url = hookInput.value.trim();
    if (url && !/^https:\/\/api\.vercel\.com\//.test(url)) { estado.textContent = 'Esa URL no parece un Deploy Hook de Vercel.'; return; }
    try { await setDoc(ajustes(), { deployHook: url }, { merge: true }); estado.textContent = 'Guardado.'; }
    catch (err) { estado.textContent = mensajeError(err); }
  });
  $('[data-publicar]').addEventListener('click', async () => {
    const url = hookInput.value.trim();
    if (!url) { estado.textContent = 'Primero configura la URL del Deploy Hook (abajo).'; return; }
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors' }); // Vercel no devuelve CORS: la respuesta es opaca
      await setDoc(ajustes(), { ultima: serverTimestamp() }, { merge: true });
      estado.textContent = 'Publicación lanzada. En 1–3 minutos la web estará actualizada.';
    } catch (err) { estado.textContent = mensajeError(err); }
  });
}
