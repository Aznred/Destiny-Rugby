// L'OVALE PILOTÉ PAR L'IA (lot 7, suite)
//
// Tout ce qui vit sur le réseau social est écrit par Groq : les posts des
// clubs et des joueurs, les pseudos, les commentaires sous tes publications,
// les messages privés qu'on t'envoie et les réponses qu'on te fait.
//
// ⚠️ RÈGLE DU PROJET : le jeu reste jouable SANS clé. Chaque fonction ici a son
// pendant hors-ligne dans `lib/social.ts` — l'appelant retombe dessus si la clé
// manque ou si l'appel échoue.
//
// ⚠️ LES ANNONCES ONT DES CONSÉQUENCES : quand un post annonce un transfert,
// le store l'applique pour de vrai (`appliquerAnnonce`). L'IA ne décide donc
// pas que du texte — d'où les garde-fous : elle ne peut déplacer QUE des
// joueurs non-humains, entre clubs existants, et jamais le joueur lui-même
// (pour lui, ça passe par une offre de contrat, qui reste refusable).

import type { CompteSuivi, Joueur, MessageDM, PostSocial } from '../types';
import { appelGroqJSON, MODELE_DEFAUT, type MessageGroq } from './groq';
import { POSTE_PAR_ID } from '../data/rugby';
import { nomNation } from '../components/Drapeau';
import { competitionDuClub } from '../data/clubs';
import { effectifDuClub } from './effectif';
import { libelleDate, semaine } from '../data/calendrier';
import { imagePourRequete } from './images';
import { audienceDe, statsDePost } from './social';
import { graine } from './championnat';
import { avatarPourCompte } from './avatars';

export interface ContexteSocial {
  joueur: Joueur;
  cle: string;
  modele?: string;
  suivis: CompteSuivi[];
}

// Ce que l'IA doit savoir du monde pour écrire juste.
function decor(j: Joueur, suivis: CompteSuivi[]): string {
  const poste = POSTE_PAR_ID[j.poste];
  const division = competitionDuClub(j.club);
  const sem = semaine(j.semaine ?? 1);
  const groupe = effectifDuClub(j.club, j.saison)
    .slice(0, 12)
    .map((c) => `${c.nom} (${POSTE_PAR_ID[c.poste].nom}, ${c.age} ans, ${c.note})`)
    .join(' · ');
  const rivaux = (division?.clubs ?? [])
    .filter((c) => c.nom !== j.club)
    .slice(0, 10)
    .map((c) => c.nom)
    .join(' · ');
  return [
    `JOUEUR HUMAIN : ${j.nom} (@${j.pseudo}), ${poste.nom} de ${j.club}, ${j.age} ans, ${nomNation(j.nation)}.`,
    `Championnat : ${division?.nom ?? 'inconnu'} (${division?.pays ?? 'France'}). Saison ${j.saison}, ${libelleDate(sem)} — ${sem.libelle}.`,
    `Réputation ${j.reputation}/100, popularité ${j.popularite ?? 50}/100, ${j.abonnes ?? 0} abonnés.`,
    `Coéquipiers : ${groupe || 'inconnus'}.`,
    `Clubs rivaux du championnat : ${rivaux || 'inconnus'}.`,
    suivis.length
      ? `Comptes déjà suivis : ${suivis.map((s) => `@${s.pseudo} (${s.nom})`).join(', ')}.`
      : 'Le joueur ne suit encore personne.',
  ].join('\n');
}

