// L'OVALE — le réseau social du jeu (lot 7, point 23)
//
// Une timeline façon X : le joueur poste, et le monde répond. Fans, suiveurs,
// journalistes et haters n'ont pas la même lecture d'un même message, et le
// vestiaire lit tout. Ce que tu écris pèse pour de vrai sur la réputation, la
// popularité, la confiance du staff — et peut te coûter une amende.
//
// Ici : les COMPTES, les TONS de publication et les gabarits de réponses.
// La mécanique (qui répond, combien d'abonnés, quelle sanction) est dans
// `src/lib/social.ts`.

import type { StatVariable } from '../types';

// --- Comptes qui peuplent la timeline -------------------------------------

export type TypeCompte = 'fan' | 'journaliste' | 'hater' | 'media' | 'club' | 'coequipier';

export interface Compte {
  nom: string;
  pseudo: string; // sans @
  avatar: string; // emoji
  certifie?: boolean;
  type: TypeCompte;
}

export const COMPTES: Compte[] = [
  // Supporters
  { nom: 'Bruno du Virage Sud', pseudo: 'virage_sud_81', avatar: '🧣', type: 'fan' },
  { nom: 'Mathilde R.', pseudo: 'mathrugby', avatar: '🏉', type: 'fan' },
  { nom: 'Le Pilier du Comptoir', pseudo: 'pilier_comptoir', avatar: '🍺', type: 'fan' },
  { nom: 'Sandrine A.', pseudo: 'sandrine_ovalie', avatar: '💚', type: 'fan' },
  { nom: 'Tribune Nord', pseudo: 'tribune_nord', avatar: '📣', type: 'fan' },
  { nom: 'Papy Ovalie', pseudo: 'papy_ovalie', avatar: '👴', type: 'fan' },
  { nom: 'Kevin', pseudo: 'kev_du_15', avatar: '🧢', type: 'fan' },
  { nom: 'La Touche en Or', pseudo: 'touche_en_or', avatar: '🥇', type: 'fan' },
  // Journalistes
  { nom: 'Julien Bascou', pseudo: 'jbascou_rugby', avatar: '🎙️', certifie: true, type: 'journaliste' },
  { nom: 'Claire Ferrand', pseudo: 'cferrand_sport', avatar: '📝', certifie: true, type: 'journaliste' },
  { nom: 'Hugo Lartigue', pseudo: 'hlartigue', avatar: '🗞️', certifie: true, type: 'journaliste' },
  { nom: 'Insider Mercato', pseudo: 'insider_mercato', avatar: '🕵️', type: 'journaliste' },
  // Médias
  { nom: 'Ovalie Info', pseudo: 'ovalieinfo', avatar: '📰', certifie: true, type: 'media' },
  { nom: 'Le Journal du Rugby', pseudo: 'lejournalrugby', avatar: '🗞️', certifie: true, type: 'media' },
  { nom: 'Touch & Go', pseudo: 'touchandgo', avatar: '📺', certifie: true, type: 'media' },
  // Haters
  { nom: 'Analyste Objectif', pseudo: 'analyste_objectif', avatar: '🤓', type: 'hater' },
  { nom: 'Ratio', pseudo: 'ratio_permanent', avatar: '🔻', type: 'hater' },
  { nom: 'Vérités du Rugby', pseudo: 'verites_rugby', avatar: '⚠️', type: 'hater' },
  { nom: 'Ancien de la maison', pseudo: 'ancien_maison', avatar: '🧓', type: 'hater' },
];

// --- Tons de publication ---------------------------------------------------

export interface TonPost {
  id: string;
  emoji: string;
  nom: string;
  desc: string;
  // Effets de base (modulés par le nombre d'abonnés et par les traits).
  deltas: Partial<Record<StatVariable, number>>;
  coach: number; // confiance du staff
  fans: number; // popularité
  abonnes: number; // abonnés gagnés (base, avant multiplicateur)
  risque: number; // probabilité de dérapage (sanction du club)
  ratio: number; // part de réponses hostiles (0 = adoré, 1 = lynché)
}

