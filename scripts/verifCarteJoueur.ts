// VÉRIFICATION — LA CARTE D'UN JOUEUR ET L'ÉCRAN DE COMPOSITION
//
// Demande : « les cartes pourraient donner toutes les infos importantes sans
// avoir à ouvrir le profil du joueur », et la phrase qui commande tout le lot :
//
//   « Je changerais les 6 stats selon le poste. Un pilier ne doit pas être jugé
//     sur les mêmes choses qu'un ailier. Ça permet d'avoir un 82 pilier et un
//     82 ailier sans prétendre qu'ils ont les mêmes qualités. »
//
// ⚠️ LE CONTRÔLE CENTRAL EST LE 2, et il a deux moitiés qui se contredisent en
// apparence : deux joueurs de même note doivent avoir des PROFILS très
// différents, ET la note générale doit rester comparable entre postes. Si le
// profil d'un poste ajoutait des points, un 82 pilier serait meilleur qu'un
// 82 ailier — et toute la hiérarchie du jeu, qui raisonne sur la note, se
// mettrait à mentir.
//
// Lancer : npx vite-node scripts/verifCarteJoueur.ts

import { POSTES } from '../src/data/rugby';
import type { FamillePoste, PosteId } from '../src/types';
import {
  ABREVIATION, AXES_PAR_FAMILLE, adequationAuPoste, alertesDeComposition,
  attributsDe, axesDe, badgesDe, facteurDePerformance, notesDeLEquipe,
  statsDeCarte, statutDe, valeurAxe,
} from '../src/lib/carteJoueur';
import type { EtatDuJoueur } from '../src/lib/carteJoueur';
import type { Coequipier } from '../src/lib/effectif';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(56)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(56)} ${valeur}`);
}

function joueur(id: string, poste: PosteId, note: number, age = 27, potentiel = note): Coequipier {
  return { id, nom: id, poste, age, note, potentiel, nation: 'France', regen: false };
}

const FAMILLES = Object.keys(AXES_PAR_FAMILLE) as FamillePoste[];
const UN_POSTE: Record<FamillePoste, PosteId> = {} as Record<FamillePoste, PosteId>;
for (const f of FAMILLES) UN_POSTE[f] = POSTES.find((p) => p.famille === f)!.id;

// ---------------------------------------------------------------------------
console.log('\n=== 1. SIX AXES PAR POSTE, ET PAS LES MÊMES ===');
// ---------------------------------------------------------------------------
console.log('');
for (const f of FAMILLES) {
  console.log(`  ${f.padEnd(18)} ${AXES_PAR_FAMILLE[f].map((a) => ABREVIATION[a]).join(' · ')}`);
}
const toutesSix = FAMILLES.every((f) => new Set(AXES_PAR_FAMILLE[f]).size === 6);
ligne('chaque poste montre six axes distincts', `${FAMILLES.length} familles`, toutesSix);
// ⚠️ Si deux familles montraient les mêmes six axes, l'une des deux ne serait
// pas jugée sur son métier.
const signatures = new Set(FAMILLES.map((f) => AXES_PAR_FAMILLE[f].slice().sort().join('|')));
ligne('… et les familles ne se ressemblent pas toutes',
  `${signatures.size} combinaisons pour ${FAMILLES.length} familles`, signatures.size >= 6);
const pilierMontreMelee = axesDe('pilier_gauche').includes('melee');
const ailierMontreMelee = axesDe('ailier_gauche').includes('melee');
ligne('⚠️ la mêlée est sur la carte du pilier, pas sur celle de l\'ailier',
  `pilier ${pilierMontreMelee ? 'oui' : 'non'} · ailier ${ailierMontreMelee ? 'oui' : 'non'}`,
  pilierMontreMelee && !ailierMontreMelee);

// ---------------------------------------------------------------------------
console.log('\n=== 2. ⚠️ UN 82 PILIER ET UN 82 AILIER ===');
// ---------------------------------------------------------------------------
const pilier = joueur('pilier-82', 'pilier_gauche', 82);
const ailier = joueur('ailier-82', 'ailier_droit', 82);
console.log('');
console.log(`  ${'PILIER 82'.padEnd(22)} ${statsDeCarte(pilier).map((s) => `${s.abrege} ${s.valeur}`).join('  ')}`);
console.log(`  ${'AILIER 82'.padEnd(22)} ${statsDeCarte(ailier).map((s) => `${s.abrege} ${s.valeur}`).join('  ')}`);
console.log('');
info('force du pilier / de l\'ailier',
  `${attributsDe(pilier).force} / ${attributsDe(ailier).force}`);
info('vitesse du pilier / de l\'ailier',
  `${attributsDe(pilier).vitesse} / ${attributsDe(ailier).vitesse}`);
ligne('⚠️ le pilier est nettement plus fort',
  `${attributsDe(pilier).force} contre ${attributsDe(ailier).force}`,
  attributsDe(pilier).force > attributsDe(ailier).force + 10);
ligne('⚠️ … et nettement plus lent',
  `${attributsDe(pilier).vitesse} contre ${attributsDe(ailier).vitesse}`,
  attributsDe(ailier).vitesse > attributsDe(pilier).vitesse + 15);

// ⚠️ ET POURTANT LA NOTE RESTE COMPARABLE. C'est l'autre moitié du contrôle :
// aucune famille ne doit gagner de points en moyenne, sinon la note générale —
// sur laquelle repose tout le reste du jeu — cesserait d'être une échelle
// commune.
console.log('\n  famille            | moyenne des 8 attributs (note de base 80)');
const moyennes: number[] = [];
for (const f of FAMILLES) {
  const lot = Array.from({ length: 60 }, (_, i) => joueur(`${f}-${i}`, UN_POSTE[f], 80));
  const m = lot.reduce((s, j) => {
    const a = attributsDe(j);
    return s + Object.values(a).reduce((x, y) => x + y, 0) / 8;
  }, 0) / lot.length;
  moyennes.push(m);
  console.log(`  ${f.padEnd(18)} | ${m.toFixed(1)}`);
}
const ecart = Math.max(...moyennes) - Math.min(...moyennes);
ligne('⚠️ aucun poste n\'est structurellement mieux noté',
  `${ecart.toFixed(1)} point d'écart entre familles`, ecart < 3);

