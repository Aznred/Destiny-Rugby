// BANC D'ESSAI DES DUELS DE LA CARTE DE DÉCISION — sans navigateur.
//
// Retour de jeu, mot pour mot : « avec un système de pourcentage de réussite et
// d'impact dans le jeu, et aussi que ça s'applique vraiment — en mode plaquage
// réussi ça plaque direct, plaquage raté le mec perce, pareil pour les autres.
// Et il peut y avoir des combos sur l'action : tu perces, tu peux tenter un
// autre truc sur le défenseur. »
//
// Trois promesses ont été faites au joueur, et une seule d'entre elles se voit
// à l'œil nu. Ce script mesure les trois :
//
//  1. ⚠️ LE POURCENTAGE ANNONCÉ EST CELUI QUI SORT. C'est la promesse la plus
//     facile à trahir et la plus grave : un « 71 % » qui gagne une fois sur
//     deux transforme un jeu de décision en machine à frustration, et personne
//     ne s'en apercevrait en jouant — on met ça sur le compte de la malchance.
//     On regroupe les tirages par tranche de chance annoncée et on compare à la
//     fréquence RÉELLE de réussite.
//  2. LE GESTE S'APPLIQUE VRAIMENT. Plaquage réussi → le porteur est arrêté.
//     Plaquage raté → il a franchi, et le défenseur est au sol.
//  3. LES ENCHAÎNEMENTS EXISTENT, et ils ne s'emballent pas.
//
// Et le garde-fou de toujours : le score reste CELUI DE LA LIGUE.
//
//   npx vite-node scripts/verifDuels.ts

import {
  avancer, creerMatch, enjeuDe, estUnDuel, resoudreChoix, type EtatMatch,
} from '../src/lib/moteur/moteur';
import { decisionPour, REPOS_DECISION } from '../src/lib/moteur/decisions';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';
import type { ActionJoueur } from '../src/lib/moteur/etat';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

const AVATAR = {
  club: A,
  nom: 'Sonde Duel',
  poste: 'troisieme_aile_g' as const,
  attributs: { vitesse: 80, passe: 72, plaquage: 82, jeuAuPied: 58, vision: 74, force: 80, mental: 72, endurance: 82 },
  titulaire: true,
};

