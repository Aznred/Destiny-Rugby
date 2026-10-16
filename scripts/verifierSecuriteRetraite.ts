import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES_SUPPLEMENTAIRES } from '../src/data/textesSupplementaires.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const racine = path.resolve(__dirname, '..');

console.log('--- 1. Vérification de PanneauJoueur.tsx ---');
const contenuPJ = fs.readFileSync(path.join(racine, 'src/components/PanneauJoueur.tsx'), 'utf-8');

// Le bouton de retraite ne doit plus figurer dans .pj-actions
const pjActionsMatch = contenuPJ.match(/<div className="pj-actions">([\s\S]*?)<\/div>/);
assert.ok(pjActionsMatch, '.pj-actions doit exister dans PanneauJoueur');
assert.ok(!pjActionsMatch[1].includes('confirmerRetraite'), 'Le bouton de retraite ne doit plus être dans .pj-actions');
assert.ok(!pjActionsMatch[1].includes('pj.retraite'), 'La clé pj.retraite ne doit plus être dans .pj-actions');

// Une section dépliante dédiée doit exister en bas de panneau
assert.ok(contenuPJ.includes('<details className="pj-zone-retraite">'), 'PanneauJoueur doit contenir une zone details.pj-zone-retraite');
assert.ok(contenuPJ.includes('pj-zone-retraite-sommaire'), 'Le sommaire de la zone retraite doit exister');
assert.ok(contenuPJ.includes('pj-zone-retraite-contenu'), 'Le contenu replié doit exister');
assert.ok(contenuPJ.includes('pj-btn-retraite'), 'Le bouton pj-btn-retraite doit être dans la zone repliée');
assert.ok(contenuPJ.includes('texteCaseConfirmation={t(\'pj.confirmerRetraite.case\')}'), 'La modale doit exiger la case à cocher');

console.log('--- 2. Vérification de Manager.tsx ---');
const contenuManager = fs.readFileSync(path.join(racine, 'src/screens/Manager.tsx'), 'utf-8');
assert.ok(contenuManager.includes('<details className="manager-zone-retraite">'), 'Manager.tsx doit contenir details.manager-zone-retraite');
assert.ok(contenuManager.includes('texteCaseConfirmation={t(\'mgr.raccrocherCase\')}'), 'Manager.tsx doit exiger la case de confirmation');

console.log('--- 3. Vérification de Confirmation.tsx ---');
const contenuConf = fs.readFileSync(path.join(racine, 'src/components/Confirmation.tsx'), 'utf-8');
assert.ok(contenuConf.includes('texteCaseConfirmation?: string'), 'Confirmation doit avoir texteCaseConfirmation en prop');
assert.ok(contenuConf.includes('confirmation-case-label'), 'Confirmation doit rendre la case à cocher quand demandé');
assert.ok(contenuConf.includes('danger?: boolean'), 'Confirmation doit accepter danger en prop');

console.log('--- 4. Vérification des traductions i18n ---');
const langues = ['fr', 'en', 'es', 'it', 'de', 'pt', 'ja'];
const clesAVerifier = [
  'pj.confirmerRetraite.case',
  'pj.retraiteZoneTitre',
  'pj.retraiteZoneAide',
  'pj.retraiteBouton',
  'mgr.zoneRetraiteTitre',
  'mgr.zoneRetraiteAide',
  'mgr.raccrocherCase',
];

for (const cle of clesAVerifier) {
  assert.ok(TEXTES_SUPPLEMENTAIRES[cle], `La clé ${cle} doit exister dans TEXTES_SUPPLEMENTAIRES`);
  for (const l of langues) {
    const val = TEXTES_SUPPLEMENTAIRES[cle][l];
    assert.ok(val && val.length > 0, `Traduction manquante pour ${cle} en [${l}]`);
  }
}

console.log('OK — Tous les contrôles de sécurité et d\'isolation de la retraite ont réussi !');
