// LA VIE EN DEHORS DU TERRAIN — la grosse base d'évènements à choix.
//
// Demande explicite : « avec l'IA, ça nous pose un contexte avec un évènement
// auquel on peut répondre ; sans IA locale, un texte préfait
// avec des choix (fais une grosse db d'évènements). Pas de truc avec les matchs
// par contre, comme c'est pas durant les matchs. »
//
// ⚠️ RIEN ICI NE PARLE DU MATCH EN COURS. Le match se joue dans le moteur 2D ;
// ces situations-là, c'est le reste : le vestiaire, l'argent, la famille, les
// médias, le corps, la nuit, les tentations.
//
// ⚠️ CHAQUE SITUATION EST CONTEXTUELLE : `quand` filtre sur l'âge, la forme, le
// moral, la division, la notoriété, le contrat… On ne propose pas « premier
// contrat pro » à un joueur de 33 ans, ni « la retraite approche » à un espoir.

import type { Joueur, StatVariable } from '../types';
import type { Scenario } from './scenarios';
import { t } from '../lib/i18n';

// Ce que peut déclencher un choix, en plus des stats. C'est LE point d'entrée
// des évènements durs (voir `lib/consequences.ts`).
export type ConsequenceDure =
  | 'prison'          // condamnation : plusieurs mois hors des terrains
  | 'accident'        // accident grave : longue indisponibilité
  | 'deces'           // fin brutale — la carrière s'arrête là
  | 'finDeCarriere'   // le corps a dit stop
  | 'exclusionClub'   // le club rompt le contrat : te voilà sans club
  | 'relegationFinanciere' // le club est rétrogradé administrativement
  | 'suspension';     // suspension sportive de quelques semaines

export interface IssueSituation {
  recit: string;
  deltas: Partial<Record<StatVariable, number>>;
  ovas: number;
  coach?: number;
  fans?: number;
  /**
   * ⚠️ CE CHOIX OUVRE VRAIMENT LE MARCHÉ, comme pour les scénarios
   * (`IssueChoix.marche`, data/scenarios.ts). Il manquait ici : une situation
   * du genre « appelle ton agent pour partir en janvier » ne pouvait que le
   * RACONTER, jamais le déclencher — exactement le défaut corrigé côté
   * scénarios (« les transferts marchent pas »). `versScenario` recopie l'issue
   * telle quelle, le store fait le reste.
   */
  marche?: boolean;
  /** Conséquence lourde, appliquée par le store. */
  dur?: { type: ConsequenceDure; semaines?: number; motif: string };
}

export interface ChoixSituation {
  texte: string;
  issue: IssueSituation;
}

export interface Situation {
  id: string;
  emoji: string;
  titre: string;
  categorie: 'vestiaire' | 'argent' | 'medias' | 'perso' | 'corps' | 'nuit' | 'club' | 'carriere';
  /** Poids de tirage : 1 = ordinaire, 0.2 = rare. */
  poids?: number;
  /** Conditions d'apparition. Toutes doivent être vraies. */
  quand?: (j: Joueur) => boolean;
  situation: string;
  choix: ChoixSituation[];
}

const gen = (j: Joueur): number => {
  const v = Object.values(j.attributs ?? {});
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 45;
};
const pro = (j: Joueur): boolean => ['top14', 'prod2', 'nationale'].includes(j.division ?? '');
const amateur = (j: Joueur): boolean => !pro(j);

