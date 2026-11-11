// Dibujo de la caja con sus siluetas en PNG, uno por composición. Lo usan la vista previa de WhatsApp
// (og:image de /funkos/caja-N-S) y la miniatura del Funko en la cesta.
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { composiciones, svgCaja } from '../../lib/funko';

const COLORES = `.fk-marco{fill:#2e5b44}.fk-ventana{fill:#f7f3ec}.fk-claro{fill:#dfe8df}.fk-fig rect{fill:#22261f}.fk-eye{fill:#f7f3ec}`;

export const getStaticPaths = (() =>
  composiciones().flatMap(({ n, s }) => [
    { params: { img: `caja-${n}-${s}` }, props: { n, s, ancho: 1200, alto: 630, margen: 70 } },
    { params: { img: `caja-${n}-${s}-mini` }, props: { n, s, ancho: 288, alto: 384, margen: 24 } },
  ])) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { n, s, ancho, alto, margen } = props as { n: number; s: number; ancho: number; alto: number; margen: number };
  const caja = svgCaja(n, s);
  const [, w, h] = /width="([\d.]+)" height="([\d.]+)"/.exec(caja)!.map(Number);
  const k = Math.min((ancho - margen * 2) / w, (alto - margen * 2) / h);
  const cw = w * k, ch = h * k;
  const interior = caja.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <style>${COLORES}</style>
    <rect width="100%" height="100%" fill="#efe9e0"/>
    <svg x="${(ancho - cw) / 2}" y="${(alto - ch) / 2}" width="${cw}" height="${ch}" viewBox="0 0 ${w} ${h}">${interior}</svg>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
