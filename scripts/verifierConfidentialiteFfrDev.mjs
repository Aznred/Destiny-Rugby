import assert from 'node:assert/strict';
import { createServer, resolveConfig, normalizePath } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const defaults = await resolveConfig({configFile:false,logLevel:'silent'},'serve');
const serveur = await createServer({server:{host:'127.0.0.1',port:5188,strictPort:false},logLevel:'silent'});
try {
  for (const exclusion of defaults.server.fs.deny) assert.ok(serveur.config.server.fs.deny.includes(exclusion),`L'exclusion par défaut ${exclusion} reste active.`);
  await serveur.listen();
  const adresse = serveur.httpServer.address();
  const base = `http://127.0.0.1:${adresse.port}`;
  const version = JSON.parse(readFileSync('.ffr/active-career-dataset.json','utf8')).version;
  const relatif = `.ffr/${version}/sources.sqlite`;
  const chemins = [`/.ffr/active-career-dataset.json`, `/${relatif}`, `/.ffr/${version}/report.json`,
    `/@fs/${normalizePath(resolve(relatif))}`, `/@fs/${normalizePath(resolve(relatif))}?raw`,
    `/%2effr/${version}/sources.sqlite`, '/.env'];
  for (const chemin of chemins) {
    const reponse = await fetch(new URL(chemin,base),{method:'HEAD'});
    assert.equal(reponse.status,403,`L'accès HTTP direct ${chemin} doit être interdit.`);
  }
  assert.equal((await fetch(base)).status,200,'Le site ordinaire reste servi.');
  assert.equal((await fetch(`${base}/src/data/versionJeunesFfr.generated.ts`)).status,200,'Les seules métadonnées publiques restent servies.');
  const {joueursLocaux} = await serveur.ssrLoadModule('/serveur/ffr/stockageLocal.ts');
  const stockage = joueursLocaux(undefined,()=>undefined);
  const page = await stockage.jeunesCarriere(new URLSearchParams({version,limit:'1'}));
  assert.equal(page.version,version);assert.equal(page.joueurs.length,1);assert.equal(page.total,792);
  assert.equal((await fetch(`${base}/api/carriere?jeunesCarriere=1`)).status,401,'L’API HTTP conserve sa session obligatoire.');
  console.log('Confidentialité Vite : sept accès directs refusés, exclusions par défaut préservées, site et métadonnées publics servis, SQLite lu par Node SSR et API protégée.');
} finally { await serveur.close(); }
