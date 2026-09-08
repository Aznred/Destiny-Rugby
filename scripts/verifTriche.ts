// LE BANC DE TRICHE — on attaque le serveur, commande par commande.
//
// ⚠️ CE BANC NE VÉRIFIE PAS QUE LE JEU MARCHE, IL VÉRIFIE QU'IL RÉSISTE. Tout
// ce que le navigateur envoie est fabriquable à la main : `fetch` sur
// `/api/carriere` avec le corps qu'on veut, ou la console ouverte sur la page.
// La seule question qui compte est donc « qu'est-ce que le SERVEUR accepte ? ».
//
// Chaque contrôle est une tentative de triche qui DOIT être refusée. Un banc
// vert ne prouve pas qu'il n'y a plus de faille — il prouve que ces
// vingt-huit-là sont fermées et le resteront.
//
// Lancer : npm run verify:triche

import {
  agirCarriere, avancerCarriere, creerCarriere, vueCarriere, DOTATION_MAX,
} from '../src/lib/ligue/carriere';
import type { CommandeCarriere, EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import { verifierFiche, scoreDeLaFiche, VERSION_BAREME } from '../src/lib/classementMondial';
import { TROPHEES } from '../src/data/trophees';

const T0 = Date.parse('2026-09-08T10:00:00.000Z');
const JOUR = 86_400_000;
let ko = 0;

function dire(condition: boolean, quoi: string, detail = '') {
  if (!condition) ko++;
  console.log(`  ${condition ? '✅' : '❌'} ${quoi.padEnd(62)} ${detail}`);
}

/** La tentative doit être REFUSÉE. Un succès est une faille. */
function refuse(quoi: string, tentative: () => unknown, detail = '') {
  try {
    tentative();
    dire(false, quoi, `⚠️ ACCEPTÉ — ${detail}`);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    dire(erreur instanceof Error && erreur.name === 'ErreurCarriere', quoi, message.slice(0, 60));
  }
}

function titre(t: string) {
  console.log(`\n  ${t}\n  ${'─'.repeat(78)}`);
}

/** Une ligue de trois clubs, saison lancée, tout le monde à 50 000 Ovas. */
function ligue(): EtatCarriereEnLigne {
  let e = creerCarriere({
    id: 'ligue-triche', nom: 'Ligue des tricheurs', code: 'DR-TRICHE',
    compteId: 'compte-1', pseudo: 'Colin', clubNom: 'Colin RFC', rythme: 1, maxClubs: 8,
  }, T0, 'graine-triche');
  for (const n of [2, 3]) {
    e = agirCarriere(e, `compte-${n}`, { type: 'rejoindre', pseudo: `Ami ${n}`, clubNom: `Club ${n}` }, T0, `g${n}`);
  }
  e = agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, T0, 'saison');
  for (const club of e.clubs) club.ovas = 50_000;
  return e;
}

/** Le total des Ovas de la ligue : rien ne doit en créer hors des sources connues. */
const totalOvas = (e: EtatCarriereEnLigne) => e.clubs.reduce((somme, c) => somme + c.ovas, 0);

console.log('\n═══ LE BANC DE TRICHE ═══');

