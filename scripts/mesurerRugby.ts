// LE RUGBY QUE PRODUIT LE MOTEUR, MESURÉ SUR BEAUCOUP DE MATCHS.
//
// Essais, pénalités, transformations, cartons, mêlées, touches, turnovers, jeu
// au pied par type, cassures, offloads, rucks, score moyen — et QUI touche le
// ballon, poste par poste. C'est ce banc qui dit si une retouche de l'IA de jeu
// donne un match qui ressemble à du rugby ; aucune probabilité ne se règle sans lui.
//
// Les modes sont ceux que le jeu utilise vraiment :
//   carriere3d : match de carrière regardé en 3D (dix minutes, cadence détaillée, placement joué)
//   carriere2d : le même vu de haut (dix minutes, cadence normale)
//   fond       : les autres rencontres de la poule, rejouées sans rendu (80 minutes d'horloge)
//   ligue      : match de ligue en ligne, règles en cours (temps réel)
//
// Lancer : npm run mesure:rugby -- 40 carriere3d,fond [ia]
//          (matchs par mode, modes, niveau d'IA : 1 = d'origine, 2 = par poste)
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { PHASES_ARRETEES, type EtatMatch } from '../src/lib/moteur/etat';
import { REGLAGES_IA } from '../src/lib/moteur/ia/reglages';

const PAIRES: [string, string][] = [
  ['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'],
  ['Castres Olympique', 'Section Paloise'], ['Racing 92', 'Stade Toulousain'], ['ASM Clermont', 'Castres Olympique'],
];
const N = Number(process.argv[2] ?? 24);
const MODES = (process.argv[3] ?? 'carriere3d,carriere2d,fond').split(',');
const IA = process.argv[4] ? Number(process.argv[4]) : undefined;
const DETAIL = process.argv.includes('--scores');
// Essayer un réglage sans toucher au fichier : --reglages=condense:1.5,retardRapide:2
const ESSAI = process.argv.find((a) => a.startsWith('--reglages='));
if (ESSAI) {
  for (const paire of ESSAI.slice('--reglages='.length).split(',')) {
    const [cle, valeur] = paire.split(':');
    if (!(cle in REGLAGES_IA)) throw new Error('réglage inconnu : ' + cle);
    (REGLAGES_IA as Record<string, number>)[cle] = Number(valeur);
  }
  console.log('Réglages essayés :', ESSAI.slice('--reglages='.length));
}

type Compte = Record<string, number>;
const plus = (c: Compte, cle: string, n = 1) => { c[cle] = (c[cle] ?? 0) + n; };

