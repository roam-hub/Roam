import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

function makeIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.22;

  // Coral/orange background with rounded corners
  ctx.fillStyle = "#ff6a5a";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Draw white plane, centered, angled 45° up-right
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.52; // scale

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4); // 45° tilt (nose points up-right)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();

  // Fuselage (tall narrow rounded body)
  const fw = s * 0.18;
  const fh = s * 0.72;
  ctx.roundRect(-fw / 2, -fh / 2, fw, fh, fw / 2);
  ctx.fill();

  // Nose cone on top
  ctx.beginPath();
  ctx.moveTo(-fw / 2, -fh / 2);
  ctx.quadraticCurveTo(-fw / 2, -fh / 2 - s * 0.18, 0, -fh / 2 - s * 0.24);
  ctx.quadraticCurveTo(fw / 2, -fh / 2 - s * 0.18, fw / 2, -fh / 2);
  ctx.closePath();
  ctx.fill();

  // Main wings (wide swept)
  ctx.beginPath();
  ctx.moveTo(-fw / 2, -fh * 0.08);
  ctx.lineTo(-s * 0.52, s * 0.16);
  ctx.lineTo(-s * 0.42, s * 0.2);
  ctx.lineTo(-fw / 2, s * 0.04);
  ctx.lineTo(fw / 2, s * 0.04);
  ctx.lineTo(s * 0.42, s * 0.2);
  ctx.lineTo(s * 0.52, s * 0.16);
  ctx.lineTo(fw / 2, -fh * 0.08);
  ctx.closePath();
  ctx.fill();

  // Tail fins
  ctx.beginPath();
  ctx.moveTo(-fw / 2, fh * 0.28);
  ctx.lineTo(-s * 0.26, fh * 0.44);
  ctx.lineTo(-s * 0.2, fh * 0.48);
  ctx.lineTo(-fw / 2, fh * 0.38);
  ctx.lineTo(fw / 2, fh * 0.38);
  ctx.lineTo(s * 0.2, fh * 0.48);
  ctx.lineTo(s * 0.26, fh * 0.44);
  ctx.lineTo(fw / 2, fh * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  return canvas.toBuffer("image/png");
}

writeFileSync("public/icon-192.png", makeIcon(192));
writeFileSync("public/icon-512.png", makeIcon(512));
writeFileSync("public/apple-touch-icon.png", makeIcon(180));
console.log("Icons written to public/");