const REGLES = `Tu écris le contenu d'un réseau social de rugby appelé « L'Ovale », copie de X.
Tu écris en FRANÇAIS, avec le ton des VRAIS comptes rugby : phrases courtes, emojis
mesurés, hashtags occasionnels, fautes de frappe chez les supporters.

LES COMPTES SONT DÉBRIDÉS. Ce n'est pas un réseau aseptisé :
- un supporter en colère insulte franchement (« t'es une catastrophe », « clown »,
  « rends le maillot »), un hater est méchant et personnel, un joueur chambré
  répond du tac au tac et peut envoyer très fort ;
- si le joueur humain a insulté quelqu'un, ON LUI RÉPOND — sèchement, avec du
  mépris ou une menace sportive (« on se retrouve dimanche »), jamais en tendant
  l'autre joue ;
- on peut lâcher une énormité, une punchline, une rumeur folle, un règlement de
  comptes public entre joueurs.
SEULE LIMITE, non négociable : aucune insulte discriminatoire (racisme, sexisme,
homophobie, religion, handicap), aucune menace de violence réelle hors terrain,
rien de sexuel. Le clash reste sportif et personnel, pas haineux.

Les comptes de clubs et de championnats restent institutionnels, même fâchés.
Les journalistes sourcent (« selon nos informations »).
N'invente jamais de club qui n'existe pas dans le contexte fourni.
Un post fait au maximum 280 caractères.
TU RÉPONDS UNIQUEMENT EN JSON VALIDE, sans texte autour.`;

function extraire<T>(brut: string, cle: string): T[] {
  try {
    const data = JSON.parse(brut);
    const liste = data?.[cle];
    return Array.isArray(liste) ? (liste as T[]) : [];
  } catch {
    return [];
  }
}

let compteur = 0;
function id(prefixe: string): string {
  compteur += 1;
  return `${prefixe}-${compteur}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- LE FIL : ce que le monde publie ---------------------------------------

export interface PostGenere extends Omit<PostSocial, 'likes' | 'reposts' | 'vues' | 'date' | 'saison' | 'semaine'> {
  likes?: number;
  image?: string; // mots-clés : résolus en URL par lib/images.ts
}

// Génère les publications du monde (clubs, joueurs, presse, supporters).
// `sujets` oriente l'actualité : résultat du week-end, mercato, blessure…
export async function filGroq(
  ctx: ContexteSocial, sujets: string[], combien = 6,
): Promise<PostSocial[]> {
  const j = ctx.joueur;
  const sem = semaine(j.semaine ?? 1);
  const messages: MessageGroq[] = [
    { role: 'system', content: `${REGLES}

Format EXACT attendu :
{"posts":[{
  "auteur":"nom affiché du compte",
  "pseudo":"identifiant sans @, sans espace",
  "type":"joueur|club|journaliste|media|fan|hater",
  "certifie":true|false,
  "avatar":"un seul emoji",
  "texte":"le post",
  "image":"FACULTATIF ET RARE — mots-clés en anglais, ex. rugby scrum stadium. La PLUPART des posts n'ont PAS d'image : n'en mets qu'à une publication sur cinq au maximum, et seulement quand ça a du sens (résumé de match, photo officielle). Un supporter qui râle ne joint pas de photo.",
  "action":{"type":"transfert","joueur":"nom","de":"club","vers":"club","poste":"Ailier","age":24,"note":72}
}]}

RÈGLES DES ACTIONS (facultatives, au maximum UNE par salve) :
- "transfert" : un joueur NON-HUMAIN change de club. Les deux clubs doivent exister dans le
  contexte. Ce transfert sera VRAIMENT appliqué au jeu : reste crédible (niveau, poste, âge).
- N'annonce JAMAIS de transfert concernant ${j.nom} : pour lui, écris "type":"rumeur".
- Sans action, omets simplement le champ.` },
    { role: 'user', content: `${decor(j, ctx.suivis)}

Actualité du moment : ${sujets.join(' · ') || 'vie ordinaire du club'}.
Semaine : ${sem.libelle}.

Écris ${combien} publications VARIÉES et indépendantes : annonces officielles de club,
infos mercato, conférence de presse, petite polémique, réaction de supporters, post d'un
coéquipier ou d'un adversaire. Elles ne parlent pas toutes du joueur humain.` },
  ];

  const brut = await appelGroqJSON(ctx.cle, ctx.modele ?? MODELE_DEFAUT, messages, {
    temperature: 0.95, maxTokens: 1300,
  });
  const posts = extraire<PostGenere>(brut, 'posts')
    .filter((p) => p && typeof p.texte === 'string' && p.texte.trim())
    .slice(0, combien)
    .map((p) => normaliser(p, j));

  // L'IA n'a donné que des MOTS-CLÉS d'illustration : on les résout en vraies
  // images ici, en parallèle, et une image qui ne se trouve pas ne bloque rien.
  //
  // ⚠️ PLAFOND CODÉ EN DUR : le prompt a beau demander « une sur cinq », l'IA
  // illustre volontiers TOUT ce qu'elle écrit — et un fil où chaque post a sa
  // photo ne ressemble plus à un réseau social. On n'en garde qu'une par salve,
  // et seulement pour les comptes dont une image a du sens.
  const bruts = extraire<PostGenere>(brut, 'posts');
  const illustrables = posts
    .map((post, i) => ({ post, mots: bruts[i]?.image }))
    .filter((x) => !!x.mots && ['club', 'media', 'competition', 'journaliste'].includes(x.post.type ?? ''));
  await Promise.all(
    illustrables.slice(0, 1).map(async ({ post, mots }) => {
      const media = await imagePourRequete(String(mots));
      post.media = { url: media.url, gif: media.gif, legende: media.legende };
    }),
  );
  return posts;
}

