import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { choisirCombinaison, choisirVariante, combinaisonsValides, creerCombinaison, MAX_COMBINAISONS } from '../src/lib/ligue/combinaisons';
import { strategieValide, STRATEGIE_EN_LIGNE_DEFAUT, avancerMatchEnLigne, creerMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { preparerCombinaison, demarrerCombinaison, pointSurTerrain, placerCombinaison } from '../src/lib/moteur/combinaisons';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';

const base = creerCombinaison('base');
const precise = { ...structuredClone(base), id: 'precise', zone: 'leurs22' as const, couloir: 'gauche' as const };
assert.equal(choisirCombinaison([base, precise], 'melee', 85, 14)?.id, 'precise');
assert.equal(choisirCombinaison([base, precise], 'melee', 50, 35)?.id, 'base');
assert.equal(choisirCombinaison([base, precise], 'touche', 85, 14), undefined);
assert.equal(choisirCombinaison([{ ...precise, active: false }], 'melee', 85, 14), undefined);
assert.equal(choisirCombinaison([{ ...base, zone: 'nos22' }], 'melee', 22, 35)?.id, 'base');
assert.deepEqual(strategieValide(null), STRATEGIE_EN_LIGNE_DEFAUT);
assert.deepEqual(combinaisonsValides({ variantes: [] }), []);
const malveillant = structuredClone(base);
malveillant.variantes[0].placements = [{ numero: 99, x: Infinity, y: NaN }, { numero: 10, x: 9e6, y: -9e6 }];
malveillant.variantes[0].poids = 9e6;
malveillant.variantes[0].actions = [{ type: 'passe', destinataire: 99 }, { type: 'pied', intention: 'chandelle' }, { type: 'passe', destinataire: 10 }];
const valide = combinaisonsValides([malveillant])[0];
assert.deepEqual(valide.variantes[0].placements, [{ numero: 10, x: 35, y: -65 }]);
assert.equal(valide.variantes[0].poids, 100);
assert.deepEqual(valide.variantes[0].actions, [{ type: 'pied', intention: 'chandelle' }]);
assert.equal(combinaisonsValides(Array.from({ length: 50 }, (_, i) => ({ ...base, id: `${i}` }))).length, MAX_COMBINAISONS);
const variantes = { ...base, variantes: [{ ...base.variantes[0], nom: 'A', poids: 1 }, { ...base.variantes[0], nom: 'B', poids: 3 }] };
assert.equal(choisirVariante(variantes, () => .1).nom, 'A');
assert.equal(choisirVariante(variantes, () => .9).nom, 'B');

const effectifA = effectifDuClub('Stade Toulousain', 1);
const effectifB = effectifDuClub('RC Toulon', 1);
for (const cote of ['A', 'B'] as const) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, `atelier-${cote}`);
  const s = cote === 'A' ? 1 : -1;
  e.possession = cote; e.phase = 'melee'; e.ballon = { x: 61, y: cote === 'A' ? 14 : 56 };
  e.plansCombinaisons = { [cote]: [base] };
  preparerCombinaison(e, 'melee');
  assert.ok(e.combinaisonPreparee);
  assert.ok(demarrerCombinaison(e, e.ballon));
  e.phase = 'jeuCourant'; e.origine = { ...e.ballon }; e.rng = () => .99;
  const neuf = e.porteur!;
  const dix = e.pions.find(p => p.cote === cote && p.numero === 10)!;
  neuf.pos = { x: 59, y: 35 }; dix.pos = { x: 59 - s * 4, y: 41 };
  e.ballon = { ...neuf.pos };
  for (const p of e.pions.filter(p => p.cote !== cote)) p.pos = { x: 59 + s * 35, y: 60 };
  const relative = pointSurTerrain(e.combinaisonEnCours!, { x: -4, y: 6 });
  assert.equal(relative.x, 61 - s * 4);
  assert.equal(relative.y, cote === 'A' ? 20 : 50);
  placerCombinaison(e);
  assert.ok((dix.cible.x - neuf.pos.x) * s < 0);
  avancer(e, .65);
  assert.ok(neuf.stats.passes > 0, `La passe programmée doit être effectuée pour ${cote}`);
  assert.ok(e.vol?.receveur === dix || e.porteur === dix, 'Le n° 10 choisi reçoit la passe');
}

// Le sauteur sélectionné est réellement annoncé pendant la conquête.
const touche = creerCombinaison('touche', 'touche');
touche.variantes[0].sauteur = 5;
const eTouche = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, 'atelier-touche');
eTouche.phase = 'touche'; eTouche.possession = 'A'; eTouche.ballon = { x: 90, y: .6 };
eTouche.conquete = { type: 'touche', progression: 0 };
eTouche.plansCombinaisons = { A: [touche] };
preparerCombinaison(eTouche, 'touche');
assert.equal(eTouche.pions.find(p => p.id === eTouche.conquete?.cibleId)?.numero, 5);
// Un joueur sanctionné annule la combinaison, sans bloquer le jeu.
eTouche.pions.find(p => p.cote === 'A' && p.numero === 10)!.sanction = 600;
preparerCombinaison(eTouche, 'touche');
assert.equal(eTouche.combinaisonPreparee, undefined);

