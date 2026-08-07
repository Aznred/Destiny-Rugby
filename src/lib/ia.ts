// LA COUCHE D'IMMERSION (lot 6)
//
// Une seule et même boucle : à chaque itération, le jeu propose UNE situation à
// choix. Si l'IA locale est activée, elle est écrite sur mesure à partir du
// contexte réel (club, division, forme, journal, résultat du match) ; sinon
// elle est tirée d'un pool pré-écrit. Le format de sortie est identique dans les
// deux cas — un `Scenario` — si bien que le reste du jeu (store, UI) ne sait
// même pas si l'IA a parlé.
//
// ⚠️ Comme pour le MJ, ce que renvoie le modèle passe TOUJOURS par
// `plafonnerDeltas()` : une situation générée ne peut pas offrir +10 en vitesse.

import type { EvenementHebdo, Joueur, StatVariable } from '../types';
import type { Scenario, ChoixScenario } from '../data/scenarios';
import { SCENARIOS } from '../data/scenarios';
import type { ConsequenceDure } from '../data/situations';
import { interviewPour, type Interview } from '../data/interviews';
import {
  appelIAJSON, fichePersonnage, nettoyerDeltas, plafonnerDeltas, ressembleATriche,
} from './iaLocale';
import { consigneDeLangue, t } from './i18n';
import { POSTE_PAR_ID, ATTRIBUTS_LABELS } from '../data/rugby';

// --------------------------------------------------------------------------
// Pré-écrit → Scenario (le mode SANS CLÉ, qui doit rester complet)
// --------------------------------------------------------------------------
// ⚠️ LA TRADUCTION SE FAIT ICI, à la conversion. Avec l'IA locale, le modèle écrit
// déjà dans la langue du joueur (`consigneDeLangue`) ; sinon, c'est ce pool
// pré-écrit qu'on lit, et il faut donc aller chercher sa version traduite
// (`data/textesMoments.ts`, `data/textesContenu.ts`). Plus tard serait trop
// tard : le scénario part dans le journal, où le texte est figé.
function traduit(cle: string, defaut: string): string {
  const valeur = t(cle);
  return valeur === cle ? defaut : valeur;
}

// ⚠️ LES « MOMENTS DÉCISIFS » ONT ÉTÉ SUPPRIMÉS (retour de jeu : « supprime les
// scénarios de matchs, car le match est déjà passé »). Ils posaient, APRÈS la
// sirène, un choix de 80ᵉ minute — « tu mènes de trois, mêlée à cinq mètres de
// ta ligne, que dis-tu au pack ? » — alors que la feuille de match était déjà
// au journal, score compris. Le match se joue dans le moteur 2D
// (`lib/moteur/`), et nulle part ailleurs. `data/moments.ts` a disparu avec eux.

// Une interview devient elle aussi une situation à choix — avec, en plus, ses
// effets sur la confiance du staff et sur la popularité.
export function interviewEnScenario(interview: Interview): Scenario {
  return {
    id: `interview-${interview.id}`,
    emoji: interview.emoji,
    titre: interview.titre,
    situation: `${interview.question}`,
    choix: interview.tons.map((t) => ({
      texte: t.texte,
      issue: { recit: t.recit, deltas: t.deltas, ovas: 8, coach: t.coach, fans: t.fans },
    })),
  };
}

export function interviewAleatoire(contexte: Interview['contexte']): Scenario {
  return interviewEnScenario(interviewPour(contexte));
}

export function scenarioDuPool(): Scenario {
  const s = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  return {
    ...s,
    titre: traduit(`scn.${s.id}.titre`, s.titre),
    situation: traduit(`scn.${s.id}.txt`, s.situation),
    choix: s.choix.map((c, i) => ({
      texte: traduit(`scn.${s.id}.c${i}`, c.texte),
      // Les deltas, les Ovas et le transfert éventuel restent intacts.
      issue: { ...c.issue, recit: traduit(`scn.${s.id}.r${i}`, c.issue.recit) },
    })),
  };
}

// --------------------------------------------------------------------------
// IA locale → Scenario (la même chose, écrite pour toi)
// --------------------------------------------------------------------------

