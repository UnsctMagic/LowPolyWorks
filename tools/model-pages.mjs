import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site = 'https://www.lowpolyworks.com';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

export function modelPage(template, row, thumbnail) {
  const url = `${site}/model/${row.id}/`;
  const image = `${site}/thumbs/unit-${row.id}.png`;
  const description = row.description.replace(/\s+/g, ' ').trim();
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
  return template.replace(/<title>.*?<\/title>/, `<title>${escape(row.name)} — LowPolyWorks</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(description)}">`)
    .replace('</head>', `${metadata}\n</head>`);
}

export function previewTemplate(html) {
  return html.replace('<head>', '<head><base href="/">')
    .replace(/src="app\.js\?v=[^"]+"/, 'src="app.js?v=20261007-model-previews"');
}

export function previewApp(app) {
  const oldRoute = "const [,kind,id]=location.hash.match(/^#(army|model)\\/(.+)$/)||[];";
  if (!app.includes(oldRoute)) throw Error('Model route owner changed');
  if (app.split('href="#model/${row.id}"').length !== 3 || app.split('const army=armies.find(a=>a.id===row.army);document.title=').length !== 2) throw Error('Model link owner changed');
  return app.replaceAll('href="#model/${row.id}"', 'href="/model/${row.id}/"')
    .replace(oldRoute, "const modelPath=location.pathname.match(/^\\/model\\/([a-z0-9-]+)\\/?$/);const [,kind,id]=(location.hash||(modelPath?'#model/'+modelPath[1]:'')).match(/^#(army|model)\\/(.+)$/)||[];")
    .replace("const army=armies.find(a=>a.id===row.army);document.title=", "history.replaceState(null,'','/model/'+row.id+'/'+location.search);const army=armies.find(a=>a.id===row.army);document.title=");
}

export function generateModelPages(root) {
  const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.json'), 'utf8'));
  for (const row of rows) {
    const directory = path.join(root, 'model', row.id);
    fs.mkdirSync(directory, {recursive:true});
    fs.writeFileSync(path.join(directory, 'index.html'), modelPage(template, row, fs.readFileSync(path.join(root, 'thumbs', `unit-${row.id}.png`))));
  }
  return rows.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Generated preview pages for ${generateModelPages(path.resolve('dist'))} models.`);
}