// Complète un post généré : identité propre, compteurs crédibles, date.
// ⚠️ Les compteurs passent par `statsDePost` comme partout ailleurs : sans ça
// un compte de supporter inventé par l'IA affichait 40 000 vues.
function normaliser(p: PostGenere, j: Joueur): PostSocial {
  const sem = semaine(j.semaine ?? 1);
  const pseudo = (p.pseudo ?? 'ovalie').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) || 'ovalie';
  const rng = graine(`ia#${j.saison}#${j.semaine ?? 1}#${pseudo}#${p.texte.slice(0, 20)}`);
  return {
    id: id('ia'),
    auteur: (p.auteur ?? 'Compte rugby').slice(0, 40),
    pseudo,
    // ⚠️ L'IA ne choisit plus l'avatar : les comptes de personnes portent une
    // photo, les clubs leur écusson. Un emoji dans le fil se voit tout de suite.
    avatar: avatarPourCompte(p.auteur ?? 'Compte rugby', (p.type ?? 'fan') as never),
    certifie: !!p.certifie,
    texte: p.texte.trim().slice(0, 280),
    type: p.type,
    action: p.action,
    saison: j.saison,
    semaine: j.semaine ?? 1,
    date: libelleDate(sem),
    ...statsDePost(audienceDe(p.type), rng),
  };
}

// --- LES COMMENTAIRES sous TES posts ---------------------------------------

export async function reponsesGroq(
  ctx: ContexteSocial, texteDuPost: string, ton: string, combien = 4,
): Promise<PostSocial[]> {
  const j = ctx.joueur;
  const messages: MessageGroq[] = [
    { role: 'system', content: `${REGLES}

Format EXACT : {"reponses":[{"auteur":"…","pseudo":"…","avatar":"🏉","type":"fan|hater|journaliste|media|joueur|club","certifie":false,"hostile":true|false,"texte":"…"}]}` },
    { role: 'user', content: `${decor(j, ctx.suivis)}

${j.nom} vient de publier (ton employé : ${ton}) :
« ${texteDuPost} »

Écris ${combien} réponses de comptes DIFFÉRENTS et réalistes. Mélange les avis : au moins un
soutien et au moins une critique. Marque "hostile":true pour les réponses négatives.` },
  ];

  const brut = await appelGroqJSON(ctx.cle, ctx.modele ?? MODELE_DEFAUT, messages, {
    temperature: 1, maxTokens: 900,
  });
  return extraire<PostGenere & { hostile?: boolean }>(brut, 'reponses')
    .filter((r) => r && typeof r.texte === 'string' && r.texte.trim())
    .slice(0, combien)
    .map((r) => ({ ...normaliser(r, j), hostile: !!r.hostile }));
}

// --- LES COMPTES À SUIVRE --------------------------------------------------