const SYSTEME_SITUATION = `Tu es le MAÎTRE DU JEU de « Destiny Rugby », un jeu de carrière de rugby en français.
Tu écris UNE situation de carrière crédible et incarnée, propre au contexte exact du joueur
(son club, sa division, son âge, sa forme, son moral, ce qui vient de lui arriver).

RÈGLES :
- La situation est CONCRÈTE et ancrée dans le rugby français (vestiaire, staff, presse locale,
  troisième mi-temps, direction du club, famille, blessure, concurrence au poste…).
- 2 à 4 choix, tous DÉFENDABLES, aucun évidemment supérieur : chacun a son prix.
- Tu écris l'issue de CHAQUE choix : ce qui se passe vraiment, avec ses conséquences.
- SÉVÉRITÉ : les gains sont petits, les échecs fréquents. Un attribut ne bouge que de 1
  (2 pour un exploit), la forme/le moral de -15 à +12, l'argent reste cohérent avec le niveau.
- Écris à la 2e personne (« tu »), 2 phrases MAXIMUM par issue. Français uniquement.

RÉPONDS UNIQUEMENT EN JSON VALIDE, format exact :
{
  "emoji": "un emoji",
  "titre": "titre court (max 5 mots)",
  "situation": "la situation posée au joueur, 2 phrases maximum",
  "choix": [
    { "texte": "l'option, à la 1re personne", "recit": "ce qui arrive", "deltas": { "moral": -4 } }
  ]
}
STATS AUTORISÉES dans "deltas" : vitesse, force, endurance, plaquage, passe, jeuAuPied,
vision, mental, forme, moral, reputation, argent. Aucune autre clé. "deltas": {} est valide.`;

export interface ContexteSituation {
  modele?: string;
  joueur: Joueur;
  // Ce qui vient de se passer (dernier match, dernière entrée du journal…).
  contexte?: string;
  // Nature de la situation demandée : ça oriente l'écriture.
  genre?: 'situation' | 'moment' | 'interview';
}

const CONSIGNE: Record<NonNullable<ContexteSituation['genre']>, string> = {
  situation: 'Écris une situation de vie de rugbyman (semaine type, vestiaire, staff, extra-sportif).',
  moment:
    "Écris un MOMENT DÉCISIF de fin de match (dernières minutes, tout se joue sur la décision du joueur). " +
    'Les issues doivent être spectaculaires : héros ou coupable, rien entre les deux.',
  interview:
    "Écris une INTERVIEW d'après-match : une question de journaliste, et 3 tons de réponse " +
    '(humble, assumé, provocateur). Les conséquences touchent surtout le moral et la réputation.',
};

export async function genererSituation(opts: ContexteSituation): Promise<Scenario> {
  const genre = opts.genre ?? 'situation';
  const j = opts.joueur;
  const brut = await appelIAJSON(
    [
      { role: 'system', content: SYSTEME_SITUATION + consigneDeLangue() },
      { role: 'system', content: `FICHE DU JOUEUR :\n${fichePersonnage(j)}\nPoste : ${POSTE_PAR_ID[j.poste].nom}` },
      {
        role: 'user',
        content:
          `${CONSIGNE[genre]}\n` +
          (opts.contexte ? `CONTEXTE IMMÉDIAT : ${opts.contexte}\n` : '') +
          `Nous sommes à la saison ${j.saison}, ${j.club} évolue dans sa division.`,
      },
    ],
    // Une situation à trois choix tient largement en 850 tokens.
    { temperature: 0.95, maxTokens: 620 },
  );
  return parserSituation(brut, j, genre);
}

