// BANC DU TUTORIEL GUIDÉ (Correctif 18) — `npm run verify:tutoriel`
//
// Ce que ce banc garantit, sans navigateur :
//   1. CHAQUE ÉTAPE A SON TEXTE dans les sept langues (la phrase, et le titre quand l'étape en annonce un), avec les mêmes variables.
//   2. CHAQUE ANCRE VISÉE EXISTE dans le code des écrans (`data-tuto="…"`), y compris les ancres construites (`cel-onglet-<id>`, `mgr-onglet-<vue>`).
//   3. LE PLACEMENT DE LA BULLE tient sur vingt tailles d'écran et des centaines de cibles : toujours DANS l'écran, jamais sur la cible
//      sauf quand c'est inévitable (et alors `chevauche` le dit), et toujours une feuille sur téléphone en portrait.
//   4. LA MÉMOIRE (drapeaux, rejouer une famille, désactiver sans rien rendre vu).
//   5. LES PARCOURS sont bien formés : identifiants uniques, un seul type de départ, famille cohérente, aucune étape sans cible ni carte.

import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../src/data/textes';
import { PARCOURS_GENERAUX } from '../src/lib/tutoriel/parcours/general';
import { PARCOURS_JOUEUR } from '../src/lib/tutoriel/parcours/joueur';
import { PARCOURS_ENTRAINEUR } from '../src/lib/tutoriel/parcours/entraineur';
import { PARCOURS_LIGUE } from '../src/lib/tutoriel/parcours/ligue';
import { PARCOURS_CONTEXTE } from '../src/lib/tutoriel/parcours/contexte';
import { placerLaBulle, boiteDeLaCible, estPortraitEtroit, MARGE, type Boite, type Vue } from '../src/lib/tutoriel/placement';
import { dejaVu, marquerVu, oublier, desactiverLesTutoriels, tutorielsDesactives, reinitialiserLaMemoire, relireLeStockage, drapeauxVus } from '../src/lib/tutoriel/memoire';
import type { ParcoursTuto } from '../src/lib/tutoriel/types';
import { useGame } from '../src/store/useGame';
import { enregistrerLesParcours, reconnaitreLesAnciens } from '../src/lib/tutoriel/guide';

const LANGUES = ['fr', 'en', 'es', 'it', 'de', 'pt', 'ja'] as const;
const TOUS: ParcoursTuto[] = [...PARCOURS_GENERAUX, ...PARCOURS_JOUEUR, ...PARCOURS_ENTRAINEUR, ...PARCOURS_LIGUE, ...PARCOURS_CONTEXTE];
let controles = 0;
const ok = (condition: unknown, message: string): void => { controles++; assert.ok(condition, message); };

// ═══ 5. LES PARCOURS SONT BIEN FORMÉS ═══════════════════════════════════════
const ids = new Set<string>();
for (const p of TOUS) {
  ok(!ids.has(p.id), `Identifiant de parcours en double : ${p.id}`);
  ids.add(p.id);
  ok(p.id.startsWith(`${p.famille === 'contexte' ? 'context' : p.famille}.`), `${p.id} : la famille ${p.famille} ne correspond pas à son préfixe.`);
  ok(p.etapes.length > 0, `${p.id} : aucun pas.`);
  const etapes = new Set<string>();
  p.etapes.forEach((e, i) => {
    ok(!etapes.has(e.id), `${p.id} : étape en double « ${e.id} ».`);
    etapes.add(e.id);
    const type = e.type ?? (e.cible ? 'info' : 'carte');
    if (type === 'clic' || type === 'action') ok(Boolean(e.cible), `${p.id}/${e.id} : une étape ${type} sans cible n'a rien à attendre.`);
    if (type === 'action') ok(typeof e.jusqua === 'function', `${p.id}/${e.id} : une étape action sans condition de fin.`);
    if (e.choix) ok(type === 'carte' && !e.cible, `${p.id}/${e.id} : un écran de choix est une carte sans cible.`);
    if (type === 'carte' && !e.choix && i > 0 && !p.souple) { /* une carte au milieu d'un parcours est permise */ }
  });
  if (p.souple) ok(p.etapes.every((e) => !e.type || e.type === 'carte' || e.type === 'info'), `${p.id} : un parcours souple ne bloque rien (ni clic ni action).`);
}
ok(TOUS.length >= 25, `Il devrait y avoir au moins vingt-cinq parcours (${TOUS.length}).`);

