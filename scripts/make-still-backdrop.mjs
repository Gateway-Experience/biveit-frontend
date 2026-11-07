#!/usr/bin/env node
// Intentions: phones get the backdrop's pictures without their animations. SVG animations inside a background image
// get redrawn every frame, which keeps a phone busy (and warm) even on a page nobody's touching. Each picture already
// says how it looks standing still, in its reduced-motion block, so a `-still` copy just applies that block for
// everyone. Run it again after changing any of the art, day or night (so after make-night-backdrop.mjs):
//
//   node scripts/make-still-backdrop.mjs
//
// References: `daydream-backdrop` and its `-night` twin in src/styles/index.css, where these get swapped in.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const _PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const _PIECES = ['sky', 'sky-left', 'meadow-back', 'meadow-front', 'tree', 'grass-left', 'grass-right'];
const _FILES = _PIECES.flatMap(piece => [`daydream-${piece}.svg`, `daydream-${piece}-night.svg`]);

const _REDUCED_MOTION_BLOCK = /@media\(prefers-reduced-motion:reduce\)\{(.*)\}\s*$/m;

// [Pure] The SVG with its reduced-motion rules always on; throws if a picture has none, so new art can't slip through
// still animated.
function _toStill(svg, fileName) {
  if (!_REDUCED_MOTION_BLOCK.test(svg)) {
    throw new Error(`${fileName}: no reduced-motion block to apply`);
  }
  return svg.replace(_REDUCED_MOTION_BLOCK, '$1');
}

for (const fileName of _FILES) {
  const stillName = fileName.replace(/\.svg$/, '-still.svg');
  writeFileSync(join(_PUBLIC_DIR, stillName), _toStill(readFileSync(join(_PUBLIC_DIR, fileName), 'utf8'), fileName));
  console.log(`wrote public/${stillName}`);
}