let echecs = 0;
function ligne(nom: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(48)} ${valeur}`);
}

const monPion = (e: EtatMatch) => e.pions.find((p) => p.moi)!;

/** Un tirage observé : ce qu'on avait annoncé, et ce qui est sorti. */
interface Tirage {
  action: ActionJoueur;
  chance: number;
  /** Le dé a-t-il été lancé ? Un geste resté armé ne s'étalonne pas. */
  joue: boolean;
  reussi: boolean;
}

/**
 * Joue un match en prenant TOUJOURS la première option de chaque carte, et
 * relève chaque duel.
 *
 * ⚠️ ON PASSE PAR `decisionPour`, PAS PAR UNE LISTE D'ACTIONS INVENTÉE : c'est
 * exactement le chemin de l'écran. Un duel que la carte ne propose jamais n'a
 * pas à être mesuré ici, et un duel qu'elle propose doit l'être.
 */
function jouerAvecCartes(cle: string, choix: (n: number) => number): {
  e: EtatMatch; tirages: Tirage[]; chaines: number[];
} {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR, {
    niveau: 'pro', controle: true,
  });
  const tirages: Tirage[] = [];
  const chaines: number[] = [];
  let depuis = 0;
  let enchaine = false;
  let chaine = 0;
  let garde = 0;

  while (!e.fini && garde++ < 30_000) {
    const moi = monPion(e);

    // ⚠️ ON CONSOMME LA PERCÉE EXACTEMENT COMME L'ÉCRAN. Le drapeau est posé au
    // fond du moteur, dans `resoudrePlaquage`, et il couvre les DEUX chemins :
    // le duel joué sur-le-champ et le geste resté armé qui trouve son contact
    // deux secondes plus tard. Le mesurer autrement, ce serait mesurer un jeu
    // que personne ne joue.
    if (e.perceeJoueur) {
      e.perceeJoueur = false;
      if (chaine < 2) { enchaine = true; chaine += 1; chaines.push(chaine); }
    }

    const repos = enchaine ? REPOS_DECISION : e.sim - depuis;
    const carte = decisionPour(e, moi, repos);
    if (carte) {
      depuis = e.sim;
      enchaine = false;
      const o = carte.options[choix(carte.options.length)];
      const issue = resoudreChoix(e, moi, o.action);
      if (estUnDuel(o.action)) {
        tirages.push({ action: o.action, chance: o.chance, joue: issue.joue, reussi: issue.reussi });
      }
      if (!issue.combo) chaine = 0;
      continue;
    }
    avancer(e, 0.4);
  }
  return { e, tirages, chaines };
}

// ---------------------------------------------------------------------------
console.log('=== 1. ⚠️ LE POURCENTAGE ANNONCÉ EST CELUI QUI SORT ===');
const tous: Tirage[] = [];
const parties: EtatMatch[] = [];
const chainesVues: number[] = [];
{
  const N = 48;
  for (let i = 0; i < N; i++) {
    // On alterne les choix pour balayer toutes les options, donc toute la
    // gamme de probabilités — sinon on ne mesurerait qu'un seul geste.
    const r = jouerAvecCartes(`duel#${i}`, (n) => i % n);
    tous.push(...r.tirages);
    chainesVues.push(...r.chaines);
    parties.push(r.e);
  }
  const joues = tous.filter((t) => t.joue);
  console.log(`  ${'gestes choisis'.padEnd(48)} ${tous.length}`);
  // ⚠️ ON N'ÉTALONNE QUE LES DÉS RÉELLEMENT LANCÉS. Un crochet demandé sur une
  // carte de RÉCEPTION reste armé : le ballon n'est pas encore là, il n'y a rien
  // à trancher. Le compter comme une réussite était le défaut qui faisait sortir
  // la tranche « 55-75 % » à 78,6 % — et le total, lui, tombait juste.
  console.log(`  ${'dont duels tranchés sur-le-champ'.padEnd(48)} ${joues.length}`);
  ligne('assez de duels tranchés pour conclure', `${joues.length}`, joues.length >= 60);

  // Par tranche de chance annoncée.
  const tranches = [[0, 0.35], [0.35, 0.55], [0.55, 0.75], [0.75, 1.01]];
  let pireSigma = 0;
  let pireTranche = 'aucune tranche mesurable';
  for (const [bas, haut] of tranches) {
    const lot = joues.filter((t) => t.chance >= bas && t.chance < haut);
    if (lot.length < 12) {
      console.log(`  ${`tranche ${Math.round(bas * 100)}-${Math.round(haut * 100)} %`.padEnd(48)} ${lot.length} tirage(s), trop peu pour conclure`);
      continue;
    }
    const annonce = lot.reduce((s, t) => s + t.chance, 0) / lot.length;
    const reel = lot.filter((t) => t.reussi).length / lot.length;
    const ecart = Math.abs(annonce - reel);
    const sigma = Math.max(0.04, Math.sqrt(Math.max(0.01, annonce * (1 - annonce)) / lot.length));
    const n = ecart / sigma;
    if (n > pireSigma) { pireSigma = n; pireTranche = `${(ecart * 100).toFixed(1)} pts = ${n.toFixed(1)} σ`; }
    console.log(`  ${`tranche ${Math.round(bas * 100)}-${Math.round(haut * 100)} %`.padEnd(48)} annoncé ${(annonce * 100).toFixed(1)} % · sorti ${(reel * 100).toFixed(1)} % (${lot.length}, ${n.toFixed(1)} σ)`);
  }
  // ⚠️ LA TOLÉRANCE SE CALCULE, ELLE NE SE DEVINE PAS. Un seuil fixe est un
  // piège sur des lots de tailles inégales : huit points, c'est laxiste sur
  // trois cents tirages et intenable sur cinquante, où l'écart-type d'une
  // proportion vaut déjà sept points à lui seul. On compare donc chaque tranche
  // à DEUX ÉCARTS-TYPES DE SA PROPRE TAILLE — ce qui refuse un biais
  // systématique tout en acceptant le hasard. Le plancher de 4 points évite
  // qu'une tranche énorme devienne absurdement exigeante.
  ligne('aucune tranche ne dévie au-delà du hasard',
    pireTranche, pireSigma <= 2);

  const global = joues.filter((t) => t.reussi).length / Math.max(1, joues.length);
  const attendu = joues.reduce((s, t) => s + t.chance, 0) / Math.max(1, joues.length);
  ligne('et sur l’ensemble, à 4 points près',
    `annoncé ${(attendu * 100).toFixed(1)} % · sorti ${(global * 100).toFixed(1)} %`,
    Math.abs(global - attendu) <= 0.04);
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE GESTE S’APPLIQUE VRAIMENT, TOUT DE SUITE ===');
{
  // ⚠️ ON FABRIQUE LA SITUATION plutôt que de l'attendre : on avance jusqu'à ce
  // que mon pion défende face à un porteur à portée, puis on plaque. C'est le
  // seul moyen de séparer proprement « réussi » et « raté » sur assez de cas.
  let ok = 0; let ko = 0; let arretes = 0; let franchis = 0; let plaqueursAuSol = 0;
  for (let i = 0; i < 60; i++) {
    const m = jouerRencontre(A, B, 1, `plq#${i}`, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, `plq#${i}`, AVATAR, {
      niveau: 'pro', controle: true,
    });
    let garde = 0;
    let fait = false;
    while (!e.fini && garde++ < 20_000 && !fait) {
      avancer(e, 0.15);
      const moi = monPion(e);
      const porteur = e.porteur;
      if (!moi.surLeTerrain || moi.sanction > 0) continue;
      if (!porteur || porteur.cote === moi.cote) continue;
      const d = Math.hypot(porteur.pos.x - moi.pos.x, porteur.pos.y - moi.pos.y);
      if (d > 6) continue;
      const avantFranch = porteur.stats.franchissements;
      const issue = resoudreChoix(e, moi, 'plaquage');
      fait = true;
      if (issue.reussi) {
        ok++;
        // Un plaquage abouti met fin à la course : ruck, mêlée, ou coup de
        // sifflet. Ce qu'on refuse, c'est « rien ne s'est passé ».
        if (e.porteur !== porteur || e.phase !== 'jeuCourant') arretes++;
      } else {
        ko++;
        if (porteur.stats.franchissements > avantFranch) franchis++;
        if (moi.battu > 0) plaqueursAuSol++;
      }
    }
  }
  console.log(`  ${'plaquages joués'.padEnd(48)} ${ok} réussis · ${ko} ratés`);
  ligne('plaquage réussi → le porteur est stoppé',
    `${arretes}/${ok}`, ok > 0 && arretes === ok);
  ligne('plaquage raté → il franchit',
    `${franchis}/${ko}`, ko > 0 && franchis === ko);
  ligne('… et le plaqueur reste au sol',
    `${plaqueursAuSol}/${ko}`, ko > 0 && plaqueursAuSol === ko);
}