// Courses et leurres déplacent les joueurs, puis le botteur joue un vrai pied.
const course = creerCombinaison('course-et-pied');
course.variantes[0].actions = [
  { type: 'leurre', numero: 12, destination: { x: 10, y: 8 } },
  { type: 'course', destination: { x: 6, y: 0 } },
  { type: 'pied', intention: 'occupation' },
];
const eCourse = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, 'atelier-course');
eCourse.phase = 'melee'; eCourse.possession = 'A'; eCourse.ballon = { x: 61, y: 35 };
eCourse.plansCombinaisons = { A: [course] };
preparerCombinaison(eCourse, 'melee'); demarrerCombinaison(eCourse, eCourse.ballon);
eCourse.phase = 'jeuCourant'; eCourse.origine = { ...eCourse.ballon }; eCourse.rng = () => .99;
const botteur = eCourse.porteur!;
botteur.pos = { x: 60, y: 35 }; eCourse.ballon = { ...botteur.pos };
for (const p of eCourse.pions.filter(p => p.cote === 'B')) p.pos = { x: 102, y: 60 };
avancer(eCourse, .3);
placerCombinaison(eCourse);
const leurre = eCourse.pions.find(p => p.cote === 'A' && p.numero === 12)!;
assert.deepEqual(leurre.cible, { x: 71, y: 43 });
avancer(eCourse, 5);
assert.ok(botteur.pos.x > 60, 'Le porteur court vers sa destination');
assert.ok(botteur.stats.coupsDePied > 0, 'Le dernier geste exécute un vrai coup de pied');

// Deux rythmes d'appels au serveur doivent produire le même match.
const plans = (['melee', 'touche', 'ruck'] as const).map(phase => {
  const c = creerCombinaison(`serveur-${phase}`, phase);
  c.variantes[0].actions = phase === 'touche' ? [{ type: 'passe', destinataire: 9 }, { type: 'pied', intention: 'chandelle' }] : [{ type: 'passe', destinataire: 10 }, { type: 'pied', intention: 'occupation' }];
  return c;
});
const equipe = (id: string, effectif: typeof effectifA) => ({ clubId: id, nom: id, effectif, composition: compositionManagerParDefaut(effectif), strategie: { ...STRATEGIE_EN_LIGNE_DEFAUT, modeCombinaisons: 'configure' as const, combinaisons: plans } });
const debut = Date.parse('2026-09-30T12:00:00Z');
const faire = (id: string) => creerMatchEnLigne({ id, domicile: equipe('club-a', effectifA), exterieur: equipe('club-b', effectifB), debut, graine: 43219 });
const original = faire('combinaisons-determinisme');
const direct = avancerMatchEnLigne(structuredClone(original), debut + 40 * 60_000);
let progressif = structuredClone(original);
for (let minute = 1; minute <= 40; minute++) progressif = avancerMatchEnLigne(progressif, debut + minute * 60_000);
// L'avance directe a rempli le cache à la 40e. Revenir à la 1re force une
// reconstruction complète avant la série d'appels progressifs.
assert.deepEqual(direct.score, progressif.score);
assert.deepEqual(direct.fil, progressif.fil);
assert.ok(direct.fil.some(l => l.texte.startsWith('Combinaison :')), 'Les plans sont exécutés dans le moteur en ligne');

// L'accès repose sur l'identifiant authentifié, jamais sur le pseudo Kiri.
const dossier = mkdtempSync(join(tmpdir(), 'destiny-combinaisons-'));
try {
  const db = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID(); const visiteur = randomUUID();
  for (const [id, identifiant] of [[kiri, 'kiri'], [visiteur, 'visiteur']] as const) {
    await db.creerCompte({ id, identifiant, pseudo: 'Kiri', empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 600_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(jeton: string, url: string, body?: unknown) {
    let statut = 200; let donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
    await api.handler({ method: body ? 'POST' : 'GET', url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body }, res);
    return { statut, donnees };
  }
  const creee = await appel(kiri, '/api/carriere', { action: 'creer', nom: 'Bêta combinaisons', clubNom: 'Club Kiri', rythme: 1, maxClubs: 4 });
  assert.equal(creee.statut, 201);
  const ligue = creee.donnees.id;
  const inscription = await appel(visiteur, '/api/carriere', { action: 'rejoindre', code: creee.donnees.code, clubNom: 'Club visiteur' });
  assert.equal(inscription.statut, 200);
  const strategie = { ...STRATEGIE_EN_LIGNE_DEFAUT, combinaisons: [base], modeCombinaisons: 'configure' };
  const commande = (jeton: string, action: unknown) => appel(jeton, '/api/carriere', { action: 'commande', ligue, requeteId: randomUUID(), commande: action });
  const refuse = await commande(visiteur, { type: 'strategie', strategie });
  assert.equal(refuse.statut, 400);
  assert.match(refuse.donnees.erreur, /bêta privée/);
  const refuseDirect = await commande(visiteur, { type: 'match', matchId: 'faux', action: { type: 'strategie', strategie } });
  assert.equal(refuseDirect.statut, 400); assert.match(refuseDirect.donnees.erreur, /bêta privée/);
  const accepte = await commande(kiri, { type: 'strategie', strategie });
  assert.equal(accepte.statut, 200);
  assert.deepEqual(accepte.donnees.clubs.find((c: any) => c.id === accepte.donnees.monClubId).strategie.combinaisons, [base]);
  const relecture = await appel(kiri, `/api/carriere?ligue=${ligue}`);
  assert.equal(relecture.donnees.clubs.find((c: any) => c.id === relecture.donnees.monClubId).strategie.modeCombinaisons, 'configure');
  const autreVue = await appel(visiteur, `/api/carriere?ligue=${ligue}`);
  assert.equal(autreVue.donnees.clubs.find((c: any) => c.id === accepte.donnees.monClubId).strategie, undefined, 'Les combinaisons adverses restent privées');
  assert.equal((await commande(visiteur, { type: 'strategie', strategie: STRATEGIE_EN_LIGNE_DEFAUT })).statut, 200);
} finally {
  rmSync(dossier, { recursive: true, force: true });
}
console.log('Combinaisons : validation, zones, variantes, passes A/B, touche, moteur en ligne, sauvegarde et bêta Kiri vérifiés.');
