// LA RETRANSMISSION — deux commentateurs qui REGARDENT le match
//
// Le système d'avant lisait le journal du moteur et jouait un clip par famille
// d'événement : « passe », « plaquage », « ruck ». Celui-ci regarde l'ÉTAT du
// match, pas à pas, et sait donc QUI a fait QUOI : il nomme les joueurs, compte
// leurs franchissements et leurs grattages, se souvient de ce qui s'est passé,
// et connaît la saison (`ContexteStatsTV`, préparé une fois par l'hôte — aucune
// requête pendant le match).
//
// ⚠️ IL N'ÉCRIT RIEN DANS LE MATCH ET NE TIRE RIEN DU HASARD DU MOTEUR. Deux
// spectateurs d'une même ligue voient le même match ; ils n'entendent pas
// forcément la même phrase, et ce n'est pas grave.
//
// Il fonctionne sur l'état vivant d'un match de carrière comme sur l'état
// rejoué du film d'un direct : chaque champ lu est facultatif.
import type { EtatMatch } from '../moteur/etat.js';
import type { Pion } from '../moteur/entites.js';
import type { ContexteStatsTV } from '../statsTV.js';
import { creerSacs, remplir, type LangueRetransmission, type Voix } from './phrases.js';

export interface Replique {
  voix: Voix; texte: string; categorie: string;
  /** De 1 (anecdote, on peut la sauter) à 5 (essai : on coupe la parole). */
  priorite: number;
  /** Seconde d'écran où elle est née : une réplique trop vieille ne se dit plus. */
  t: number;
}

type Etat = Pick<EtatMatch, 'pions' | 'phase' | 'possession' | 'clubA' | 'clubB' | 'scoreA' | 'scoreB' | 'minute' | 'periode' | 't'>
  & Partial<Pick<EtatMatch, 'vol' | 'ruck' | 'conquete' | 'maul' | 'tir' | 'sifflet' | 'penalite' | 'echappee' | 'tmo' | 'grosImpact'
    | 'dernierTurnover' | 'lancement' | 'fini' | 'dropEnCours' | 'gestes' | 'porteur'>>;

/** Ce que la retransmission lit d'un match : l'état vivant d'une carrière, ou l'état rejoué du film d'un direct. */
export type EtatRetransmission = Etat;

/** « Antoine Dupont » se dit « Dupont » à l'antenne. */
// Les fiches écrivent le nom de famille en capitales : à voix haute (et à l'écran) on dit « Dupont », pas « DUPONT ».
const titre = (mot: string): string => (mot.length > 1 && mot === mot.toUpperCase() ? mot.charAt(0) + mot.slice(1).toLowerCase() : mot);
const nomCourt = (nom: string): string => {
  const i = nom.indexOf(' ');
  return (i > 0 && i < nom.length - 1 ? nom.slice(i + 1) : nom).split(' ').map((m) => m.split('-').map(titre).join('-')).join(' ');
};
const majuscule = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * LA PART DE BLAGUES. Une catégorie qui a une variante « Blague » la tire une
 * fois sur cinq environ, pour chaque voix. ⚠️ Jamais sur un carton rouge, une
 * blessure ou un essai refusé (`SANS_BLAGUE`) : on rit du jeu, pas de la douleur.
 */
const PART_DES_BLAGUES = 0.2;
const SANS_BLAGUE = new Set(['cartonRouge', 'tmoRefus', 'blessure']);