export const SITUATIONS: Situation[] = [
  // ═══════════════════════ VESTIAIRE ═══════════════════════
  {
    id: 'bizutage', emoji: '🎽', categorie: 'vestiaire', poids: 1,
    quand: (j) => j.age <= 23,
    titre: 'Le rituel du vestiaire',
    situation: 'Les anciens veulent te faire chanter debout sur la table du réfectoire, devant tout le monde. Le staff regarde ailleurs en souriant.',
    choix: [
      { texte: 'Y aller à fond, faux et assumé.', issue: { recit: 'Tu massacres la chanson, le vestiaire pleure de rire. Tu fais partie du groupe.', deltas: { moral: 8, reputation: 2 }, ovas: 3, coach: 3, fans: 2 } },
      { texte: 'Refuser poliment.', issue: { recit: 'Personne n’insiste, mais tu sens un froid pendant deux semaines.', deltas: { moral: -5 }, ovas: 1, coach: -2 } },
      { texte: 'Retourner le truc contre les anciens.', issue: { recit: 'Tu improvises un couplet sur le capitaine. Risqué — mais le vestiaire adore.', deltas: { moral: 10, reputation: 4, mental: 1 }, ovas: 5, coach: 1, fans: 4 } },
    ],
  },
  {
    id: 'bagarre-entrainement', emoji: '🥊', categorie: 'vestiaire', poids: 0.7,
    titre: 'Ça dégénère à l’entraînement',
    situation: 'Une opposition monte d’un cran. Un coéquipier te met un coup d’épaule bien après le coup de sifflet, puis te cherche du regard.',
    choix: [
      { texte: 'Lui rentrer dedans.', issue: { recit: 'Deux minutes de chaos, le staff vous sépare. Le coach vous colle une amende à tous les deux.', deltas: { moral: -3, argent: -800, reputation: 1 }, ovas: 2, coach: -5 } },
      { texte: 'Serrer les dents et repartir.', issue: { recit: 'Tu ne réponds pas. Le staff le voit, le vestiaire aussi.', deltas: { mental: 1, moral: -2 }, ovas: 3, coach: 4 } },
      { texte: 'Le prendre à part après la séance.', issue: { recit: 'Discussion franche sous la douche. Vous en sortez plus proches qu’avant.', deltas: { moral: 5, mental: 1 }, ovas: 4, coach: 2 } },
    ],
  },
  {
    id: 'jeune-a-aider', emoji: '🤝', categorie: 'vestiaire', poids: 1,
    quand: (j) => j.age >= 26,
    titre: 'Un jeune du centre de formation',
    situation: 'Un espoir de 19 ans monte s’entraîner avec le groupe. Il est perdu, il n’ose parler à personne, et il joue à ton poste.',
    choix: [
      { texte: 'Le prendre sous ton aile.', issue: { recit: 'Tu lui expliques tout : les codes, les vidéos, les kinés. Le staff apprécie beaucoup.', deltas: { moral: 6, reputation: 3 }, ovas: 5, coach: 6, fans: 3 } },
      { texte: 'Le laisser se débrouiller — c’est un concurrent.', issue: { recit: 'Il galère. Personne ne t’en veut ouvertement, mais on t’a vu faire.', deltas: { moral: -2 }, ovas: 1, coach: -3 } },
      { texte: 'Le pousser à bout à l’entraînement.', issue: { recit: 'Tu le passes à la moulinette. Il en ressort plus dur — et il te doit quelque chose.', deltas: { plaquage: 1, reputation: 2 }, ovas: 4, coach: 2 } },
    ],
  },
  {
    id: 'capitanat', emoji: '©️', categorie: 'vestiaire', poids: 0.5,
    quand: (j) => gen(j) >= 60 && j.age >= 25 && !j.capitaine,
    titre: 'Le brassard se libère',
    situation: 'Le capitaine part en fin de saison. Le coach fait le tour des cadres pour prendre la température. Il te demande si tu te sens prêt.',
    choix: [
      { texte: 'Te porter candidat.', issue: { recit: 'Tu poses ta candidature clairement. Le staff note ton aplomb.', deltas: { mental: 2, reputation: 4, moral: 4 }, ovas: 6, coach: 7, fans: 3 } },
      { texte: 'Soutenir un autre cadre.', issue: { recit: 'Tu appuies un ancien. Le vestiaire retient ta loyauté.', deltas: { moral: 3 }, ovas: 4, coach: 3 } },
      { texte: 'Dire que tu préfères te concentrer sur ton jeu.', issue: { recit: 'Réponse honnête. Le coach comprend, mais range ton nom dans une autre case.', deltas: { moral: 2 }, ovas: 2, coach: -2 } },
    ],
  },

  // ═══════════════════════ ARGENT ═══════════════════════
  {
    id: 'sponsor-local', emoji: '🤝', categorie: 'argent', poids: 1,
    quand: (j) => (j.reputation ?? 0) >= 25,
    titre: 'Un sponsor frappe à la porte',
    situation: 'Un concessionnaire automobile de la ville te propose un contrat d’image : une voiture, un peu d’argent, et trois apparitions par an.',
    choix: [
      { texte: 'Signer, c’est du bonus.', issue: { recit: 'Photos, sourire, poignées de main. L’argent tombe, la notoriété locale grimpe.', deltas: { argent: 9000, reputation: 3, forme: -2 }, ovas: 6, fans: 5 } },
      { texte: 'Négocier plus cher.', issue: { recit: 'Tu doubles la mise. Ils acceptent, un peu refroidis.', deltas: { argent: 16000, reputation: 2 }, ovas: 8, fans: 2 } },
      { texte: 'Refuser, tu veux rester concentré.', issue: { recit: 'Pas de distraction cette saison. Le staff apprécie.', deltas: { moral: 2 }, ovas: 3, coach: 4 } },
    ],
  },
  {
    id: 'investissement', emoji: '💸', categorie: 'argent', poids: 0.8,
    quand: (j) => j.argent >= 25_000,
    titre: 'Un « ami » a un plan en or',
    situation: 'Un proche te propose d’investir dans un restaurant qui va ouvrir en centre-ville. « Tu ne toucheras à rien, tu récupères juste les bénéfices. »',
    choix: [
      { texte: 'Mettre 20 000 €.', issue: { recit: 'Six mois plus tard, l’enseigne ferme et ton ami ne répond plus. Leçon chère payée.', deltas: { argent: -20_000, moral: -10, mental: 2 }, ovas: 2 } },
      { texte: 'Mettre 5 000 € pour voir.', issue: { recit: 'Ça tourne moyennement, mais tu récupères ta mise et un peu plus.', deltas: { argent: 2000, mental: 1 }, ovas: 4 } },
      { texte: 'Refuser et placer ton argent proprement.', issue: { recit: 'Tu passes par un conseiller. Rien de spectaculaire, mais rien ne brûle.', deltas: { argent: 3500, mental: 1 }, ovas: 5 } },
    ],
  },
  {
    id: 'paris-sportifs', emoji: '🎰', categorie: 'argent', poids: 0.35,
    titre: 'Un pari de trop',
    situation: 'Un ami t’explique qu’il gagne « à tous les coups » en pariant sur le rugby anglais. Il te propose de suivre ses pronostics. Parier sur le rugby est interdit aux joueurs sous licence.',
    choix: [
      { texte: 'Refuser net.', issue: { recit: 'Tu coupes court. Il insiste, tu changes de sujet.', deltas: { mental: 1 }, ovas: 4 } },
      { texte: 'Parier discrètement, petites sommes.', issue: { recit: 'Tu gagnes un peu. Puis tu perds beaucoup. Et surtout tu regardes ton téléphone entre deux séances.', deltas: { argent: -6000, moral: -8, forme: -4 }, ovas: 1, coach: -3 } },
      {
        texte: 'Parier gros, et sur ton propre championnat.',
        issue: {
          recit: 'La fédération croise les comptes. Convocation, commission de discipline, suspension ferme. Ton nom sort dans la presse.',
          deltas: { reputation: -25, moral: -25, argent: -20_000 }, ovas: 0, coach: -30, fans: -25,
          dur: { type: 'suspension', semaines: 14, motif: 'paris sportifs sur ta propre compétition' },
        },
      },
    ],
  },
  {
    id: 'impots', emoji: '🧾', categorie: 'argent', poids: 0.5,
    quand: (j) => j.argent >= 60_000,
    titre: 'Un contrôle fiscal',
    situation: 'Ton comptable t’annonce un contrôle. Il te propose de « lisser » deux ou trois choses avant l’échéance.',
    choix: [
      { texte: 'Tout déclarer, quitte à payer.', issue: { recit: 'La facture pique, mais tu dors bien.', deltas: { argent: -18_000, mental: 2, moral: -3 }, ovas: 5 } },
      { texte: 'Suivre son conseil.', issue: { recit: 'Ça passe cette fois. Tu as gardé de l’argent, et une petite boule au ventre.', deltas: { argent: -3000, moral: -4 }, ovas: 3 } },
      { texte: 'Changer de comptable et régulariser.', issue: { recit: 'Coûteux, long, mais définitivement réglé.', deltas: { argent: -12_000, mental: 3 }, ovas: 6 } },
    ],
  },

  // ═══════════════════════ MÉDIAS ═══════════════════════
  {
    id: 'interview-piege', emoji: '🎙️', categorie: 'medias', poids: 1,
    quand: (j) => (j.reputation ?? 0) >= 20,
    titre: 'Une question piège',
    situation: 'En zone mixte, un journaliste te demande si le coach s’est trompé dans ses choix ce week-end.',
    choix: [
      { texte: 'Botter en touche.', issue: { recit: 'Réponse lisse, personne n’en fait un titre. Le staff apprécie.', deltas: { reputation: 1 }, ovas: 3, coach: 4 } },
      { texte: 'Dire ce que tu penses vraiment.', issue: { recit: 'La phrase tourne en boucle. Le coach te convoque le lendemain matin.', deltas: { reputation: 5, moral: -6, argent: -2500 }, ovas: 5, coach: -10, fans: 8 } },
      { texte: 'Défendre le coach avec force.', issue: { recit: 'Tu montes au créneau pour le staff. Ça se voit, ça se sait.', deltas: { reputation: 2, moral: 3 }, ovas: 4, coach: 8 } },
    ],
  },
  {
    id: 'documentaire', emoji: '🎬', categorie: 'medias', poids: 0.5,
    quand: (j) => (j.reputation ?? 0) >= 45,
    titre: 'Une équipe de télé veut te suivre',
    situation: 'Une production veut te filmer pendant six mois : entraînements, famille, vestiaire. Gros chèque, zéro intimité.',
    choix: [
      { texte: 'Accepter tout.', issue: { recit: 'Le documentaire cartonne. Tu deviens un visage connu — et tu ne rentres plus chez toi sans caméra.', deltas: { argent: 30_000, reputation: 12, moral: -6, forme: -4 }, ovas: 10, fans: 20, coach: -3 } },
      { texte: 'Accepter, mais sans la famille.', issue: { recit: 'Compromis accepté. Moins d’argent, mais ta maison reste ta maison.', deltas: { argent: 14_000, reputation: 6 }, ovas: 8, fans: 10 } },
      { texte: 'Refuser.', issue: { recit: 'Tu passes ton tour. La production trouve quelqu’un d’autre.', deltas: { moral: 2 }, ovas: 3, coach: 2 } },
    ],
  },
  {
    id: 'polemique-arbitre', emoji: '⚖️', categorie: 'medias', poids: 0.6,
    titre: 'L’arbitrage en question',
    situation: 'Un micro traîne pendant que tu commentes une décision arbitrale de la journée. Le journaliste te propose de « développer, en off ».',
    choix: [
      { texte: 'Refuser le off.', issue: { recit: 'Tu connais la chanson. Rien ne sort.', deltas: { mental: 1 }, ovas: 3, coach: 3 } },
      { texte: 'Développer, en off.', issue: { recit: 'Ça sort quand même, sans ton nom mais tout le monde te reconnaît. La commission te convoque.', deltas: { reputation: -6, argent: -4000, moral: -6 }, ovas: 2, coach: -6 } },
      { texte: 'Assumer publiquement.', issue: { recit: 'Tu signes tes mots. Amende immédiate, mais la moitié du rugby français t’applaudit.', deltas: { reputation: 8, argent: -6000, mental: 2 }, ovas: 6, fans: 15, coach: -5 } },
    ],
  },

  // ═══════════════════════ PERSO ═══════════════════════
  {
    id: 'naissance', emoji: '👶', categorie: 'perso', poids: 0.6,
    quand: (j) => j.age >= 23,
    titre: 'Un heureux évènement',
    situation: 'Ta compagne est enceinte. L’accouchement tombe en pleine série de matchs importants.',
    choix: [
      { texte: 'Être là, quoi qu’il arrive.', issue: { recit: 'Tu rates un déplacement. Tu t’en fiches complètement : tu as vu ton enfant naître.', deltas: { moral: 25, forme: -5 }, ovas: 8, coach: -2 } },
      { texte: 'Jouer, et rentrer aussitôt.', issue: { recit: 'Tu joues, tu prends la voiture à la sirène, tu arrives à temps de justesse.', deltas: { moral: 15, forme: -8 }, ovas: 6, coach: 4 } },
    ],
  },
  {
    id: 'demenagement', emoji: '📦', categorie: 'perso', poids: 0.7,
    titre: 'Rester ou repartir',
    situation: 'Ta famille vit à trois cents kilomètres. Tu passes tes lundis sur l’autoroute et ça commence à se voir.',
    choix: [
      { texte: 'Les faire venir près du club.', issue: { recit: 'Déménagement coûteux, mais tu récupères deux heures par jour et ta tête va mieux.', deltas: { argent: -12_000, moral: 14, forme: 6 }, ovas: 6 } },
      { texte: 'Continuer comme ça.', issue: { recit: 'Tu tiens. Mais la fatigue s’accumule et tu le sais.', deltas: { forme: -8, moral: -4, endurance: -1 }, ovas: 2 } },
      { texte: 'Prendre un appartement sur place et rentrer le week-end.', issue: { recit: 'Solution du milieu. Ni idéale, ni catastrophique.', deltas: { argent: -5000, forme: 3, moral: 2 }, ovas: 4 } },
    ],
  },
  {
    id: 'deuil', emoji: '🕯️', categorie: 'perso', poids: 0.3,
    titre: 'Une mauvaise nouvelle',
    situation: 'Un proche est très malade. Le club te laisse libre de tes déplacements.',
    choix: [
      { texte: 'Prendre le temps qu’il faut.', issue: { recit: 'Tu t’absentes deux semaines. Le rugby attendra ; ça, non.', deltas: { moral: -12, forme: -10, mental: 3 }, ovas: 4, coach: 2 } },
      { texte: 'Te réfugier dans le travail.', issue: { recit: 'Tu enchaînes les séances pour ne pas penser. Ça tient, un temps.', deltas: { moral: -18, plaquage: 1, force: 1 }, ovas: 3 } },
    ],
  },
  {
    id: 'reprise-etudes', emoji: '🎓', categorie: 'perso', poids: 0.6,
    quand: (j) => j.age >= 24,
    titre: 'Préparer l’après',
    situation: 'Le syndicat des joueurs propose une formation à distance — kiné, commerce, entraîneur. Ça prend deux soirs par semaine.',
    choix: [
      { texte: 'S’inscrire.', issue: { recit: 'Deux soirs en moins pour récupérer, mais un avenir qui se dessine.', deltas: { forme: -5, mental: 3, moral: 6 }, ovas: 7 } },
      { texte: 'Plus tard.', issue: { recit: 'Tu remets à la saison prochaine. Comme l’an dernier.', deltas: { moral: -2 }, ovas: 1 } },
    ],
  },

  // ═══════════════════════ CORPS ═══════════════════════
  {
    id: 'douleur-cachee', emoji: '🩹', categorie: 'corps', poids: 1,
    quand: (j) => (j.forme ?? 100) <= 70,
    titre: 'Une douleur qui traîne',
    situation: 'Ton genou te lance depuis trois semaines. Le kiné veut faire une IRM ; le coach compte sur toi dimanche.',
    choix: [
      { texte: 'Faire l’IRM et lever le pied.', issue: { recit: 'Rien de grave, mais deux semaines de gestion. Tu reviens sur de bonnes bases.', deltas: { forme: 14, moral: -3 }, ovas: 5, coach: -2 } },
      { texte: 'Serrer les dents et jouer.', issue: { recit: 'Tu joues infiltré. Ça passe. Le genou, lui, n’oublie pas.', deltas: { forme: -12, reputation: 3, endurance: -1 }, ovas: 3, coach: 6 } },
      { texte: 'Voir un spécialiste à tes frais, sans en parler.', issue: { recit: 'Diagnostic clair, protocole précis. Personne au club n’en sait rien.', deltas: { argent: -3500, forme: 8, mental: 1 }, ovas: 5 } },
    ],
  },
  {
    id: 'complements', emoji: '💊', categorie: 'corps', poids: 0.4,
    titre: 'Le complément miracle',
    situation: 'Un préparateur croisé en stage te propose « un truc légal, tout le monde en prend » pour récupérer plus vite. Il n’a ni ordonnance, ni étiquette.',
    choix: [
      { texte: 'Refuser sans discuter.', issue: { recit: 'Tu ne prends que ce que le médecin du club te donne. Basique, efficace.', deltas: { mental: 2 }, ovas: 5 } },
      { texte: 'Demander l’avis du médecin du club.', issue: { recit: 'Le médecin est catégorique : c’est n’importe quoi. Tu l’as échappé belle.', deltas: { mental: 2, moral: 2 }, ovas: 6 } },
      {
        texte: 'Essayer, juste pour voir.',
        issue: {
          recit: 'Contrôle inopiné trois semaines plus tard. Le produit contenait une substance interdite. Suspension et titres à la une.',
          deltas: { reputation: -30, moral: -30, argent: -15_000 }, ovas: 0, coach: -30, fans: -30,
          dur: { type: 'suspension', semaines: 24, motif: 'contrôle antidopage positif' },
        },
      },
    ],
  },
  {
    id: 'commotion', emoji: '🧠', categorie: 'corps', poids: 0.5,
    titre: 'Un choc à la tête',
    situation: 'Tu as pris un coup à l’entraînement. Tu as vu trouble dix secondes. Personne ne l’a remarqué.',
    choix: [
      { texte: 'Le signaler tout de suite.', issue: { recit: 'Protocole commotion : dix jours sans contact. Frustrant, mais c’est le cerveau.', deltas: { forme: -6, mental: 3 }, ovas: 6, coach: 3 } },
      {
        texte: 'Ne rien dire.',
        issue: {
          recit: 'Tu enchaînes. Trois semaines plus tard, un second choc — et cette fois, les médecins sont formels : c’est terminé.',
          deltas: { moral: -35, forme: -40 }, ovas: 0,
          dur: { type: 'finDeCarriere', motif: 'commotions cérébrales à répétition' },
        },
      },
      { texte: 'En parler au médecin en privé.', issue: { recit: 'Suivi discret, charge allégée. Le staff n’en saura rien.', deltas: { forme: -2, mental: 2 }, ovas: 5 } },
    ],
  },

  // ═══════════════════════ NUIT ═══════════════════════
  {
    id: 'sortie-veille', emoji: '🍻', categorie: 'nuit', poids: 1,
    titre: 'La soirée de trop',
    situation: 'Anniversaire d’un coéquipier, un mardi. Séance de décrassage le lendemain à 9 h.',
    choix: [
      { texte: 'Passer une heure, boire un verre, rentrer.', issue: { recit: 'Tu montres ta tête, tu rentres tôt. Tout le monde y gagne.', deltas: { moral: 5 }, ovas: 4, coach: 1 } },
      { texte: 'Rester jusqu’au bout.', issue: { recit: 'Décrassage à 9 h avec deux heures de sommeil. Le préparateur physique n’est pas dupe.', deltas: { forme: -12, moral: 6 }, ovas: 3, coach: -5 } },
      { texte: 'Ne pas y aller.', issue: { recit: 'Tu restes chez toi. Le groupe le remarque, sans t’en vouloir vraiment.', deltas: { forme: 4, moral: -3 }, ovas: 2 } },
    ],
  },
  {
    id: 'volant', emoji: '🚗', categorie: 'nuit', poids: 0.3,
    titre: 'Reprendre le volant',
    situation: 'Trois heures du matin, deux verres de trop, ta voiture est sur le parking et tu habites à dix minutes.',
    choix: [
      { texte: 'Appeler un taxi.', issue: { recit: 'Trente euros et une nuit tranquille.', deltas: { argent: -30, mental: 1 }, ovas: 4 } },
      { texte: 'Dormir sur place.', issue: { recit: 'Canapé du club-house. Dos cassé, mais permis intact.', deltas: { forme: -4, moral: 1 }, ovas: 3 } },
      {
        texte: 'Prendre le volant, ça va aller.',
        issue: {
          recit: 'Contrôle à la sortie du rond-point. Alcoolémie largement au-dessus, retrait de permis immédiat, garde à vue, et le club apprend tout par la presse.',
          deltas: { reputation: -25, moral: -25, argent: -8000 }, ovas: 0, coach: -30, fans: -20,
          dur: { type: 'prison', semaines: 8, motif: 'conduite en état d’ivresse' },
        },
      },
    ],
  },
  {
    id: 'bagarre-boite', emoji: '💥', categorie: 'nuit', poids: 0.35,
    titre: 'Une altercation en ville',
    situation: 'On te cherche depuis vingt minutes dans un bar. Le type est ivre, il connaît ton nom, et il a sorti son téléphone.',
    choix: [
      { texte: 'Partir immédiatement.', issue: { recit: 'Tu sors sans un mot. Une vidéo circule où on te voit… partir. Rien à en tirer.', deltas: { mental: 2 }, ovas: 5, coach: 3 } },
      { texte: 'Répondre verbalement.', issue: { recit: 'Ça monte, ça filme, ça finit sur les réseaux. Le club publie un communiqué gêné.', deltas: { reputation: -8, moral: -6, argent: -3000 }, ovas: 2, coach: -8 } },
      {
        texte: 'Le mettre au sol.',
        issue: {
          recit: 'Un coup, une fracture, une plainte. Le procureur ne plaisante pas avec les sportifs professionnels, et le club rompt ton contrat dans la foulée.',
          deltas: { reputation: -35, moral: -30, argent: -25_000 }, ovas: 0, coach: -40, fans: -30,
          dur: { type: 'prison', semaines: 20, motif: 'violences volontaires' },
        },
      },
    ],
  },

  // ═══════════════════════ CLUB ═══════════════════════
  {
    id: 'salaires-retard', emoji: '🏦', categorie: 'club', poids: 0.4,
    quand: (j) => amateur(j) || (j.division === 'nationale'),
    titre: 'Les salaires ont du retard',
    situation: 'Deuxième mois sans virement. Le président parle de « décalage de trésorerie ». Le vestiaire gronde.',
    choix: [
      { texte: 'Faire grève avec le groupe.', issue: { recit: 'Entraînement boycotté, presse locale en alerte. Le président paie sous quinze jours — et la DNACG ouvre un dossier.', deltas: { moral: -6, argent: 4000 }, ovas: 4, coach: -4 } },
      { texte: 'Aller voir le président seul à seul.', issue: { recit: 'Il te reçoit, t’explique tout, te règle en priorité. Le vestiaire l’apprend et grince des dents.', deltas: { argent: 6000, moral: -3, reputation: -3 }, ovas: 5 } },
      {
        texte: 'Prévenir la fédération.',
        issue: {
          recit: 'La commission financière descend au club. Comptes épluchés, budget refusé : le club est rétrogradé administrativement en fin de saison.',
          deltas: { moral: -12, reputation: 4 }, ovas: 3, coach: -12,
          dur: { type: 'relegationFinanciere', motif: 'dépôt de bilan du club' },
        },
      },
    ],
  },
  {
    id: 'coach-vire', emoji: '📉', categorie: 'club', poids: 0.6,
    titre: 'Le coach est sur le départ',
    situation: 'Trois défaites de suite. Un journaliste t’appelle : « Est-ce que le vestiaire suit encore l’entraîneur ? »',
    choix: [
      { texte: 'Assurer que tout le monde est derrière lui.', issue: { recit: 'Message clair. Le coach l’entend, le président aussi.', deltas: { reputation: 2 }, ovas: 4, coach: 10 } },
      { texte: 'Rester neutre.', issue: { recit: 'Réponse tiède. On ne peut rien te reprocher, et personne ne te remercie.', deltas: {}, ovas: 2 } },
      { texte: 'Laisser entendre que ça ne va plus.', issue: { recit: 'Le coach saute quinze jours plus tard. Il sait d’où c’est parti.', deltas: { reputation: -4, moral: -5 }, ovas: 3, coach: -15 } },
    ],
  },
  {
    id: 'ecart-conduite', emoji: '⛔', categorie: 'club', poids: 0.3,
    quand: (j) => (j.confianceCoach ?? 50) <= 35,
    titre: 'Convoqué par le président',
    situation: 'Retards répétés, séances bâclées, une sortie de trop : le président te reçoit dans son bureau. Le directeur sportif est là aussi, et il ne sourit pas.',
    choix: [
      { texte: 'Reconnaître et t’excuser.', issue: { recit: 'Tu prends tout, sans discuter. Ils te laissent une dernière chance.', deltas: { moral: -5, mental: 2 }, ovas: 4, coach: 8 } },
      { texte: 'Te justifier.', issue: { recit: 'Tu expliques. Ils écoutent à moitié. Amende, et mise à l’écart du groupe pro deux semaines.', deltas: { argent: -6000, moral: -10 }, ovas: 2, coach: -6 } },
      {
        texte: 'Hausser le ton.',
        issue: {
          recit: 'Tu claques la porte. Le club engage une procédure pour faute grave et rompt ton contrat.',
          deltas: { moral: -20, reputation: -12 }, ovas: 0, coach: -40,
          dur: { type: 'exclusionClub', motif: 'rupture de contrat pour faute grave' },
        },
      },
    ],
  },
  {
    id: 'fidelite', emoji: '💚', categorie: 'club', poids: 0.7,
    quand: (j) => (j.contrat?.saisons ?? 2) <= 1,
    titre: 'Le club veut te prolonger',
    situation: 'Ton contrat se termine. Le président te propose une prolongation en dessous du marché, mais te promet le brassard et un rôle central.',
    choix: [
      { texte: 'Prolonger par fidélité.', issue: { recit: 'Tu signes. Le club et le public retiennent le geste.', deltas: { moral: 10, reputation: 5, argent: 3000 }, ovas: 7, coach: 12, fans: 15 } },
      { texte: 'Demander le prix du marché.', issue: { recit: 'Négociation dure. Tu obtiens plus, mais le président te regarde autrement.', deltas: { argent: 20_000, reputation: 2 }, ovas: 6, coach: -5 } },
      { texte: 'Attendre les offres.', issue: { recit: 'Tu prends ton temps. Le club prolonge quelqu’un d’autre à ton poste.', deltas: { moral: -6 }, ovas: 3, coach: -8 } },
    ],
  },

  // ═══════════════════════ CARRIÈRE ═══════════════════════
  {
    id: 'sollicitation-etranger', emoji: '✈️', categorie: 'carriere', poids: 0.5,
    quand: (j) => gen(j) >= 65,
    titre: 'Un appel de l’étranger',
    situation: 'Un club japonais te fait passer un message par ton agent : le double de ton salaire, six mois par an, à l’autre bout du monde.',
    choix: [
      { texte: 'Écouter sérieusement.', issue: { recit: 'Tu prends le rendez-vous. Rien n’est signé, mais ta cote monte et le club s’inquiète.', deltas: { reputation: 4, moral: 3 }, ovas: 6, coach: -4 } },
      { texte: 'Refuser immédiatement.', issue: { recit: 'Tu coupes court. Le club l’apprend et t’en sait gré.', deltas: { moral: 2 }, ovas: 4, coach: 8 } },
      { texte: 'Faire monter les enchères chez toi.', issue: { recit: 'Tu t’en sers comme levier. Le club s’aligne à moitié, la relation se refroidit.', deltas: { argent: 18_000, moral: -2 }, ovas: 5, coach: -8 } },
    ],
  },
  {
    id: 'fin-approche', emoji: '⌛', categorie: 'carriere', poids: 0.8,
    quand: (j) => j.age >= 33,
    titre: 'Le corps parle',
    situation: 'Tu mets deux jours de plus à récupérer qu’il y a cinq ans. Le staff commence à gérer ton temps de jeu sans t’en parler.',
    choix: [
      { texte: 'Adapter ta préparation.', issue: { recit: 'Moins de charge, plus de qualité. Tu tiens la distance.', deltas: { forme: 10, endurance: 1, mental: 2 }, ovas: 6, coach: 4 } },
      { texte: 'En faire deux fois plus.', issue: { recit: 'Tu forces. Le corps encaisse mal.', deltas: { forme: -12, force: 1 }, ovas: 3, coach: -2 } },
      { texte: 'Commencer à préparer l’après.', issue: { recit: 'Tu passes tes diplômes d’entraîneur en parallèle. Le club te voit déjà rester.', deltas: { mental: 3, moral: 5 }, ovas: 8, coach: 6 } },
    ],
  },
  {
    id: 'selection-espoir', emoji: '🏳️', categorie: 'carriere', poids: 0.5,
    quand: (j) => j.age <= 22 && gen(j) >= 55,
    titre: 'Un stage avec les jeunes internationaux',
    situation: 'Tu es appelé à un stage de détection avec les U20 nationaux. C’est la même semaine qu’un match important pour ton club.',
    choix: [
      { texte: 'Aller au stage.', issue: { recit: 'Tu tapes dans l’œil du sélectionneur. Ton club fait la moue.', deltas: { reputation: 8, moral: 8, vitesse: 1 }, ovas: 8, coach: -5 } },
      { texte: 'Rester avec ton club.', issue: { recit: 'Tu joues, tu es bon, et le staff n’oubliera pas ce choix.', deltas: { moral: 4, reputation: 2 }, ovas: 5, coach: 12 } },
    ],
  },
  {
    id: 'agent-douteux', emoji: '🕴️', categorie: 'carriere', poids: 0.4,
    titre: 'Un agent très pressant',
    situation: 'Un agent que tu ne connais pas t’appelle trois fois par semaine. Il promet un club deux divisions au-dessus, contre 15 % et une signature immédiate.',
    choix: [
      { texte: 'Refuser et bloquer le numéro.', issue: { recit: 'Tu restes avec ton agent actuel. Sage.', deltas: { mental: 1 }, ovas: 4 } },
      { texte: 'Signer avec lui.', issue: { recit: 'Aucun club ne rappelle. Tu es lié par un mandat d’un an à quelqu’un qui ne fait rien.', deltas: { argent: -8000, moral: -8 }, ovas: 2 } },
      { texte: 'Le faire vérifier par le syndicat.', issue: { recit: 'Il n’est même pas licencié. Dossier transmis, affaire classée.', deltas: { mental: 2, reputation: 1 }, ovas: 5 } },
    ],
  },
  {
    id: 'accident-route', emoji: '🚑', categorie: 'perso', poids: 0.2,
    titre: 'Sur la route du club',
    situation: 'Pluie battante sur la départementale. Une voiture déboîte sans prévenir à deux cents mètres devant toi.',
    choix: [
      { texte: 'Freiner et te déporter doucement.', issue: { recit: 'Tu évites de justesse. Le cœur à 180, mais rien de cassé.', deltas: { moral: -4, mental: 2 }, ovas: 4 } },
      {
        texte: 'Braquer sec.',
        issue: {
          recit: 'Aquaplaning, fossé, tonneau. Les pompiers te sortent conscient — mais l’épaule et le bassin sont en morceaux.',
          deltas: { moral: -25, forme: -50 }, ovas: 0,
          dur: { type: 'accident', semaines: 30, motif: 'accident de la route' },
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEUXIÈME LOT — LE CLUB, L'ARGENT, LA CHUTE ET L'APRÈS
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ Demande explicite : « rajoute plein de scénarios pour la carrière quand
  // on n'a pas l'IA — viré du club, augmentation, banni du rugby, prison,
  // entrepreneuriat, études… mais reste sur une généralité rugby ».
  //
  // ⚠️ LA RÈGLE QUI TIENT CE LOT : UN CHOIX DUR DOIT COÛTER QUELQUE CHOSE.
  // Un scénario « banni du rugby » qui se solde par −5 de moral n'est pas un
  // scénario, c'est une anecdote. Ceux d'ici branchent de vraies conséquences
  // (`ConsequenceDure`) : contrat rompu, suspension longue, prison. En
  // contrepartie, aucun n'est un piège aveugle — le texte annonce toujours ce
  // qu'on risque, et il existe toujours une porte de sortie honnête.

  // ───────────────────────── LE CLUB ─────────────────────────
  {
    id: 'convoque-direction', emoji: '🚪', categorie: 'club', poids: 0.5,
    quand: (j) => (j.confianceCoach ?? 50) < 40 && j.saison >= 2,
    titre: 'Convoqué par la direction',
    situation: 'Le président et le manager te reçoivent un mardi matin. Le ton est poli, la phrase est claire : ils envisagent de rompre ton contrat à l’amiable.',
    choix: [
      { texte: 'Refuser net et se battre pour ta place.', issue: { recit: 'Tu refuses de partir. Le club te laisse au groupe, mais l’ambiance est glaciale pendant des semaines.', deltas: { moral: -10, mental: 2 }, ovas: 3, coach: -4 } },
      { texte: 'Négocier une indemnité de départ.', issue: { recit: 'Tu pars la tête haute, un chèque en poche. Reste à retrouver un club.', deltas: { argent: 18000, moral: -8 }, ovas: 5, dur: { type: 'exclusionClub', motif: 'rupture conventionnelle' } } },
      { texte: 'Demander trois mois pour faire tes preuves.', issue: { recit: 'Ils acceptent. Tu as douze semaines pour tout renverser, et tout le monde le sait.', deltas: { moral: -3, mental: 3 }, ovas: 4, coach: 2 } },
    ],
  },
  {
    id: 'augmentation', emoji: '💶', categorie: 'argent', poids: 0.8,
    quand: (j) => j.saison >= 2 && (j.noteSaison ?? 5) >= 6.5,
    titre: 'Tu vaux plus que ça',
    situation: 'Tu enchaînes les titularisations et ton salaire n’a pas bougé depuis ta signature. Ton agent veut aller taper à la porte du président.',
    choix: [
      { texte: 'Réclamer une revalorisation, franchement.', issue: { recit: 'Le président grogne, puis lâche. Salaire revu à la hausse — et une attente en face, désormais.', deltas: { argent: 14000, reputation: 3, moral: 6 }, ovas: 6, coach: -1 } },
      { texte: 'Attendre la fin de saison sans rien dire.', issue: { recit: 'Tu laisses parler le terrain. Le club le remarque, et ta cote grimpe toute seule.', deltas: { reputation: 4, mental: 1 }, ovas: 4, coach: 5 } },
      { texte: 'Faire fuiter que d’autres clubs t’appellent.', issue: { recit: 'La rumeur sort dans la presse locale. Le club augmente… et ne te le pardonne pas tout de suite.', deltas: { argent: 20000, reputation: 2, moral: -4 }, ovas: 5, coach: -7, fans: -3 } },
    ],
  },
  {
    id: 'mise-au-placard', emoji: '🪑', categorie: 'club', poids: 0.5,
    quand: (j) => (j.confianceCoach ?? 50) < 35,
    titre: 'Mis à l’écart du groupe',
    situation: 'Tu t’entraînes avec les blessés et les indésirables. Personne ne t’a rien dit — c’est la feuille de match du samedi qui te l’a appris.',
    choix: [
      { texte: 'Bosser deux fois plus, en silence.', issue: { recit: 'Tu es le premier arrivé, le dernier parti. Au bout d’un mois, le staff n’a plus d’excuse.', deltas: { forme: 6, mental: 3, moral: -4 }, ovas: 5, coach: 8 } },
      { texte: 'Demander des explications devant tout le monde.', issue: { recit: 'La discussion tourne mal dans le couloir. Le vestiaire te donne raison sur le fond, tort sur la forme.', deltas: { moral: -6, reputation: 2 }, ovas: 3, coach: -6 } },
      { texte: 'Appeler ton agent pour partir en janvier.', issue: { recit: 'Le message est passé. Ton nom circule ailleurs, et le club le sait.', deltas: { moral: 3 }, ovas: 4, coach: -3, marche: true } },
    ],
  },
  {
    id: 'club-en-faillite', emoji: '🏦', categorie: 'club', poids: 0.25,
    quand: (j) => amateur(j) || j.division === 'nationale',
    titre: 'Le club ne paie plus',
    situation: 'Deuxième mois sans salaire. Le trésorier ne répond plus, la DNACG a ouvert un dossier, et le bruit court d’une rétrogradation administrative.',
    choix: [
      { texte: 'Rester et jouer quand même.', issue: { recit: 'Vous finissez la saison à onze contre le monde entier. Le club est rétrogradé, mais le vestiaire est devenu une famille.', deltas: { moral: -6, mental: 4, argent: -3000 }, ovas: 6, coach: 6, dur: { type: 'relegationFinanciere', motif: 'dépôt de bilan du club' } } },
      { texte: 'Saisir la commission juridique.', issue: { recit: 'Tu récupères tes arriérés et ta liberté. Le club te le fait payer en réputation.', deltas: { argent: 9000, reputation: -4 }, ovas: 5, dur: { type: 'exclusionClub', motif: 'contrat résilié pour impayés' } } },
      { texte: 'Chercher un club immédiatement.', issue: { recit: 'Tu actives tous tes contacts avant que le marché ne se referme.', deltas: { moral: -2 }, ovas: 4, marche: true } },
    ],
  },
  {
    id: 'pret-division-inferieure', emoji: '📉', categorie: 'carriere', poids: 0.6,
    quand: (j) => j.age <= 24 && pro(j),
    titre: 'Un prêt à l’étage du dessous',
    situation: 'Tu ne joues pas. Le club te propose un prêt de six mois dans une division inférieure, avec la garantie d’être titulaire.',
    choix: [
      { texte: 'Accepter : jouer, c’est tout ce qui compte.', issue: { recit: 'Vingt matchs pleins en six mois. Tu reviens avec des jambes et une confiance que le banc ne t’aurait jamais données.', deltas: { forme: 10, mental: 3, reputation: 2 }, ovas: 6, coach: 4 } },
      { texte: 'Refuser et te battre pour ta place ici.', issue: { recit: 'Tu restes. Six mois de banc et d’entraînement, sans une minute de jeu.', deltas: { moral: -10, forme: -4, mental: 2 }, ovas: 2, coach: -2 } },
    ],
  },

  // ───────────────────────── LA CHUTE ─────────────────────────
  {
    id: 'pari-du-copain', emoji: '🎰', categorie: 'nuit', poids: 0.3,
    quand: (j) => j.age >= 20,
    titre: 'Un pote te propose de parier',
    situation: 'Un ami d’enfance te propose de miser gros sur un match de ton championnat. « Tu connais les équipes mieux que personne. » Parier sur sa propre compétition est interdit, et tu le sais.',
    choix: [
      { texte: 'Refuser et couper court.', issue: { recit: 'Tu raccroches. Il insiste deux fois, puis lâche l’affaire.', deltas: { mental: 2 }, ovas: 3 } },
      { texte: 'Parier discrètement, une seule fois.', issue: { recit: 'La fédération croise les comptes six mois plus tard. Suspension, audition, une saison à regarder les autres jouer.', deltas: { moral: -22, reputation: -18, argent: 4000 }, ovas: 0, coach: -12, fans: -14, dur: { type: 'suspension', semaines: 40, motif: 'paris sur sa propre compétition' } } },
      { texte: 'Lui donner un tuyau sur la compo.', issue: { recit: 'Une info d’initié, un SMS retrouvé. Le club rompt ton contrat le jour même.', deltas: { moral: -25, reputation: -22 }, ovas: 0, coach: -15, fans: -12, dur: { type: 'exclusionClub', motif: 'transmission d’informations à un parieur' } } },
    ],
  },
  {
    id: 'controle-antidopage', emoji: '🧪', categorie: 'corps', poids: 0.3,
    quand: (j) => pro(j),
    titre: 'Contrôle inopiné',
    situation: 'Deux préleveurs t’attendent à la sortie du vestiaire. Tu prends un complément acheté en ligne depuis trois semaines — sans avoir vérifié la composition.',
    choix: [
      { texte: 'Tout déclarer, y compris le complément.', issue: { recit: 'Le produit contenait une substance apparentée. Ta transparence te vaut la clémence : trois mois, pas deux ans.', deltas: { moral: -14, reputation: -6 }, ovas: 1, coach: -4, dur: { type: 'suspension', semaines: 12, motif: 'complément alimentaire contaminé' } } },
      { texte: 'Ne rien dire et croiser les doigts.', issue: { recit: 'Positif. Sans déclaration préalable, la commission ne retient aucune circonstance atténuante. Deux ans.', deltas: { moral: -30, reputation: -25 }, ovas: 0, coach: -15, fans: -18, dur: { type: 'suspension', semaines: 96, motif: 'contrôle positif, aucune déclaration' } } },
      { texte: 'Refuser le contrôle.', issue: { recit: 'Un refus vaut un positif. Le règlement ne fait pas de nuance, et ton club non plus.', deltas: { moral: -28, reputation: -22 }, ovas: 0, coach: -14, dur: { type: 'exclusionClub', motif: 'refus de se soumettre à un contrôle' } } },
    ],
  },
  {
    id: 'sortie-de-boite', emoji: '🚔', categorie: 'nuit', poids: 0.3,
    quand: (j) => j.age <= 30,
    titre: 'Ça part en vrille à la sortie de boîte',
    situation: 'Quatre heures du matin. Un type reconnaît ton maillot, insulte ton club, pousse ton frère. Deux téléphones filment déjà.',
    choix: [
      { texte: 'Partir sans répondre.', issue: { recit: 'Tu tires ton frère par le bras et vous rentrez. La vidéo fait trois vues.', deltas: { mental: 2, moral: -2 }, ovas: 3, coach: 2 } },
      { texte: 'T’interposer, sans frapper.', issue: { recit: 'Tu prends un coup, tu n’en rends aucun. La vidéo tourne — et te donne le beau rôle.', deltas: { forme: -6, reputation: 4 }, ovas: 4, fans: 6 } },
      { texte: 'Lui mettre une droite.', issue: { recit: 'Un coup, une mâchoire cassée, une plainte. Comparution immédiate, et la prison ferme au bout.', deltas: { moral: -28, reputation: -20, argent: -15000 }, ovas: 0, coach: -12, fans: -15, dur: { type: 'prison', semaines: 26, motif: 'violences volontaires' } } },
    ],
  },
  {
    id: 'permis-retire', emoji: '🚗', categorie: 'perso', poids: 0.4,
    quand: (j) => j.age >= 19,
    titre: 'Contrôle routier au retour du match',
    situation: 'Troisième mi-temps, deux bières, deux heures de route. Les gendarmes sont au rond-point à la sortie du village.',
    choix: [
      { texte: 'Avoir laissé les clés à un coéquipier.', issue: { recit: 'Tu dors à l’arrière. Le contrôle dure quatre minutes.', deltas: { mental: 1 }, ovas: 3 } },
      { texte: 'Souffler et espérer.', issue: { recit: '0,6 g. Permis suspendu six mois, amende, et un club qui apprend la nouvelle par le journal.', deltas: { argent: -4500, reputation: -8, moral: -10 }, ovas: 0, coach: -8, fans: -5 } },
      { texte: 'Faire demi-tour avant le contrôle.', issue: { recit: 'La patrouille te suit. Refus d’obtempérer : ce n’est plus une amende, c’est un tribunal.', deltas: { moral: -20, reputation: -14, argent: -9000 }, ovas: 0, coach: -10, dur: { type: 'prison', semaines: 10, motif: 'refus d’obtempérer' } } },
    ],
  },

  // ───────────────────────── L'ARGENT QU'ON FAIT TOURNER ─────────────────────
  {
    id: 'ouvrir-restaurant', emoji: '🍽️', categorie: 'argent', poids: 0.5,
    quand: (j) => j.argent >= 60000 && j.age >= 24,
    titre: 'Le restaurant du coin est à vendre',
    situation: 'Une brasserie à deux rues du stade cherche un repreneur. Ton beau-frère est cuisinier. Tout le monde te dit que c’est une évidence — c’est bien ce qui t’inquiète.',
    choix: [
      { texte: 'Investir et t’impliquer à fond.', issue: { recit: 'Les six premiers mois sont un enfer : tu fermes à minuit et tu t’entraînes à sept heures. La salle est pleine, tes jambes sont vides.', deltas: { argent: -45000, forme: -10, moral: 6 }, ovas: 6, coach: -5 } },
      { texte: 'Mettre de l’argent, laisser gérer.', issue: { recit: 'Tu signes un chèque et tu passes le dimanche. Ça tourne doucement, sans te coûter une minute de sommeil.', deltas: { argent: -30000, moral: 4 }, ovas: 5 } },
      { texte: 'Laisser passer.', issue: { recit: 'Tu refuses poliment. Deux ans plus tard, l’affaire a coulé — et tu dors très bien.', deltas: { mental: 2 }, ovas: 3 } },
    ],
  },
  {
    id: 'placement-douteux', emoji: '📈', categorie: 'argent', poids: 0.5,
    quand: (j) => j.argent >= 40000,
    titre: 'Le conseiller du vestiaire',
    situation: 'Un « conseiller en patrimoine » vient au club une fois par mois. Trois coéquipiers ont déjà signé. Le rendement annoncé est de 14 % par an, garanti.',
    choix: [
      { texte: 'Signer comme les autres.', issue: { recit: 'Le fonds s’effondre au printemps. Le conseiller ne répond plus, et vous êtes onze au commissariat.', deltas: { argent: -35000, moral: -14 }, ovas: 1 } },
      { texte: 'Demander l’avis d’un expert indépendant.', issue: { recit: 'Deux questions suffisent à faire tomber le montage. Tu préviens le vestiaire — trois gars te doivent une fière chandelle.', deltas: { moral: 6, reputation: 3 }, ovas: 5, coach: 3 } },
      { texte: 'Mettre une petite somme, pour voir.', issue: { recit: 'Tu perds ce que tu avais mis, pas plus. La leçon coûte le prix d’une montre.', deltas: { argent: -6000, mental: 2 }, ovas: 3 } },
    ],
  },
  {
    id: 'marque-vetements', emoji: '👕', categorie: 'argent', poids: 0.45,
    quand: (j) => (j.abonnes ?? 0) >= 5000,
    titre: 'Ta propre marque',
    situation: 'Un ami graphiste te propose de lancer une marque de vêtements de rugby à ton nom. Cent pièces pour commencer, et ton visage sur chaque photo.',
    choix: [
      { texte: 'Se lancer, à fond.', issue: { recit: 'Rupture de stock en dix jours. Tu passes tes lundis à faire des cartons, et tu adores ça.', deltas: { argent: 12000, moral: 8, reputation: 5 }, ovas: 7, fans: 8 } },
      { texte: 'Prêter ton nom, sans t’en occuper.', issue: { recit: 'La collection sort, la qualité est médiocre, et c’est ton nom qui est dessus.', deltas: { argent: 6000, reputation: -5 }, ovas: 3, fans: -4 } },
      { texte: 'Attendre d’avoir un vrai palmarès.', issue: { recit: 'Tu remets à plus tard. Le projet t’attendra — ou pas.', deltas: { mental: 1 }, ovas: 2 } },
    ],
  },
  {
    id: 'sponsor-garagiste', emoji: '🤝', categorie: 'argent', poids: 0.6,
    titre: 'Le garagiste veut te sponsoriser',
    situation: 'Le patron du garage à la sortie de la ville te propose 500 € par mois et une voiture, contre ta photo sur ses devantures et deux inaugurations par an.',
    choix: [
      { texte: 'Accepter, c’est du concret.', issue: { recit: 'Ta tête est sur tous les abribus du département. Le club trouve ça très bien, tes coéquipiers te chambrent trois mois.', deltas: { argent: 6000, moral: 3 }, ovas: 5, fans: 5 } },
      { texte: 'Négocier aussi un contrat pour ton club.', issue: { recit: 'Tu obtiens un maillot floqué pour les jeunes du club. Le président t’embrasserait.', deltas: { argent: 4000, reputation: 5 }, ovas: 6, coach: 5, fans: 6 } },
      { texte: 'Refuser : tu veux rester libre.', issue: { recit: 'Tu déclines. Personne ne t’en veut, et personne ne t’aide non plus.', deltas: {}, ovas: 2 } },
    ],
  },

  // ───────────────────────── LES ÉTUDES ET L'APRÈS ─────────────────────
  {
    id: 'reprendre-etudes', emoji: '🎓', categorie: 'perso', poids: 0.6,
    quand: (j) => j.age >= 21,
    titre: 'Reprendre les études',
    situation: 'Le syndicat des joueurs propose une licence à distance, financée. Douze heures de travail par semaine, en plus des entraînements.',
    choix: [
      { texte: 'S’inscrire et tenir le rythme.', issue: { recit: 'Les six premiers mois sont durs, puis ça devient une habitude. Tu as un plan B, et ça change ta façon de jouer.', deltas: { mental: 5, forme: -4, moral: 6 }, ovas: 6 } },
      { texte: 'S’inscrire, puis abandonner.', issue: { recit: 'Tu tiens deux mois. Le dossier reste dans un tiroir, et le doute avec.', deltas: { moral: -5 }, ovas: 2 } },
      { texte: 'Refuser : le rugby d’abord.', issue: { recit: 'Tu mets tout dans le terrain. C’est un choix — il a un prix, et tu le connais.', deltas: { forme: 5, mental: -1 }, ovas: 3, coach: 3 } },
    ],
  },
  {
    id: 'diplome-entraineur', emoji: '📋', categorie: 'carriere', poids: 0.5,
    quand: (j) => j.age >= 28,
    titre: 'Le brevet d’entraîneur',
    situation: 'La fédération ouvre une session de formation d’entraîneur. Trois week-ends par an, et une place à prendre à la fin de ta carrière.',
    choix: [
      { texte: 'S’inscrire pendant que tu joues encore.', issue: { recit: 'Tu passes tes week-ends de trêve en salle de classe. Le staff te regarde autrement — et te confie les jeunes le mercredi.', deltas: { mental: 4, moral: 5 }, ovas: 6, coach: 7 } },
      { texte: 'Attendre la fin de carrière.', issue: { recit: 'Tu remets à plus tard. Les places, elles, ne t’attendront pas.', deltas: {}, ovas: 2 } },
    ],
  },
  {
    id: 'stage-kine', emoji: '🩺', categorie: 'perso', poids: 0.4,
    quand: (j) => j.age >= 23 && (j.blessure?.semaines ?? 0) > 0,
    titre: 'Trois semaines à la salle de soins',
    situation: 'Blessé, tu passes tes journées au cabinet du kiné du club. Il te propose de l’assister pendant ta convalescence, pour comprendre ce qui t’arrive.',
    choix: [
      { texte: 'Accepter et apprendre.', issue: { recit: 'Tu ressors en sachant lire ton propre corps. Tu ne te blesseras plus jamais de la même façon.', deltas: { mental: 4, endurance: 2, moral: 5 }, ovas: 6 } },
      { texte: 'Rester chez toi à ruminer.', issue: { recit: 'Trois semaines de canapé et de replays. La rééducation prend du retard.', deltas: { moral: -8, forme: -5 }, ovas: 1 } },
    ],
  },

  // ───────────────────────── LE RUGBY, TOUT SIMPLEMENT ─────────────────
  {
    id: 'convocation-espoirs', emoji: '🎽', categorie: 'carriere', poids: 0.5,
    quand: (j) => j.age <= 22 && gen(j) >= 55,
    titre: 'Une convocation en équipe de jeunes',
    situation: 'Le sélectionneur national des moins de 20 ans t’appelle pour un stage. Ton club, lui, joue un match capital le même week-end.',
    choix: [
      { texte: 'Partir en stage.', issue: { recit: 'Trois jours au centre national, entouré des meilleurs de ta génération. Ton club perd — et te le fait sentir.', deltas: { reputation: 10, mental: 3, moral: 6 }, ovas: 7, coach: -5 } },
      { texte: 'Rester avec ton club.', issue: { recit: 'Tu joues, le club gagne, le vestiaire n’oubliera pas. Le sélectionneur, lui, appellera quelqu’un d’autre.', deltas: { moral: 4, reputation: -2 }, ovas: 4, coach: 9 } },
    ],
  },
  {
    id: 'essai-refuse-video', emoji: '📺', categorie: 'medias', poids: 0.6,
    titre: 'L’arbitrage vidéo t’enlève un essai',
    situation: 'Tu aplatis à la 78ᵉ, le stade explose. Quatre minutes de vidéo plus tard : en-avant à trois phases de là. Essai refusé, défaite.',
    choix: [
      { texte: 'Serrer la main de l’arbitre.', issue: { recit: 'Tu vas le voir avant tout le monde. L’image tourne, et elle te grandit.', deltas: { mental: 3, reputation: 4 }, ovas: 5, fans: 7, coach: 4 } },
      { texte: 'Exploser au micro d’après-match.', issue: { recit: 'Tu dis tout haut ce que le stade pense. La commission de discipline aussi a une télévision.', deltas: { moral: 4, reputation: -6, argent: -2500 }, ovas: 3, fans: 5, coach: -6 } },
      { texte: 'Ne rien dire et rentrer.', issue: { recit: 'Tu passes devant les micros sans t’arrêter. Personne n’en parle le lendemain.', deltas: { moral: -4 }, ovas: 3 } },
    ],
  },
  {
    id: 'retour-de-blessure', emoji: '🩹', categorie: 'corps', poids: 0.7,
    quand: (j) => j.forme <= 60,
    titre: 'Le genou n’est pas prêt',
    situation: 'Le kiné dit trois semaines. Le coach dit qu’il a besoin de toi samedi. Le genou, lui, ne dit rien — mais tu le sens à chaque appui.',
    choix: [
      { texte: 'Écouter le kiné.', issue: { recit: 'Trois semaines de plus, et un genou qui tient. Le coach râle, ton corps te remercie.', deltas: { forme: 12, mental: 2 }, ovas: 5, coach: -3 } },
      { texte: 'Jouer infiltré.', issue: { recit: 'Tu joues, tu tiens soixante minutes. Et tu paies le mois suivant, au double.', deltas: { forme: -18, moral: 4, reputation: 3 }, ovas: 3, coach: 7 } },
      { texte: 'Jouer, mais le dire au staff.', issue: { recit: 'Tu entres en fin de match, vingt minutes, sans forcer. Personne ne perd.', deltas: { forme: -4, mental: 2 }, ovas: 5, coach: 4 } },
    ],
  },
  {
    id: 'jeune-qui-pousse', emoji: '🌱', categorie: 'vestiaire', poids: 0.6,
    quand: (j) => j.age >= 28,
    titre: 'Le gamin qui joue à ton poste',
    situation: 'Il a dix ans de moins que toi, il court plus vite, et le staff ne parle plus que de lui. Il vient te demander des conseils.',
    choix: [
      { texte: 'Tout lui apprendre.', issue: { recit: 'Tu lui donnes tout ce que tu sais. Il te pique ta place en février — et te remercie publiquement en mai.', deltas: { moral: 5, mental: 3, reputation: 5 }, ovas: 6, coach: 8, fans: 6 } },
      { texte: 'Le laisser se débrouiller.', issue: { recit: 'Tu gardes tes secrets. Il progresse quand même, et le vestiaire remarque ton silence.', deltas: { moral: -3 }, ovas: 2, coach: -4 } },
      { texte: 'Lui montrer qu’il n’est pas prêt.', issue: { recit: 'Tu le passes à la moulinette à l’entraînement. Il apprend dans la douleur — et il apprend vite.', deltas: { mental: 2, forme: -3 }, ovas: 4, coach: 2 } },
    ],
  },
  {
    id: 'derniere-saison', emoji: '🕯️', categorie: 'carriere', poids: 0.5,
    quand: (j) => j.age >= 33,
    titre: 'Une dernière saison ?',
    situation: 'Le corps encaisse moins bien, la récupération prend trois jours. Le club te propose une année de plus — avec un rôle de doublure et un salaire réduit.',
    choix: [
      { texte: 'Signer, pour le vestiaire.', issue: { recit: 'Tu joues moins, tu portes plus. La saison est belle, autrement.', deltas: { argent: -4000, moral: 8, mental: 3 }, ovas: 6, coach: 8 } },
      { texte: 'Refuser et chercher un dernier vrai contrat.', issue: { recit: 'Tu veux jouer, pas accompagner. Le marché te dira si tu as raison.', deltas: { mental: 2, moral: -2 }, ovas: 4, marche: true } },
      { texte: 'Arrêter à la fin de la saison.', issue: { recit: 'Tu poses la date toi-même. C’est rare, et ça vaut tous les contrats.', deltas: { moral: 6, mental: 4 }, ovas: 6 } },
    ],
  },
];

export const SITUATION_PAR_ID: Record<string, Situation> = Object.fromEntries(
  SITUATIONS.map((s) => [s.id, s]),
);

// Tire une situation adaptée au joueur, en évitant celles déjà vues cette saison.
export function situationPour(j: Joueur, dejaVues: string[], alea = Math.random): Situation | null {
  const eligibles = SITUATIONS.filter((s) => !dejaVues.includes(s.id) && (!s.quand || s.quand(j)));
  const pool = eligibles.length ? eligibles : SITUATIONS.filter((s) => !s.quand || s.quand(j));
  if (!pool.length) return null;
  const total = pool.reduce((t, s) => t + (s.poids ?? 1), 0);
  let r = alea() * total;
  for (const s of pool) {
    r -= s.poids ?? 1;
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

// Conversion vers le format `Scenario` utilisé par l'écran de carrière.
//
// ⚠️ C'EST ICI QUE LA TRADUCTION SE FAIT, et nulle part ailleurs. La situation
// traverse ensuite le store (`poserSituation`, `resoudreChoix`) puis le journal,
// où elle devient du texte figé : traduire plus tard reviendrait à traduire une
// entrée de journal déjà écrite. `traduit()` retombe sur le français dès qu'une
// clé manque — jamais de « sit.bizutage.titre » à l'écran.
function traduit(cle: string, defaut: string): string {
  const valeur = t(cle);
  return valeur === cle ? defaut : valeur;
}

export function versScenario(s: Situation): Scenario {
  return {
    id: s.id,
    emoji: s.emoji,
    titre: traduit(`sit.${s.id}.titre`, s.titre),
    situation: traduit(`sit.${s.id}.txt`, s.situation),
    choix: s.choix.map((c, i) => ({
      texte: traduit(`sit.${s.id}.c${i}`, c.texte),
      // ⚠️ On ne recopie QUE le récit : les deltas, les Ovas et la conséquence
      // dure (`dur`) restent l'objet d'origine. Une traduction ne doit jamais
      // pouvoir déplacer l'équilibre du jeu.
      issue: { ...c.issue, recit: traduit(`sit.${s.id}.r${i}`, c.issue.recit) },
    })),
  };
}