// ═══ 1. LES TEXTES ═════════════════════════════════════════════════════════
const variables = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
function verifierCle(cle: string, contexte: string): void {
  const tr = TEXTES[cle];
  ok(tr, `${contexte} : clé de texte absente « ${cle} ».`);
  const modele = variables(tr.fr);
  for (const l of LANGUES) {
    const texte = (tr as Record<string, string | undefined>)[l];
    ok(texte && texte.trim().length > 0, `${cle} : la langue ${l} est vide.`);
    ok(variables(texte!) === modele, `${cle} : les variables de ${l} diffèrent du français.`);
  }
  ok(tr.fr.length <= 330, `${cle} : ${tr.fr.length} caractères — une bulle de trois lignes, pas un paragraphe.`);
}
for (const cle of ['tg.ui.passer', 'tg.ui.suivant', 'tg.ui.retour', 'tg.ui.terminer', 'tg.ui.ok', 'tg.ui.plusTard', 'tg.ui.commencer',
  'tg.ui.clic', 'tg.ui.action', 'tg.ui.etape', 'tg.ui.desactiver',
  'tg.reg.titre', 'tg.reg.aide', 'tg.reg.desactiver', 'tg.reg.desactiverAide', 'tg.reg.general', 'tg.reg.ligue', 'tg.reg.joueur',
  'tg.reg.entraineur', 'tg.reg.match', 'tg.reg.matchRelance']) verifierCle(cle, 'interface');
let phrases = 0;
for (const p of TOUS) {
  for (const e of p.etapes) {
    const base = e.cle ?? `tg.${p.id}.${e.id}`;
    verifierCle(`${base}.x`, `${p.id}/${e.id}`);
    phrases++;
    if (e.titre) verifierCle(`${base}.t`, `${p.id}/${e.id}`);
    if (e.consigne) verifierCle(e.consigne, `${p.id}/${e.id}`);
    if (e.bouton) verifierCle(e.bouton, `${p.id}/${e.id}`);
    for (const c of e.choix ?? []) { verifierCle(c.titre, `${p.id}/${e.id}`); verifierCle(c.texte, `${p.id}/${e.id}`); }
  }
}
// Aucune clé orpheline : tout `tg.*` du dictionnaire sert à une étape ou à l'interface.
const attendues = new Set<string>();
for (const p of TOUS) for (const e of p.etapes) {
  const base = e.cle ?? `tg.${p.id}.${e.id}`;
  attendues.add(`${base}.x`); if (e.titre) attendues.add(`${base}.t`);
  for (const c of e.choix ?? []) { attendues.add(c.titre); attendues.add(c.texte); }
}
for (const cle of Object.keys(TEXTES)) {
  if (!cle.startsWith('tg.') || cle.startsWith('tg.ui.') || cle.startsWith('tg.reg.')) continue;
  ok(attendues.has(cle), `Clé de tutoriel orpheline (aucune étape ne s'en sert) : ${cle}`);
}