function jouer(mode: string, k: number) {
  const [a, b] = PAIRES[k % PAIRES.length];
  const cibles = [[24, 20], [31, 17], [18, 22], [27, 27]][k % 4];
  const detaille = mode === 'carriere3d' || mode === 'ligue';
  const options: Record<string, unknown> = {
    niveau: 'pro', scoreSurTerrain: true,
    tempsReel: mode === 'ligue',
    cadenceDetaillee: detaille, placementJoue: detaille,
    resserrement: mode === 'ligue' ? 1 : undefined,
  };
  if (IA !== undefined) options.ia = IA;
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), cibles[0], cibles[1], `rugby-${k}`, undefined, options);
  if (mode.startsWith('carriere')) e.carriereDixMinutes = true;

  const pieds: Compte = {}, phases: Compte = {}, lancements: Compte = {}, structures: Compte = {}, motifs: Compte = {}, cartons: Compte = {};
  let penalitePrec: unknown = null;
  const dejaSanctionnes = new Set<string>();
  let volPrec: unknown = null, phasePrec = '', possPrec = e.possession, lancementPrec: unknown = null;
  let turnoversJeu = 0, ballonsPerdus = 0, jeu = 0, mauls = 0, celluleLiee = 0, cellulePrec: unknown = null;
  let poussees = 0, pousseePrec = false;
  // La fraîcheur des titulaires encore en jeu à l'heure de jeu : c'est elle que la fatigue doit reproduire.
  let fraicheur60 = -1;
  e.apresPas = (m: EtatMatch) => {
    if (m.phase !== phasePrec) { plus(phases, m.phase); if (m.phase === 'maul') mauls++; }
    if (m.penalite && m.penalite !== penalitePrec) plus(motifs, m.penalite.motif);
    penalitePrec = m.penalite;
    for (const p of m.pions) {
      const n = p.stats.cartonsJaunes + p.stats.cartonsRouges;
      const cle = `${p.id}:${n}`;
      if (n > 0 && !dejaSanctionnes.has(cle)) { dejaSanctionnes.add(cle); plus(cartons, `${p.stats.cartonsRouges > 0 && p.sanction > 9000 ? 'ROUGE' : 'jaune'} ${p.motifCarton ?? '?'}`); }
    }
    if (m.vol && m.vol !== volPrec && m.vol.type === 'pied') {
      // Un tir au but vole avec l'intention « drop » : il se compte à part.
      plus(pieds, m.phase === 'tirAuBut' || m.phase === 'transformation' ? 'tirAuBut' : String(m.vol.intention));
    }
    volPrec = m.vol;
    if (m.lancement && m.lancement !== lancementPrec) {
      plus(lancements, m.lancement.type);
      if (m.lancement.structure) plus(structures, m.lancement.structure);
      const jeuDe = (m.lancement as unknown as { jeu?: string }).jeu;
      if (jeuDe) plus(structures, jeuDe);
    }
    lancementPrec = m.lancement;
    const vivant = m.phase === 'jeuCourant' || m.phase === 'ruck' || m.phase === 'maul';
    if (vivant) jeu += 0.15;
    if (m.possession !== possPrec) {
      if (phasePrec === 'ruck' || phasePrec === 'maul') turnoversJeu++;
      else if (phasePrec === 'ballonLibre' && !PHASES_ARRETEES.has(m.phase)) ballonsPerdus++;
      else if (phasePrec === 'jeuCourant' && m.phase === 'jeuCourant') turnoversJeu++;
    }
    if (m.cellule && m.cellule !== cellulePrec && m.cellule.lie) celluleLiee++;
    cellulePrec = m.cellule?.lie ? m.cellule : cellulePrec;
    const pousse = !!m.cellule?.pousse;
    if (pousse && !pousseePrec) poussees++;
    pousseePrec = pousse;
    possPrec = m.possession; phasePrec = m.phase;
    if (fraicheur60 < 0 && m.minute >= 60) {
      const l = m.pions.filter((p) => p.surLeTerrain && p.numero <= 15 && p.minutes > 50);
      fraicheur60 = l.length ? l.reduce((s, p) => s + p.endurance, 0) / l.length : 100;
    }
  };
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, 0.6);

  const somme = (f: (p: EtatMatch['pions'][number]) => number) => e.pions.reduce((s, p) => s + f(p), 0);
  const parPoste = (f: (p: EtatMatch['pions'][number]) => number) => {
    const groupes: Compte = {};
    for (const p of e.pions) {
      const n = p.numero;
      const g = n <= 3 ? '1-3' : n <= 5 ? '4-5' : n <= 7 ? '6-7' : n === 8 ? '8' : n === 9 ? '9' : n === 10 ? '10'
        : n === 12 || n === 13 ? '12-13' : n === 11 || n === 14 ? '11-14' : '15';
      plus(groupes, g, f(p));
    }
    return groupes;
  };
  const c = e.commentaires;
  const butsReussis = somme((p) => p.stats.butsReussis);
  const penalitesReussies = c.filter((x) => x.type === 'but' && x.points === 3).length;
  const drops = pieds.drop ?? 0;
  return {
    fini: e.fini, score: [e.scoreA, e.scoreB], essais: e.essaisA + e.essaisB,
    penalitesSifflees: c.filter((x) => x.type === 'penalite').length,
    penalitesReussies, transformations: Math.max(0, butsReussis - penalitesReussies),
    jaunes: somme((p) => p.stats.cartonsJaunes), rouges: somme((p) => p.stats.cartonsRouges),
    melees: e.compteurs.melees, touches: e.compteurs.touches, rucks: e.compteurs.rucks, mauls,
    percees: e.compteurs.percees, enAvants: e.compteurs.enAvants,
    offloads: somme((p) => p.stats.offloads), passes: somme((p) => p.stats.passes),
    plaquages: somme((p) => p.stats.plaquages), manques: somme((p) => p.stats.plaquagesManques),
    franchissements: somme((p) => p.stats.franchissements),
    grattages: somme((p) => p.stats.grattages), turnoversJeu, ballonsPerdus,
    motifs, cartons,
    coupsDePied: Object.values(pieds).reduce((s, n) => s + n, 0) - (pieds.tirAuBut ?? 0) - (pieds.renvoi ?? 0), drops, pieds, phases, lancements, structures,
    celluleLiee, poussees, fraicheur60,
    sim: e.sim, jeu,
    courses: parPoste((p) => p.stats.courses), essaisPar: parPoste((p) => p.stats.essais), metres: parPoste((p) => p.stats.metres),
    passesPar: parPoste((p) => p.stats.passes),
  };
}

type Match = ReturnType<typeof jouer>;
const fmt = (n: number, d = 1) => n.toFixed(d);

