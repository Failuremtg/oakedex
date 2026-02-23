#!/usr/bin/env node
/**
 * Generates assets/images/pokeball-bw.png (black and white Poké Ball).
 * Run: node scripts/generate-pokeball-bw.js
 * Requires: sharp (dev dependency)
 */

const path = require('path');
const fs = require('fs');

const ASSETS_IMAGES = path.join(__dirname, '..', 'assets', 'images');
const OUT = path.join(ASSETS_IMAGES, 'pokeball-bw.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="none" stroke="#333" stroke-width="2"/>
  <path d="M 2 32 A 30 30 0 0 1 62 32" fill="#1a1a1a"/>
  <path d="M 2 32 A 30 30 0 0 0 62 32" fill="#fff"/>
  <line x1="2" y1="32" x2="62" y2="32" stroke="#fff" stroke-width="4"/>
  <circle cx="32" cy="32" r="5" fill="#fff" stroke="#333" stroke-width="2"/>
</svg>
`.trim();

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install sharp --save-dev');
    process.exit(1);
  }
  if (!fs.existsSync(ASSETS_IMAGES)) {
    fs.mkdirSync(ASSETS_IMAGES, { recursive: true });
  }
  await sharp(Buffer.from(svg))
    .resize(128, 128)
    .png()
    .toFile(OUT);
  console.log('Generated:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