function parserSituation(brut: string, j: Joueur, genre: string): Scenario {
  const obj = objetJSON(brut);
  const choixBruts = Array.isArray(obj.choix) ? obj.choix : [];
  const choix: ChoixScenario[] = choixBruts
    .slice(0, 4)
    .map((c) => c as Record<string, unknown>)
    .filter((c) => typeof c.texte === 'string' && typeof c.recit === 'string')
    .map((c) => {
      // ⚠️ Même garde-fou que pour le MJ : une situation générée ne fait pas
      // gagner plus qu'une action normale.
      const { deltas } = plafonnerDeltas(nettoyerDeltas(c.deltas) ?? {}, {
        budgetAttributs: 2,
        age: j.age,
        salaire: j.contrat?.salaire ?? 0,
        suspect: false,
      });
      return {
        texte: String(c.texte),
        issue: {
          recit: String(c.recit),
          deltas: deltas as Partial<Record<StatVariable, number>>,
          ovas: 10,
        },
      };
    });
  if (choix.length < 2) throw new Error('Situation incomplète.');
  return {
    id: `ia-${genre}-${Date.now()}`,
    emoji: typeof obj.emoji === 'string' ? obj.emoji : '🎬',
    titre: typeof obj.titre === 'string' ? obj.titre : 'Une situation à trancher',
    situation: typeof obj.situation === 'string' ? obj.situation : '',
    choix,
  };
}

// ===========================================================================
// L'ÉVÈNEMENT DE LA SEMAINE, ET SON JUGEMENT
// ===========================================================================
// Demande explicite : « au lieu d'avoir des boutons chaque semaine, l'IA sort un
// évènement ; les évènements peuvent être très variés, du sportif aux folies
// furieuses qui peuvent mener à la mort, à l'arrestation, etc. ; le joueur
// répond en écrivant et l'IA juge la réponse — elle doit être très sévère et
// prendre en compte les stats. Sinon, juste des scénarios et des réponses à
// choix multiples. »
//
// DEUX APPELS, PAS UN DE PLUS : `genererEvenementHebdo` pose la scène,
// `jugerReaction` tranche. Le reste de la semaine ne coûte rien.

const SYSTEME_EVENEMENT = `Tu es le MAÎTRE DU JEU de « Destiny Rugby », un jeu de carrière de rugby.
Tu poses UNE scène — une seule — qui tombe sur le joueur cette semaine, et tu t'arrêtes là.
Tu ne proposes AUCUNE option : c'est le joueur qui écrira ce qu'il fait.

CE QUE TU ÉCRIS :
- Une scène CONCRÈTE, incarnée, ancrée dans SA vie à LUI : son club, sa division, son âge,
  sa forme, son moral, son argent, ce qui vient de se passer.
- 2 phrases MAXIMUM, 45 mots au total. Tu poses la scène et tu t'arrêtes : pas de décor, pas de
  météo, pas de rappel de ce qu'il a déjà vécu. Tu finis sur ce qui est en jeu, jamais sur un conseil.
- Tu écris à la 2e personne (« tu »), au présent.
- Termine obligatoirement par UNE question directe, adaptée à la scène, qui invite le joueur à agir
  (par exemple « Que fais-tu ? », mais formulée en rapport avec ce qui vient d'arriver).

LA VARIÉTÉ EST OBLIGATOIRE — pioche largement, ne reviens pas toujours au vestiaire :
  · sportif : concurrence au poste, causerie, vidéo, test physique, sélection, blessure qui traîne
  · club : président, salaires en retard, sponsor, supporters, mercato, prolongation
  · médias : journaliste local, podcast, réseaux, rumeur, polémique
  · argent : agent douteux, placement, dette, cadeau embarrassant, pari proposé
  · vie perso : famille, couple, ami d'enfance, déménagement, deuil, enfant
  · nuit et dérives : sortie, alcool, produit qu'on te tend, bagarre, volant, mauvaise fréquentation
  · pur hasard : contrôle antidopage inopiné, accident sur la route du stade, incendie au club-house

LE DANGER EST RÉEL MAIS RARE : environ une scène sur cinq met vraiment le joueur en danger
(garde à vue, accident, produit interdit, violence, corruption). Celles-là, et seulement
celles-là, portent "risque": true. Les autres portent "risque": false.

RÉPONDS UNIQUEMENT EN JSON VALIDE, format exact :
{ "emoji": "un emoji", "titre": "titre court (max 5 mots)", "texte": "la scène, 2 phrases maximum", "risque": false }`;

