// Site art and script loading rules (AGENTS.md "Site art and script loading"), checked by check-project.mjs.
// read(relativePath) returns the file's bytes or null; paths are relative to dist/ with forward slashes.
import path from 'node:path';

// Hard cap for any site-art file the pages load, and for any raster embedded in an SVG.
export const ART_HARD_CAP = 1024 * 1024;
// Kept on purpose; the pages themselves do not load them as site art.
export const ART_EXEMPT = new Map([
  ['ui/mdlxl-icon.png', 'full-size share image (og:image on the MDLxL pages)'],
  ['ui/unsanctionedmagic-name.png', 'linked from posts'],
  ['ui/author-space-dog.gif', 'MDLxL About page picture (page content, not site art)'],
]);
const ART = /(?:^|[^\w/.-])\.?\/?(ui\/[\w./-]+?\.(?:png|webp|svg|gif|jpe?g|avif))/g;
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+?\.m?js)(\?[^'"]*)?\1/g;
const SCRIPT_TAG = /<script\b[^>]*\bsrc="([^"]+?\.m?js)(\?[^"]*)?"/g;

const text = bytes => bytes.toString('utf8');

// Shell files: the page template and the stylesheets and scripts next to it.
export function shellFiles(list) {
  return list.filter(file => /^[^/]+\.(?:html|css|m?js)$/.test(file) || /^mdlxl\/tutorials\/[^/]+\.(?:css|m?js)$/.test(file));
}
// Script files that may import each other.
export function scriptFiles(list) {
  return list.filter(file => /\.m?js$/.test(file) && /^(?:[^/]+|vendor\/.+|whiteout\/.+|mdlxl\/.+)$/.test(file));
}

export function artProblems(read, list) {
  const problems = [], seen = new Set();
  for (const file of shellFiles(list)) {
    for (const match of text(read(file)).matchAll(ART)) {
      const asset = match[1];
      if (seen.has(asset) || ART_EXEMPT.has(asset)) continue;
      seen.add(asset);
      const bytes = read(asset);
      if (!bytes) continue; // Missing files are reported by the existing checks.
      if (bytes.length > ART_HARD_CAP) problems.push(`${asset} is ${bytes.length} bytes; site art must stay under ${ART_HARD_CAP} (use WebP at the displayed size).`);
      if (asset.endsWith('.svg')) {
        for (const [, data] of text(bytes).matchAll(/data:image\/[\w+.-]+;base64,([A-Za-z0-9+/=\s]+)/g)) {
          const size = Buffer.from(data, 'base64').length;
          if (size > ART_HARD_CAP) problems.push(`${asset} embeds a ${size}-byte raster; keep embedded rasters under ${ART_HARD_CAP} (lossless WebP at the needed size).`);
        }
      }
    }
  }
  return problems;
}

export function scriptProblems(read, list) {
  const keys = new Map();
  const add = (target, query, from) => {
    if (!keys.has(target)) keys.set(target, new Map());
    const byQuery = keys.get(target);
    if (!byQuery.has(query)) byQuery.set(query, []);
    byQuery.get(query).push(from);
  };
  for (const file of scriptFiles(list)) {
    for (const [, , specifier, query = ''] of text(read(file)).matchAll(IMPORT)) add(path.posix.join(path.posix.dirname(file), specifier), query, file);
  }
  for (const file of list.filter(file => /^[^/]+\.html$/.test(file))) {
    for (const [, src, query = ''] of text(read(file)).matchAll(SCRIPT_TAG)) if (!/^[a-z]+:/i.test(src)) add(path.posix.normalize(src.replace(/^\//, '')), query, file);
  }
  const problems = [];
  for (const [target, byQuery] of keys) {
    if (byQuery.size < 2) continue;
    problems.push(`${target} is loaded under ${byQuery.size} different keys, so a page downloads and runs it twice: ` +
      [...byQuery].map(([query, from]) => `${query || '(no key)'} from ${[...new Set(from)].join(', ')}`).join('; '));
  }
  return problems;
}

export function siteAssetProblems(read, list) {
  return [...artProblems(read, list), ...scriptProblems(read, list)];
}