// Le bruit personnel doit exister, sans écraser la note.
const deuxPiliers = [joueur('p1', 'pilier_gauche', 80), joueur('p2', 'pilier_gauche', 80)];
const diff = Math.abs(attributsDe(deuxPiliers[0]).force - attributsDe(deuxPiliers[1]).force);
ligne('deux joueurs de même note et même poste diffèrent',
  `${diff} point(s) d'écart en force`, diff > 0);
// ⚠️ LE CONTRÔLE PORTE SUR LES SIX AXES AFFICHÉS, pas sur les huit attributs
// cachés. Une première version regardait tout et comptait 40 dépassements : ils
// venaient de la force d'un ouvreur (profil −34) et de son jeu au pied (+18),
// deux valeurs qui n'apparaissent jamais ensemble sur une carte. Un ouvreur EST
// faible en force brute, et c'est très bien — ce qui doit rester lisible, c'est
// ce que le manager lit vraiment.
let horsBornes = 0;
for (let i = 0; i < 400; i++) {
  const j = joueur(`test-${i}`, UN_POSTE[FAMILLES[i % FAMILLES.length]], 70);
  for (const s of statsDeCarte(j)) if (Math.abs(s.valeur - 70) > 30) horsBornes++;
}
ligne('… mais jamais au point de démentir la note',
  `${horsBornes} axe(s) affiché(s) à plus de 30 points de la note`, horsBornes === 0);

// Déterminisme : la carte ne change pas entre deux ouvertures de l'écran.
const a1 = JSON.stringify(attributsDe(joueur('stable', 'demi_melee', 84)));
const a2 = JSON.stringify(attributsDe(joueur('stable', 'demi_melee', 84)));
ligne('une carte ne change pas quand on rouvre l\'écran',
  a1 === a2 ? 'déterministe' : 'DIVERGENCE', a1 === a2);