// ═══ 2. LES ANCRES EXISTENT DANS LE CODE ═══════════════════════════════════
function fichiers(dossier: string, sortie: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) fichiers(chemin, sortie);
    else if (/\.(tsx|ts)$/.test(nom) && !chemin.includes(join('lib', 'tutoriel'))) sortie.push(chemin);
  }
  return sortie;
}
const racine = fileURLToPath(new URL('../src', import.meta.url));
const code = fichiers(racine).map((f) => readFileSync(f, 'utf8')).join('\n');
const ancresLitterales = new Set([...code.matchAll(/data-tuto="([\w-]+)"/g)].map((m) => m[1]));
const ancresChoisies = new Set([...code.matchAll(/data-tuto=\{[^}]*?'([\w-]+)'[^}]*\}/g)].map((m) => m[1]));
const ancresChampTuto = new Set([...code.matchAll(/tuto="([\w-]+)"/g)].map((m) => m[1]));
// Les ancres construites : `cel-onglet-${o.id}` (ids de l'onglet), `mgr-onglet-<vue>` (écrites en clair par la passe), `role-<role>`, `mgr-onglet-…`.
const ONGLETS_LIGUE = ['club', 'calendrier', 'composition', 'effectif', 'collection', 'packs', 'marche', 'competitions', 'histoire', 'wiki'];
const construites = new Set(ONGLETS_LIGUE.map((o) => `cel-onglet-${o}`));
ok(/data-tuto=\{`cel-onglet-\$\{o\.id\}`\}/.test(code), "L'ancre construite des onglets de la ligue a disparu.");
const connues = (nom: string): boolean => ancresLitterales.has(nom) || ancresChoisies.has(nom) || ancresChampTuto.has(nom) || construites.has(nom);
for (const p of TOUS) for (const e of p.etapes) {
  if (e.cible) ok(connues(e.cible), `${p.id}/${e.id} vise l'ancre « ${e.cible} », absente du code des écrans.`);
}
// Et les déclencheurs lisent des ancres qui existent aussi : on le vérifie sur le texte source des parcours.
const sourceParcours = ['general', 'joueur', 'entraineur', 'ligue', 'contexte']
  .map((f) => readFileSync(join(racine, 'lib', 'tutoriel', 'parcours', `${f}.ts`), 'utf8')).join('\n');
