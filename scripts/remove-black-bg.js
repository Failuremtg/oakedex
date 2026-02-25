/**
 * One-off: make black background transparent in hero-promo.png
 * Run from repo root: node scripts/remove-black-bg.js
 */
const { Jimp } = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'landing', 'assets', 'hero-promo.png');
const outputPath = inputPath;
const threshold = 45; // pixels with R,G,B all below this become transparent

Jimp.read(inputPath)
  .then((img) => {
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
      const r = img.bitmap.data[idx];
      const g = img.bitmap.data[idx + 1];
      const b = img.bitmap.data[idx + 2];
      if (r <= threshold && g <= threshold && b <= threshold) {
        img.bitmap.data[idx + 3] = 0;
      }
    });
    return img.write(outputPath);
  })
  .then(() => console.log('Done: black background made transparent.', outputPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
