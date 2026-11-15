import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ART_HARD_CAP, siteAssetProblems} from './site-assets.mjs';

const site = files => {
  const bytes = Object.fromEntries(Object.entries(files).map(([name, value]) => [name, Buffer.isBuffer(value) ? value : Buffer.from(value)]));
  return [name => bytes[name] ?? null, Object.keys(bytes)];
};
const big = Buffer.alloc(ART_HARD_CAP + 1);
const small = Buffer.alloc(1000);

test('site art the pages load must stay under the hard cap', () => {
  const ok = site({'index.html': '<image href="ui/header.webp"/>', 'style.css': ".a{background:url('ui/stone.webp')}", 'ui/header.webp': small, 'ui/stone.webp': small});
  assert.deepEqual(siteAssetProblems(...ok), []);
  const heavy = site({'index.html': '<image href="ui/header.png"/>', 'style.css': '', 'ui/header.png': big});
  assert.match(siteAssetProblems(...heavy).join('\n'), /ui\/header\.png is \d+ bytes/);
  const fromScript = site({'menu-visitor.js': "new URL('./ui/visitor/0.png' + search, import.meta.url)", 'ui/visitor/0.png': big});
  assert.match(siteAssetProblems(...fromScript).join('\n'), /ui\/visitor\/0\.png/);
});

test('an SVG may not hide a large raster, even when the SVG file passes', () => {
  const raster = big.toString('base64');
  const svg = `<svg><image href="data:image/png;base64,${raster}"/></svg>`;
  const problems = siteAssetProblems(...site({'index.html': '<img src="ui/button.svg">', 'ui/button.svg': svg}));
  assert(problems.some(problem => /embeds a \d+-byte raster/.test(problem)));
});

test('the kept share and post images, and share links to other hosts, are exempt', () => {
  const page = '<meta property="og:image" content="https://www.lowpolyworks.com/ui/huge.png"><link rel="icon" href="/ui/mdlxl-icon-192.png">';
  const files = site({'index.html': page, 'mdlxl.js': "`<img src=\"ui/author-space-dog.gif\">`, 'ui/mdlxl-icon.png'", 'ui/huge.png': big,
    'ui/mdlxl-icon.png': big, 'ui/author-space-dog.gif': big, 'ui/mdlxl-icon-192.png': small});
  assert.deepEqual(siteAssetProblems(...files), []);
});

test('a script imported under two cache keys is reported once with both importers', () => {
  const files = site({
    'index.html': '<script type="module" src="app.js?v=1"></script>',
    'app.js': "import {a} from './unit-card.js?v=new'; import('./viewer.js?v=2');",
    'journal.js': "import {b} from './unit-card.js?v=old';",
    'unit-card.js': "const v = () => import('./viewer.js?v=2');",
    'viewer.js': "import {c} from './viewer-effect-controls.js';",
    'other.js': "import {c} from './viewer-effect-controls.js?v=3';",
    'vendor/a.js': "import {d} from '../usage.js?v=1';",
    'usage.js': '',
  });
  const problems = siteAssetProblems(...files);
  assert.equal(problems.length, 2, problems.join('\n'));
  assert.match(problems.join('\n'), /unit-card\.js is loaded under 2 different keys.*\?v=new from app\.js; \?v=old from journal\.js/);
  assert.match(problems.join('\n'), /viewer-effect-controls\.js .*\(no key\) from viewer\.js/);
});

test('one key per script, across folders, passes', () => {
  const files = site({
    'index.html': '<script type="module" src="app.js?v=1"></script>',
    'app.js': "import {a} from './usage.js?v=9'; import {t} from './mdlxl/tutorials/playback.js?v=4';",
    'mdlxl-tutorials.js': "import {r} from './usage.js?v=9'; import {t} from './mdlxl/tutorials/playback.js?v=4';",
    'mdlxl/tutorials/playback.js': "import {u} from '../../usage.js?v=9';",
  });
  assert.deepEqual(siteAssetProblems(...files), []);
});
