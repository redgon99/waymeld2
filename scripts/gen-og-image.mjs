import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// 소셜 카드 권장 비율 1.91:1 — 잘라내면 목업 화면이 잘리므로 브랜드 배경 위에 전체를 얹는다.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public/landing/hero.png');
const target = join(root, 'public/og-default.png');

await sharp(source)
  .resize(1200, 630, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
  .flatten({ background: { r: 15, g: 23, b: 42 } })
  .png({ quality: 90 })
  .toFile(target);

console.log('wrote public/og-default.png');