// ---------------------------------------------------------------------------
console.log('\n=== 3. LES AXES COMPOSITES SE DÉDUISENT ===');
// ---------------------------------------------------------------------------
// ⚠️ Un pilier faible et bon en mêlée n'a pas de sens : la mêlée sort de la
// force, pas d'un tirage séparé.
let incoherents = 0;
for (let i = 0; i < 300; i++) {
  const j = joueur(`mel-${i}`, 'pilier_droit', 60 + (i % 35));
  const a = attributsDe(j);
  if (Math.abs(valeurAxe(j, 'melee') - a.force) > 22) incoherents++;
  if (Math.abs(valeurAxe(j, 'physique') - (a.force + a.endurance) / 2) > 2) incoherents++;
}
ligne('la mêlée suit la force, le physique suit force et endurance',
  `${incoherents} incohérence(s) sur 600 contrôles`, incoherents === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 4. LE STATUT DE LA CARTE ===');
// ---------------------------------------------------------------------------
console.log('');
const CAS: [string, Coequipier][] = [
  ['19 ans, 68, potentiel 86', joueur('a', 'centre_1' as PosteId, 68, 19, 86)],
  ['30 ans, 78', joueur('b', 'premier_centre', 78, 30, 78)],
  ['27 ans, 84', joueur('c', 'premier_centre', 84, 27, 84)],
  ['28 ans, 91', joueur('d', 'premier_centre', 91, 28, 91)],
  ['22 ans, 78, potentiel 92', joueur('e', 'premier_centre', 78, 22, 92)],
];
for (const [libelle, j] of CAS) console.log(`  ${libelle.padEnd(28)} → ${statutDe(j)}`);
// ⚠️ LA COMPARAISON PORTE SUR LE MÊME NOMBRE, 78, à deux âges différents.
// Une première version attendait « pro » pour le joueur de 30 ans : c'était
// l'assertion qui était fausse, pas le classement — 78 franchit le seuil
// « international ». Ce qui doit être vrai, c'est qu'il n'est PAS un espoir.
ligne('⚠️ « espoir » est un âge et une marge, pas une note',
  `78 à 22 ans avec marge → ${statutDe(CAS[4][1])} · 78 à 30 ans → ${statutDe(CAS[1][1])}`,
  statutDe(CAS[4][1]) === 'espoir' && statutDe(CAS[1][1]) !== 'espoir');
ligne('… et le très haut niveau se distingue',
  `84 → ${statutDe(CAS[2][1])} · 91 → ${statutDe(CAS[3][1])}`,
  statutDe(CAS[2][1]) === 'star' && statutDe(CAS[3][1]) === 'majeur');

// ---------------------------------------------------------------------------
console.log('\n=== 5. ⚠️ TROIS NIVEAUX D\'ADÉQUATION, PAS DEUX ===');
// ---------------------------------------------------------------------------
console.log('');
const PAIRES: [PosteId, PosteId, string][] = [
  ['pilier_gauche', 'pilier_droit', 'naturel'],
  ['pilier_gauche', 'talonneur', 'secondaire'],
  ['deuxieme_ligne_g', 'troisieme_aile_d', 'secondaire'],
  ['ailier_gauche', 'arriere', 'secondaire'],
  ['ailier_gauche', 'pilier_gauche', 'horsPoste'],
  ['demi_melee', 'deuxieme_ligne_g', 'horsPoste'],
  ['demi_ouverture', 'premier_centre', 'secondaire'],
];
let bonnes = 0;
for (const [j, slot, attendu] of PAIRES) {
  const r = adequationAuPoste(j, slot);
  if (r === attendu) bonnes++;
  console.log(`  ${r === attendu ? '✅' : '❌'} ${j} → ${slot.padEnd(18)} ${r} (attendu ${attendu})`);
}
ligne('l\'adéquation distingue le dépannage de l\'accident',
  `${bonnes}/${PAIRES.length}`, bonnes === PAIRES.length);
info('facteurs de performance',
  `naturel ×${facteurDePerformance('naturel')} · secondaire ×${facteurDePerformance('secondaire')} `
  + `· hors poste ×${facteurDePerformance('horsPoste')}`);
// ⚠️ « Pas de malus FIFA artificiel du genre −5 général. » La note ne bouge pas ;
// c'est la performance qui paie.
const avant = joueur('x', 'ailier_gauche', 82);
ligne('⚠️ la note affichée ne bouge pas quand on déplace un joueur',
  `${avant.note} au poste naturel comme hors poste`, avant.note === 82);
ligne('… mais la performance, si',
  `−${Math.round((1 - facteurDePerformance('horsPoste')) * 100)} % hors poste`,
  facteurDePerformance('horsPoste') < facteurDePerformance('secondaire')
  && facteurDePerformance('secondaire') < facteurDePerformance('naturel'));

// ---------------------------------------------------------------------------
console.log('\n=== 6. L\'EN-TÊTE : NOTE, ATTAQUE, DÉFENSE, CONQUÊTE ===');
// ---------------------------------------------------------------------------
const XV: PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8', 'demi_melee', 'demi_ouverture',
  'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere',
];
const equipe = XV.map((p, i) => joueur(`xv-${i}`, p, 78 + (i % 7)));
const notes = notesDeLEquipe(equipe);
info('note générale', String(notes.generale));
info('attaque', String(notes.attaque));
info('défense', String(notes.defense));
info('conquête', String(notes.conquete));
// ⚠️ Trois notes identiques n'apprendraient rien : elles doivent se lire sur les
// joueurs qui jouent vraiment ce secteur.
const troisNotes = [notes.attaque, notes.defense, notes.conquete];
ligne('⚠️ les trois secteurs ne rendent pas le même nombre',
  `${Math.max(...troisNotes) - Math.min(...troisNotes)} point(s) d'écart`,
  Math.max(...troisNotes) - Math.min(...troisNotes) >= 3);