export function creerRetransmission(langue: LangueRetransmission, contexte?: ContexteStatsTV, alea: () => number = Math.random) {
  const sacs = creerSacs(langue, alea);
  const vu = {
    pret: false, vol: null as unknown, ruck: null as unknown, conquete: null as unknown, maul: null as unknown, tir: null as unknown,
    etapeTir: '', tirDit: false, sifflet: null as unknown, echappee: null as unknown, tmo: null as unknown, impact: null as unknown,
    turnover: null as unknown, jeu: '' as string | undefined, phase: '', periode: 0, drop: null as unknown, issueMelee: '',
    surLeTerrain: new Set<string>(), scoreA: 0, scoreB: 0, dernierVolPasse: null as { auteur: Pion; receveur: Pion | null } | null,
  };
  let derniereLigne = -99, dernierConsultant = -99, derniereAnalyse = 0, finSerreeDite = false, faceDite = false, serieDite = false;
  const possession: { t: number; cote: 'A' | 'B' }[] = [];
  // Les gestes déjà vus : la clé suffit, l'état rejoué d'un direct refabrique ses objets à chaque pas.
  const gestesVus = new Set<string>();
  const cleDuGeste = (g: { joueurId: string; clip: string; debut: number }) => `${g.joueurId}|${g.clip}|${Math.round(g.debut * 20)}`;

  return function observer(e: Etat, maintenant: number): Replique[] {
    const sortie: Replique[] = [];
    const club = (cote: 'A' | 'B') => (cote === 'A' ? e.clubA : e.clubB);
    const autre = (cote: 'A' | 'B'): 'A' | 'B' => (cote === 'A' ? 'B' : 'A');
    const score = (): string => {
      const hi = Math.max(e.scoreA, e.scoreB), lo = Math.min(e.scoreA, e.scoreB);
      if (hi === lo) return langue === 'fr' ? `${hi} partout` : `${hi} all`;
      const meneur = e.scoreA > e.scoreB ? e.clubA : e.clubB;
      return langue === 'fr' ? `${meneur} mène ${hi} à ${lo}` : `${meneur} lead ${hi} to ${lo}`;
    };
    const pion = (id?: string | null) => (id ? e.pions.find((p) => p.id === id) : undefined);
    const ligne = (voix: Voix, categorie: string, vars: Record<string, string | number | undefined>, priorite: number): boolean => {
      // L'humour de la cabine : la variante « Blague » de la catégorie, quand elle existe pour cette voix.
      if (!SANS_BLAGUE.has(categorie) && !categorie.endsWith('Blague') && alea() < PART_DES_BLAGUES) {
        for (let essai = 0; essai < 3; essai++) {
          const modele = sacs.tirer(categorie + 'Blague', voix);
          if (!modele) break;
          const texte = remplir(modele, vars);
          if (texte) { sortie.push({ voix, texte, categorie: categorie + 'Blague', priorite, t: maintenant }); return true; }
        }
      }
      // Quelques essais : une phrase dont une variable manque est écartée, une autre prend sa place.
      for (let essai = 0; essai < 4; essai++) {
        const modele = sacs.tirer(categorie, voix);
        if (!modele) return false;
        const texte = remplir(modele, vars);
        if (texte) { sortie.push({ voix, texte, categorie, priorite, t: maintenant }); return true; }
      }
      return false;
    };
    /** Le commentateur parle ; le consultant enchaîne parfois, jamais deux fois de suite à moins de neuf secondes. */
    const dire = (categorie: string, vars: Record<string, string | number | undefined>, priorite: number, analyse = 0.35) => {
      if (priorite <= 2 && maintenant - derniereLigne < 3.5) return;
      if (!ligne('commentateur', categorie, vars, priorite)) return;
      derniereLigne = maintenant;
      if ((priorite >= 5 || alea() < analyse) && maintenant - dernierConsultant > 9) {
        if (ligne('consultant', categorie, vars, Math.max(1, priorite - 1))) dernierConsultant = maintenant;
      }
    };
    const vars = (p?: Pion | null, q?: Pion | null, plus: Record<string, string | number | undefined> = {}) => ({
      nom: p ? nomCourt(p.nom) : undefined, autre: q ? nomCourt(q.nom) : undefined,
      club: p ? club(p.cote) : club(e.possession), adv: p ? club(autre(p.cote)) : club(autre(e.possession)),
      score: score(), min: e.minute, ...plus,
    });

    // La possession se relève en continu : elle nourrit l'analyse du consultant.
    if (e.phase === 'jeuCourant' || e.phase === 'ruck') {
      const d = possession[possession.length - 1];
      if (!d || e.t - d.t >= 6) possession.push({ t: e.t, cote: e.possession });
      while (possession.length && e.t - possession[0].t > 600) possession.shift();
    }

    // Première image : on prend ses repères sans rien raconter du passé.
    if (!vu.pret) {
      vu.pret = true;
      Object.assign(vu, { vol: e.vol ?? null, ruck: e.ruck ?? null, conquete: e.conquete ?? null, maul: e.maul ?? null, tir: e.tir ?? null,
        sifflet: e.sifflet ?? null, echappee: e.echappee ?? null, tmo: e.tmo ?? null, impact: e.grosImpact ?? null,
        turnover: e.dernierTurnover ?? null, jeu: e.lancement?.jeu, phase: e.phase, periode: e.periode, drop: e.dropEnCours ?? null,
        scoreA: e.scoreA, scoreB: e.scoreB });
      for (const p of e.pions) if (p.surLeTerrain) vu.surLeTerrain.add(p.id);
      for (const g of e.gestes ?? []) gestesVus.add(cleDuGeste(g));
      if (e.phase === 'coupEnvoi' && e.t < 8) dire('coupEnvoi', vars(null, null), 4, 1);
      return sortie;
    }

    // ── Les temps du match ────────────────────────────────────────────────
    if (e.phase !== vu.phase) {
      if (e.phase === 'miTemps') {
        const partA = possession.length ? Math.round(100 * possession.filter((x) => x.cote === 'A').length / possession.length) : undefined;
        const fort: 'A' | 'B' = (partA ?? 50) >= 50 ? 'A' : 'B';
        ligne('commentateur', 'miTemps', { score: score() }, 5);
        ligne('consultant', 'miTemps', { club: club(fort), n: partA === undefined ? undefined : Math.max(partA, 100 - partA), score: score() }, 4);
        dernierConsultant = maintenant;
      } else if (e.phase === 'coupEnvoi' && e.periode === 2 && vu.periode === 2 && vu.phase === 'miTemps') {
        dire('repriseSeconde', vars(null, null), 4, 1);
      }
    }
    if (e.fini && vu.phase !== 'fini') {
      vu.phase = 'fini';
      const nul = e.scoreA === e.scoreB;
      const gagnant = e.scoreA > e.scoreB ? e.clubA : e.clubB;
      const hi = Math.max(e.scoreA, e.scoreB), lo = Math.min(e.scoreA, e.scoreB);
      ligne('commentateur', nul ? 'matchNul' : 'finDeMatch', { club: gagnant, score: langue === 'fr' ? `${hi} à ${lo}` : `${hi} to ${lo}` }, 5);
      ligne('consultant', nul ? 'matchNul' : 'finDeMatch', { club: gagnant }, 4);
      return sortie;
    }

    // ── L'essai, la transformation, la pénalité ───────────────────────────
    const tir = e.tir ?? null;
    if (tir && tir !== vu.tir) { vu.tirDit = false; vu.etapeTir = ''; }
    if (tir && tir.etape === 'celebration' && vu.etapeTir !== 'celebration' && tir.marqueurId) {
      const m = pion(tir.marqueurId);
      if (m) {
        dire('essai', vars(m), 5, 1);
        const avant = contexte?.joueurs?.[m.id] ?? contexte?.joueurs?.[m.nom];
        const duMatch = Math.max(1, m.stats?.essais ?? 1);
        if (avant?.essais !== undefined) {
          ligne(alea() < 0.5 ? 'commentateur' : 'consultant', 'essaiStatSaison', vars(m, null, { n: avant.essais + duMatch, m: avant.matchs === undefined ? undefined : avant.matchs + 1 }), 3);
        } else if (duMatch >= 2) ligne('commentateur', 'essaiDouble', vars(m, null, { n: duMatch }), 3);
      }
    }
    if (tir) vu.etapeTir = tir.etape ?? '';
    if (tir && tir.retombe && !vu.tirDit && tir.volLance) {
      vu.tirDit = true;
      const b = tir.buteur;
      const poteau = typeof tir.issue === 'string' && tir.issue.startsWith('poteau');
      if (poteau) ligne('commentateur', 'poteau', vars(b), 4);
      const transformation = tir.valeur === 2;
      dire(transformation ? (tir.reussi ? 'transformationReussie' : 'transformationManquee') : (tir.reussi ? 'penaliteReussie' : 'penaliteManquee'),
        vars(b), tir.reussi ? 4 : 3, 0.4);
    }
    // Le drop : annoncé à la frappe, salué s'il passe.
    if (e.dropEnCours && e.dropEnCours !== vu.drop) dire('drop', vars(pion(e.dropEnCours.auteurId)), 4, 0.5);
    if (!tir && !vu.tir && (e.scoreA - vu.scoreA === 3 || e.scoreB - vu.scoreB === 3) && vu.drop && !e.dropEnCours) {
      dire('dropReussi', vars(pion((vu.drop as { auteurId: string }).auteurId)), 5, 1);
    }

    // ── Le jeu ────────────────────────────────────────────────────────────
    const vol = e.vol ?? null;
    if (vol && vol !== vu.vol) {
      const a = vol.auteur, r = vol.receveur;
      if (vol.type === 'passe') {
        vu.dernierVolPasse = { auteur: a, receveur: r };
        const longueur = Math.hypot(vol.vers.x - vol.de.x, vol.vers.y - vol.de.y);
        const jeu = e.lancement?.jeu;
        if (jeu === 'surnombre' && r) dire('surnombre', vars(a, r), 4, 0.6);
        else if (vol.intention === 'offload' && r) dire('offload', vars(a, r), 3, 0.3);
        else if (longueur > 13 && r) dire('passeLongue', vars(a, r), 2, 0.25);
      } else if (!tir) {
        const famille: Record<string, string> = { chandelle: 'chandelle', degagement: 'degagement', penaltouche: 'degagement', occupation: 'occupation',
          cinquanteVingtDeux: 'occupation', rasant: 'rasant', parDessus: 'parDessus', transversale: 'passeAuPied' };
        const c = famille[vol.intention as string];
        if (c) dire(c, vars(a), c === 'degagement' || c === 'occupation' ? 2 : 3, 0.3);
      }
    }
    // Ce que le porteur a décidé en regardant devant lui (match local seulement).
    const jeu = e.lancement?.jeu;
    if (jeu !== vu.jeu) {
      const porteur = e.lancement?.chaine?.[Math.max(0, e.lancement.index)];
      if (jeu === 'feinte') dire('feinte', vars(porteur), 4, 0.6);
      else if (jeu === 'intervalle') dire('intervalle', vars(porteur), 3, 0.5);
      else if ((jeu === 'cellule' || jeu === 'celluleLoin') && alea() < 0.3) dire('cellule', vars(e.lancement?.chaine?.[e.lancement.chaine.length - 1]), 1, 0.4);
    }
    if (e.echappee && e.echappee !== vu.echappee) {
      const p = e.echappee.pion;
      const n = p?.stats?.franchissements ?? 0;
      if (p && n >= 2) dire('perceeStat', vars(p, null, { n }), 4, 0.4);
      else dire('percee', vars(p), 4, 0.5);
    }
    // ── Le défenseur envoyé sur les fesses : le geste « assis » du porteur qui gagne son duel ──
    if (e.gestes?.length) {
      for (const g of e.gestes) {
        const cle = cleDuGeste(g);
        if (gestesVus.has(cle)) continue;
        gestesVus.add(cle);
        if (gestesVus.size > 400) gestesVus.delete(gestesVus.values().next().value as string);
        if (g.clip === 'fall_back' && g.variante === 'assis') {
          const assis = pion(g.joueurId), vainqueur = e.porteur ?? undefined;
          if (assis && vainqueur && vainqueur.cote !== assis.cote) dire('fessesParTerre', vars(vainqueur, assis), 4, 0.5);
        }
      }
    }
    const ruck = e.ruck ?? null;
    if (ruck && ruck !== vu.ruck) {
      const porteur = pion(ruck.porteurId), plaqueur = pion(ruck.plaqueurId);
      const type = String((ruck as { plaquage?: { type?: string } }).plaquage?.type ?? '');
      if (porteur && plaqueur) {
        const s = plaqueur.stats;
        // Un plaquage qui renvoie le porteur d'où il vient : six fois sur dix, on le raconte en « caramel ».
        if (type.includes('dominant')) dire(alea() < 0.6 ? 'plaquageCaramel' : 'plaquageDominant', vars(porteur, plaqueur), alea() < 0.6 ? 4 : 3, 0.55);
        else if (s && s.plaquages >= 8 && s.plaquagesManques === 0 && s.plaquages % 4 === 0) dire('plaquageStat', vars(plaqueur, null, { n: s.plaquages }), 2, 0.5);
        else if (alea() < 0.2) dire('plaquage', vars(porteur, plaqueur), 1, 0.15);
      }
      if ((ruck as { eclair?: boolean }).eclair && alea() < 0.45) dire('ruckRapide', vars(porteur), 2, 0.5);
    }
    if (e.dernierTurnover && e.dernierTurnover !== vu.turnover) {
      const p = e.dernierTurnover.pion;
      const passe = vu.dernierVolPasse;
      if (passe && passe.receveur === p && passe.auteur.cote !== p.cote) dire('interception', vars(p), 5, 0.6);
      else {
        const n = p?.stats?.grattages ?? 0;
        if (n >= 2) dire('grattageStat', vars(p, null, { n }), 4, 0.5);
        else dire('grattage', vars(p), 4, 0.5);
      }
    }

    // ── Les phases arrêtées ───────────────────────────────────────────────
    const c = e.conquete ?? null;
    if (c && c !== vu.conquete) {
      vu.issueMelee = '';
      if (c.type === 'melee') dire('melee', vars(null, null), 1, 0.35);
      else if (c.rapide) dire('toucheRapide', vars(pion(c.rapide.lanceurId)), 3, 0.5);
      else dire('touche', vars(null, null), 1, 0.3);
    }
    const issue = c?.melee?.issue ?? '';
    if (issue === 'avance' && vu.issueMelee !== 'avance') dire('meleeGagnee', vars(null, null), 2, 0.4);
    vu.issueMelee = issue;
    if (e.maul && e.maul !== vu.maul) dire('maul', vars(null, null), 2, 0.5);

    // ── L'arbitre ─────────────────────────────────────────────────────────
    const sifflet = e.sifflet ?? null;
    if (sifflet && sifflet !== vu.sifflet) {
      const cle = sifflet.cle ?? '';
      const fautif = e.pions.find((p) => p.nom === sifflet.fautif);
      if (cle.includes('cartonJaune')) dire('cartonJaune', vars(fautif), 5, 1);
      else if (cle.includes('cartonRouge')) dire('cartonRouge', vars(fautif), 5, 1);
      else if (/enAvant|passeEnAvant/i.test(cle)) { if (fautif) dire('enAvant', vars(fautif), 2, 0.2); }
      else if (/penalite/i.test(cle)) {
        const pour = sifflet.club === e.clubA ? 'A' : 'B';
        dire('penaliteSifflee', { club: club(pour), adv: club(autre(pour)), motif: e.penalite?.motif ? majuscule(e.penalite.motif) : undefined, score: score() }, 3, 0.5);
      }
    }
    if (e.tmo && e.tmo !== vu.tmo) dire('tmo', vars(null, null), 4, 0.7);
    if (e.grosImpact && e.grosImpact !== vu.impact) dire('grosImpact', vars(null, null), 3, 0.3);

    // ── Le banc ───────────────────────────────────────────────────────────
    for (const p of e.pions) {
      if (p.surLeTerrain && !vu.surLeTerrain.has(p.id)) {
        vu.surLeTerrain.add(p.id);
        if (e.minute > 1 && p.sanction <= 0) dire('remplacement', vars(p), 1, 0.2);
      }
    }

    // ── Le contexte : fin de match serrée, confrontations, séries, possession ──
    const ecart = Math.abs(e.scoreA - e.scoreB);
    if (!finSerreeDite && e.minute >= 72 && e.minute < 79 && ecart <= 7 && (e.phase === 'jeuCourant' || e.phase === 'ruck')) {
      finSerreeDite = true;
      dire('finSerree', { n: 80 - e.minute, m: ecart || undefined, score: score() }, 4, 1);
    }
    const calme = (e.phase === 'jeuCourant' || e.phase === 'ruck' || e.phase === 'touche' || e.phase === 'melee') && !tir;
    if (calme && maintenant - dernierConsultant > 40 && maintenant - derniereLigne > 4 && maintenant - derniereAnalyse > 55) {
      derniereAnalyse = maintenant;
      const face = contexte?.confrontations?.dernieres ?? [];
      let suite = 0;
      while (suite < face.length && face[suite] === face[0] && face[0] !== 'N') suite++;
      let dit = false;
      if (!faceDite && suite >= 2 && e.minute < 35) {
        faceDite = true;
        const g = face[0] as 'A' | 'B';
        dit = ligne('consultant', 'confrontations', { club: club(g), adv: club(autre(g)), n: suite }, 2);
      }
      const serie = Math.max(contexte?.serieA ?? 0, contexte?.serieB ?? 0);
      if (!dit && !serieDite && serie >= 3 && e.minute < 45) {
        serieDite = true;
        dit = ligne('consultant', 'serie', { club: club((contexte?.serieA ?? 0) >= (contexte?.serieB ?? 0) ? 'A' : 'B'), n: serie }, 2);
      }
      if (!dit) {
        const partA = possession.length >= 20 ? possession.filter((x) => x.cote === 'A').length / possession.length : undefined;
        const fort: 'A' | 'B' = (partA ?? 0.5) >= 0.5 ? 'A' : 'B';
        const n = partA === undefined ? undefined : Math.round(Math.max(partA, 1 - partA) * 100);
        dit = ligne('consultant', 'analyse', { club: club(fort), adv: club(autre(fort)), n: n !== undefined && n >= 58 ? n : undefined }, 1);
      }
      if (dit) dernierConsultant = maintenant;
    }

    // Le drop reste « en l'air » tant que le ballon vole : c'est à la retombée qu'on sait s'il est passé.
    const dropSuivi = e.dropEnCours ?? (e.phase === 'ballonEnLAir' ? vu.drop : null);
    Object.assign(vu, { vol, ruck, conquete: c, maul: e.maul ?? null, tir, sifflet, echappee: e.echappee ?? null, tmo: e.tmo ?? null,
      impact: e.grosImpact ?? null, turnover: e.dernierTurnover ?? null, jeu, phase: e.fini ? 'fini' : e.phase, periode: e.periode,
      drop: dropSuivi, scoreA: e.scoreA, scoreB: e.scoreB });
    return sortie;
  };
}
