import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

// Hidden lettering with a photographic fill and softly rounded H.
const h =
  'M8 0H27V39H53V0H72Q80 0 80 8V92Q80 100 72 100H53V62H27V100H8Q0 100 0 92V8Q0 0 8 0Z';
const letters = [
  [0, h],
  [93, 'M0 8Q0 0 8 0H17Q25 0 25 8V15H0ZM0 29H25V92Q25 100 17 100H0Z'],
  [
    130,
    'M53 0H79V92Q79 100 71 100H30Q0 100 0 68V62Q0 29 30 29H53ZM53 51H34Q25 51 25 64V67Q25 78 34 78H53Z',
  ],
  [
    221,
    'M53 0H79V92Q79 100 71 100H30Q0 100 0 68V62Q0 29 30 29H53ZM53 51H34Q25 51 25 64V67Q25 78 34 78H53Z',
  ],
  [
    312,
    'M73 70H25Q26 80 38 80H66Q73 100 60 100H35Q0 100 0 65Q0 29 36 29Q73 29 73 61ZM25 55H49Q47 47 37 47Q28 47 25 55Z',
  ],
  [397, 'M0 29H48Q78 29 78 61V92Q78 100 70 100H53V63Q53 51 42 51H25V100H0Z'],
];
const photo = readFileSync('assets/brand/photo-data.txt', 'utf8').trim();
function svg(word) {
  const shapes = word ? letters : [[0, h]];
  const width = word ? 475 : 80;
  const paths = shapes
    .map(
      ([x, p]) =>
        `<path transform="translate(${x} 0)" d="${p}" clip-rule="evenodd"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 ${width + 10} 110" role="img" aria-label="Hidden"><defs><clipPath id="letters">${paths}</clipPath><filter id="hidden-photo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${word ? 9 : 3}"/></filter><filter id="volume" x="-15%" y="-20%" width="130%" height="145%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="shape"/><feSpecularLighting in="shape" surfaceScale="4" specularConstant=".65" specularExponent="16" lighting-color="#fff4ff" result="light"><feDistantLight azimuth="225" elevation="50"/></feSpecularLighting><feComposite in="light" in2="SourceAlpha" operator="in" result="shine"/><feBlend in="SourceGraphic" in2="shine" mode="screen"/><feGaussianBlur stdDeviation=".65"/></filter></defs><g filter="url(#volume)"><g clip-path="url(#letters)"><rect x="-5" y="-5" width="${width + 10}" height="110" fill="#aea0c9"/><image href="${photo}" x="${word ? -150 : -35}" y="-50" width="${word ? 775 : 150}" height="200" preserveAspectRatio="none" filter="url(#hidden-photo)"/><rect width="${width}" height="100" fill="#b8a1e7" opacity=".12"/></g></g></svg>`;
}
writeFileSync('public/hidden-logo.svg', svg(false));
writeFileSync('public/hidden-wordmark.svg', svg(true));
writeFileSync('src/app/icon.svg', svg(false));
await sharp(Buffer.from(svg(false)))
  .resize(512, 512, { fit: 'contain', background: '#00000000' })
  .png()
  .toFile('public/hidden-logo.png');