for (const mode of MODES) {
  const debut = performance.now();
  const r: Match[] = Array.from({ length: N }, (_, k) => jouer(mode, k));
  const moy = (f: (x: Match) => number) => r.reduce((s, x) => s + f(x), 0) / r.length;
  const cumul = (f: (x: Match) => Compte) => {
    const t: Compte = {};
    for (const x of r) for (const [cle, n] of Object.entries(f(x))) plus(t, cle, n / r.length);
    return t;
  };
  const lister = (t: Compte, d = 1) => Object.entries(t).sort((a, b) => b[1] - a[1]).map(([cle, n]) => `${cle} ${fmt(n, d)}`).join(', ');
  const ordre = ['1-3', '4-5', '6-7', '8', '9', '10', '12-13', '11-14', '15'];
  const parPoste = (t: Compte, d = 1) => ordre.map((g) => `${g}: ${fmt(t[g] ?? 0, d)}`).join(' | ');
  const points = r.map((x) => x.score[0] + x.score[1]).sort((a, b) => a - b);
  const essais = r.map((x) => x.essais).sort((a, b) => a - b);
  const q = (l: number[], p: number) => l[Math.min(l.length - 1, Math.floor(l.length * p))];

  console.log(`\n══ ${mode.toUpperCase()} — ${N} matchs${IA !== undefined ? `, IA ${IA}` : ''}${r.every((x) => x.fini) ? '' : ' ⚠️ MATCH NON TERMINÉ'} (${fmt((performance.now() - debut) / 1000)} s)`);
  console.log(`  score moyen ${fmt(moy((x) => x.score[0]))}-${fmt(moy((x) => x.score[1]))}, ${fmt(moy((x) => x.score[0] + x.score[1]))} points par match (10ᵉ centile ${q(points, 0.1)}, médiane ${q(points, 0.5)}, 90ᵉ ${q(points, 0.9)})`);
  console.log(`  essais ${fmt(moy((x) => x.essais))} par match, soit ${fmt(moy((x) => x.essais) / 2)} par équipe (de ${essais[0]} à ${essais[essais.length - 1]}, médiane ${q(essais, 0.5)}) ; matchs sans essai ${r.filter((x) => x.essais === 0).length}/${N}`);
  console.log(`  transformations ${fmt(moy((x) => x.transformations))}, pénalités sifflées ${fmt(moy((x) => x.penalitesSifflees))}, pénalités réussies ${fmt(moy((x) => x.penalitesReussies))}, drops tentés ${fmt(moy((x) => x.drops), 2)}`);
  console.log(`  cartons jaunes ${fmt(moy((x) => x.jaunes), 2)}, rouges ${fmt(moy((x) => x.rouges), 2)} par match ; matchs avec un rouge ${r.filter((x) => x.rouges > 0).length}/${N}`);
  console.log(`  motifs des pénalités : ${lister(cumul((x) => x.motifs), 2)}`);
  console.log(`  motifs des cartons : ${lister(cumul((x) => x.cartons), 2) || 'aucun'}`);
  console.log(`  mêlées ${fmt(moy((x) => x.melees))}, touches ${fmt(moy((x) => x.touches))}, mauls ${fmt(moy((x) => x.mauls))}, rucks ${fmt(moy((x) => x.rucks))}, en-avants ${fmt(moy((x) => x.enAvants))}`);
  console.log(`  turnovers au sol ou dans le jeu ${fmt(moy((x) => x.turnoversJeu))} (dont grattages ${fmt(moy((x) => x.grattages))}), ballons perdus ${fmt(moy((x) => x.ballonsPerdus))}`);
  console.log(`  passes ${fmt(moy((x) => x.passes))}, offloads ${fmt(moy((x) => x.offloads))}, cassures ${fmt(moy((x) => x.percees))}, défenseurs battus ${fmt(moy((x) => x.franchissements))}, plaquages ${fmt(moy((x) => x.plaquages))} (manqués ${fmt(moy((x) => x.manques))})`);
  console.log(`  coups de pied dans le jeu ${fmt(moy((x) => x.coupsDePied))} : ${lister(cumul((x) => x.pieds), 2)}`);
  console.log(`  lancements : ${lister(cumul((x) => x.lancements))}`);
  console.log(`  structures et jeux : ${lister(cumul((x) => x.structures)) || 'aucune'} ; cellules liées ${fmt(moy((x) => x.celluleLiee))}, poussées au contact ${fmt(moy((x) => x.poussees))}`);
  console.log(`  durée ${fmt(moy((x) => x.sim / 60))} min à l'écran, dont ${fmt(moy((x) => x.jeu / 60))} de ballon vivant ; un essai toutes les ${fmt(moy((x) => x.jeu) / Math.max(0.01, moy((x) => x.essais)), 0)} s de jeu`);
  console.log(`  fraîcheur moyenne des titulaires à la 60ᵉ : ${fmt(moy((x) => x.fraicheur60))} sur 100`);
  console.log(`  ballons portés par poste : ${parPoste(cumul((x) => x.courses))}`);
  console.log(`  passes par poste         : ${parPoste(cumul((x) => x.passesPar))}`);
  console.log(`  essais par poste         : ${parPoste(cumul((x) => x.essaisPar), 2)}`);
  if (DETAIL) console.log('  scores : ' + r.map((x) => x.score.join('-')).join(' '));
}