// ═══════════════════════════════════════════════════════════════════════════
titre('1. SE DONNER DES OVAS');
// ═══════════════════════════════════════════════════════════════════════════
{
  const e = ligue();
  const [colin, hugo] = e.clubs;
  const carte = e.cartes.find((c) => c.proprietaire === colin.id)!;

  // Le plus direct : une commande inventée qui porterait un montant.
  refuse('une commande inconnue qui prétend créditer un club',
    () => agirCarriere(e, colin.compteId, { type: 'crediter', ovas: 99_999 } as unknown as CommandeCarriere, T0, 'x1'));

  // Des champs parasites collés à une commande légitime : ils doivent être ignorés.
  const avant = colin.ovas;
  const apres = agirCarriere(e, colin.compteId,
    { type: 'actualiser', ovas: 999_999, club: { ovas: 999_999 } } as unknown as CommandeCarriere, T0 + 1000, 'x2');
  dire(apres.clubs[0].ovas === avant, 'les champs parasites d’une commande sont ignorés', `${apres.clubs[0].ovas} Ovas`);

  // Vendre une carte qui ne nous appartient pas.
  const sienne = e.cartes.find((c) => c.proprietaire === hugo.id)!;
  refuse('vendre rapidement la carte d’un autre club',
    () => agirCarriere(e, colin.compteId, { type: 'venteRapide', carteId: sienne.id }, T0, 'x3'));
  refuse('mettre en vente la carte d’un autre club',
    () => agirCarriere(e, colin.compteId, { type: 'vendre', carteId: sienne.id, prix: 500, mode: 'directe', dureeHeures: 24 }, T0, 'x4'));

  // Vendre DEUX FOIS la même carte dans le même lot : la duplication classique.
  refuse('vendre la même carte trente fois dans un seul lot',
    () => agirCarriere(e, colin.compteId, { type: 'venteRapideGroupee', carteIds: new Array(30).fill(carte.id) }, T0, 'x5'));

  // Des montants hors bornes.
  refuse('mettre en vente à un prix négatif',
    () => agirCarriere(e, colin.compteId, { type: 'vendre', carteId: carte.id, prix: -5000, mode: 'directe', dureeHeures: 24 }, T0, 'x6'));
  refuse('mettre en vente à un prix astronomique',
    () => agirCarriere(e, colin.compteId, { type: 'vendre', carteId: carte.id, prix: 10 ** 15, mode: 'directe', dureeHeures: 24 }, T0, 'x7'));
  refuse('mettre en vente pour une durée de dix ans',
    () => agirCarriere(e, colin.compteId, { type: 'vendre', carteId: carte.id, prix: 500, mode: 'directe', dureeHeures: 90_000 }, T0, 'x8'));
  refuse('enchérir un montant négatif',
    () => agirCarriere(e, colin.compteId, { type: 'encherir', venteId: 'inexistante', montant: -1000 }, T0, 'x9'));

  // Réclamer la récompense d'un objectif qui n'est pas atteint, ou pas le sien.
  const objectif = e.objectifs.find((o) => o.clubId === colin.id);
  if (objectif) {
    objectif.progression = 0;
    refuse('réclamer un objectif non atteint',
      () => agirCarriere(e, colin.compteId, { type: 'reclamerObjectif', objectifId: objectif.id }, T0, 'x10'));
  }
  const sienObjectif = e.objectifs.find((o) => o.clubId === hugo.id);
  if (sienObjectif) {
    sienObjectif.progression = sienObjectif.cible;
    refuse('réclamer l’objectif d’un autre club',
      () => agirCarriere(e, colin.compteId, { type: 'reclamerObjectif', objectifId: sienObjectif.id }, T0, 'x11'));
  }

  // La dotation de départ est plafonnée, même en trichant à la création.
  const demesure = creerCarriere({
    id: 'ligue-riche', nom: 'Ligue riche', code: 'DR-RICHE', compteId: 'compte-riche', pseudo: 'Riche', clubNom: 'Club riche',
    rythme: 1, maxClubs: 4, dotationOvas: 10 ** 12,
  }, T0, 'graine-riche');
  dire(demesure.clubs[0].ovas === DOTATION_MAX, '⚠️ une dotation de départ démesurée est RAMENÉE au plafond', `${demesure.clubs[0].ovas} Ovas`);
}