export const TONS: TonPost[] = [
  {
    id: 'humble',
    emoji: '🙏',
    nom: 'Humble',
    desc: 'Le collectif d’abord, le staff, les supporters. Personne ne peut rien te reprocher.',
    deltas: { moral: 2 },
    coach: 6, fans: 3, abonnes: 40, risque: 0, ratio: 0.08,
  },
  {
    id: 'confiant',
    emoji: '💪',
    nom: 'Confiant',
    desc: 'Tu assumes ton niveau et tes ambitions. Ça plaît, et ça agace.',
    deltas: { reputation: 2, moral: 3 },
    coach: 0, fans: 8, abonnes: 120, risque: 0.05, ratio: 0.24,
  },
  {
    id: 'drole',
    emoji: '😂',
    nom: 'Drôle',
    desc: 'La vanne du vestiaire, en public. C’est ce qui fait décoller un compte.',
    deltas: { moral: 4 },
    coach: -1, fans: 10, abonnes: 220, risque: 0.06, ratio: 0.14,
  },
  {
    id: 'engage',
    emoji: '✊',
    nom: 'Engagé',
    desc: 'Tu prends position (arbitrage, calendrier, salaires des amateurs). Clivant, mais respecté.',
    deltas: { reputation: 3, moral: 1 },
    coach: -5, fans: 6, abonnes: 180, risque: 0.14, ratio: 0.38,
  },
  {
    id: 'clash',
    emoji: '🔥',
    nom: 'Clash',
    desc: 'Tu allumes quelqu’un. Les vues explosent, le club fronce les sourcils.',
    deltas: { reputation: 6, moral: -1 },
    coach: -14, fans: 12, abonnes: 480, risque: 0.42, ratio: 0.55,
  },
];

export const TON_PAR_ID: Record<string, TonPost> = Object.fromEntries(
  TONS.map((t) => [t.id, t]),
);

// --- Gabarits de réponses --------------------------------------------------
// Variables : {joueur}, {club}, {poste}.