for (const m of sourceParcours.matchAll(/ancrePresente\('([\w-]+)'\)/g)) {
  ok(connues(m[1]), `Un déclencheur lit l'ancre « ${m[1]} », absente du code des écrans.`);
}
const tabsManager = (code.match(/data-tuto="mgr-onglet-\w+"/g) ?? []).length;
ok(tabsManager >= 13, `Les onglets du manager devraient porter 13 ancres (${tabsManager}).`);
ok(/data-tuto=\{`mgr-onglet-/.test(code) || tabsManager >= 13, 'Ancres des onglets du manager manquantes.');

// ═══ 3. LE PLACEMENT ═══════════════════════════════════════════════════════
const VUES: Vue[] = [
  { w: 320, h: 568 }, { w: 360, h: 640 }, { w: 375, h: 667 }, { w: 375, h: 812 }, { w: 390, h: 844 }, { w: 412, h: 915 }, { w: 430, h: 932 },
  { w: 568, h: 320 }, { w: 667, h: 375 }, { w: 740, h: 360 }, { w: 812, h: 375 }, { w: 844, h: 390 }, { w: 932, h: 430 },
  { w: 768, h: 1024 }, { w: 1024, h: 768 }, { w: 1180, h: 820 }, { w: 1280, h: 720 }, { w: 1366, h: 768 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
let graine = 20260610;
const hasard = (): number => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 2 ** 32; };
const recoupe = (a: Boite, b: Boite): boolean => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;

let essais = 0;
let chevauchements = 0;
for (const vue of VUES) {
  for (let k = 0; k < 400; k++) {
    // Une cible de taille et de position quelconques, jusqu'à plus grande que l'écran.
    const w = 20 + hasard() * vue.w * (k % 7 === 0 ? 1.2 : 0.7);
    const h = 16 + hasard() * vue.h * (k % 5 === 0 ? 1.1 : 0.6);
    const cible: Boite = { x: hasard() * (vue.w - Math.min(w, vue.w)) , y: hasard() * (vue.h - Math.min(h, vue.h)), w, h };
    const bulle = { w: 300 + hasard() * 120, h: 90 + hasard() * 250 };
    const cote = (['haut', 'bas', 'gauche', 'droite', undefined] as const)[k % 5];
    const p = placerLaBulle(cible, bulle, vue, cote);
    essais++;
    const dedans = p.x >= MARGE - 0.6 && p.x + p.w <= vue.w - MARGE + 0.6 && p.y >= MARGE - 0.6 && p.y + p.h <= vue.h - MARGE + 0.6;
    ok(dedans, `Bulle hors écran sur ${vue.w}×${vue.h} (cible ${JSON.stringify(cible)}) : ${JSON.stringify(p)}`);
    if (estPortraitEtroit(vue)) ok(p.mode === 'feuille', `Sur ${vue.w}×${vue.h} (portrait) la bulle devrait être une feuille (${p.mode}).`);
    const R = boiteDeLaCible(cible, vue);
    const boite: Boite = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (!p.chevauche) ok(!recoupe(R, boite), `La bulle recouvre la cible sans le dire (${vue.w}×${vue.h}) : ${JSON.stringify({ cible, p })}`);
    else { chevauchements++; ok(recoupe(R, boite) || p.mode === 'feuille', 'Un chevauchement annoncé qui n\'en est pas un.'); }
    if (p.mode === 'flottante') ok(!recoupe(R, boite), 'Une bulle flottante ne recouvre jamais la cible.');
  }
}
// Une cible modeste (un bouton) n'est JAMAIS recouverte, quelle que soit la taille de l'écran : le cas courant.
// ⚠️ Sur un écran minuscule (paysage de téléphone), la bulle ordinaire ne tient pas à côté d'un bouton posé au milieu : elle passe alors
// en mode « serré » (deux lignes, sans animation — voir `GuideTutoriel.tsx`) et on la replace. C'est ce que le composant fait.
let serres = 0;
for (const vue of VUES) {
  for (let k = 0; k < 200; k++) {
    const cible: Boite = { x: hasard() * (vue.w - 120), y: hasard() * (vue.h - 50), w: 80 + hasard() * 40, h: 32 + hasard() * 20 };
    let p = placerLaBulle(cible, { w: 340, h: 150 + hasard() * 60 }, vue);
    if (p.chevauche) { serres++; p = placerLaBulle(cible, { w: 340, h: 96 }, vue); }
    ok(!p.chevauche, `Un simple bouton est recouvert sur ${vue.w}×${vue.h}, même en mode serré : ${JSON.stringify({ cible, p })}`);
  }
}
// Pas de cible : au centre, dans l'écran.
for (const vue of VUES) {
  const p = placerLaBulle(null, { w: 460, h: 300 }, vue);
  ok(p.mode === 'centre' && p.x >= MARGE - 0.6 && p.y >= MARGE - 0.6 && p.x + p.w <= vue.w - MARGE + 0.6 && p.y + p.h <= vue.h - MARGE + 0.6, `Carte du centre hors écran sur ${vue.w}×${vue.h}.`);
}

// ═══ 4. LA MÉMOIRE ═════════════════════════════════════════════════════════
const stockage = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => stockage.get(k) ?? null, setItem: (k: string, v: string) => { stockage.set(k, v); },
  removeItem: (k: string) => { stockage.delete(k); },
};
reinitialiserLaMemoire();
ok(!dejaVu('league.intro'), 'Un drapeau vierge est déjà vu.');
marquerVu('league.intro'); marquerVu('league.packs'); marquerVu('player.creation'); marquerVu('player.role.buteur');
ok(dejaVu('league.intro') && dejaVu('tutorial.league.intro'), 'Un drapeau marqué ne se relit pas (avec ou sans préfixe).');
ok(drapeauxVus().includes('tutorial.league.intro'), 'Le drapeau porte le préfixe tutorial.');
oublier('league');
ok(!dejaVu('league.intro') && !dejaVu('league.packs'), 'Rejouer la famille league doit effacer tous ses drapeaux.');
ok(dejaVu('player.creation') && dejaVu('player.role.buteur'), 'Rejouer league ne doit pas toucher player.');
oublier('player.role.buteur');
ok(!dejaVu('player.role.buteur') && dejaVu('player.creation'), 'Oublier un drapeau précis laisse ses voisins.');
desactiverLesTutoriels(true);
ok(tutorielsDesactives(), 'La désactivation ne s\'enregistre pas.');
ok(dejaVu('player.creation'), 'Désactiver ne doit rien rendre vu ni rien effacer.');
desactiverLesTutoriels(false);
ok(!tutorielsDesactives() && dejaVu('player.creation'), 'Réactiver ne doit pas rejouer ce qui était vu.');
// Le stockage corrompu ne casse rien.
stockage.set('destiny-rugby:tutoriel', '{pas du json');
relireLeStockage();
ok(!dejaVu('player.creation') && !tutorielsDesactives(), 'Un stockage corrompu doit repartir de zéro sans lever d\'erreur.');
stockage.set('destiny-rugby:tutoriel', JSON.stringify({ v: 1, vus: { 'tutorial.ok': true, 'autre.chose': true, 'tutorial.mauvais': 3 }, desactive: 'oui' }));
relireLeStockage();
ok(dejaVu('tutorial.ok') && !dejaVu('autre.chose') && !dejaVu('tutorial.mauvais') && !tutorielsDesactives(), 'Le stockage est assaini à la lecture.');

// ═══ 6. LES RESPONSABILITÉS SE FÊTENT QUAND ON LES REÇOIT, ET LES ANCIENS SONT RECONNUS ═══════════════════
enregistrerLesParcours(TOUS);
useGame.getState().reinitialiser();
useGame.getState().creerJoueur({ nom: 'Joueur Tuto', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain', division: 'top14', age: 22, traits: [] });
const DE_ROLE = (id: string): ParcoursTuto => TOUS.find((p) => p.id === `player.role.${id}`)!;
const declenche = (id: string): boolean => DE_ROLE(id).declencheur!();
const poser = (r: NonNullable<ReturnType<typeof useGame.getState>['joueur']>['responsabilites'], capitaine = false): void => {
  useGame.setState((s) => ({ joueur: s.joueur ? { ...s.joueur, capitaine, responsabilites: r } : s.joueur }));
};
const TOUS_LES_ROLES = ['capitaine', 'vice', 'buteur', 'lanceur', 'engagement', 'droppeur'];
poser({ hierarchie: 'aucune', buteur: 0, engagement: false, droppeur: false, lanceur: 0 });
for (const id of TOUS_LES_ROLES) ok(!declenche(id), `Le parcours « ${id} » se déclenche pour un joueur sans responsabilité.`);
poser({ hierarchie: 'capitaine', buteur: 0, engagement: false, droppeur: false, lanceur: 0 }, true);
ok(declenche('capitaine') && !declenche('vice') && !declenche('buteur'), 'Capitaine : seule la carte du capitaine doit s\'ouvrir.');
poser({ hierarchie: 'vice', buteur: 1, engagement: true, droppeur: true, lanceur: 2 });
ok(declenche('vice') && !declenche('capitaine') && declenche('buteur') && declenche('engagement') && declenche('droppeur') && declenche('lanceur'),
  'Vice, buteur secondaire, engagement, droppeur, lanceur : une carte par rôle tenu.');
useGame.getState().setEcran('accueil');
ok(!declenche('buteur'), 'Une carte de rôle ne s\'ouvre pas hors de l\'écran de carrière.');
useGame.getState().setEcran('carriere');
// Les anciens : un joueur existant ne revoit pas la création ni la visite, mais DÉCOUVRE les rôles qui n'existaient pas.
reinitialiserLaMemoire();
reconnaitreLesAnciens();
ok(dejaVu('player.carriere') && dejaVu('player.creation') && dejaVu('general.intro'), 'Un joueur existant doit être reconnu : visite et création déjà vues.');
ok(!dejaVu('player.role.buteur') && !dejaVu('player.role.capitaine'), 'Les rôles (nés avec le Correctif 17) restent à découvrir pour un ancien.');
ok(!dejaVu('league.club') && !dejaVu('coach.club'), 'Une carrière de joueur ne prouve rien sur la ligue ni sur l\'entraîneur.');
// Rejoué une seconde fois, la reconnaissance ne fait plus rien (la mémoire existe).
oublier('player');
reconnaitreLesAnciens();
ok(!dejaVu('player.carriere'), 'La reconnaissance des anciens ne doit s\'exécuter qu\'au premier lancement.');

console.log(`✓ Tutoriel guidé : ${controles} contrôles — ${TOUS.length} parcours, ${phrases} phrases en 7 langues, ${essais} placements de bulle (${chevauchements} cibles trop grandes pour être évitées, ${serres} boutons demandant le mode serré).`);
