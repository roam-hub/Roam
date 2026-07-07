import sharp from "sharp";

const SRC = "./scripts/source-icon.png";

const trimmed = await sharp(SRC)
  .trim({ background: "#e5e5ea", threshold: 40 })
  .toBuffer({ resolveWithObject: true });

console.log(`Trimmed to: ${trimmed.info.width}x${trimmed.info.height}`);

// Composite onto a solid navy background so rounded-corner grey becomes navy
async function makeIcon(destPath, size) {
  await sharp(trimmed.data)
    .resize(size, size)
    .flatten({ background: "#1b2640" })
    .png()
    .toFile(destPath);
}

await makeIcon("public/icon-512.png", 512);
await makeIcon("public/icon-192.png", 192);
await makeIcon("public/apple-touch-icon.png", 180);

console.log("Written: public/icon-512.png, icon-192.png, apple-touch-icon.png");
