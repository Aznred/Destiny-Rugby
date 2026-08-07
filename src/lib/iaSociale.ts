// L'OVALE PILOTÉ PAR L'IA LOCALE (lot 7, suite)
//
// Tout ce qui vit sur le réseau social peut être écrit par le modèle local : les posts des
// clubs et des joueurs, les pseudos, les commentaires sous tes publications,
// les messages privés qu'on t'envoie et les réponses qu'on te fait.
//
// ⚠️ RÈGLE DU PROJET : le jeu reste jouable sans WebGPU. Chaque fonction ici a
// son pendant pré-écrit dans `lib/social.ts` — l'appelant retombe dessus si le
// modèle n'est pas activé ou si le chargement échoue.
//
// ⚠️ LES ANNONCES ONT DES CONSÉQUENCES : quand un post annonce un transfert,
// le store l'applique pour de vrai (`appliquerAnnonce`). L'IA ne décide donc
// pas que du texte — d'où les garde-fous : elle ne peut déplacer QUE des
// joueurs non-humains, entre clubs existants, et jamais le joueur lui-même
// (pour lui, ça passe par une offre de contrat, qui reste refusable).

import type { CompteSuivi, Joueur, MessageDM, PostSocial } from '../types';
import { appelIAJSON, type MessageIA } from './iaLocale';
import { POSTE_PAR_ID } from '../data/rugby';
import { nomNation } from './nations';
import { competitionDuClub } from '../data/clubs';
import { effectifDuClub } from './effectif';
import { libelleDate, semaine } from '../data/calendrier';
import { imagePourRequete } from './images';
import { audienceDe, statsDePost } from './social';
import { graine } from './championnat';
import { avatarPourCompte } from './avatars';
import { consigneDeLangue } from './i18n';

export interface ContexteSocial {
  joueur: Joueur;
  modele?: string;
  suivis: CompteSuivi[];
}

// ---------------------------------------------------------------------------
// ⚠️ ÉCONOMIE DE TOKENS (demande explicite)
// ---------------------------------------------------------------------------
// Le décor était envoyé À CHAQUE APPEL avec douze coéquipiers détaillés (poste,
// âge, note), dix clubs rivaux et la liste complète des comptes suivis — plus
// de 300 tokens d'entrée, répétés quatre fois par semaine de jeu, pour une
// information dont l'IA n'a besoin QUE lorsqu'elle écrit le fil du monde.
// Deux décors désormais : le complet pour `filIA`, et un décor court (une
// ligne) pour tout le reste. Mesuré : ~70 % d'entrée en moins sur les
// commentaires et les messages privés.
function decorCourt(j: Joueur): string {
  const division = competitionDuClub(j.club);
  const sem = semaine(j.semaine ?? 1);
  return `${j.nom} (@${j.pseudo}), ${POSTE_PAR_ID[j.poste].nom} de ${j.club}, `
    + `${j.age} ans, ${nomNation(j.nation)}. ${division?.nom ?? 'championnat inconnu'}, `
    + `saison ${j.saison}, ${libelleDate(sem)}. Réputation ${j.reputation}/100.`;
}

// Le décor complet : réservé à l'écriture du fil, qui a besoin de noms propres
// pour ne rien inventer.
function decor(j: Joueur, suivis: CompteSuivi[]): string {
  const division = competitionDuClub(j.club);
  const sem = semaine(j.semaine ?? 1);
  const groupe = effectifDuClub(j.club, j.saison)
    .slice(0, 8)
    .map((c) => c.nom)
    .join(', ');
  const rivaux = (division?.clubs ?? [])
    .filter((c) => c.nom !== j.club)
    .slice(0, 6)
    .map((c) => c.nom)
    .join(', ');
  return [
    decorCourt(j),
    `Semaine : ${sem.libelle}.`,
    `Coéquipiers : ${groupe || 'inconnus'}.`,
    `Clubs rivaux : ${rivaux || 'inconnus'}.`,
    suivis.length
      ? `Comptes suivis : ${suivis.slice(0, 8).map((s) => `@${s.pseudo}`).join(', ')}.`
      : '',
  ].filter(Boolean).join('\n');
}