// ═══════════════════════════════════════════════════════════════════════════
titre('2. SE DONNER DES PACKS ET DES CARTES');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue();
  const [colin, hugo] = e.clubs;
  e.clubs[0].ovas = 0;

  refuse('ouvrir un pack sans les Ovas',
    () => agirCarriere(e, colin.compteId, { type: 'ouvrirPack', packId: 'premium' }, T0, 'p1'));
  refuse('ouvrir un pack qui n’existe pas',
    () => agirCarriere(e, colin.compteId, { type: 'ouvrirPack', packId: 'pack-maison' }, T0, 'p2'));
  refuse('ouvrir un pack quotidien inventé',
    () => agirCarriere(e, colin.compteId, { type: 'ouvrirPackGratuit', attributionId: 'club:quotidien:2026-01-01:0' }, T0, 'p3'));

  // Le pack quotidien d'un AUTRE club.
  const sien = e.clubs[1].packsGratuits?.[0];
  if (sien) {
    refuse('ouvrir le pack quotidien d’un autre club',
      () => agirCarriere(e, colin.compteId, { type: 'ouvrirPackGratuit', attributionId: sien.id }, T0, 'p4'));
  }

  // Le même pack quotidien deux fois.
  const mien = e.clubs[0].packsGratuits![0];
  e = agirCarriere(e, colin.compteId, { type: 'ouvrirPackGratuit', attributionId: mien.id }, T0 + 1000, 'p5');
  refuse('ouvrir deux fois le même pack quotidien',
    () => agirCarriere(e, colin.compteId, { type: 'ouvrirPackGratuit', attributionId: mien.id }, T0 + 2000, 'p6'));

  // Aligner ou échanger la carte d'un autre.
  const sienneCarte = e.cartes.find((c) => c.proprietaire === hugo.id)!;
  const mesCartes = e.cartes.filter((c) => c.proprietaire === colin.id);
  refuse('aligner la carte d’un autre club sur sa feuille',
    () => agirCarriere(e, colin.compteId, {
      type: 'composition',
      composition: {
        ...e.clubs[0].composition,
        titulaires: [...e.clubs[0].composition.titulaires.slice(0, 14), sienneCarte.id],
      },
    }, T0, 'p7'));
  refuse('donner dans un échange une carte qu’on ne possède pas',
    () => agirCarriere(e, colin.compteId, {
      type: 'proposerEchange', vers: hugo.id, cartesDonnees: [sienneCarte.id], cartesDemandees: [],
      ovasDonnes: 0, ovasDemandes: 0,
    }, T0, 'p8'));
  refuse('promettre dans un échange des Ovas qu’on n’a pas',
    () => agirCarriere(e, colin.compteId, {
      type: 'proposerEchange', vers: hugo.id, cartesDonnees: [], cartesDemandees: [sienneCarte.id],
      ovasDonnes: 900_000, ovasDemandes: 0,
    }, T0, 'p9'));
  refuse('s’échanger des cartes avec soi-même',
    () => agirCarriere(e, colin.compteId, {
      type: 'proposerEchange', vers: colin.id, cartesDonnees: [mesCartes[0].id], cartesDemandees: [],
      ovasDonnes: 0, ovasDemandes: 0,
    }, T0, 'p10'));
}

