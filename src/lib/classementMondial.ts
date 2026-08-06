// LE CLASSEMENT MONDIAL — et surtout : COMMENT L'EMPÊCHER D'ÊTRE FALSIFIÉ
//
// Demande explicite : « prépare le classement mondial, et protège à fond pour
// que ce soit incassable à falsifier son score ; dans la DB je veux retenir
// juste le score ».
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LA VÉRITÉ D'ABORD, PARCE QU'ELLE COMMANDE TOUTE LA CONCEPTION
// ═══════════════════════════════════════════════════════════════════════════
// Destiny Rugby tourne ENTIÈREMENT dans le navigateur. Tout ce qui s'exécute
// chez le joueur lui appartient : il peut ouvrir les outils de développement,
// éditer le localStorage, modifier le bundle, ou appeler l'API à la main avec
// `fetch`. AUCUN code livré au navigateur ne peut donc, à lui seul, garantir un
// score. Un secret embarqué dans le bundle n'est pas un secret : il se lit en
// vingt secondes. Quiconque prétend le contraire vend du vent.
//
// La seule protection RÉELLE est donc : **le serveur ne fait jamais confiance
// au score envoyé — il le RECALCULE.**
//
// D'où l'architecture, qui répond aussi à « dans la DB je veux juste le score » :
//
//        navigateur                      serveur (Edge Function)            DB
//   ┌──────────────────┐          ┌────────────────────────────┐    ┌────────────┐
//   │ FicheCarriere    │  POST →  │ 1. verifierFiche(fiche)    │    │ pseudo     │
//   │ (les faits bruts │          │ 2. score = scoreDeLaFiche()│ →  │ score      │
//   │  de la carrière) │          │ 3. jette la fiche          │    │ cree_le    │
//   └──────────────────┘          └────────────────────────────┘    └────────────┘
//
// La REQUÊTE porte les faits (saisons, note, matchs, essais, titres…), ce qui
// permet au serveur de recalculer. La BASE, elle, ne garde que le score : la
// fiche est jetée aussitôt vérifiée. Les deux contraintes sont satisfaites.
//
// ⚠️ CE FICHIER EST FAIT POUR TOURNER DES DEUX CÔTÉS. Aucune dépendance, aucun
// import du store, aucun accès au DOM : on le copie tel quel dans la fonction
// serveur (Supabase Edge / Vercel / Cloudflare Worker). C'est indispensable —
// si le barème existait en deux exemplaires, il finirait par y avoir deux
// vérités, et le serveur validerait des scores que le jeu ne produit pas.

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA FICHE — le strict nécessaire pour recalculer un score
// ═══════════════════════════════════════════════════════════════════════════
// On n'envoie QUE ça. Pas les attributs détaillés, pas le journal, pas les
// relations : moins il y a de champs, moins il y a de surface à falsifier et
// moins il y a de données personnelles qui circulent.

/** Version du barème. Toute fiche d'une autre version est refusée. */
export const VERSION_BAREME = 1;

