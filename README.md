# Daniro 3D · catálogo web

Web estática hecha con [Astro](https://astro.build). Sin servidor ni base de datos: todo sale de tres archivos JSON.

## Arrancar

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera la web final en dist/
```

Para publicarla, sube la carpeta `dist/` a Netlify, Cloudflare Pages o GitHub Pages (los tres son gratis).

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
