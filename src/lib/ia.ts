// LA COUCHE D'IMMERSION (lot 6)
//
// Une seule et même boucle : à chaque itération, le jeu propose UNE situation à
// choix. Si une clé Groq est disponible, elle est écrite sur mesure à partir du
// contexte réel (club, division, forme, journal, résultat du match) ; sinon
// elle est tirée d'un pool pré-écrit. Le format de sortie est identique dans les
// deux cas — un `Scenario` — si bien que le reste du jeu (store, UI) ne sait
// même pas si l'IA a parlé.
//
// ⚠️ Comme pour le MJ, ce que renvoie le modèle passe TOUJOURS par
// `plafonnerDeltas()` : une situation générée ne peut pas offrir +10 en vitesse.

import type { Joueur, StatVariable } from '../types';
import type { Scenario, ChoixScenario } from '../data/scenarios';
import { SCENARIOS } from '../data/scenarios';
import { MOMENTS, type MomentDecisif } from '../data/moments';
import { interviewPour, type Interview } from '../data/interviews';
import { appelGroqJSON, fichePersonnage, nettoyerDeltas, plafonnerDeltas, MODELE_DEFAUT } from './groq';
import { consigneDeLangue, t } from './i18n';
import { POSTE_PAR_ID } from '../data/rugby';

// --------------------------------------------------------------------------
// Pré-écrit → Scenario (le mode SANS CLÉ, qui doit rester complet)
// --------------------------------------------------------------------------
// ⚠️ LA TRADUCTION SE FAIT ICI, à la conversion. Avec une clé Groq, l'IA écrit
// déjà dans la langue du joueur (`consigneDeLangue`) ; sans clé, c'est ce pool
// pré-écrit qu'on lit, et il faut donc aller chercher sa version traduite
// (`data/textesMoments.ts`, `data/textesContenu.ts`). Plus tard serait trop
// tard : le scénario part dans le journal, où le texte est figé.
function traduit(cle: string, defaut: string): string {
  const valeur = t(cle);
  return valeur === cle ? defaut : valeur;
}

// Un moment décisif devient une situation à choix. La réussite de chaque geste
// est tirée à la CONSTRUCTION (le joueur ne la voit pas : c'est équivalent à un
// tirage au clic, et ça garde le format commun).
export function momentEnScenario(j: Joueur, moment: MomentDecisif): Scenario {
  const choix: ChoixScenario[] = moment.options.map((o, i) => {
    const niveau = j.attributs[o.attribut];
    // 50 % au seuil, ~85 % quinze points au-dessus, ~15 % quinze en dessous.
    const chance = Math.max(0.08, Math.min(0.92, 0.5 + (niveau - o.seuil) / 30));
    const reussi = Math.random() < chance;
    const issue = reussi ? o.reussite : o.echec;
    return {
      texte: traduit(`mom.${moment.id}.o${i}`, o.texte),
      issue: {
        recit: traduit(`mom.${moment.id}.o${i}.${reussi ? 'ok' : 'ko'}`, issue.recit),
        deltas: issue.deltas,
        ovas: reussi ? 14 : 5,
      },
    };
  });
  return {
    id: `moment-${moment.id}`,
    emoji: moment.emoji,
    titre: traduit(`mom.${moment.id}.titre`, moment.titre),
    situation: traduit(`mom.${moment.id}.txt`, moment.situation),
    choix,
  };
}

export function momentAleatoire(j: Joueur): Scenario {
  return momentEnScenario(j, MOMENTS[Math.floor(Math.random() * MOMENTS.length)]);
}

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
// Groq → Scenario (le mode AVEC CLÉ : la même chose, écrite pour toi)
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
- Écris à la 2e personne (« tu »), 2 à 4 phrases par issue. Français uniquement.

RÉPONDS UNIQUEMENT EN JSON VALIDE, format exact :
{
  "emoji": "un emoji",
  "titre": "titre court (max 5 mots)",
  "situation": "la situation posée au joueur (2 à 4 phrases)",
  "choix": [
    { "texte": "l'option, à la 1re personne", "recit": "ce qui arrive", "deltas": { "moral": -4 } }
  ]
}
STATS AUTORISÉES dans "deltas" : vitesse, force, endurance, plaquage, passe, jeuAuPied,
vision, mental, forme, moral, reputation, argent. Aucune autre clé. "deltas": {} est valide.`;

export interface ContexteSituation {
  cle: string;
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
  const brut = await appelGroqJSON(
    opts.cle,
    opts.modele || MODELE_DEFAUT,
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
    { temperature: 0.95, maxTokens: 850 },
  );
  return parserSituation(brut, j, genre);
}

function parserSituation(brut: string, j: Joueur, genre: string): Scenario {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(brut);
  } catch {
    const m = brut.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Réponse illisible du MJ.');
    obj = JSON.parse(m[0]);
  }
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

// --------------------------------------------------------------------------
// NÉGOCIATION DE CONTRAT
// La mécanique (ce que tu obtiens, et le risque de tout perdre) est côté code —
// l'IA ne fait que raconter la scène. Sans clé, un texte pré-écrit fait le job.
// --------------------------------------------------------------------------

export async function raconterNegociation(
  opts: { cle: string; modele?: string; joueur: Joueur },
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
  const brut = await appelGroqJSON(
    opts.cle,
    opts.modele || MODELE_DEFAUT,
    [
      {
        role: 'system',
        content:
          'Tu racontes, en français et à la 2e personne, une scène de négociation de contrat de rugby ' +
          '(bureau du club, agent, café en face du stade). 2 à 4 phrases, concret, sans emphase. ' +
          'Réponds en JSON : { "recit": "…" }' + consigneDeLangue(),
      },
      { role: 'system', content: fichePersonnage(opts.joueur) },
      { role: 'user', content: `Club : ${club}. Agent : ${agent}. ${consigne}` },
    ],
    // « 2 à 4 phrases » : 260 tokens suffisent, 400 étaient payés pour rien.
    { temperature: 0.9, maxTokens: 260 },
  );
  try {
    const o = JSON.parse(brut) as { recit?: unknown };
    if (typeof o.recit === 'string' && o.recit.trim()) return o.recit.trim();
  } catch {
    /* on retombe sur le texte pré-écrit */
  }
  throw new Error('Négociation : réponse illisible.');
}