export interface FicheCarriere {
  /** Version du barème avec lequel la fiche a été produite. */
  v: number;
  /** Pseudo choisi par le joueur (≠ nom du personnage). */
  pseudo: string;
  nom: string;
  poste: string;
  nation: string;
  /** Âge à la création du personnage. */
  ageDebut: number;
  /** Âge à la retraite (ou aujourd'hui, pour une carrière en cours). */
  age: number;
  saisons: number;
  /** Moyenne des 8 attributs, arrondie. */
  note: number;
  reputation: number;
  matchs: number;
  essais: number;
  selections: number;
  /** Ids de trophées (`data/trophees.ts`), un par titre remporté. */
  titres: string[];
  /** Le score annoncé par le client. Le serveur le RECALCULE et compare. */
  score: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE BARÈME — une seule fonction, partagée
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LE score. C'est la seule définition qui existe dans tout le projet :
 * `scoreCarriere()` (store) et le serveur passent tous les deux par ici.
 */
export function scoreDeLaFiche(f: Pick<
  FicheCarriere, 'note' | 'reputation' | 'saisons' | 'titres' | 'essais' | 'matchs'
>): number {
  return Math.round(
    f.note * 12
    + f.reputation * 3
    + f.saisons * 20
    + f.titres.length * 120
    + f.essais * 6
    + f.matchs * 2,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES LIMITES DU JEU — c'est ELLES qui font le vrai travail
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Le plafond global de score ne sert presque à rien tout seul : il autorise
// encore « 30 saisons, 1 350 matchs, 5 400 essais ». Ce qui coince un tricheur,
// c'est la COHÉRENCE INTERNE — chaque chiffre est borné par les autres. Pour
// annoncer 5 000 essais, il faut annoncer 1 250 matchs, donc 28 saisons, donc
// avoir commencé à 15 ans et raccroché à 42, et avoir une note plausible pour
// ce nombre de saisons. Le tricheur ne peut plus « mettre un gros nombre » : il
// doit fabriquer une carrière entière qui tient debout — et à ce moment-là,
// autant jouer.

export const LIMITES = {
  /** `Creation` n'autorise pas de démarrer avant 15 ans. */
  ageDebutMin: 15,
  ageDebutMax: 24,
  /** `AGE_RETRAITE_FORCEE` : la carrière s'arrête d'office à 44 ans. */
  ageMax: 44,
  /** Le calendrier fait 44 semaines ; on tolère phases finales et sélections. */
  matchsParSaison: 50,
  /** Un quadruplé est déjà exceptionnel ; 5 est une borne large. */
  essaisParMatch: 5,
  /**
   * ⚠️ RELEVÉ DE 4 À 9 AVEC LES HONNEURS INDIVIDUELS. Le compte se fait à la
   * main, et il est SERRÉ — c'est ce qui rend la borne utile :
   *   collectifs (4) · championnat national · coupe d'Europe · Tournoi (ou
   *     Rugby Europe Championship) · Coupe du monde (une saison sur quatre) ;
   *   individuels (5) · meilleur joueur du championnat · de la Champions Cup ·
   *     du Tournoi · homme du match de la finale du monde · meilleur joueur du
   *     monde.
   * Personne n'a jamais fait les neuf dans la même saison, mais rien dans le
   * moteur ne l'interdit — et une borne qui refuse une carrière légitime est
   * pire qu'une borne large.
   */
  titresParSaison: 9,
  /** Un international ne dépasse pas une douzaine de capes par an. */
  capesParSaison: 12,
  noteMax: 99,
  reputationMax: 100,
  /**
   * Note atteignable après N saisons. On démarre entre 30 et 40 (`attributsDeBase`)
   * et on progresse au mieux d'environ 5 points par saison — la mesure
   * (`verifDifficulte.ts`) donne une médiane à 63 et un maximum à 85 sur
   * 12 saisons. La borne est volontairement GÉNÉREUSE (40 + 6 × saisons) : elle
   * doit refuser l'absurde, pas la carrière exceptionnelle.
   */
  noteApres: (saisons: number) => Math.min(99, 40 + saisons * 6),
  pseudoMax: 24,
} as const;

export const SAISONS_MAX = LIMITES.ageMax - LIMITES.ageDebutMin + 1;

/** Le score le plus élevé qu'une carrière PUISSE atteindre en respectant les règles. */
export const SCORE_MAX = scoreDeLaFiche({
  note: LIMITES.noteMax,
  reputation: LIMITES.reputationMax,
  saisons: SAISONS_MAX,
  titres: new Array(SAISONS_MAX * LIMITES.titresParSaison).fill('brennus'),
  essais: SAISONS_MAX * LIMITES.matchsParSaison * LIMITES.essaisParMatch,
  matchs: SAISONS_MAX * LIMITES.matchsParSaison,
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA VÉRIFICATION — ce que le serveur exécute avant d'écrire une ligne
// ═══════════════════════════════════════════════════════════════════════════

export interface Verdict {
  valide: boolean;
  /** Le score RECALCULÉ. C'est lui qu'on écrit en base, jamais `fiche.score`. */
  score: number;
  /** Ce qui cloche, en clair. Vide si la fiche est valide. */
  anomalies: string[];
}

/**
 * Passe une fiche au crible. Pure, sans effet de bord, sans réseau : elle donne
 * exactement le même verdict dans le navigateur et sur le serveur.
 *
 * @param trophees ids de trophées connus (`Object.keys(TROPHEES)`). Passé en
 *   paramètre plutôt qu'importé pour que ce fichier reste copiable tel quel
 *   côté serveur, sans traîner tout `data/trophees.ts` derrière lui.
 */
export function verifierFiche(f: unknown, trophees?: Iterable<string>): Verdict {
  const anomalies: string[] = [];
  const rejet = (m: string) => anomalies.push(m);

  if (!f || typeof f !== 'object') {
    return { valide: false, score: 0, anomalies: ['fiche absente ou illisible'] };
  }
  const c = f as Partial<FicheCarriere>;

  // --- Types et bornes élémentaires ----------------------------------------
  const entier = (v: unknown, nom: string, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
      rejet(`${nom} n'est pas un entier`);
      return NaN;
    }
    if (v < min || v > max) rejet(`${nom} hors bornes (${v}, attendu ${min}..${max})`);
    return v;
  };

  if (c.v !== VERSION_BAREME) rejet(`version de barème inconnue (${String(c.v)})`);

  const pseudo = typeof c.pseudo === 'string' ? c.pseudo.trim() : '';
  if (!pseudo) rejet('pseudo vide');
  else if (pseudo.length > LIMITES.pseudoMax) rejet('pseudo trop long');
  if (typeof c.nom !== 'string' || !c.nom.trim()) rejet('nom vide');
  if (typeof c.poste !== 'string' || !c.poste) rejet('poste absent');
  if (typeof c.nation !== 'string' || !c.nation) rejet('nation absente');

  const saisons = entier(c.saisons, 'saisons', 1, SAISONS_MAX);
  const ageDebut = entier(c.ageDebut, 'ageDebut', LIMITES.ageDebutMin, LIMITES.ageDebutMax);
  const age = entier(c.age, 'age', LIMITES.ageDebutMin, LIMITES.ageMax);
  const note = entier(c.note, 'note', 0, LIMITES.noteMax);
  const reputation = entier(c.reputation, 'reputation', 0, LIMITES.reputationMax);
  const matchs = entier(c.matchs, 'matchs', 0, SAISONS_MAX * LIMITES.matchsParSaison);
  const essais = entier(c.essais, 'essais', 0, SAISONS_MAX * LIMITES.matchsParSaison * LIMITES.essaisParMatch);
  const selections = entier(c.selections, 'selections', 0, SAISONS_MAX * LIMITES.capesParSaison);

  if (!Array.isArray(c.titres)) rejet('titres n\'est pas une liste');
  const titres = Array.isArray(c.titres) ? c.titres : [];
  if (titres.some((t) => typeof t !== 'string')) rejet('un titre n\'est pas un identifiant');

  // Une anomalie de type rend la suite ininterprétable : on s'arrête là.
  if (anomalies.length) return { valide: false, score: 0, anomalies };

  // --- LA COHÉRENCE INTERNE, le vrai verrou --------------------------------
  // ⚠️ Chaque chiffre est borné par les AUTRES. C'est ce qui transforme
  // « mettre un gros nombre » en « fabriquer une carrière entière crédible ».

  // Une saison de jeu = un an de vie. Le calendrier ne connaît pas d'exception.
  if (age !== ageDebut + saisons - 1) {
    rejet(`âge incohérent : ${ageDebut} + ${saisons} saisons − 1 = ${ageDebut + saisons - 1}, annoncé ${age}`);
  }
  if (matchs > saisons * LIMITES.matchsParSaison) {
    rejet(`${matchs} matchs en ${saisons} saison(s) : maximum ${saisons * LIMITES.matchsParSaison}`);
  }
  if (essais > matchs * LIMITES.essaisParMatch) {
    rejet(`${essais} essais en ${matchs} match(s) : maximum ${matchs * LIMITES.essaisParMatch}`);
  }
  if (titres.length > saisons * LIMITES.titresParSaison) {
    rejet(`${titres.length} titres en ${saisons} saison(s) : maximum ${saisons * LIMITES.titresParSaison}`);
  }
  // ⚠️ ET SURTOUT : ON NE GAGNE PAS DEUX FOIS LE MÊME TROPHÉE LA MÊME SAISON.
  // Cette borne-là est bien plus serrée que le total, et c'est elle qui reprend
  // le travail que le plafond de titres faisait avant qu'on l'ouvre aux
  // distinctions individuelles (4 → 9). Elle refuse « 40 Boucliers de Brennus
  // en 12 saisons » — que le total, lui, laissait passer (40 < 108) — sans rien
  // interdire à une carrière réelle : un championnat se gagne une fois par an.
  const parTrophee = new Map<string, number>();
  for (const t of titres) parTrophee.set(t, (parTrophee.get(t) ?? 0) + 1);
  const repetes = [...parTrophee].filter(([, n]) => n > saisons);
  if (repetes.length) {
    rejet(`trophée(s) gagné(s) plus d'une fois par saison : `
      + repetes.map(([id, n]) => `${id} ×${n} en ${saisons} saison(s)`).join(', '));
  }
  if (selections > saisons * LIMITES.capesParSaison) {
    rejet(`${selections} sélections en ${saisons} saison(s) : maximum ${saisons * LIMITES.capesParSaison}`);
  }
  if (note > LIMITES.noteApres(saisons)) {
    rejet(`note ${note} après ${saisons} saison(s) : maximum ${LIMITES.noteApres(saisons)}`);
  }
  // On ne marque pas d'essai sans jouer, et on n'est pas international sans match.
  if (matchs === 0 && (essais > 0 || selections > 0)) {
    rejet('des essais ou des sélections sans le moindre match');
  }
  // Un titre se gagne avec une équipe : il faut avoir joué.
  if (matchs === 0 && titres.length > 0) rejet('des titres sans le moindre match');

  // --- Les titres doivent EXISTER ------------------------------------------
  // Sans ça, on annonce quarante titres inventés et le compteur × 120 s'envole.
  if (trophees) {
    const connus = new Set(trophees);
    const inconnus = [...new Set(titres.filter((t) => !connus.has(t)))];
    if (inconnus.length) rejet(`trophée(s) inconnu(s) : ${inconnus.join(', ')}`);
  }

  // --- Enfin : le score annoncé doit être CELUI QU'ON RECALCULE -------------
  const score = scoreDeLaFiche({ note, reputation, saisons, titres, essais, matchs });
  if (typeof c.score !== 'number' || Math.round(c.score) !== score) {
    rejet(`score annoncé ${String(c.score)}, score recalculé ${score}`);
  }
  if (score > SCORE_MAX) rejet(`score au-dessus du plafond absolu (${score} > ${SCORE_MAX})`);

  return { valide: anomalies.length === 0, score, anomalies };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE SCEAU — détecter une sauvegarde retouchée à la main
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CE N'EST PAS DE LA SÉCURITÉ, C'EST DE LA DÉTECTION. La clé vit dans le
// bundle : quelqu'un de motivé la lira et recalculera le sceau. Ce n'est pas le
// but. Le but, c'est d'attraper le geste le plus courant de très loin — ouvrir
// l'onglet Application, changer `essais: 12` en `essais: 9999`, recharger — et
// de refuser d'envoyer une sauvegarde qui ne correspond plus à ce que le jeu a
// produit. La vraie barrière reste `verifierFiche()`, côté serveur.

/** FNV-1a 32 bits, doublé sur deux graines pour 64 bits d'empreinte. */
export function empreinte(chaine: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < chaine.length; i++) {
    const co = chaine.charCodeAt(i);
    a = Math.imul(a ^ co, 0x01000193) >>> 0;
    b = Math.imul(b ^ (co + i), 0x85ebca6b) >>> 0;
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** La chaîne canonique d'une fiche : ordre FIXE, sinon le sceau n'est pas stable. */
export function canonique(f: FicheCarriere): string {
  return [
    f.v, f.pseudo, f.nom, f.poste, f.nation, f.ageDebut, f.age, f.saisons,
    f.note, f.reputation, f.matchs, f.essais, f.selections,
    // ⚠️ Les titres sont TRIÉS : deux carrières identiques dont les titres
    // arrivent dans un ordre différent doivent produire le même sceau.
    [...f.titres].sort().join(','),
    f.score,
  ].join('|');
}

export function sceller(f: FicheCarriere, sel: string): string {
  return empreinte(`${sel}::${canonique(f)}`);
}

export function sceauValide(f: FicheCarriere, sceau: string, sel: string): boolean {
  return sceller(f, sel) === sceau;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CE QUE LE SERVEUR DOIT FAIRE — la check-list, en un endroit
// ═══════════════════════════════════════════════════════════════════════════
// `verifierFiche` couvre la falsification du CONTENU. Restent trois abus qu'une
// fonction pure ne peut pas voir, et qui se traitent côté serveur :
//
//   1. LE VOLUME. Une carrière crédible demande des heures de jeu. Un envoi par
//      appareil et par heure, dix par jour, suffit à rendre le forçage inutile.
//      (clé = hash de l'IP + un identifiant d'appareil, PAS l'IP en clair.)
//   2. LA RÉPÉTITION. Même pseudo + même score + même minute = doublon : on
//      garde le premier. Un `unique(pseudo)` en base et un `on conflict do
//      update where excluded.score > carrieres.score` suffisent.
//   3. LA VITESSE. Deux carrières de 20 saisons en cinq minutes, c'est un
//      script. Journaliser l'écart entre deux envois d'un même appareil.
//
// ⚠️ ET LA CLÉ D'ÉCRITURE NE DOIT JAMAIS ÊTRE DANS LE BUNDLE. Le navigateur
// parle à une Edge Function ; c'est ELLE qui détient la clé de service et écrit
// en base. Une clé `anon` avec droit d'insertion sur la table du classement,
// c'est un classement mort en une semaine.
export const RECOMMANDATIONS_SERVEUR_LISTE = [
  'Recalculer le score avec scoreDeLaFiche() : ne jamais écrire fiche.score.',
  'Refuser toute fiche dont verifierFiche() renvoie des anomalies.',
  'Limiter : 1 envoi/heure et 10/jour par appareil, 30/heure par IP.',
  'Contrainte unique sur le pseudo, et ne garder que le meilleur score.',
  'Écrire depuis une Edge Function avec la clé de service — jamais depuis le navigateur.',
  'Journaliser les refus : c\'est là qu\'on voit arriver les scripts.',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// 7. FABRIQUER LA FICHE (côté jeu uniquement)
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ SECTION CLIENT. Les imports ci-dessous sont des imports de TYPES : ils
// disparaissent à la compilation, le fichier reste donc exécutable tel quel
// côté serveur. Si tu le copies dans une Edge Function, tu peux supprimer cette
// section — le serveur reçoit une fiche déjà faite, il n'a qu'à la vérifier.

import type { Joueur, LegendeSauvegardee } from '../types';

function moyenne(valeurs: number[]): number {
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / (valeurs.length || 1));
}

/** La fiche d'une carrière EN COURS. */
export function ficheDepuisJoueur(j: Joueur, pseudo?: string): FicheCarriere {
  const saisons = Math.max(1, j.saison);
  const base = {
    v: VERSION_BAREME,
    pseudo: (pseudo ?? j.pseudo ?? j.nom).slice(0, LIMITES.pseudoMax),
    nom: j.nom,
    poste: j.poste,
    nation: j.nation,
    // ⚠️ DÉDUIT, PAS STOCKÉ : une saison de jeu = un an de vie, partout dans le
    // moteur. C'est cette égalité que `verifierFiche` re-teste — elle borne le
    // nombre de saisons annonçables à ce qu'une vie de rugbyman permet.
    ageDebut: j.age - saisons + 1,
    age: j.age,
    saisons,
    note: moyenne(Object.values(j.attributs)),
    reputation: Math.round(j.reputation),
    matchs: j.matchsJoues,
    essais: j.essais,
    selections: j.selections ?? 0,
    // On envoie les IDS de trophées, pas les libellés : c'est vérifiable.
    titres: (j.palmares ?? []).map((t) => t.trophee),
  };
  return { ...base, score: scoreDeLaFiche(base) };
}

/** La fiche d'une carrière TERMINÉE (une légende du Hall). */
export function ficheDepuisLegende(l: LegendeSauvegardee, pseudo?: string): FicheCarriere {
  const saisons = Math.max(1, l.saisons);
  const base = {
    v: VERSION_BAREME,
    pseudo: (pseudo ?? l.nom).slice(0, LIMITES.pseudoMax),
    nom: l.nom,
    poste: l.poste,
    nation: l.nation,
    ageDebut: l.age - saisons + 1,
    age: l.age,
    saisons,
    note: Math.round(l.note),
    reputation: Math.round(l.reputation),
    matchs: l.matchsJoues,
    essais: l.essais,
    selections: 0,
    // ⚠️ Une légende ne garde que des LIBELLÉS (« Bouclier de Brennus (S4) ») :
    // on ne peut pas en tirer d'ids vérifiables. On envoie donc une liste de
    // marqueurs neutres, de la bonne LONGUEUR — c'est elle qui compte dans le
    // barème — et le serveur ne pourra pas vérifier la nature des trophées.
    // C'est le prix des sauvegardes d'avant `Joueur.palmares` ; les carrières
    // menées depuis, elles, envoient de vrais ids.
    titres: (l.titres ?? []).map(() => 'titre'),
  };
  return { ...base, score: scoreDeLaFiche(base) };
}
