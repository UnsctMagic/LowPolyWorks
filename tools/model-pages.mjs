import {mdlxlSections,tutorialSlugs} from '../dist/mdlxl-routes.js';
import {syncModelUpdates} from './model-updates.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site = 'https://www.lowpolyworks.com';
const cataloguePath = '/warhammercraft/';
const catalogueTitle = 'Warhammer Fantasy Models for Warcraft III — WarhammerCraft';
const catalogueDescription = 'Browse Warhammer Fantasy armies, preview animated models in 3D, and download models for Warcraft III Classic.';
const armyPath = army => `/army/${army.id}/`;
const modelPath = row => `/model/${row.slug || row.id}/`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

function pageHead(template, title, description, metadata) {
  return template.replace(/<link rel="canonical" href="[^"]*">/, '')
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(description)}">`)
    .replace('</head>', () => `${metadata}\n</head>`);
}

function pageContent(template, content) {
  return template.replace(/(<main id="app"[^>]*>)[\s\S]*?(<\/main>)/, (_, open, close) => `${open}${content}${close}`);
}

export function cataloguePage(template, armies, rows, army) {
  const title = army ? `${army.name} Models for Warcraft III — LowPolyWorks` : catalogueTitle;
  const heading = army ? army.name : 'Warhammer Fantasy Models for Warcraft III';
  const description = army
    ? `Preview and download ${army.name} models for Warcraft III Classic from the WarhammerCraft catalogue.`
    : catalogueDescription;
  const url = site + (army ? armyPath(army) : cataloguePath);
  const links = army
    ? rows.filter(row => row.army === army.id).map(row => `<li><a href="${modelPath(row)}">${escape(row.name)}</a></li>`)
    : armies.map(entry => `<li><a href="${armyPath(entry)}">${escape(entry.name)}</a></li>`);
  const back = army ? `<p><a href="${cataloguePath}">All WarhammerCraft armies</a></p>` : '';
  const content = `<section class="project-heading"><h1>${escape(heading)}</h1><p>${escape(description)}</p>${back}<ul>\n${links.join('\n')}\n</ul></section>`;
  return pageContent(pageHead(template, title, description, `<link rel="canonical" href="${url}">`), content);
}

