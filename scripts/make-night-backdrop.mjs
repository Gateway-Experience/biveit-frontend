#!/usr/bin/env node
// Intentions: the dark theme's backdrops are the light theme's artwork at night -- same pictures, recoloured. The
// daytime SVGs in public/ are the originals; this writes a `-night` copy of each by swapping every colour in them
// for its night counterpart (_NIGHT_COLORS). Run it again after changing any of the daytime art:
//
//   node scripts/make-night-backdrop.mjs
//
// A colour that isn't in the map stops it with an error, so new art can't slip through half recoloured.
// References: `daydream-backdrop` and its `-night` twin in src/styles/index.css.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const _PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// The pieces that get a night copy. The rabbit has its own, since its white means "pale shape", not "cloud".
const _FILES = [
  'daydream-sky.svg',
  'daydream-sky-left.svg',
  'daydream-meadow-back.svg',
  'daydream-meadow-front.svg',
  'daydream-tree.svg',
  'daydream-grass-left.svg',
  'daydream-grass-right.svg',
];

// Day colour -> night colour. The sky's pale blues and creams turn deep blue (lighter towards the horizon, like the
// last light), the sun's warm glow becomes cold moonlight, clouds dim to blue-grey, the meadow and tree go dark
// blue-green, and the stars/sparkles and lavender flowers keep shining.
const _NIGHT_COLORS = {
  // sky gradient: top, middle, horizon
  '#DCECF1': '#121A36',
  '#EFF4ED': '#18213F',
  '#F7F5E5': '#212C48',
  // the sun's glow -> moonlight
  '#FFF9D9': '#3C4C7E',
  // sparkles -> stars
  '#FFFDF0': '#FFF6D2',
  // clouds and their highlights; white flowers
  '#FFFDF7': '#2B3858',
  '#FFFFFF': '#40507A',
  // distant meadow
  '#E7EDDF': '#1C3134',
  '#D9E3D0': '#16282C',
  '#E5EBE0': '#1D3235',
  '#D5DFCC': '#1A2E31',
  '#CFDCC4': '#1F3537',
  // grass and leaves
  '#B9CDA1': '#2C4B42',
  '#9DB38A': '#233E37',
  '#A7B48F': '#28433C',
  '#B2C1A6': '#2A443F',
  // the tree
  '#95AC8F': '#203B35',
  '#9EAC91': '#243F38',
  '#A3AB93': '#27413A',
  '#ABBDA0': '#2A473F',
  '#B8C5A9': '#2F5047',
  '#C2D0AE': '#33564C',
  '#C4C6AF': '#304B45',
  '#D3DFBE': '#385B51',
  // lavender flowers, a touch dimmer
  '#B8A4D6': '#9583C2',
  // the projects page's website outlines: lime and lavender lines, kept bright enough to read on the dark page
  '#A8BB88': '#5E7346',
  '#C9F56A': '#B5E05C',
  '#A28CC8': '#8673B5',
  '#AB96CF': '#8E7CBC',
  '#B5A4CF': '#9888C0',
  '#B8A4E8': '#A08CDA',
};

const _RABBIT_NIGHT_COLOR = '#B9C4DE';

// [Pure] The SVG with every colour swapped for its night one; throws on one the map doesn't know.
function _toNight(svg, fileName) {
  return svg.replace(/#[0-9A-Fa-f]{6}\b/g, (color) => {
    const nightColor = _NIGHT_COLORS[color.toUpperCase()];
    if (!nightColor) {
      throw new Error(`${fileName}: no night colour for ${color} -- add it to _NIGHT_COLORS`);
    }
    return nightColor;
  });
}

for (const fileName of _FILES) {
  const nightName = fileName.replace(/\.svg$/, '-night.svg');
  writeFileSync(join(_PUBLIC_DIR, nightName), _toNight(readFileSync(join(_PUBLIC_DIR, fileName), 'utf8'), fileName));
  console.log(`wrote public/${nightName}`);
}
const rabbit = readFileSync(join(_PUBLIC_DIR, 'daydream-rabbit.svg'), 'utf8').replace(/#FFFFFF/gi, _RABBIT_NIGHT_COLOR);
writeFileSync(join(_PUBLIC_DIR, 'daydream-rabbit-night.svg'), rabbit);
console.log('wrote public/daydream-rabbit-night.svg');
