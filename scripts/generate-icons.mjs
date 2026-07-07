import sharp from "sharp";
import { writeFileSync } from "fs";

// Material Design "flight" icon — clean top-down airplane, 24x24 viewBox, pointing up
// Rotated -45° so it points up-right
const MD_FLIGHT = `M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z`;

function makeSVG(size) {
  const r = Math.round(size * 0.22);
  // Scale so plane fills ~52% of icon
  const scale = (size * 0.52) / 24;
  const cx = size / 2;
  const cy = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#1b2640"/>
  <g transform="translate(${cx},${cy}) rotate(-45) scale(${scale}) translate(-12,-12)">
    <path d="${MD_FLIGHT}" fill="white"/>
  </g>
</svg>`;
}

async function writeIcon(path, size) {
  await sharp(Buffer.from(makeSVG(size))).png().toFile(path);
  console.log(`Written: ${path}`);
}

await writeIcon("public/icon-192.png", 192);
await writeIcon("public/icon-512.png", 512);
await writeIcon("public/apple-touch-icon.png", 180);