// ⚠️ POOL ÉLARGI (demande explicite). Il tenait en trois à cinq phrases par
// famille : sous une publication qui récolte huit à douze réponses, on lisait
// forcément deux fois la même. Chaque famille en compte maintenant douze à
// vingt — et `publierPost` écarte déjà les doublons dans une même fournée.
export const REPONSES_POSITIVES: Record<TypeCompte, string[]> = {
  fan: [
    'ALLEZ {joueur} 💚 On est derrière toi !',
    'Voilà le mental qu’on veut voir à {club}. 🔥',
    'Mon fils a ton nom floqué dans le dos, il va être content.',
    'Enfin quelqu’un qui parle vrai chez nous.',
    'Le genre de mec qu’on veut garder dix ans au club.',
    'Toujours là {joueur}, dans les bons comme dans les mauvais jours. 🤝',
    'Franchement ça fait du bien de lire ça un lundi matin.',
    'On te suit depuis la {division}, on lâchera pas. 💪',
    'Le maillot floqué {joueur}, il est déjà commandé.',
    'Voilà pourquoi j’ai repris mon abonnement. Merci.',
    'Ma fille veut jouer {poste} à cause de toi. Bravo. 🥹',
    'Tribune Nord derrière toi dimanche, prépare tes oreilles. 🔊',
    'Ça, c’est un joueur de {club}. Le reste, c’est du bruit.',
    'On en a vu passer, mais toi t’as quelque chose en plus.',
    'Continue de parler comme ça, ça fait un bien fou.',
    'Respect {joueur}. Vraiment. 👏',
  ],
  journaliste: [
    'Discours assumé de {joueur}, à retrouver en intégralité demain matin.',
    'On dit ce qu’on veut, mais {joueur} est un des dossiers les plus intéressants du championnat.',
    'Le genre de sortie qui vaut trois pages. Merci {joueur}.',
    'Rare de lire un {poste} aussi clair sur son propre jeu. À suivre.',
    'Je confirme ce que dit {joueur} : le vestiaire de {club} est derrière lui.',
    'Message qui va tourner. Et pour de bonnes raisons, pour une fois.',
    'On m’avait dit que {joueur} était de ceux qui parlent vrai. Confirmé.',
    'Portrait de {joueur} à lire dans nos colonnes cette semaine.',
    'Ce genre de prise de parole change l’image d’un championnat.',
    'Je note. Et je reviendrai vers vous, {joueur}. 📝',
  ],
  hater: [
    'Bon. Là, je peux rien dire. 🤝',
    'Ok, tu marques un point. Un seul.',
    'Je reste sur mes positions, mais celle-là est correcte.',
    'Tiens, pour une fois. Note que je l’ai écrit.',
    'Admettons. Mais on rediscute dans six mois.',
    'Bien joué. Ça ne change pas ce que je pense du reste.',
  ],
  media: [
    '🚨 {joueur} ({club}) : le message qui fait réagir tout le championnat.',
    'La publication de {joueur} dépasse déjà les 200 000 vues.',
    '💬 {joueur} sort du silence — notre analyse à lire ici.',
    '📈 Le compte de {joueur} explose depuis ce message.',
    '🎙️ {joueur} sera notre invité cette semaine. Rendez-vous jeudi.',
    'Rarement vu un joueur de {division} faire autant parler en une phrase.',
  ],
  club: [
    '💚 Notre {poste} a parlé. On avance ensemble.',
    '🤝 Le club soutient {joueur}, comme toujours.',
    '💬 Voilà l’état d’esprit que nous voulons voir à {club}.',
    '👏 Merci {joueur}. Rendez-vous dimanche.',
  ],
  coequipier: [
    'Mon frère 🤝',
    'Il a dit ce qu’il fallait. 👏',
    'On te suit là-dessus, capitaine ou pas.',
    'Voilà. Merci de l’avoir dit à voix haute. 💪',
    'Vestiaire à 100 % derrière toi. Comme toujours.',
    'Bien parlé. On en reparle à la séance. 😄',
    'Tu sais que je suis d’accord. Depuis le début.',
  ],
};

export const REPONSES_NEGATIVES: Record<TypeCompte, string[]> = {
  fan: [
    'Bof. Concentre-toi sur le terrain avant de faire l’influenceur.',
    'On a perdu 4 matchs de suite et il tweete. 🤡',
    'Moins de téléphone, plus de plaquages.',
    'Franchement {joueur}, c’est pas le moment de l’ouvrir.',
    'Le maillot de {club} mérite mieux que des posts.',
    'J’ai payé ma place pour voir ça ? Sérieusement ?',
    'Et les supporters, tu y penses quand exactement ?',
    'Parle moins, cours plus. C’est tout ce qu’on demande.',
    'On était derrière toi. Là, tu nous perds.',
    'Reste humble deux minutes, ça fera pas de mal.',
    'Mon gamin te suivait. Il a arrêté ce matin.',
    'Le club a besoin de joueurs, pas de commentateurs.',
  ],
  journaliste: [
    'Sortie très maladroite de {joueur}. Le club va devoir gérer ça en interne.',
    'Communication risquée pour un joueur de son statut.',
    'Le vestiaire de {club} apprécie moyennement, d’après nos informations.',
    'Ce message va laisser des traces. Le staff n’était pas prévenu.',
    'On me dit que la direction de {club} a été surprise. Euphémisme.',
    'Difficile de défendre {joueur} sur ce coup-là. Vraiment.',
    'Le genre de publication qu’un agent supprime dans l’heure.',
    'Un {poste} de {division} qui parle comme ça, ça se paie sur le terrain.',
  ],
  hater: [
    'Statistiquement, tu n’as strictement rien fait cette saison. 🔻',
    'Le mec est au-dessus de tout le monde… dans les stats de fautes.',
    'Poste ton bilan de la saison pour voir. Ah non, mauvaise idée.',
    'Ratio + tu joues en {club} + personne ne t’a demandé.',
    'Combien de minutes jouées ce mois-ci ? Je pose la question.',
    'Le niveau de {division} explique beaucoup de choses. 😴',
    'On peut avoir le nombre de ballons touchés dimanche ? Merci.',
    'Chaque semaine il parle, chaque semaine il déçoit.',
    'La confiance en soi, c’est bien. Le talent, c’est mieux.',
    'Je vais garder ce message pour la fin de saison. 📌',
    'Tu devrais mettre ton compte en privé, sincèrement.',
    'Encore un qui se croit arrivé. Classique.',
  ],
  media: [
    '⚠️ La publication de {joueur} fait polémique. La commission pourrait se saisir du dossier.',
    'Tempête sur les réseaux après le message de {joueur}.',
    '🚨 {club} sous pression après la sortie de son {poste}.',
    '📉 Plusieurs partenaires s’interrogent après le message de {joueur}.',
    'Le message a été supprimé… mais capturé. Notre article.',
  ],
  club: [
    'Le club rappelle que la parole des joueurs engage l’institution.',
    'Une mise au point sera faite en interne. Nous n’en dirons pas plus.',
    'Ce message n’engage que son auteur.',
  ],
  coequipier: [
    'Bro… on en parle au vestiaire plutôt ? 😬',
    'Fallait peut-être pas écrire ça.',
    'Appelle-moi. Tout de suite.',
    'On est une équipe. Là, tu joues perso.',
    'J’ai rien vu, j’ai rien lu. Pour ton bien. 🙈',
  ],
};