// ⚠️ Les règles disaient trois fois la même chose en quinze lignes. Elles sont
// resserrées sans rien perdre de ce qui compte : le ton débridé voulu par le
// projet, et la seule limite non négociable.
const REGLES = `Tu écris « L'Ovale », un réseau social de rugby calqué sur X, en FRANÇAIS.
Ton : celui des vrais comptes rugby — phrases courtes, emojis mesurés, fautes de frappe chez les supporters.
DÉBRIDÉ : un supporter en colère insulte franchement, un hater est méchant et personnel, un joueur
chambré répond du tac au tac. Si le joueur humain agresse quelqu'un, ON LUI RÉPOND sèchement.
Punchlines, rumeurs et règlements de comptes publics sont permis.
SEULE LIMITE : rien de discriminatoire (racisme, sexisme, homophobie, religion, handicap),
aucune menace de violence réelle, rien de sexuel.
Clubs et championnats restent institutionnels. Les journalistes sourcent.
N'invente aucun club absent du contexte. 180 caractères maximum par publication : sur un
réseau social, un pavé ne ressemble à rien.
Réponds UNIQUEMENT en JSON valide.`;

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
export async function filIA(
  ctx: ContexteSocial, sujets: string[], combien = 6,
): Promise<PostSocial[]> {
  const j = ctx.joueur;
  const messages: MessageIA[] = [
    { role: 'system', content: `${REGLES}${consigneDeLangue()}

Format EXACT :
{"posts":[{"auteur":"…","pseudo":"sans @ ni espace","type":"joueur|club|journaliste|media|fan|hater",
"certifie":true|false,"texte":"…","image":"facultatif, RARE","reponses":[{"auteur":"…","pseudo":"…","type":"fan|hater|joueur|journaliste","hostile":true|false,"texte":"…"}],
"action":{"type":"transfert","joueur":"nom","de":"club","vers":"club","poste":"Ailier","age":24,"note":72}}]}

- "reponses" : 2 commentaires de comptes DIFFÉRENTS sous les DEUX publications les plus marquantes
  seulement (les autres n'en ont pas). Mélange soutien et critique, "hostile":true pour les négatifs.
- "image" : mots-clés en anglais, UNE publication sur cinq au maximum, et jamais sous un supporter
  qui râle. Sans image, omets le champ.
- "action" : au maximum UNE par salve. "transfert" déplace VRAIMENT un joueur NON-HUMAIN entre deux
  clubs du contexte — reste crédible. N'annonce JAMAIS de transfert de ${j.nom}.` },
    { role: 'user', content: `${decor(j, ctx.suivis)}

Actualité : ${sujets.slice(0, 4).join(' · ') || 'vie ordinaire du club'}.

Écris ${combien} publications variées et indépendantes : annonce de club, mercato, conférence de
presse, polémique, réaction de supporters, post d'un coéquipier ou d'un adversaire. Elles ne
parlent pas toutes du joueur humain.` },
  ];

  // ⚠️ UN SEUL APPEL PAR SEMAINE. Il y en avait TROIS : le fil, puis un
  // `reponsesIA` pour chacune des deux publications les plus lues. Les
  // commentaires sont désormais demandés DANS la même réponse — même contenu,
  // un tiers du coût, et une seule latence.
  const brut = await appelIAJSON(messages, {
    temperature: 0.85, maxTokens: 640,
  });
  const posts = extraire<PostGenere>(brut, 'posts')
    .filter((p) => p && typeof p.texte === 'string' && p.texte.trim())
    .slice(0, combien)
    .map((p) => normaliser(p, j));

  // Les commentaires écrits dans la même salve, remis en forme comme des posts.
  const avecReponses = extraire<PostGenere & { reponses?: (PostGenere & { hostile?: boolean })[] }>(brut, 'posts');
  posts.forEach((post, i) => {
    const reps = avecReponses[i]?.reponses;
    if (!Array.isArray(reps) || !reps.length) return;
    post.reponses = reps
      .filter((r) => r && typeof r.texte === 'string' && r.texte.trim())
      .slice(0, 3)
      .map((r) => ({ ...normaliser(r, j), hostile: !!r.hostile }));
  });

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

export async function reponsesIA(
  ctx: ContexteSocial, texteDuPost: string, ton: string, combien = 4,
): Promise<PostSocial[]> {
  const j = ctx.joueur;
  const messages: MessageIA[] = [
    { role: 'system', content: `${REGLES}${consigneDeLangue()}

Format EXACT : {"reponses":[{"auteur":"…","pseudo":"…","type":"fan|hater|journaliste|media|joueur|club","certifie":false,"hostile":true|false,"texte":"…"}]}` },
    // ⚠️ Décor COURT : pour commenter un tweet, l'IA n'a pas besoin de la liste
    // des coéquipiers ni des clubs rivaux.
    { role: 'user', content: `${decorCourt(j)}

${j.nom} vient de publier (ton : ${ton}) :
« ${texteDuPost} »

Écris ${combien} réponses de comptes DIFFÉRENTS. Mélange soutien et critique.
"hostile":true pour les réponses négatives.` },
  ];

  const brut = await appelIAJSON(messages, {
    temperature: 0.85, maxTokens: 320,
  });
  return extraire<PostGenere & { hostile?: boolean }>(brut, 'reponses')
    .filter((r) => r && typeof r.texte === 'string' && r.texte.trim())
    .slice(0, combien)
    .map((r) => ({ ...normaliser(r, j), hostile: !!r.hostile }));
}

// --- LES COMPTES À SUIVRE --------------------------------------------------
//
// ⚠️ La génération de comptes a été supprimée. L'IA inventait des comptes — avec leur
// nombre d'abonnés, tiré de nulle part — qui n'existaient nulle part ailleurs
// dans le jeu : Explorer annonçait « 12 000 abonnés », le profil du même compte
// en affichait 400, et suivre ce compte ne menait à rien. L'annuaire
// (`lib/comptes.ts`) contient déjà 374 comptes réels et cohérents, gratuitement.
// Voir `suggestionsLocales` dans `lib/social.ts`.

// --- LES MESSAGES PRIVÉS ---------------------------------------------------
// Le modèle local répond à la place du compte, en gardant son caractère et l'historique.

export async function messageIA(
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
  // ⚠️ Quatre messages d'historique suffisent à tenir le fil d'une conversation
  // privée : au-delà, on repayait à chaque envoi des échanges que personne ne
  // relit. Chaque message est aussi tronqué — un pavé ne change pas la réponse.
  const fil = historique
    .slice(-4)
    .map((m) => `${m.de === 'moi' ? j.nom : compte.nom} : ${m.texte.slice(0, 180)}`)
    .join('\n');
  const messages: MessageIA[] = [
    { role: 'system', content: `${REGLES}${consigneDeLangue()}

Tu incarnes UN SEUL compte et tu réponds en message privé, à la première personne, sans
guillemets, en 1 à 2 phrases COURTES. Tu restes dans ton rôle. Tu peux refuser, plaisanter, relancer,
t'énerver, couper court. Si on t'insulte, tu RÉPONDS sèchement.
Format EXACT : {"reponse":"…"}` },
    // ⚠️ Décor COURT : répondre en privé ne demande ni l'effectif ni les rivaux.
    { role: 'user', content: `${decorCourt(j)}

Tu es ${compte.nom} (@${compte.pseudo}), ${compte.type}${compte.club ? ` de ${compte.club}` : ''}.
RELATION : ${etat}
${(compte.bio ?? '').slice(0, 120)}

${fil || '(aucun message)'}

${j.nom} vient de t'écrire : « ${envoye.slice(0, 300)} »
Réponds.` },
  ];

  const brut = await appelIAJSON(messages, {
    temperature: 0.85, maxTokens: 160,
  });
  try {
    const data = JSON.parse(brut);
    const rep = typeof data?.reponse === 'string' ? data.reponse.trim() : '';
    return rep.slice(0, 400);
  } catch {
    return '';
  }
}
