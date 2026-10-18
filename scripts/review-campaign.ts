import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { WORLDS } from '../src/shared/config';
import type { Level } from '../src/shared/types';

const files = (await readdir('levels')).filter(name => name.endsWith('.json')).sort();
const levels: Level[] = await Promise.all(files.map(name => readFile(`levels/${name}`, 'utf8').then(JSON.parse)));
const data = JSON.stringify(levels).replaceAll('<', '\\u003c');
const palettes = JSON.stringify(WORLDS);
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas da campanha · Raízes de Ametista</title>
<style>body{margin:0;padding:32px;background:#101e19;color:#e8d5ab;font:14px system-ui}h1{font:32px Georgia;margin:0 0 10px}p{color:#9eb39e;line-height:1.6}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}article{background:#182a22;border:1px solid #425444;border-radius:8px;padding:18px}h2{font-size:15px;margin:8px 0}header{display:flex;justify-content:space-between;color:#d6be80;font-size:12px}.map{height:260px;display:flex;align-items:center;justify-content:center;background:#0c1713;margin:14px 0}canvas{max-width:100%;max-height:100%;image-rendering:pixelated}small{color:#99b09c}button{padding:10px 16px;background:#d7c08b;border:0;border-radius:5px;margin:6px 0 24px;cursor:pointer}@media(max-width:1000px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){main{grid-template-columns:1fr}body{padding:18px}}</style>
<h1>Raízes de Ametista · Atlas da nova campanha</h1><p>20 desenhos independentes, de 24 × 24 a 46 × 38. Verde: entrada · dourado: portal · roxo: gemas · azul: água e runas · vermelho: perigos. O tamanho das células é igual em todos os mapas.</p><button id="objects">Ocultar objetos</button><main></main><script>
const levels=${data},worlds=${palettes};let objects=true;const main=document.querySelector('main');
for(const level of levels){const card=document.createElement('article');card.innerHTML='<header><span>FASE '+level.id+'</span><span>'+level.map[0].length+' × '+level.map.length+'</span></header><h2>'+level.name+'</h2><small>'+level.layout+'</small><div class="map"><canvas width="'+level.map[0].length*6+'" height="'+level.map.length*6+'"></canvas></div><small>'+worlds[level.world].name+' · '+level.quota+' gemas · '+level.targetSeconds+' s</small>';main.append(card)}
function draw(){document.querySelectorAll('canvas').forEach((canvas,i)=>{const level=levels[i],w=worlds[level.world],c=canvas.getContext('2d');c.imageSmoothingEnabled=false;for(let y=0;y<level.map.length;y++)for(let x=0;x<level.map[0].length;x++){const t=level.map[y][x];c.fillStyle=t==='#'||t==='*'?'#0c1713':w.stone;c.fillRect(x*6,y*6,6,6);if(!objects)continue;const color=t==='@'||t==='2'?'#8bebb1':t==='E'?'#ffe39a':t==='d'?'#c397ff':'~='.includes(t)?'#6bb5d1':t==='t'?'#62f5eb':'^!><uvnmh'.includes(t)?'#f17f74':'abcABClpG'.includes(t)?'#f4b964':t==='s'||t==='r'||t==='$'?'#eea0bc':'fiXWO'.includes(t)?'#c7e1ad':t===','?'#49834b':null;if(color){c.fillStyle=color;c.fillRect(x*6+1,y*6+1,4,4)}}})}draw();document.querySelector('button').onclick=()=>{objects=!objects;document.querySelector('button').textContent=objects?'Ocultar objetos':'Mostrar objetos';draw()};</script></html>`;
await writeFile('docs/campaign-preview.html', html);
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('docs/campaign-preview.html')).href);
  if (await page.locator('canvas').count() !== 20 || errors.length) throw new Error('Falha ao gerar atlas da campanha.');
  await page.screenshot({ path: 'docs/screenshots/campaign-overview.png', fullPage: true });
  await page.getByRole('button', { name: 'Ocultar objetos' }).click();
  await page.getByRole('button', { name: 'Mostrar objetos' }).waitFor();
  console.log('Atlas com 20 mapas distintos gerado; visualização e alternância de objetos verificadas.');
} finally { await browser.close(); }
