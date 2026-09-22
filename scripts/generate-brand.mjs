import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

// Hidden's custom lettering: clipped corners, rounded counters, rising crossbar.
const h = 'M8 0H27V40H53V0H80V92L72 100H53V61H27V100H0V8Z';
const letters = [
  [0, h],
  [93, 'M0 8Q0 0 8 0H17Q25 0 25 8V15H0ZM0 29H25V88L13 100H0Z'],
  [
    130,
    'M53 0H79V88L67 100H30Q0 100 0 68V62Q0 29 30 29H53ZM53 51H34Q25 51 25 64V67Q25 78 34 78H53Z',
  ],
  [
    221,
    'M53 0H79V88L67 100H30Q0 100 0 68V62Q0 29 30 29H53ZM53 51H34Q25 51 25 64V67Q25 78 34 78H53Z',
  ],
  [
    312,
    'M73 70H25Q26 80 38 80H72L60 100H35Q0 100 0 65Q0 29 36 29Q73 29 73 61ZM25 55H49Q47 47 37 47Q28 47 25 55Z',
  ],
  [397, 'M0 29H48Q78 29 78 61V88L66 100H53V63Q53 51 42 51H25V100H0Z'],
];
const defs = `<defs><linearGradient id="color" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c2b2ee"/><stop offset=".34" stop-color="#c797bc"/><stop offset=".66" stop-color="#928bc9"/><stop offset="1" stop-color="#5a597f"/></linearGradient><radialGradient id="light"><stop stop-color="#f3b9d2" stop-opacity=".8"/><stop offset="1" stop-color="#e7c1ee" stop-opacity="0"/></radialGradient><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".3"/></filter></defs>`;
function svg(word) {
  const shapes = word ? letters : [[0, h]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -5 ${word ? 505 : 110} 110" role="img" aria-label="Hidden">${defs}<g transform="translate(8 0) skewX(-5)">${shapes.map(([x, p]) => `<g transform="translate(${x} 0)" filter="url(#soft)"><path d="${p}" fill="url(#color)" fill-rule="evenodd"/><path d="${x === 0 ? 'M12 0H27V39L65 31V0H80V88L68 100H53V57L27 63V100H0V12Z' : p}" fill="url(#light)" fill-rule="evenodd"/></g>`).join('')}</g></svg>`;
}
writeFileSync('public/hidden-logo.svg', svg(false));
writeFileSync('public/hidden-wordmark.svg', svg(true));
writeFileSync('src/app/icon.svg', svg(false));
await sharp(Buffer.from(svg(false)))
  .resize(512, 512, { fit: 'contain', background: '#00000000' })
  .png()
  .toFile('public/hidden-logo.png');