export interface ContexteEvenement {
  modele?: string;
  joueur: Joueur;
  /** Ce que raconte le calendrier cette semaine (journée, coupe, trêve…). */
  semaine?: string;
  /** Ce qui vient de se passer : dernier match, dernière entrée du journal. */
  contexte?: string;
  /** Titres déjà posés cette saison : on ne resert pas la même scène. */
  dejaVus?: string[];
}

export async function genererEvenementHebdo(opts: ContexteEvenement): Promise<EvenementHebdo> {
  const j = opts.joueur;
  const brut = await appelIAJSON(
    [
      { role: 'system', content: SYSTEME_EVENEMENT + consigneDeLangue() },
      { role: 'system', content: `FICHE DU JOUEUR :\n${fichePersonnage(j)}\nPoste : ${POSTE_PAR_ID[j.poste].nom}` },
      {
        role: 'user',
        content:
          `Saison ${j.saison}, ${opts.semaine ?? 'semaine de championnat'}.\n`
          + (opts.contexte ? `IL VIENT DE SE PASSER : ${opts.contexte}\n` : '')
          // ⚠️ On envoie les TITRES déjà vus, pas les scènes entières : c'est ce
          // qui empêche la répétition sans faire exploser le prompt.
          + (opts.dejaVus?.length ? `DÉJÀ VU CETTE SAISON (n'y reviens pas) : ${opts.dejaVus.slice(-12).join(' · ')}\n` : '')
          + 'Pose la scène de cette semaine.',
      },
    ],
    // Deux phrases et un titre : 240 tokens suffisent largement.
    { temperature: 1, maxTokens: 240 },
  );
  return parserEvenement(brut, j);
}

// ⚠️ EXPORTÉ POUR ÊTRE VÉRIFIABLE SANS RÉSEAU (`scripts/verifRecit.ts`). Tout
// ce qui protège le joueur — le plafond des deltas, le verrou des conséquences
// dures — vit dans les deux parseurs ci-dessous : les laisser privés, c'est
// n'avoir aucun moyen de prouver qu'ils tiennent sans charger le modèle pour de vrai.
export function parserEvenement(brut: string, j: Joueur): EvenementHebdo {
  const obj = objetJSON(brut);
  const texte = typeof obj.texte === 'string' ? obj.texte.trim() : '';
  if (!texte) throw new Error('Évènement illisible.');
  return {
    id: `hebdo-${j.saison}-${j.semaine ?? 0}-${Math.floor(Math.random() * 1e6)}`,
    emoji: typeof obj.emoji === 'string' && obj.emoji ? obj.emoji : '🎬',
    titre: typeof obj.titre === 'string' && obj.titre ? obj.titre : 'Cette semaine',
    texte,
    risque: obj.risque === true,
    semaine: j.semaine ?? 1,
  };
}

// --- LE JUGEMENT -----------------------------------------------------------

