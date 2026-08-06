import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public/favicon.svg'));
const sizes = [
  [192, 'pwa-192.png'],
  [512, 'pwa-512.png'],
  [180, 'apple-touch-icon.png'],
];

for (const [size, name] of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(root, 'public', name));
  console.log(`wrote public/${name}`);
}