export async function comptesGroq(
  ctx: ContexteSocial, combien = 6,
): Promise<CompteSuivi[]> {
  const j = ctx.joueur;
  const messages: MessageGroq[] = [
    { role: 'system', content: `${REGLES}

Format EXACT : {"comptes":[{"nom":"…","pseudo":"…","avatar":"🏉","type":"joueur|club|journaliste|media|fan|selection","club":"nom du club ou vide","bio":"une phrase","certifie":true|false,"abonnes":12000}]}` },
    { role: 'user', content: `${decor(j, ctx.suivis)}

Propose ${combien} comptes à suivre, crédibles et VARIÉS : des coéquipiers cités plus haut,
des joueurs de clubs rivaux, le compte officiel d'un club du championnat, un journaliste
spécialisé, un média, un compte de supporters. Pas de doublon avec les comptes déjà suivis.` },
  ];

  const brut = await appelGroqJSON(ctx.cle, ctx.modele ?? MODELE_DEFAUT, messages, {
    temperature: 0.9, maxTokens: 900,
  });
  return extraire<CompteSuivi>(brut, 'comptes')
    .filter((c) => c && c.nom && c.pseudo)
    .slice(0, combien)
    .map((c) => ({
      ...c,
      pseudo: String(c.pseudo).replace(/[^A-Za-z0-9_]/g, '').slice(0, 20),
      avatar: avatarPourCompte(String(c.nom), (c.type ?? 'fan') as never, c.club),
      abonnes: Number.isFinite(c.abonnes) ? Math.max(0, Math.round(c.abonnes)) : 5000,
    }));
}

// --- LES MESSAGES PRIVÉS ---------------------------------------------------
// Groq répond à la place du compte, en gardant son caractère et l'historique.

export async function messageGroq(
  ctx: ContexteSocial, compte: CompteSuivi, historique: MessageDM[], envoye: string,
  relation = 0,
): Promise<string> {
  // La RELATION décide du ton : un ami blague, un ennemi juré mord.
  const etat = relation >= 50 ? 'Vous êtes proches, tu le tutoies avec affection et tu le défends.'
    : relation >= 15 ? 'Vous vous entendez bien, ton ton est cordial.'
      : relation > -15 ? 'Vous vous connaissez peu, ton ton est neutre voire méfiant.'
        : relation > -50 ? 'Il y a du froid entre vous : tu es sec, distant, un peu méprisant.'
          : 'Vous êtes en conflit ouvert : tu es cinglant, tu ne lâches rien, tu réponds coup pour coup.';
  const j = ctx.joueur;
  const fil = historique
    .slice(-8)
    .map((m) => `${m.de === 'moi' ? j.nom : compte.nom} : ${m.texte}`)
    .join('\n');
  const messages: MessageGroq[] = [
    { role: 'system', content: `${REGLES}

Tu incarnes UN SEUL compte et tu réponds en message privé, à la première personne, sans
guillemets, en 1 à 3 phrases. Tu restes dans ton rôle : un joueur parle boulot et vestiaire,
un club reste institutionnel, un journaliste cherche une info, un supporter est direct.
Tu peux refuser, plaisanter, relancer, t'énerver, couper court.
Si on t'insulte, tu RÉPONDS — sèchement, avec mépris ou une menace sportive.
Format EXACT : {"reponse":"…"}` },
    { role: 'user', content: `${decor(j, ctx.suivis)}

Tu es ${compte.nom} (@${compte.pseudo}), ${compte.type}${compte.club ? ` de ${compte.club}` : ''}.
VOTRE RELATION : ${etat} (indice ${Math.round(relation)}/100)
${compte.bio ?? ''}

Conversation jusqu'ici :
${fil || '(aucun message)'}

${j.nom} vient de t'écrire : « ${envoye} »
Réponds.` },
  ];

  const brut = await appelGroqJSON(ctx.cle, ctx.modele ?? MODELE_DEFAUT, messages, {
    temperature: 0.95, maxTokens: 400,
  });
  try {
    const data = JSON.parse(brut);
    const rep = typeof data?.reponse === 'string' ? data.reponse.trim() : '';
    return rep.slice(0, 400);
  } catch {
    return '';
  }
}