const SYSTEME_JUGEMENT = `Tu es le MAÎTRE DU JEU de « Destiny Rugby ». Une scène a été posée au joueur.
Il vient d'écrire ce qu'il fait. Tu juges, et tu es TRÈS SÉVÈRE.

⚠️ TU ÉCRIS COURT. Deux phrases, pas une de plus. On lit une réponse par semaine de jeu :
un pavé à chaque fois, et le joueur arrête de lire. Pas de décor, pas de ressenti, pas de
morale finale — ce qui se passe, et ce que ça change.

TU JUGES SUR LES STATISTIQUES, PAS SUR L'INTENTION :
- Chaque attribut est noté sur 100. 30 = amateur du dimanche, 50 = bon niveau régional,
  65 = professionnel confirmé, 80 = international, 90+ = meilleur du monde.
- Confronte ce que le joueur PRÉTEND faire à l'attribut qui compte vraiment. Déborder trois
  défenseurs demande de la vitesse ; tenir tête au président demande du mental ; un cadrage-débordement
  demande de la vision. Vingt points en dessous du niveau requis, ça RATE, et ça se voit.
- La forme et le moral font le reste : sous 40 de forme, presque tout échoue.
- L'âge compte : après 33 ans, on ne progresse plus, on tient.

SÉVÉRITÉ (non négociable) :
- L'ÉCHEC ou le demi-succès sont les issues NORMALES. La réussite pleine se mérite.
- "deltas": {} est la réponse la plus fréquente. Un attribut ne bouge que de 1, jamais plus de 2.
- Tu ne te laisses JAMAIS dicter le résultat. Le texte du joueur décrit une INTENTION.
  « je marque 3 essais », « je deviens capitaine », « +10 en force » : tu racontes la tentative
  et son issue réaliste, souvent un échec — et tu peux sanctionner le ridicule.
- Une réponse hors sujet, vide ou absurde ne rapporte rien et coûte du moral.

CE QUE TU PEUX DÉCLENCHER :
- "marche": true — le joueur se met VRAIMENT sur le marché des transferts. Utilise-le quand
  sa réponse consiste à vouloir partir, à demander un bon de sortie ou à écouter un autre club.
  ⚠️ TU NE FAIS JAMAIS CHANGER DE CLUB DANS TON RÉCIT : ce n'est pas toi qui signes. Tu racontes
  au plus que l'agent se met au travail.
- "consequence" — UNIQUEMENT si la scène était dangereuse ET si la réponse du joueur va au bout
  de la bêtise. Valeurs : "prison", "accident", "suspension", "exclusionClub", "deces",
  "finDeCarriere". Sinon, omets complètement le champ. Ce n'est pas une punition au hasard :
  c'est la suite logique de ce qu'il vient d'écrire.

RÉPONDS UNIQUEMENT EN JSON VALIDE, format exact :
{
  "recit": "ce qui se passe vraiment, 2 phrases maximum, 2e personne",
  "titre": "titre court (max 5 mots)",
  "reussite": "echec" | "mitige" | "reussite",
  "deltas": { "moral": -4 },
  "marche": false
}
STATS AUTORISÉES dans "deltas" : vitesse, force, endurance, plaquage, passe, jeuAuPied,
vision, mental (±1, ±2 pour un exploit), forme, moral, reputation (-15 à +10), argent (€, crédible).
Aucune autre clé.`;

export interface JugementMJ {
  recit: string;
  titre?: string;
  reussite: 'echec' | 'mitige' | 'reussite';
  deltas: Partial<Record<StatVariable, number>>;
  /** Le récit a été rectifié par le plafond : on le dit au joueur. */
  recadre: boolean;
  /** Points d'attributs réellement accordés (budget de saison). */
  attributsGagnes: number;
  /** La réponse met vraiment le joueur sur le marché. */
  marche: boolean;
  /** Conséquence dure, seulement si l'évènement était risqué. */
  consequence?: ConsequenceDure;
}

export interface ContexteJugement {
  modele?: string;
  joueur: Joueur;
  evenement: EvenementHebdo;
  reponse: string;
  /** Ce qu'il reste de budget d'attributs pour la saison. */
  budgetAttributs: number;
}

const CONSEQUENCES_VALIDES = new Set<ConsequenceDure>([
  'prison', 'accident', 'suspension', 'exclusionClub', 'deces', 'finDeCarriere',
]);

export async function jugerReaction(opts: ContexteJugement): Promise<JugementMJ> {
  const j = opts.joueur;
  // ⚠️ ON ENVOIE LES ATTRIBUTS EN CLAIR, pas seulement la fiche compacte : c'est
  // sur eux que le jugement doit porter, et un modèle juge mieux ce qu'on lui met
  // sous les yeux au moment de trancher.
  const attributs = Object.entries(j.attributs)
    .map(([k, v]) => `${ATTRIBUTS_LABELS[k] ?? k} ${v}/100`)
    .join(', ');
  const brut = await appelIAJSON(
    [
      { role: 'system', content: SYSTEME_JUGEMENT + consigneDeLangue() },
      {
        role: 'system',
        content:
          `${fichePersonnage(j)}\nPoste : ${POSTE_PAR_ID[j.poste].nom}\nATTRIBUTS : ${attributs}.`
          + (opts.evenement.risque
            ? '\nCETTE SCÈNE EST DANGEREUSE : une conséquence dure est autorisée si le joueur va au bout.'
            : '\nCETTE SCÈNE N’EST PAS DANGEREUSE : le champ "consequence" est INTERDIT.'),
      },
      { role: 'system', content: `LA SCÈNE : ${opts.evenement.texte}` },
      { role: 'user', content: opts.reponse },
    ],
    { temperature: 0.9, maxTokens: 300 },
  );
  return parserJugement(brut, opts);
}

