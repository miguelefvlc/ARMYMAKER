// Generates the PWA / home-screen military helmet icons (no external dependencies).
// Usage: node scripts/make_icons.js
// Output: icons/favicon.svg, icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png, icons/apple-touch-icon.png
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = [9, 9, 11];             // zinc-950 (#09090b)
const BADGE_BG = [24, 24, 27];     // zinc-900 (#18181b)
const AMBER = [251, 191, 36];      // amber-400 (#fbbf24)
const AMBER_DARK = [217, 119, 6];  // amber-600 (#d97706)
const STAR_RED = [184, 66, 66];    // tactical red (#b84242)

// CRC32 for PNG chunks
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function starPolygon(cx, cy, rOuter, rInner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Evaluates point (u, v) in normalized [-1, 1] coords for the WWII Combat Helmet
function sampleHelmet(uRaw, vRaw, scale) {
  const u = uRaw / scale;
  const v = vRaw / scale;

  // Subtle circular tactical badge backing
  const rBadge = Math.hypot(u, v);
  let color = BG;
  if (rBadge <= 0.80) {
    color = rBadge >= 0.75 ? AMBER_DARK : BADGE_BG;
  }

  // Helmet coordinates:
  // Upper dome: centered around (0, 0.06), rx = 0.56, ry = 0.52 for v <= 0.08
  const domeX = u / 0.55;
  const domeY = (v - 0.08) / 0.52;
  const inUpperDome = v <= 0.12 && (domeX * domeX + domeY * domeY <= 1.0);

  // Flared skirt / rim (front visor on left, deeper neck guard on right)
  // Rim bottom curve dips from front-left (-0.64, 0.15) across middle (0, 0.20) to rear-right (0.64, 0.28)
  const rimBottomY = 0.17 + 0.07 * u + 0.06 * (u * u);
  const rimTopY = -0.02 + 0.04 * u;
  const halfWidthAtV = 0.55 + Math.max(0, (v + 0.02) * 0.42);
  const inSkirt = v >= rimTopY && v <= rimBottomY && Math.abs(u) <= Math.min(0.65, halfWidthAtV);

  // Rounded brim corners at left (-0.59, 0.12) and right (0.59, 0.21)
  const inLeftLip = Math.hypot((u + 0.55) / 0.10, (v - 0.10) / 0.07) <= 1.0;
  const inRightLip = Math.hypot((u - 0.55) / 0.11, (v - 0.18) / 0.09) <= 1.0;

  const inHelmetShell = inUpperDome || inSkirt || inLeftLip || inRightLip;

  if (inHelmetShell) {
    color = AMBER;

    // Dark separation groove along the flare line
    const grooveY = 0.07 + 0.06 * u + 0.04 * (u * u);
    if (Math.abs(v - grooveY) < 0.024 && Math.abs(u) < 0.56) {
      color = BADGE_BG;
    }

    // Specular crown highlight arc on top-left of dome
    const hlDist = Math.abs(Math.hypot(u + 0.05, v - 0.08) - 0.40);
    if (v < -0.08 && u < 0.12 && u > -0.38 && hlDist < 0.028) {
      color = BADGE_BG;
    }

    // Side rivet dots
    if (Math.hypot(u - 0.32, v - 0.02) < 0.032 || Math.hypot(u + 0.34, v - 0.01) < 0.030) {
      color = BADGE_BG;
    }

    // Front emblem star on the helmet dome
    const star = starPolygon(-0.04, -0.14, 0.15, 0.062);
    if (inPolygon(u, v, star)) {
      color = STAR_RED;
    }
  }

  // Chinstrap loop hanging slightly below the helmet
  const strapDistLeft = distToSegment(u, v, -0.34, 0.16, -0.16, 0.42);
  const strapDistRight = distToSegment(u, v, 0.30, 0.23, 0.14, 0.42);
  const strapDistBottom = distToSegment(u, v, -0.16, 0.42, 0.14, 0.42);
  const strapDist = Math.min(strapDistLeft, strapDistRight, strapDistBottom);
  if (!inHelmetShell && v > 0.14 && strapDist <= 0.028) {
    color = AMBER_DARK;
  }

  return color;
}

function render(size, scale = 1) {
  const SS = 4; // 4x4 supersampling anti-aliasing
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 2 - 1;
          const v = ((y + (sy + 0.5) / SS) / size) * 2 - 1;
          const c = sampleHelmet(u, v, scale);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 3;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
    }
  }
  return encodePNG(size, px);
}

// Write crisp SVG favicon as well
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#09090b"/>
  <circle cx="32" cy="32" r="27" fill="#18181b" stroke="#d97706" stroke-width="2"/>
  <!-- Chinstrap -->
  <path d="M21 38 L26 48 H37 L42 40" stroke="#d97706" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- WWII Military Helmet Shell -->
  <path d="M12 35 C12 20 20 13 32 13 C44 13 51 20 51 34 C53 35.5 54 37.5 54 39.5 C54 41.5 51.5 42.5 48 42 C38 40.5 24 39 14 38.5 C11 38.3 10 36.5 12 35 Z" fill="#fbbf24"/>
  <!-- Helmet Flare Groove -->
  <path d="M13.5 34.5 C24 35 38 36.2 50.5 38" stroke="#18181b" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Dome Highlight -->
  <path d="M19 25 C21 19.5 26 16.8 31.5 16.5" stroke="#18181b" stroke-width="2" stroke-linecap="round"/>
  <!-- Tactical Star Emblem -->
  <polygon points="31,20 32.6,23.6 36.5,24 33.5,26.6 34.4,30.4 31,28.4 27.6,30.4 28.5,26.6 25.5,24 29.4,23.6" fill="#b84242"/>
  <!-- Side Rivet -->
  <circle cx="42.5" cy="33" r="1.4" fill="#18181b"/>
</svg>
`;

fs.writeFileSync(path.join(OUT, 'favicon.svg'), svgContent, 'utf8');
console.log('icons/favicon.svg');

const targets = [
  ['icon-192.png', 192, 1.05],
  ['icon-512.png', 512, 1.05],
  ['icon-maskable-512.png', 512, 0.86],
  ['apple-touch-icon.png', 180, 1.0],
];
for (const [name, size, scale] of targets) {
  fs.writeFileSync(path.join(OUT, name), render(size, scale));
  console.log(`icons/${name}`);
}
