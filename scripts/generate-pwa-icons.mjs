// Generates the PWA icon set in public/ from an inline SVG.
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

// FarmForecast mark: deep-green tile, rising harvest-gold trend line,
// topped with a blueberry. `pad` shrinks the artwork for maskable icons
// so the safe zone is respected.
function iconSvg({ size, pad }) {
  const s = size;
  const p = pad * s;
  const artScale = (s - 2 * p) / 512;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${pad > 0 ? 0 : s * 0.18}" fill="#2f6b3a"/>
  <g transform="translate(${p} ${p}) scale(${artScale})">
    <!-- rising bars -->
    <rect x="80" y="312" width="72" height="120" rx="14" fill="#e9efe4" opacity="0.55"/>
    <rect x="184" y="252" width="72" height="180" rx="14" fill="#e9efe4" opacity="0.75"/>
    <rect x="288" y="192" width="72" height="240" rx="14" fill="#e9efe4"/>
    <!-- trend line -->
    <path d="M96 268 L220 200 L332 132" stroke="#f0c94a" stroke-width="30"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <!-- blueberry at the tip -->
    <circle cx="392" cy="112" r="54" fill="#4a5fa5"/>
    <circle cx="374" cy="94" r="14" fill="#ffffff" opacity="0.35"/>
    <!-- leaf -->
    <path d="M392 58 Q418 28 452 34 Q446 70 414 76 Q398 72 392 58 Z" fill="#8fbf6f"/>
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  { file: "icon-maskable-192.png", size: 192, pad: 0.1 },
  { file: "icon-maskable-512.png", size: 512, pad: 0.1 },
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
];

for (const { file, size, pad } of targets) {
  const svg = Buffer.from(iconSvg({ size, pad }));
  await sharp(svg).png().toFile(path.join(outDir, file));
  console.log(`wrote public/${file}`);
}
