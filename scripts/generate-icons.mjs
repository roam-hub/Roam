import sharp from "sharp";
import { writeFileSync } from "fs";

function makeSVG(size) {
  const r = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.58);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#1b2640"/>
  <text
    x="${size / 2}"
    y="${size / 2}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    text-anchor="middle"
    dominant-baseline="central"
    fill="white"
  >✈</text>
</svg>`;
}

async function writeIcon(path, size) {
  await sharp(Buffer.from(makeSVG(size))).png().toFile(path);
  console.log(`Written: ${path}`);
}

await writeIcon("public/icon-192.png", 192);
await writeIcon("public/icon-512.png", 512);
await writeIcon("public/apple-touch-icon.png", 180);
