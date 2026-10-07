import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(project, 'dist');
const port = Number(process.env.PORT || 4178);
const studios = {
  '/__thumbnails.html': path.join(project, 'tools/army-formations.html'),
  '/__portraits.html': path.join(project, 'tools/portrait-studio.html'),
};
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.txt': 'text/plain', '.wasm': 'application/wasm', '.zip': 'application/zip',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/__portrait') {
      const name = url.searchParams.get('id');
      if (!/^[a-z0-9-]+$/.test(name)) throw Error('Bad name');
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      if (bytes.length > 4000000) throw Error('Too large');
      await fs.mkdir(path.join(root, 'thumbs'), {recursive: true});
      await fs.writeFile(path.join(root, 'thumbs', name + '.png'), bytes);
      res.end('Saved');
      return;
    }
    let file = studios[url.pathname] || path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    const relative = path.relative(root, file);
    if (!studios[url.pathname] && (relative.startsWith('..') || path.isAbsolute(relative))) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const bytes = await fs.readFile(file);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`LowPolyWorks: http://127.0.0.1:${port}/`));
