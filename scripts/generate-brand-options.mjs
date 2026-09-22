import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const base = readFileSync('public/hidden-wordmark.svg','utf8');
const variants = [
 ['A','Current','The version currently in the app.',base],
 ['B','Soft depth','Subtle lavender depth behind the same lettering.',base.replace('<defs>','<defs><filter id="depth" x="-20%" y="-30%" width="150%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/><feOffset dx="3" dy="5" result="offset"/><feFlood flood-color="#8071b2" flood-opacity=".5"/><feComposite in2="offset" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>').replace('</defs>','</defs><g filter="url(#depth)">').replace('</svg>','</g></svg>')],
 ['C','Frosted','Lighter pink and lilac, with hazier edges.',base.replaceAll('#c2b2ee','#e0d7f4').replaceAll('#c797bc','#e5bad1').replaceAll('#928bc9','#ada9df').replaceAll('#5a597f','#787baa').replace('stdDeviation=".3"','stdDeviation="1.1"')],
 ['D','Flow','A gentler H crossbar with a slight forward lean.',base.replace('M12 0H27V39L65 31V0H80V88L68 100H53V57L27 63V100H0V12Z','M8 0H27V40H53V0H80V92L72 100H53V61H27V100H0V8Z').replace('viewBox="-5 -5 485 110"','viewBox="-12 -5 505 110"').replace('</defs>','</defs><g transform="translate(8 0) skewX(-5)">').replace('</svg>','</g></svg>')],
 ['E','Afterglow','Deeper violet with a warm pink center.',base.replaceAll('#c2b2ee','#b9a5e7').replaceAll('#c797bc','#e5a2c0').replaceAll('#928bc9','#796fbd').replaceAll('#5a597f','#383655').replaceAll('#f3b9d2','#f8c1d5')],
 ['F','Haze','Soft photographic texture inside the letter shapes.',null],
];
const photo = readFileSync('assets/brand/photo-data.txt','utf8').trim();
const paths = [...base.matchAll(/<g transform="translate\(([^)]+)\)"[^>]*><path d="([^"]+)"/g)].map(m=>`<path transform="translate(${m[1]})" d="${m[2]}" clip-rule="evenodd"/>`).join('');
variants[5][3]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 485 110"><defs><clipPath id="letters">${paths}</clipPath><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs><g clip-path="url(#letters)"><rect width="475" height="100" fill="#b7a6d0"/><image href="${photo}" x="-150" y="-50" width="775" height="200" preserveAspectRatio="none" filter="url(#blur)"/><rect width="475" height="100" fill="#e0c4e9" opacity=".25"/></g></svg>`;
const composite=[];
for (const [i,[id,name,description,svg]] of variants.entries()) {
 writeFileSync(`public/brand-options/${id}.svg`,svg);
 const x=30+(i%2)*690,y=100+Math.floor(i/2)*310;
 const card=Buffer.from(`<svg width="660" height="280"><rect width="660" height="280" rx="22" fill="white"/><text x="28" y="38" font-family="sans-serif" font-size="22" font-weight="bold" fill="#24212e">${id} · ${name}</text><text x="28" y="249" font-family="sans-serif" font-size="17" fill="#77717f">${description}</text></svg>`);
 composite.push({input:card,left:x,top:y});
 composite.push({input:await sharp(Buffer.from(svg)).resize(565,128).png().toBuffer(),left:x+42,top:y+75});
}
const header=Buffer.from('<svg width="1400" height="85"><text x="40" y="55" font-family="sans-serif" font-size="32" font-weight="bold" fill="#24212e">Hidden / Wordmark directions</text></svg>');
await sharp({create:{width:1400,height:1040,channels:3,background:'#f3f1f6'}}).composite([{input:header,left:0,top:0},...composite]).png().toFile('outputs/branding/hidden-options.png');
writeFileSync('public/brand-options/index.html',`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hidden — logo options</title><style>body{margin:0;background:#f3f1f6;color:#24212e;font:16px system-ui;padding:32px}main{max-width:1200px;margin:auto}h1{font-size:28px}p{color:#77717f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{background:white;border-radius:20px;padding:24px}img{width:100%;height:150px;object-fit:contain}h2{font-size:20px}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><main><h1>Hidden / Wordmark directions</h1><p>Pick A–F. The app still uses A.</p><div class="grid">${variants.map(([id,name,desc])=>`<article><h2>${id} · ${name}</h2><img src="${id}.svg" alt="Hidden ${name} wordmark"><p>${desc}</p></article>`).join('')}</div></main></body></html>`);
