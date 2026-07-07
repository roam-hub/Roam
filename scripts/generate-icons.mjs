import sharp from "sharp";
import { writeFileSync } from "fs";

// Clean top-down airplane silhouette as SVG path (scaled to 100x100 viewBox)
const planePath = `
  M50 8
  C52 8 54 10 54 12
  L54 38
  L78 52
  L78 58
  L54 52
  L54 68
  L62 72
  L62 76
  L50 73
  L38 76
  L38 72
  L46 68
  L46 52
  L22 58
  L22 52
  L46 38
  L46 12
  C46 10 48 8 50 8
  Z
`;

function makeSVG(size) {
  const r = Math.round(size * 0.22);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#ff6a5a"/>
  <g transform="translate(${size / 2}, ${size / 2}) rotate(-45) scale(${size / 115})">
    <path d="${planePath}" fill="white" transform="translate(-50, -50)"/>
  </g>
</svg>`.trim();
}

async function writeIcon(path, size) {
  await sharp(Buffer.from(makeSVG(size)))
    .png()
    .toFile(path);
  console.log(`Written: ${path}`);
}

await writeIcon("public/icon-192.png", 192);
await writeIcon("public/icon-512.png", 512);
await writeIcon("public/apple-touch-icon.png", 180);