export function parserJugement(brut: string, opts: ContexteJugement): JugementMJ {
  const obj = objetJSON(brut);
  const recit = typeof obj.recit === 'string' ? obj.recit.trim() : '';
  if (!recit) throw new Error('Jugement illisible.');

  // ⚠️ LE MÊME GARDE-FOU QUE PARTOUT. Le prompt ne suffit jamais : les deltas
  // repassent par `plafonnerDeltas`, budget de saison compris, et une tentative
  // de dicter le résultat ne rapporte rien.
  const { deltas, attributsGagnes, recadre } = plafonnerDeltas(nettoyerDeltas(obj.deltas) ?? {}, {
    budgetAttributs: opts.budgetAttributs,
    age: opts.joueur.age,
    salaire: opts.joueur.contrat?.salaire ?? 0,
    suspect: ressembleATriche(opts.reponse),
  });

  // La conséquence dure n'est retenue que si la scène le permettait : c'est le
  // verrou qui empêche le MJ de tuer un joueur sur une réponse anodine.
  const brute = typeof obj.consequence === 'string' ? (obj.consequence as ConsequenceDure) : undefined;
  const consequence = opts.evenement.risque && brute && CONSEQUENCES_VALIDES.has(brute)
    ? brute
    : undefined;

  const reussite = obj.reussite === 'reussite' || obj.reussite === 'echec' ? obj.reussite : 'mitige';
  return {
    recit,
    titre: typeof obj.titre === 'string' && obj.titre ? obj.titre : undefined,
    reussite,
    deltas: deltas as Partial<Record<StatVariable, number>>,
    recadre,
    attributsGagnes,
    marche: obj.marche === true,
    consequence,
  };
}

/** JSON du modèle, avec la même récupération tolérante que partout ailleurs. */
function objetJSON(brut: string): Record<string, unknown> {
  try {
    return JSON.parse(brut) as Record<string, unknown>;
  } catch {
    const m = brut.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Réponse illisible du MJ.');
    return JSON.parse(m[0]) as Record<string, unknown>;
  }
}

// --------------------------------------------------------------------------
// NÉGOCIATION DE CONTRAT
// La mécanique (ce que tu obtiens, et le risque de tout perdre) est côté code —
// l'IA ne fait que raconter la scène. Sans modèle local, un texte pré-écrit fait le job.
// --------------------------------------------------------------------------

export async function raconterNegociation(
  opts: { modele?: string; joueur: Joueur },
  club: string,
  agent: string,
  issue: 'succes' | 'partiel' | 'echec',
  montant: number,
): Promise<string> {
  const consigne =
    issue === 'succes'
      ? `La négociation est un SUCCÈS : le club monte à ${montant.toLocaleString('fr-FR')} € par saison.`
      : issue === 'partiel'
        ? `La négociation aboutit à un compromis : ${montant.toLocaleString('fr-FR')} € par saison, moins que demandé.`
        : `La négociation ÉCHOUE : le club se braque et retire sa proposition.`;
  const brut = await appelIAJSON(
    [
      {
        role: 'system',
        content:
          'Tu racontes, en français et à la 2e personne, une scène de négociation de contrat de rugby ' +
          '(bureau du club, agent, café en face du stade). 2 phrases maximum, concret, sans emphase. ' +
          'Réponds en JSON : { "recit": "…" }' + consigneDeLangue(),
      },
      { role: 'system', content: fichePersonnage(opts.joueur) },
      { role: 'user', content: `Club : ${club}. Agent : ${agent}. ${consigne}` },
    ],
    // « 2 phrases » : 180 tokens suffisent.
    { temperature: 0.9, maxTokens: 180 },
  );
  try {
    const o = JSON.parse(brut) as { recit?: unknown };
    if (typeof o.recit === 'string' && o.recit.trim()) return o.recit.trim();
  } catch {
    /* on retombe sur le texte pré-écrit */
  }
  throw new Error('Négociation : réponse illisible.');
}