// ---------------------------------------------------------------------------
console.log('\n=== 3. LES ENCHAÎNEMENTS EXISTENT, ET NE S’EMBALLENT PAS ===');
{
  const toutesChaines = parties.length ? chainesVues : [];
  const combos = toutesChaines.length;
  const parMatch = combos / Math.max(1, parties.length);
  console.log(`  ${'enchaînements ouverts'.padEnd(48)} ${combos} sur ${parties.length} matchs`);
  ligne('percer ouvre bien un enchaînement', `${parMatch.toFixed(1)}/match`, combos > 0);
  // ⚠️ ET ÇA RESTE UNE ACTION D'ANTHOLOGIE, pas la trame du match. Au-delà d'une
  // dizaine par match, le rugby devient un jeu de cartes.
  ligne('et ça reste l’exception (≤ 10 par match)', `${parMatch.toFixed(1)}/match`, parMatch <= 10);
  // Le plafond de l'écran tient : jamais plus de deux maillons d'affilée.
  const pire = toutesChaines.length ? Math.max(...toutesChaines) : 0;
  ligne('jamais plus de deux maillons d’affilée', `${pire}`, pire <= 2);
}

// ---------------------------------------------------------------------------
console.log('\n=== 3 bis. ⚠️ CHAQUE POSTE A SES GESTES, ET ILS S’APPLIQUENT ===');
{
  // Demande, mot pour mot : « rajoute de nouvelles actions en fonction du poste
  // — un arrière l’occasion de faire un 50/22, une 9 de faire une chenille,
  // chandelle pour dégager, foncer en avant, et faire un offload au dernier
  // moment ; et il faut que les actions soient vraiment effectuées ».
  //
  // ⚠️ DEUX CHOSES À PROUVER, ET LA SECONDE EST LA VRAIE. Qu’un geste soit
  // PROPOSÉ au bon poste se lit dans `DefinitionAction.pour` ; qu’il soit
  // EXÉCUTÉ ne se lit nulle part. Un geste ajouté au type, offert sur la carte,
  // et qui ne changerait rien à l’état du match, personne ne le verrait — c’est
  // exactement ce qui est arrivé à deux effets de traits, restés sans lecteur
  // pendant des mois.
  const PROFILS = [
    { poste: 'arriere' as const, attendus: ['cinquanteVingtDeux', 'chandelle'] },
    { poste: 'demi_melee' as const, attendus: ['chenille', 'chandelle'] },
    { poste: 'pilier_gauche' as const, attendus: ['percussion'] },
  ];
  const SPECIAUX = ['cinquanteVingtDeux', 'chandelle', 'chenille', 'percussion', 'offload'];

  let manquants = 0;
  let horsPoste = 0;
  let sansEffet = 0;
  let detailManquant = '';
  let detailHorsPoste = '';
  let detailSansEffet = '';

  for (const { poste, attendus } of PROFILS) {
    const avatar = {
      club: A, nom: 'Sonde Poste', poste, titulaire: true,
      attributs: { vitesse: 78, passe: 76, plaquage: 74, jeuAuPied: 78, vision: 76, force: 76, mental: 72, endurance: 80 },
    };
    const joues = new Map<string, number>();
    const proposes = new Set<string>();

    for (let m = 0; m < 3; m++) {
      const r = jouerRencontre(A, B, 1, `poste#${poste}#${m}`, null);
      const e = creerMatch(A, B, effA, effB, r.scoreD, r.scoreE, `poste#${poste}#${m}`, avatar, {
        niveau: 'pro', controle: true,
      });
      const moi = monPion(e);
      const avant = moi.avant;
      let depuis = 0;
      let pas = 0;
      while (!e.fini && pas++ < 40_000) {
        const carte = decisionPour(e, moi, e.sim - depuis);
        if (!carte) { avancer(e, 0.3); continue; }
        depuis = e.sim;
        for (const o of carte.options) {
          if (!SPECIAUX.includes(o.action)) continue;
          proposes.add(o.action);
          // ⚠️ UN AVANT NE TAPE PAS DE CHANDELLE, un trois-quarts ne fait pas de
          // percussion : le filtre de poste doit tenir dans les deux sens.
          if (avant && (o.action === 'chandelle' || o.action === 'cinquanteVingtDeux')) {
            horsPoste++; detailHorsPoste = `${poste} (avant) s’est vu proposer ${o.action}`;
          }
          if (!avant && o.action === 'percussion') {
            horsPoste++; detailHorsPoste = `${poste} (ligne arrière) s’est vu proposer percussion`;
          }
          if (o.action === 'chenille' && moi.numero !== 9) {
            horsPoste++; detailHorsPoste = `${poste} (n°${moi.numero}) s’est vu proposer la chenille`;
          }
        }

        // On joue le geste de poste dès qu’il est là : c’est ce qu’on mesure.
        const spe = carte.options.find((o) => SPECIAUX.includes(o.action));
        const choisi = spe ?? carte.options[0];

        // ⚠️ L’EMPREINTE AVANT / APRÈS. « Vraiment effectué » ne se prouve pas en
        // lisant un booléen de retour : on photographie l’état du match, on joue,
        // et on exige que QUELQUE CHOSE ait bougé — le ballon, la possession, la
        // phase, une statistique, une ligne de commentaire.
        const photo = `${e.phase}|${e.possession}|${e.porteur?.nom ?? 0}|${e.vol?.intention ?? 0}`
          + `|${Math.round(e.ballon.x)}|${e.commentaires.length}|${moi.stats.coupsDePied}`
          + `|${moi.stats.passes}|${moi.stats.metres.toFixed(1)}|${moi.stats.offloads}`;
        const issue = resoudreChoix(e, moi, choisi.action);
        const apres = `${e.phase}|${e.possession}|${e.porteur?.nom ?? 0}|${e.vol?.intention ?? 0}`
          + `|${Math.round(e.ballon.x)}|${e.commentaires.length}|${moi.stats.coupsDePied}`
          + `|${moi.stats.passes}|${moi.stats.metres.toFixed(1)}|${moi.stats.offloads}`;

        if (SPECIAUX.includes(choisi.action)) {
          joues.set(choisi.action, (joues.get(choisi.action) ?? 0) + 1);
          if (issue.joue && photo === apres) {
            sansEffet++;
            detailSansEffet = `${choisi.action} tranché sans rien changer à l’état`;
          }
        }
      }
    }

    const vus = attendus.filter((a) => proposes.has(a));
    const faits = attendus.filter((a) => (joues.get(a) ?? 0) > 0);
    console.log(`  ${poste.padEnd(16)} proposés : ${[...proposes].join(", ") || "aucun"}`);
    console.log(`  ${"".padEnd(16)} joués    : ${[...joues].map(([k, v]) => `${k} ×${v}`).join(", ") || "aucun"}`);
    if (vus.length < attendus.length) {
      manquants++;
      detailManquant = `${poste} : ${attendus.filter((a) => !proposes.has(a)).join(", ")} jamais proposé(s)`;
    } else if (faits.length < attendus.length) {
      manquants++;
      detailManquant = `${poste} : ${attendus.filter((a) => !faits.includes(a)).join(", ")} proposé(s) mais jamais joué(s)`;
    }
  }

  ligne('chaque poste reçoit ET joue ses gestes',
    manquants ? detailManquant : 'arrière, 9 et pilier servis', manquants === 0);
  ligne('et jamais ceux d’un autre poste',
    horsPoste ? detailHorsPoste : '0 geste hors poste', horsPoste === 0);
  ligne('un geste tranché change toujours quelque chose',
    sansEffet ? detailSansEffet : '0 geste sans effet', sansEffet === 0);
}
console.log('\n=== 3 ter. ⚠️ UN GESTE RÉUSSI MÈNE QUELQUE PART ===');
{
  // Retour de jeu, mot pour mot : « c’est pas assez fun, nos actions n’ont
  // aucun impact dans le jeu ; fais que par exemple un raffut, un sprint ou un
  // prendre-l’espace mène à un essai si réussi, qu’un turnover relance la
  // dynamique de l’équipe, qu’une passe peut arriver à une passe décisive ».
  //
  // ⚠️ TROIS CHAÎNES À PROUVER, ET AUCUNE NE SE LIT DANS LE CODE. Qu’un geste
  // existe se vérifie à la relecture ; qu’il MÈNE quelque part ne se vérifie
  // qu’en jouant. Le piège est connu de ce projet : l’offload a vécu un tour
  // entier en déclenchant un plaquage ordinaire, parce que rien ne mesurait sa
  // conséquence — seulement son existence.
  const N_MATCHS = 5;
  const POSTES = ['arriere', 'demi_ouverture', 'demi_melee', 'pilier_gauche'] as const;
  const NOUVEAUX: ActionJoueur[] = ['percee', 'chipEtSuivre', 'plongeon', 'interception', 'contreRuck'];

  let echappees = 0;
  let essaisJoueur = 0;
  let cartesEspace = 0;
  let passesDecisives = 0;
  let retombees = 0;
  let turnovers = 0;
  let turnoversQuiPoussent = 0;
  let elanMax = 0;
  let ecartAnnonce = 0;
  let sansEffet = 0;
  let detailSansEffet = '';
  const proposes = new Set<string>();
  const joues = new Set<string>();

  for (const poste of POSTES) {
    for (let m = 0; m < N_MATCHS; m++) {
      const cle = `impact#${poste}#${m}`;
      const r = jouerRencontre(A, B, 1, cle, null);
      const e = creerMatch(A, B, effA, effB, r.scoreD, r.scoreE, cle,
        { ...AVATAR, poste }, { niveau: `pro`, controle: true });
      const moi = monPion(e);
      let depuis = 0;
      let pas = 0;
      let dansLEspace = false;
      while (!e.fini && pas++ < 40_000) {
        const carte = decisionPour(e, moi, e.sim - depuis);
        if (!carte) { avancer(e, 0.3); continue; }
        depuis = e.sim;
        if (carte.moment === 'espace') cartesEspace++;
        for (const o of carte.options) proposes.add(o.action);

        // On joue en priorité ce qui doit mener quelque part : c’est ce qu’on
        // mesure. Les autres cartes se jouent au premier choix.
        const choisi = carte.options.find((o) => NOUVEAUX.includes(o.action)) ?? carte.options[0];

        // ⚠️ `battu` FAIT PARTIE DE L’EMPREINTE, et ce n’est pas une complaisance :
        // une interception ratée ne change ni la phase, ni la possession, ni le
        // ballon — son unique conséquence est que le défenseur est SORTI DU JEU
        // pendant près de trois secondes, et c’est la plus chère du lot.
        // ⚠️ L’EMPREINTE AVANT / APRÈS, comme en 3 bis : un geste qui ne change
        // rien à l’état est un bouton mort, et ça ne se voit pas à la relecture.
        const photo = `${e.phase}|${e.possession}|${e.porteur?.nom ?? 0}|${e.vol?.intention ?? 0}`
          + `|${Math.round(e.ballon.x)}|${e.commentaires.length}|${e.elan.toFixed(3)}`
          + `|${moi.stats.metres.toFixed(1)}|${moi.stats.essais}|${moi.stats.grattages}`
          + `|${moi.battu.toFixed(2)}`;
        const essaisAvant = moi.stats.essais;
        const pdAvant = moi.stats.passesDecisives;
        const elanAvant = e.elan;
        const enj = enjeuDe(e, moi, choisi.action);
        const issue = resoudreChoix(e, moi, choisi.action);
        const apres = `${e.phase}|${e.possession}|${e.porteur?.nom ?? 0}|${e.vol?.intention ?? 0}`
          + `|${Math.round(e.ballon.x)}|${e.commentaires.length}|${e.elan.toFixed(3)}`
          + `|${moi.stats.metres.toFixed(1)}|${moi.stats.essais}|${moi.stats.grattages}`
          + `|${moi.battu.toFixed(2)}`;

        if (NOUVEAUX.includes(choisi.action)) {
          joues.add(choisi.action);
          if (issue.joue && photo === apres) {
            sansEffet++;
            detailSansEffet = `${choisi.action} tranché sans rien changer à l’état`;
          }
        }
        // Un ballon volé DOIT pousser la dynamique du bon côté.
        if (issue.joue && issue.reussi
          && (choisi.action === 'interception' || choisi.action === 'contreRuck'
            || choisi.action === 'grattage')) {
          turnovers++;
          const gagne = moi.cote === `A` ? e.elan - elanAvant : elanAvant - e.elan;
          if (gagne > 0.05) turnoversQuiPoussent++;
        }
        elanMax = Math.max(elanMax, Math.abs(e.elan));
        ecartAnnonce = Math.max(ecartAnnonce, Math.abs(enj.chance - enjeuDe(e, moi, choisi.action).chance));

        if (moi.stats.essais > essaisAvant) essaisJoueur++;
        if (moi.stats.passesDecisives > pdAvant) passesDecisives++;
        if (e.echos.length) { retombees += e.echos.length; e.echos.length = 0; }
        const ech = e.echappee?.pion === moi;
        if (ech && !dansLEspace) echappees++;
        dansLEspace = ech;
      }
      essaisJoueur = Math.max(essaisJoueur, moi.stats.essais);
    }
  }

  const matchs = POSTES.length * N_MATCHS;
  console.log(`  ${"échappées ouvertes".padEnd(46)} ${(echappees / matchs).toFixed(1)}/match`);
  console.log(`  ${"cartes « tu es dans l’espace »".padEnd(46)} ${(cartesEspace / matchs).toFixed(1)}/match`);
  console.log(`  ${"élan maximal atteint".padEnd(46)} ${elanMax.toFixed(2)}`);

  // ⚠️ « MÈNE À UN ESSAI » NE VEUT PAS DIRE « DONNE UN ESSAI ». Le score reste
  // celui de la ligue : `tenterEssai` refuse un essai qui dépasserait le plan
  // de marque. Ce qu’on exige, c’est que le CHEMIN existe et soit emprunté.
  ligne(`une percée ouvre vraiment une échappée`,
    `${(echappees / matchs).toFixed(1)}/match`, echappees > 0);
  ligne(`… et l’échappée pose sa propre question`,
    `${cartesEspace} carte(s) « dans l’espace »`, cartesEspace > 0);
  ligne(`… et elle finit parfois dans l’en-but`,
    `${essaisJoueur} essai(s) du joueur`, essaisJoueur > 0);

  ligne(`un ballon volé relance la dynamique`,
    `${turnoversQuiPoussent}/${turnovers} turnovers`,
    turnovers > 0 && turnoversQuiPoussent === turnovers);
  // ⚠️ ET LA JAUGE DOIT VRAIMENT BOUGER. Un élan qui plafonnerait à 0,05 ne
  // déplacerait aucun pourcentage : la promesse serait tenue sur le papier et
  // invisible en jeu — exactement le défaut qu’on corrige.
  ligne(`… et la jauge sort du bruit`, `pic ${elanMax.toFixed(2)}`, elanMax > 0.3);

  ligne(`une passe qui amène l’essai est dite tout de suite`,
    `${retombees} retombée(s) poussée(s)`, retombees > 0);

  const manquants = NOUVEAUX.filter((a) => !proposes.has(a));
  ligne(`les cinq gestes sont proposés en jeu`,
    manquants.length ? `jamais vus : ${manquants.join(", ")}` : `5/5`, manquants.length === 0);
  const jamaisJoues = NOUVEAUX.filter((a) => !joues.has(a));
  ligne(`… et tous les cinq se jouent`,
    jamaisJoues.length ? `jamais joués : ${jamaisJoues.join(", ")}` : `5/5`, jamaisJoues.length === 0);
  ligne(`… et aucun ne laisse l’état inchangé`,
    sansEffet ? detailSansEffet : `0 geste sans effet`, sansEffet === 0);
}

  // ⚠️ ET L’ÉLAN SE LIT SUR LE BOUTON — sinon la jauge n’est qu’une décoration.
  // C’est le cœur de la demande (« un turnover relance la dynamique de
  // l’équipe ») et la seule façon de le prouver : on gèle une situation de
  // plaquage et on relit `enjeuDe` avec l’élan tourné d’un côté puis de
  // l’autre. Le chiffre annoncé DOIT bouger — c’est celui-là même que
  // `resoudreChoix` tirera.
  {
    const cle = 'elan#lecture';
    const r = jouerRencontre(A, B, 1, cle, null);
    const e = creerMatch(A, B, effA, effB, r.scoreD, r.scoreE, cle, AVATAR,
      { niveau: `pro`, controle: true });
    const moi = monPion(e);
    let ecart = 0;
    let pas = 0;
    while (!e.fini && pas++ < 40_000 && ecart === 0) {
      avancer(e, 0.3);
      if (!e.porteur || e.porteur.cote === moi.cote) continue;
      const signe = moi.cote === `A` ? 1 : -1;
      e.elan = signe;
      const porte = enjeuDe(e, moi, 'plaquage').chance;
      e.elan = -signe;
      const subi = enjeuDe(e, moi, 'plaquage').chance;
      e.elan = 0;
      ecart = porte - subi;
    }
    ligne(`la dynamique déplace le pourcentage annoncé`,
      `${Math.round(ecart * 1000) / 10} pts entre porté et dominé`, ecart >= 0.08);
  }
console.log('\n=== 4. LE GARDE-FOU : LE SCORE RESTE CELUI DE LA LIGUE ===');
{
  let ecarts = 0;
  for (let i = 0; i < parties.length; i++) {
    const attendu = jouerRencontre(A, B, 1, `duel#${i}`, null);
    const e = parties[i];
    if (e.scoreA !== attendu.scoreD || e.scoreB !== attendu.scoreE) ecarts++;
  }
  ligne('aucun duel ne déplace le résultat',
    `${ecarts} écart(s) sur ${parties.length}`, ecarts === 0);

  // ⚠️ ET LE MATCH VA AU BOUT. Un duel qui laisse le moteur dans un état
  // impossible (porteur nul, phase orpheline) se verrait ici et nulle part
  // ailleurs — l'écran, lui, se contenterait de figer.
  const bloques = parties.filter((e) => !e.fini).length;
  ligne('et tous les matchs vont à la sirène', `${parties.length - bloques}/${parties.length}`, bloques === 0);
}

console.log(echecs === 0
  ? '\n✅ TOUT EST BON — le pourcentage annoncé est celui qui sort, le geste s’applique sur-le-champ, et les enchaînements restent des exceptions.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