export function modelPage(template, row, thumbnail, army) {
  const url = site + modelPath(row);
  const image = `${site}/thumbs/unit-${row.id}.png${row.imageVersion ? '?v=' + encodeURIComponent(row.imageVersion) : ''}`;
  const description = (row.searchDescription ?? row.description).replace(/\s+/g, ' ').trim();
  const width = thumbnail.readUInt32BE(16), height = thumbnail.readUInt32BE(20);
  const metadata = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="LowPolyWorks">`,
    `<meta property="og:title" content="${escape(row.name)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="${width}">`,
    `<meta property="og:image:height" content="${height}">`,
    `<meta property="og:image:alt" content="${escape(row.name)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(row.name)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join('\n');
  const title = `${row.name} — Warcraft III Model — LowPolyWorks`;
  const summary = row.searchDescription ?? `Preview and download ${row.name}, a Warhammer Fantasy model for Warcraft III Classic.`;
  const content = [
    `<section class="project-heading"><h1>${escape(row.name)}</h1>`,
    `<p>${escape(summary)} <a href="${armyPath(army)}">${escape(army.name)}</a></p>`,
    `<img src="${image.slice(site.length)}" alt="${escape(row.name)}" width="${width}" height="${height}" style="max-width:100%;height:auto">`,
    ...row.description.trim().split(/\r?\n\s*\r?\n/).filter(text => text !== summary).map(text => `<p>${escape(text).replace(/\r?\n/g, '<br>')}</p>`),
    '</section>',
  ].join('\n');
  return pageContent(pageHead(template, title, summary, metadata), content);
}

export function previewTemplate(html) {
  return html.replace('<head>', '<head><base href="/">')
    .replace(/src="app\.js\?v=[^"]+"/, 'src="app.js?v=20261013-shredder-relaxed-dive"');
}

export function previewApp(app) {
  const oldRoute = "const [,kind,id]=location.hash.match(/^#(army|model)\\/(.+)$/)||[];";
  if (!app.includes(oldRoute)) throw Error('Model route owner changed');
  if (app.split('href="#model/${row.id}"').length !== 3 || app.split('const army=armies.find(a=>a.id===row.army);document.title=').length !== 2) throw Error('Model link owner changed');
  return app.replaceAll('href="#model/${row.id}"', 'href="/model/${row.id}/"')
    .replace(oldRoute, "const modelPath=location.pathname.match(/^\\/model\\/([a-z0-9-]+)\\/?$/);const [,kind,id]=(location.hash||(modelPath?'#model/'+modelPath[1]:'')).match(/^#(army|model)\\/(.+)$/)||[];")
    .replace("const army=armies.find(a=>a.id===row.army);document.title=", "history.replaceState(null,'','/model/'+row.id+'/'+location.search);const army=armies.find(a=>a.id===row.army);document.title=");
}

export function generateSearchFiles(root, rows, armies) {
  const urls = ['/', '/mdlxl/', cataloguePath, ...armies.map(armyPath), ...rows.map(modelPath)].map(route => site + route);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  return urls.length;
}

export function mdlxlPage(template, section='updates', tutorial) {
  const sectionNames={about:'About MDLxL',preview:'Preview',tutorials:'Tutorials',credits:'Credits'},guideNames={anchor:'Anchor',align:'Align',live:'Live Select',corpse:'Auto Corpse',glow:'Glow Up',emtr:'EMTR ribbons',optixl:'OptimizeXL',fx:'FX',uvgrid:'UV grid',spread:'Spread pieces'};
  const title = section==='updates'?'MDLxL — Warcraft III Model Editor — LowPolyWorks':(tutorial?guideNames[tutorial]+' tutorial':sectionNames[section])+' — MDLxL — LowPolyWorks';
  const description = "Download MDLxL, a Warcraft 3 SD model editor inspired by MDLVis. Edit meshes, UV maps and animations, and read the latest patch notes.";
  const url = `${site}/mdlxl/${section==='updates'?'':section+'/'}${tutorial?tutorialSlugs[tutorial]+'/':''}`;
  const metadata = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="LowPolyWorks">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${site}/ui/mdlxl-icon.png">`,
    `<meta name="twitter:card" content="summary">`,
  ].join('\n');
  return pageContent(pageHead(template, title, description, metadata), '<p class="loading">Loading…</p>');
}

export function generateModelPages(root) {
  syncModelUpdates(root);
  const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
  const armies = JSON.parse(fs.readFileSync(path.join(root, 'armies.json'), 'utf8'));
  const writePage = (route, html) => {
    const directory = path.join(root, route);
    fs.mkdirSync(directory, {recursive:true});
    fs.writeFileSync(path.join(directory, 'index.html'), html);
  };
  writePage(cataloguePath, cataloguePage(template, armies, rows));
  for (const army of armies) writePage(armyPath(army), cataloguePage(template, armies, rows, army));
  for (const row of rows) {
    const army = armies.find(entry => entry.id === row.army);
    const thumbnail = fs.readFileSync(path.join(root, 'thumbs', `unit-${row.id}.png`));
    writePage(modelPath(row), modelPage(template, row, thumbnail, army));
  }
  fs.mkdirSync(path.join(root, 'mdlxl'), {recursive:true});
  fs.writeFileSync(path.join(root, 'mdlxl', 'index.html'), mdlxlPage(template));
  for(const section of mdlxlSections.filter(section=>section!=='updates')){const directory=path.join(root,'mdlxl',section);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),mdlxlPage(template,section));}
  for(const tutorial of Object.keys(tutorialSlugs)){const directory=path.join(root,'mdlxl','tutorials',tutorialSlugs[tutorial]);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),mdlxlPage(template,'tutorials',tutorial));}
  generateSearchFiles(root, rows, armies);
  return rows.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Generated preview pages for ${generateModelPages(path.resolve('dist'))} models.`);
}
