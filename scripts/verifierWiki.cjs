// Contrats éditoriaux : liens locaux, images réelles et retrait de l'ancien journal.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PAGES } = require('./contenuPages.cjs');
const racine = path.resolve(__dirname, '../public');
let liens = 0;
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(racine, page.slug, 'index.html'), 'utf8');
  assert(html.includes('<h1>'), `${page.slug} : titre manquant`);
  assert(!html.includes('Journal de développement'), `${page.slug} : ancien journal`);
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)) {
    const chemin = url.split('?')[0];
    if (chemin === '/') continue;
    const cible = path.join(racine, chemin, chemin.endsWith('/') ? 'index.html' : '');
    assert(fs.existsSync(cible), `${page.slug} : lien absent ${url}`);
    liens++;
  }
  for (const [, image] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) assert(/^\/images\/wiki\/[a-z-]+\.webp$/.test(image), `${page.slug} : illustration hors captures ${image}`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${page.slug} : identifiants dupliqués`);
}
const sitemap = fs.readFileSync(path.join(racine, 'sitemap.xml'), 'utf8');
assert(!sitemap.includes('/journal/'));
assert(sitemap.includes('/mises-a-jour/'));
const journal = fs.readFileSync(path.join(racine, 'journal/index.html'), 'utf8');
assert(journal.includes('url=/mises-a-jour/'));
assert(!PAGES.some(p => p.slug === 'journal'));
const moteur = PAGES.find(p => p.slug === 'moteur');
assert(!JSON.stringify(moteur).includes('décomposé à l’avance'));
assert(!JSON.stringify(PAGES).includes('44 semaines'));
console.log(`${PAGES.length} pages, ${liens} liens locaux : contenus et captures vérifiés.`);
