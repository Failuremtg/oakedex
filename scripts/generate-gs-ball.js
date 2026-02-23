#!/usr/bin/env node
/**
 * Generates assets/images/gs-ball.png (GS Ball – gold/silver, True Master Collection icon).
 * Run: node scripts/generate-gs-ball.js
 * Requires: sharp (dev dependency)
 */

const path = require('path');
const fs = require('fs');

const ASSETS_IMAGES = path.join(__dirname, '..', 'assets', 'images');
const OUT = path.join(ASSETS_IMAGES, 'gs-ball.png');

// GS Ball: gold upper half, silver lower half, black band and center circle
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e8c547"/>
      <stop offset="50%" style="stop-color:#d4a82b"/>
      <stop offset="100%" style="stop-color:#b8860b"/>
    </linearGradient>
    <linearGradient id="silver" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#c0c0c0"/>
      <stop offset="50%" style="stop-color:#a0a0a0"/>
      <stop offset="100%" style="stop-color:#808080"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="none" stroke="#2a2a2a" stroke-width="2"/>
  <path d="M 2 32 A 30 30 0 0 1 62 32" fill="url(#gold)"/>
  <path d="M 2 32 A 30 30 0 0 0 62 32" fill="url(#silver)"/>
  <line x1="2" y1="32" x2="62" y2="32" stroke="#1a1a1a" stroke-width="3"/>
  <circle cx="32" cy="32" r="6" fill="#fff" stroke="#2a2a2a" stroke-width="2"/>
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