// --- Posts d'ambiance : la timeline vit même sans toi ----------------------
// Variables : {club}, {joueur}, {division}, {adversaire}, {nation}.

export interface Ambiance {
  type: TypeCompte;
  texte: string;
}

export const AMBIANCE: Ambiance[] = [
  { type: 'media', texte: '📊 {division} — Classement mis à jour après cette journée. {club} continue de faire parler la poule.' },
  { type: 'media', texte: '🏉 Programme du week-end en {division} : encore une affiche à ne pas manquer du côté de {club}.' },
  { type: 'journaliste', texte: 'On me souffle que plusieurs clubs suivent la situation de {joueur} de très près. À confirmer.' },
  { type: 'journaliste', texte: 'Belle ambiance à l’entraînement de {club} ce matin. Groupe au complet, ou presque.' },
  { type: 'fan', texte: 'Réveillez-vous à {club}, on ne peut pas jouer comme ça une saison entière. 😤' },
  { type: 'fan', texte: 'Abonnement repris pour la saison. Allez {club} 💚' },
  { type: 'fan', texte: 'Le stade était plein hier. Ça, c’est du rugby.' },
  { type: 'hater', texte: 'Sérieusement, quelqu’un peut m’expliquer ce que {joueur} fait sur une feuille de match ?' },
  { type: 'hater', texte: '{club} en {division}, c’est le niveau réel du club. Rien d’injuste.' },
  { type: 'media', texte: '🔁 MERCATO — Ça bouge beaucoup en coulisses. Plusieurs dossiers devraient tomber d’ici la fin de semaine.' },
  { type: 'journaliste', texte: 'La sélection de {nation} affine sa liste. Quelques surprises attendues.' },
  { type: 'fan', texte: 'Franchement le maillot de cette saison est magnifique. C’est déjà ça. 😅' },
  { type: 'media', texte: '🎥 Le résumé de la journée est en ligne. Un essai de 90 mètres qui va tourner en boucle.' },
  { type: 'coequipier', texte: 'Grosse séance ce matin, les jambes ont pris cher. À dimanche. 💪' },
  { type: 'hater', texte: 'Le rugby, c’était mieux avant. Point.' },
];

// Insultes et gros dérapages : le club ne laisse pas passer.
export const MOTS_INTERDITS =
  /\b(nul|nuls|merde|conn?ard|conn?asse|encul|batard|bâtard|ferme ta|tg|ta gueule|salope|pd|abruti|débile|debile|clochard|arbitre pourri|voleur|tricheur)\w*/i;