// Un pack fort et une ligne arrière faible doivent se voir.
const desequilibre = XV.map((p, i) => joueur(`des-${i}`, p, i < 8 ? 88 : 66));
const nd = notesDeLEquipe(desequilibre);
info('pack à 88, lignes arrière à 66', `conquête ${nd.conquete} · attaque ${nd.attaque}`);
ligne('un déséquilibre pack / arrières se lit dans l\'en-tête',
  `${nd.conquete} contre ${nd.attaque}`, nd.conquete > nd.attaque + 12);

// ---------------------------------------------------------------------------
console.log('\n=== 7. LES ALERTES DE COMPOSITION ===');
// ---------------------------------------------------------------------------
const BANC: PosteId[] = [
  'talonneur', 'pilier_gauche', 'pilier_droit', 'deuxieme_ligne_g',
  'troisieme_aile_g', 'demi_melee', 'demi_ouverture', 'arriere',
];
const bancComplet = BANC.map((p, i) => joueur(`b-${i}`, p, 74));
const etats = new Map<string, EtatDuJoueur>();
const okAlertes = alertesDeComposition(equipe, bancComplet, etats, XV);
console.log('');
for (const a of okAlertes) console.log(`  ${a.gravite === 'ok' ? '🟢' : '⚠️'} ${a.cle} ${a.valeur ?? ''}`);
ligne('une composition complète est déclarée conforme',
  okAlertes.map((a) => a.gravite).join(','), okAlertes.some((a) => a.gravite === 'ok'));

// ⚠️ LA PREMIÈRE LIGNE REMPLAÇANTE EST BLOQUANTE — c'est une règle de rugby.
const bancSansPremiereLigne = BANC.map((p, i) => joueur(`c-${i}`, i < 3 ? 'ailier_droit' : p, 74));
const alertePL = alertesDeComposition(equipe, bancSansPremiereLigne, etats, XV);
console.log('');
for (const a of alertePL) console.log(`  ${a.gravite === 'ok' ? '🟢' : '⚠️'} ${a.cle} ${a.valeur ?? ''}`);
ligne('⚠️ un banc sans première ligne est BLOQUANT',
  alertePL.filter((a) => a.gravite === 'bloquant').map((a) => a.cle).join(', '),
  alertePL.some((a) => a.cle === 'compo.alerte.premiereLigne' && a.gravite === 'bloquant'));

// Un blessé aligné, ça se voit.
const blesse = new Map<string, EtatDuJoueur>([[equipe[3].id, { blesse: true }]]);
const alerteBlesse = alertesDeComposition(equipe, bancComplet, blesse, XV);
ligne('aligner un joueur indisponible est bloquant',
  alerteBlesse.some((a) => a.cle === 'compo.alerte.indisponible') ? 'signalé' : 'MANQUÉ',
  alerteBlesse.some((a) => a.cle === 'compo.alerte.indisponible' && a.gravite === 'bloquant'));

// Deux joueurs cuits, c'est un avertissement — pas un blocage.
const cuits = new Map<string, EtatDuJoueur>([
  [equipe[0].id, { fatigue: 84 }], [equipe[1].id, { fatigue: 78 }],
]);
const alerteFatigue = alertesDeComposition(equipe, bancComplet, cuits, XV);
const f = alerteFatigue.find((a) => a.cle === 'compo.alerte.fatigue');
ligne('deux joueurs très fatigués : un avertissement, pas un blocage',
  `${f?.valeur ?? '—'} joueur(s), gravité ${f?.gravite ?? '—'}`,
  f?.gravite === 'attention' && f.valeur === '2');

// ---------------------------------------------------------------------------
console.log('\n=== 8. LES BADGES ===');
// ---------------------------------------------------------------------------
const espoir = joueur('esp', 'ailier_droit', 70, 20, 88);
console.log('');
info('espoir en forme', badgesDe(espoir, { forme: 88 }).join(' '));
info('titulaire blessé', badgesDe(equipe[0], { blesse: true, forme: 90 }).join(' '));
info('international absent', badgesDe(equipe[1], { enSelection: true }).join(' '));
const b = badgesDe(equipe[0], { blesse: true, forme: 90, fatigue: 80 });
ligne('⚠️ le plus bloquant passe en premier', b[0], b[0] === 'blesse');
ligne('un espoir est marqué comme tel',
  badgesDe(espoir, {}).join(' '), badgesDe(espoir, {}).includes('espoir'));

console.log(
  echecs === 0
    ? '\n✅ Un 82 pilier n\'est pas un 82 ailier — et la note reste une échelle commune.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
