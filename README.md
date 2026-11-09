# Daniro 3D · catálogo web

Web estática hecha con [Astro](https://astro.build), publicada en **Vercel**, con **Firebase** para pedidos,
encargos, cuentas de clientes y el panel de administración (`/admin`).

## Arrancar

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # descarga productos de Firestore (si hay) y genera la web en dist/
```

## Firebase + Vercel: puesta en marcha

### 1. Variables de entorno (Vercel → Project → Settings → Environment Variables)

Los valores están en Firebase Console → ⚙ Configuración del proyecto → *Tus apps* → app web → `firebaseConfig`.

| Variable | Valor de `firebaseConfig` |
|---|---|
| `PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `PUBLIC_FIREBASE_APP_ID` | `appId` |

Márcalas para Production, Preview y Development. Son públicas por diseño (van al navegador): los datos los protegen
las reglas. Para probar en local, copia `.env.example` como `.env` y rellénalo (`.env` no se sube a GitHub).
Sin estas variables la web funciona igual que antes: pedidos por WhatsApp y sin cuentas.

### 2. Reglas

- **Firestore:** pega el contenido de `firestore.rules` en Firebase Console → Firestore → Reglas → Publicar.
- **Storage:** activa Storage (Build → Storage) y pega `storage.rules` en Storage → Reglas. Cuando la consola
  pregunte si Storage puede leer Firestore (para comprobar quién es admin), acepta.
- O con la CLI: `npx firebase-tools login`, `npx firebase-tools use <tu-project-id>` y
  `npx firebase-tools deploy --only firestore:rules,storage`.

### 3. Authentication

- Firebase Console → Authentication → Método de acceso: activa **Correo/contraseña** y **Google**.
- Authentication → Configuración → **Dominios autorizados**: añade el dominio de Vercel (`tu-proyecto.vercel.app`) y tu dominio propio.

### 4. Hacerte administrador

1. Crea tu cuenta en `/cuenta` (o entra en `/admin`): te enseña tu **UID**.
2. Firestore → Iniciar colección `admins` → ID del documento = tu UID (el documento puede ir vacío).
3. Recarga `/admin`.

### 5. Primer uso del panel

1. `/admin` → **Productos** → *Importar el catálogo actual* (copia `productos.json` a Firestore).
2. Vercel → Settings → Git → **Deploy Hooks** → crea uno para `main` y pégalo en `/admin` → **Publicar** → Configurar.
3. A partir de ahí: editas o creas productos (con fotos) en el panel y pulsas **Publicar ahora**. Vercel vuelve a
   generar la web en 1–3 minutos con los datos de Firestore.

### Qué guarda Firestore

| Colección | Qué es | Quién lee | Quién escribe |
|---|---|---|---|
| `productos` | Catálogo (también los Funkos hechos, con `ejemplo: true`) | Todos | Admins |
| `categorias` | Opcional: si existe, sustituye a `categorias.json` | Todos | Admins |
| `pedidos` | Pedidos de la cesta (además van por WhatsApp) | Su cliente y admins | Cualquiera crea; admins cambian el estado |
| `encargos` | Encargos a medida (el archivo va a Storage `encargos/`) | Su cliente y admins | Cualquiera crea; admins responden |
| `admins` | UIDs con acceso al panel | Cada uno el suyo | Solo desde la consola |
| `ajustes` | URL del Deploy Hook | Admins | Admins |

## Dónde se cambia cada cosa

| Qué | Dónde |
|---|---|
| Productos (nombre, precio, fotos, material, medidas…) | `src/data/productos.json` |
| Categorías (añadir una nueva no requiere tocar código) | `src/data/categorias.json` |
| WhatsApp, email, Wallapop, Vinted, dominio, datos legales | `src/data/sitio.json` |
| Fotos de cada producto | `src/assets/productos/<slug>/01.jpg, 02.jpg…` |
| Colores de la web y tipografías | `src/styles/global.css` (bloque `:root`) |
| Textos de envíos, devoluciones y privacidad | `src/pages/envios.astro`, `devoluciones.astro`, `privacidad.astro` |
| Texto de "Sobre nosotros" | `src/pages/sobre-nosotros.astro` |

### Fotos

Las fotos actuales salen de tu catálogo en PDF (750 × 1000 px). Para cambiar una, sustituye el archivo con el
mismo nombre. Para añadir más, copia la foto en la carpeta del producto y añade una línea en su `galeria`:

```json
{ "archivo": "05.jpg", "alt": "Descripción corta de lo que se ve en la foto" }
```

Astro las convierte a AVIF/WebP en varios tamaños al compilar. Si puedes, súbelas a 1500 px o más de ancho:
el zoom de la ficha se verá más nítido.

### Precio

```json
"precio": { "tipo": "fijo", "importe": 30 }
"precio": { "tipo": "desde", "importe": 55 }
"precio": { "tipo": "fijo", "importe": 5, "unidad": "ud." }
"precio": { "tipo": "consultar" }
```

Tamaños con precio propio: `"variantes": [{ "nombre": "30 cm", "precio": 30 }, { "nombre": "15 cm", "precio": 20 }]`.

### Funkos: encargos hechos y personalización

- La página `/funkos` tiene dos pestañas: **Personaliza tu Funko** (guía de precios y configurador) y
  **Encargos hechos** (galería, enlazable con `/funkos#encargos`).
- Un Funko entregado se añade a la galería con `"ejemplo": true` en `productos.json`. Los ejemplos no se venden ni
  salen en el catálogo. Si su `composicion` es del tipo `"Caja + 1 normal + 2 pequeños"`, el botón
  "Quiero uno así" deja el configurador preparado con esa composición.
- Los precios y los máximos por caja están en `src/lib/funko.ts` (55 € base, +30 € normal, +20 € pequeño).

### Colores

`colores` son los colores de la pieza (sirven para el filtro). Si el cliente puede elegir uno, añade
`"colorAElegir": true` y aparece el selector en la ficha. Un color nuevo necesita su muestra en `src/lib/colores.ts`.

## Pedidos y pago

La cesta se guarda en el navegador del cliente. Al tramitar, el pedido sale como mensaje de WhatsApp
(y por email si rellenas `"email"` en `sitio.json`). No hay cobro en la web.

Para conectar una pasarela de pago más adelante, la estructura está en `src/lib/pedido/`: cada forma de pedir es
un objeto `MetodoPedido` (ver `tipos.ts`). Hay un ejemplo comentado en `index.ts`. Una pasarela necesita una función
de servidor (Stripe Checkout, Redsys…), así que habrá que pasar de web estática a Netlify/Vercel Functions.

## Formulario de encargos

Sin configurar, el formulario abre WhatsApp con el encargo escrito (el archivo STL se adjunta en el chat).
Para recibirlo por email con el archivo adjunto, crea un formulario en un servicio como Formspree o Netlify Forms y
pon su URL en `"formularioEncargos"` de `sitio.json`.

## Pendiente de revisar antes de publicar

- `sitio.json`: dominio definitivo (ahora `daniro3d.es` de ejemplo; cámbialo también en `public/robots.txt`), email y datos del titular (`[COMPLETAR]`).
- `productos.json`: `materiales` está a "PLA" en todo por defecto; `tiempoFabricacion` y casi todas las `dimensiones` están vacías (la ficha oculta las filas vacías).
- Precios a consultar en: Verstappen 15 cm, M. Antoine, Funko Venom, llaveros, estantería Stranger Things, lagarto, tarjetas NFC.
- Envíos, devoluciones y privacidad son borradores: revisa plazos, costes y zonas reales.
- Marcas registradas (Lego, Funko, Pokémon, UEFA, F1, Stranger Things…) en nombres y categorías.