// ═══════════════════════════════════════════════════════════════════════════
titre('3. JOUER À LA PLACE DES AUTRES, ET AVEC L’HORLOGE');
// ═══════════════════════════════════════════════════════════════════════════
{
  const e = ligue();
  const [colin, hugo] = e.clubs;

  refuse('agir dans une ligue dont on n’est pas membre',
    () => agirCarriere(e, 'compte-intrus', { type: 'actualiser' }, T0, 'j1'));
  refuse('lancer la saison sans être le créateur',
    () => agirCarriere(e, hugo.compteId, { type: 'demarrerSaison' }, T0, 'j2'));
  refuse('créer une coupe sans être le créateur',
    () => agirCarriere(e, hugo.compteId, {
      type: 'creerCoupe', nom: 'Coupe pirate', trophee: 'brennus', participants: [colin.id, hugo.id],
      format: 'elimination', debut: new Date(T0 + JOUR).toISOString(),
      recompenseParticipation: 100, recompenseVainqueur: 500, recompenseFinaliste: 200,
    }, T0, 'j3'));
  refuse('créer une coupe aux récompenses démesurées',
    () => agirCarriere(e, colin.compteId, {
      type: 'creerCoupe', nom: 'Coupe en or', trophee: 'brennus', participants: [colin.id, hugo.id],
      format: 'elimination', debut: new Date(T0 + JOUR).toISOString(),
      recompenseParticipation: 1_000_000, recompenseVainqueur: 1_000_000, recompenseFinaliste: 1_000_000,
    }, T0, 'j4'));

  const rencontre = e.rencontres.find((r) => ![r.domicile, r.exterieur].includes(colin.id));
  if (rencontre) {
    refuse('donner des ordres dans le match de deux autres clubs',
      () => agirCarriere(e, colin.compteId, { type: 'match', matchId: rencontre.id, action: { type: 'presence' } }, T0, 'j5'));
  }
  const mienne = e.rencontres.find((r) => [r.domicile, r.exterieur].includes(colin.id))!;
  refuse('lancer son match avant l’heure d’ouverture',
    () => agirCarriere(e, colin.compteId, { type: 'lancerMatch', matchId: mienne.id }, T0, 'j6'));

  // ⚠️ L'HORLOGE EST CELLE DU SERVEUR. `agirCarriere` la reçoit en paramètre :
  // l'API passe `Date.now()`, jamais une date envoyée par le navigateur. Le
  // banc le vérifie à l'endroit qui compte — une date antérieure ne rejoue pas
  // le passé.
  const avance = avancerCarriere(e, T0 + 30 * JOUR, 'horloge');
  const recul = avancerCarriere(avance, T0, 'horloge');
  dire(totalOvas(recul) >= totalOvas(avance), '⚠️ revenir en arrière ne rembobine ni les Ovas ni les matchs',
    `${totalOvas(avance)} → ${totalOvas(recul)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
titre('4. LA CONSERVATION DES OVAS');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue();
  const [colin, hugo] = e.clubs;
  const depart = totalOvas(e);

  // Un aller-retour complet sur le marché : le total de la ligue ne bouge pas.
  const carte = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation')
    .find((c) => !e.clubs[0].composition.titulaires.includes(c.id)
      && !e.clubs[0].composition.remplacants.includes(c.id))!;
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: carte.id, prix: 4_000, mode: 'directe', dureeHeures: 24 }, T0 + 1000, 'c1');
  e = agirCarriere(e, hugo.compteId, { type: 'acheter', venteId: e.ventes[0].id }, T0 + 2000, 'c2');
  dire(totalOvas(e) === depart, '⚠️ une vente ne CRÉE aucun Ova : elle en déplace', `${depart} → ${totalOvas(e)}`);

  // Une enchère perdue rend exactement ce qu'elle a réservé.
  const autre = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation')
    .find((c) => !e.clubs[0].composition.titulaires.includes(c.id)
      && !e.clubs[0].composition.remplacants.includes(c.id) && !c.verrou)!;
  const avantEnchere = totalOvas(e);
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: autre.id, prix: 1_000, mode: 'enchere', dureeHeures: 2 }, T0 + 3000, 'c3');
  const vente = e.ventes[e.ventes.length - 1].id;
  e = agirCarriere(e, hugo.compteId, { type: 'encherir', venteId: vente, montant: 2_000 }, T0 + 4000, 'c4');
  e = agirCarriere(e, e.clubs[2].compteId, { type: 'encherir', venteId: vente, montant: 5_000 }, T0 + 5000, 'c5');
  dire(totalOvas(e) === avantEnchere - 5_000, 'une enchère en cours met exactement sa mise sous séquestre',
    `${avantEnchere} → ${totalOvas(e)}`);
  e = avancerCarriere(e, T0 + 3 * 3600_000, 'fin');
  dire(totalOvas(e) === avantEnchere, '⚠️ et à la clôture, la ligue retrouve son total au centime',
    `${avantEnchere} → ${totalOvas(e)}`);

  // Un échange annulé ne laisse pas d'Ovas en l'air.
  const avantEchange = totalOvas(e);
  const donnee = e.cartes.filter((c) => c.proprietaire === colin.id && !c.verrou)
    .find((c) => !e.clubs[0].composition.titulaires.includes(c.id) && !e.clubs[0].composition.remplacants.includes(c.id))!;
  e = agirCarriere(e, colin.compteId, {
    type: 'proposerEchange', vers: hugo.id, cartesDonnees: [donnee.id], cartesDemandees: [],
    ovasDonnes: 3_000, ovasDemandes: 0,
  }, T0 + 6000, 'c6');
  dire(totalOvas(e) === avantEchange - 3_000, 'une offre d’échange réserve les Ovas promis');
  e = agirCarriere(e, colin.compteId, { type: 'annulerEchange', echangeId: e.echanges[0].id }, T0 + 7000, 'c7');
  dire(totalOvas(e) === avantEchange, '⚠️ et l’annulation les rend, une seule fois', `${avantEchange} → ${totalOvas(e)}`);
  refuse('annuler deux fois la même offre pour être remboursé deux fois',
    () => agirCarriere(e, colin.compteId, { type: 'annulerEchange', echangeId: e.echanges[0].id }, T0 + 8000, 'c8'));
}

// ═══════════════════════════════════════════════════════════════════════════
titre('5. CE QUI SORT DU SERVEUR');
// ═══════════════════════════════════════════════════════════════════════════
{
  const e = ligue();
  const vue = vueCarriere(e, e.clubs[0].compteId);
  const texte = JSON.stringify(vue);

  dire(!('graine' in (vue as Record<string, unknown>)), '⚠️ la GRAINE des tirages ne sort jamais : elle donnerait les packs à l’avance');
  dire(!texte.includes('compte-2') && !texte.includes('compte-3'),
    '⚠️ aucun identifiant de compte d’un autre joueur ne sort');
  dire(vue.clubs.filter((c) => c.composition).length === 1,
    'la composition des adversaires reste chez eux', `${vue.clubs.filter((c) => c.composition).length} sur ${vue.clubs.length}`);
  dire(vue.clubs.filter((c) => c.packsGratuits).length === 1, 'les packs quotidiens des autres restent chez eux');
  dire(vue.transactions.every((t) => t.clubId === vue.monClubId), 'le journal financier des autres reste chez eux');
  dire(vue.objectifs.every((o) => o.clubId === vue.monClubId), 'les objectifs des autres restent chez eux');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('6. LE CLASSEMENT MONDIAL');
// ═══════════════════════════════════════════════════════════════════════════
{
  const trophees = Object.keys(TROPHEES);
  const base = {
    v: VERSION_BAREME, pseudo: 'Tricheur', nom: 'Jean Triche', poste: 'ailier', nation: 'France',
    age: 29, ageDebut: 18, saisons: 12, note: 80, reputation: 70, matchs: 200, essais: 60,
    selections: 30, titres: ['brennus'], clubs: ['Stade Toulousain'],
  };
  // ⚠️ La fiche porte son score, et le serveur le RECALCULE : les deux doivent
  // concorder, sinon c'est une fiche fabriquée à la main.
  const honnete = { ...base, score: scoreDeLaFiche(base as never) };
  const verdict = (modification: Record<string, unknown>) =>
    verifierFiche({ ...honnete, ...modification }, trophees);

  dire(verdict({}).valide, 'une fiche honnête passe', `score ${verdict({}).score}`);
  dire(!verdict({ note: 9_000 }).valide, '⚠️ une note de 9 000 est refusée');
  dire(!verdict({ saisons: 500 }).valide, '⚠️ cinq cents saisons sont refusées');
  dire(!verdict({ titres: new Array(5_000).fill('brennus') }).valide, '⚠️ cinq mille titres sont refusés');
  dire(!verdict({ essais: 99_999 }).valide, '⚠️ un nombre d’essais impossible est refusé');
  dire(!verdict({ titres: ['trophee-invente'] }).valide, '⚠️ un trophée qui n’existe pas est refusé');
  dire(!verdict({ matchs: 20, essais: 5_000 }).valide, '⚠️ plus d’essais que de matchs ne le permettent est refusé');
  // Le score envoyé n'est jamais celui écrit : le serveur recalcule.
  const triche = verdict({ score: 10 ** 9 } as Record<string, unknown>);
  dire(triche.score === verdict({}).score, '⚠️ le score ENVOYÉ est ignoré : le serveur recalcule le sien',
    `${triche.score} au lieu de 1 000 000 000`);
}

console.log(`\n${ko ? `  ❌ ${ko} faille(s) ouverte(s).` : '  ✅ Toutes les tentatives de triche sont refusées.'}\n`);
process.exit(ko ? 1 : 0);
