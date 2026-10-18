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

const BG = [22, 27, 21];             // #161B15
const BADGE_BG = [40, 50, 36];      // #283224
const BADGE_BORDER = [122, 127, 82]; // #7A7F52
const AMBER = [223, 191, 82];       // #DFBF52
const AMBER_DARK = [196, 162, 56];  // #C4A238
const STAR_RED = [115, 48, 40];     // #733028

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

// Evaluates point (u, v) for symmetrical front-view WWII combat helmet
function sampleHelmet(uRaw, vRaw, scale) {
  const uSigned = uRaw / scale;
  const u = Math.abs(uSigned);
  const v = vRaw / scale;

  // Circular tactical badge backing
  const rBadge = Math.hypot(u, v);
  let color = BG;
  if (rBadge <= 0.82) {
    color = rBadge >= 0.77 ? BADGE_BORDER : BADGE_BG;
  }

  // Chinstrap loop hanging symmetrically under helmet
  const strapD = Math.abs(Math.hypot(u / 0.32, (v - 0.18) / 0.30) - 1.0);
  if (strapD < 0.042 && v >= 0.20 && v <= 0.49) {
    color = AMBER_DARK;
    if (v >= 0.46 && u < 0.08) color = BADGE_BORDER;
  }

  // Inner helmet visor depth / face shadow
  if (v >= 0.18 && v <= 0.26 && u <= 0.44 && (v - 0.18) < (0.07 * (1 - (u / 0.44) * (u / 0.44)))) {
    color = BG;
  }

  // Upper dome: centered around (0, 0.04), rx = 0.54, ry = 0.50
  const domeX = u / 0.54;
  const domeY = (v - 0.04) / 0.50;
  const inUpperDome = v <= 0.16 && (domeX * domeX + domeY * domeY <= 1.0);

  // Lower flared rim / brow
  const rimBottomY = 0.18 + 0.09 * (u * u);
  const inSkirt = v >= 0.08 && v <= rimBottomY && u <= (0.54 + 0.12 * Math.max(0, v - 0.08));

  // Rounded ear flare lips
  const inEarLip = Math.hypot((u - 0.52) / 0.08, (v - 0.19) / 0.05) <= 1.0;

  const inHelmetShell = inUpperDome || inSkirt || inEarLip;

  if (inHelmetShell) {
    color = AMBER;

    // Brow visor crease line across front
    const browY = 0.13 + 0.07 * (u * u);
    if (Math.abs(v - browY) < 0.022 && u < 0.54) {
      color = [32, 40, 30]; // dark crease #20281E
    }

    // Specular crown highlight arch on dome (symmetrical)
    const hlDist = Math.abs(Math.hypot(u / 0.40, (v - 0.02) / 0.36) - 1.0);
    if (v < -0.06 && v > -0.28 && hlDist < 0.032 && u < 0.35) {
      color = [244, 241, 232]; // #F4F1E8
    }

    // Symmetrical air vents / rivets at u = 0.38, v = 0.02
    if (Math.hypot(u - 0.38, v - 0.02) < 0.032) {
      color = [32, 40, 30];
    }

    // Centered tactical red star emblem
    const star = starPolygon(0, -0.15, 0.15, 0.062);
    if (inPolygon(uSigned, v, star)) {
      color = STAR_RED;
    }
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

// Write crisp SVG favicon as well (Symmetrical Front View)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#161B15"/>
  <circle cx="32" cy="32" r="27" fill="#283224" stroke="#7A7F52" stroke-width="2"/>
  <!-- Chinstrap (Symmetrical front loop) -->
  <path d="M21 38.5 C21 47.5, 26 51, 32 51 C38 51, 43 47.5, 43 38.5" stroke="#C4A238" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M29.5 51 H34.5" stroke="#7A7F52" stroke-width="2.8" stroke-linecap="round"/>
  <!-- Inner helmet brow opening / shadow -->
  <path d="M16 40 C21 43.5, 43 43.5, 48 40 C44 42.5, 20 42.5, 16 40 Z" fill="#161B15"/>
  <!-- Helmet Shell (Symmetrical Front View) -->
  <path d="M12.5 38.5 C13 28, 17 14, 32 14 C47 14, 51 28, 51.5 38.5 C51.5 40.5, 48 42, 44 41 C37 39.5, 27 39.5, 20 41 C16 42, 12.5 40.5, 12.5 38.5 Z" fill="#DFBF52"/>
  <!-- Visor / Brow Arch Line -->
  <path d="M14 37.5 C20 35.5, 44 35.5, 50 37.5" stroke="#20281E" stroke-width="2" stroke-linecap="round"/>
  <!-- Lower rim line -->
  <path d="M16 40.5 C23 39, 41 39, 48 40.5" stroke="#20281E" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Symmetrical Crown Highlight Arch -->
  <path d="M22 26 C24 18.5, 28 16.5, 32 16.5 C36 16.5, 40 18.5, 42 26" stroke="#F4F1E8" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
  <!-- Symmetrical Rivets / Air Vents -->
  <circle cx="18.5" cy="31.5" r="1.3" fill="#20281E"/>
  <circle cx="45.5" cy="31.5" r="1.3" fill="#20281E"/>
  <!-- Tactical Red Star Emblem -->
  <polygon points="32,19.5 33.2,23.2 36.9,23.2 33.9,25.4 35,29.1 32,26.9 29,29.1 30.1,25.4 27.1,23.2 30.8,23.2" fill="#733028"/>
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
