// L'OVALE — le réseau social du jeu (lot 7)
//
// Interface calquée sur X : rail de navigation, timeline, panneau latéral,
// fond noir, séparateurs fins, bouton bleu. C'est le SEUL écran qui sort du
// thème pelouse/cuir — parce qu'il joue un réseau social, pas un stade.
//
// TOUT est vivant et interactif :
//   • le fil suit le CALENDRIER : une fournée de publications par semaine
//     jouée (`vivreSemaineSociale`), datée, déterministe — aucun bouton à
//     cliquer, et plus de battement à la seconde qui rendait le fil illisible ;
//   • on COMMENTE et on REPOSTE : répondre sous un post fait riposter son
//     auteur et fait bouger la relation, exactement comme un message privé ;
//   • la RECHERCHE fouille les publications ET l'annuaire (tous les clubs, tous
//     les championnats, tous les joueurs des effectifs) ;
//   • chaque nom est cliquable : on ouvre le PROFIL du compte (bannière, bio,
//     abonnés, ses posts), on le suit, on lui écrit ;
//   • les clubs portent leur ÉCUSSON, les championnats leur LOGO ;
//   • ton propre profil se personnalise (nom affiché, @, bio, photo, bannière) ;
//   • ce que tu écris en message privé change ta RELATION avec le compte — et
//     les comptes sont débridés : insulte-les, ils répondent.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { nombre, t, tn } from '../lib/i18n';
import { motion } from 'framer-motion';
import { useGame, PLAFOND_OVAS_DEFIS_PAR_SAISON } from '../store/useGame';
import { clubParNom } from '../data/clubs';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { TONS } from '../data/social';
import { LEVIERS, nomLevier, phraseLevier, resumerTermes } from '../lib/negociation';
import { AGENT_PAR_ID, descriptionAgent, niveauPourAgent, nomAgent, SEUIL_AGENT } from '../data/agents';
import { cote } from '../lib/offres';
import { compact, estCertifie, LIMITE_CARACTERES, pseudoDe, tendances } from '../lib/social';
import { annuaire, chercherComptes, chercherPosts, banniereDe, BANNIERES } from '../lib/comptes';
import { humeur } from '../lib/vie';
import { SUCCES, descriptionSucces, nomSucces, texteDefi } from '../data/succes';
import { SUCCES_MANAGER, progressionSuccesManager } from '../data/succesManager';
import { TROPHEES } from '../data/trophees';
import { defisDeLaSemaine, cleSemaine, progression } from '../lib/succes';
import { chercherMedias, reduirePourAvatar, vignetteLocale, type Media as MediaTrouve } from '../lib/images';
import { semaine, libelleSemaine, horodatageJeu } from '../data/calendrier';
import { avatarInitiales, avatarPourCompte } from '../lib/avatars';
import { ecouterEtatIA, etatIA } from '../lib/groq';
import type { CompteSuivi, Joueur, PostSocial } from '../types';
import { nomPoste } from '../data/rugby';
import { coutPremiereSaison, joueurDejaRecrute, salairesEffectif, situationSalariale } from '../lib/recrutementManager';
import { valeurDeVente } from '../lib/vestiaireManager';
import { effectifDuClub } from '../lib/effectif';

// ⚠️ L'HEURE DU JEU, PAS CELLE DE L'ORDINATEUR (retour de jeu : « dans les
// messages, fais que la date et l'heure soient celles du calendrier in-game »).
// On affichait `creeLe`, l'horodatage réel : un message reçu pendant la
// 12ᵉ journée — novembre dans le jeu — s'affichait au jour où l'on jouait.
// `creeLe` reste écrit, mais il ne sert plus qu'à RANGER les conversations.
function dateEtHeure(element?: { id?: string; semaine?: number; saison?: number }): string | null {
  if (!element?.semaine) return null;
  return horodatageJeu(element.semaine, `${element.saison ?? 1}#${element.id ?? ''}`);
}

/**
 * L'heure d'un message DANS SON FIL.
 *
 * ⚠️ ON SÈME SUR LE FIL, PAS SUR LE MESSAGE, et c'est ce qui remet la
 * conversation dans l'ordre : vu à l'écran, une réponse de club datée 13:56
 * s'affichait sous la question posée à 14:55.
 */
function heureDuFil(
  fil: string, element: { semaine?: number; saison?: number }, rang: number,
): string | null {
  if (!element.semaine) return null;
  return horodatageJeu(element.semaine, `${element.saison ?? 1}#${fil}`, rang);
}

// --- Icônes (tracés maison, dans l'esprit de l'interface d'origine) --------
const Icone = ({ d, ...reste }: { d: string } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden width="18" height="18" {...reste}>
    <path d={d} />
  </svg>
);
const I_REPONSE = 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v9a2.5 2.5 0 0 1-2.5 2.5H12l-5 4v-4H5.5A2.5 2.5 0 0 1 3 14.5v-9Z';
const I_REPOST = 'M7 4 3.5 7.5h2.7v8A2.5 2.5 0 0 0 8.7 18H13l-2-2H8.7a.5.5 0 0 1-.5-.5v-8h2.8L7 4Zm10 16 3.5-3.5h-2.7v-8A2.5 2.5 0 0 0 15.3 6H11l2 2h2.3c.28 0 .5.22.5.5v8h-2.8L17 20Z';
const I_COEUR = 'M12 21s-7.5-4.6-9.4-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.4 12c-1.9 4.4-9.4 9-9.4 9Z';
const I_VUES = 'M3 20V10h3v10H3Zm7.5 0V4h3v16h-3ZM18 20v-7h3v7h-3Z';
const I_MESSAGE = 'M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.6-.5L12 11.2 19.4 5H4.6Z';
const I_ACCUEIL = 'M12 2 2 10.5h2.6V22h5.2v-6.4h4.4V22h5.2V10.5H22L12 2Z';
const I_CLOCHE = 'M12 2a6 6 0 0 0-6 6c0 4.5-1.5 6-2 7h16c-.5-1-2-2.5-2-7a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Z';
const I_TROPHEE = 'M6 3h12v2h3v3a4 4 0 0 1-4 4h-.4A6 6 0 0 1 13 15.8V19h3v2H8v-2h3v-3.2A6 6 0 0 1 7.4 12H7a4 4 0 0 1-4-4V5h3V3Zm0 4H5v1a2 2 0 0 0 1 1.7V7Zm12 0v2.7A2 2 0 0 0 19 8V7h-1Z';
const I_LOUPE = 'M10.5 3a7.5 7.5 0 1 0 4.6 13.4l4.2 4.3 1.5-1.5-4.3-4.2A7.5 7.5 0 0 0 10.5 3Zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z';
const I_PROFIL = 'M12 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 11c-4.4 0-8 2.4-8 5.3V21h16v-1.7c0-2.9-3.6-5.3-8-5.3Z';
// ⚠️ QUATRE TRACÉS DE PLUS, MÊME FAMILLE QUE LES SEPT AUTRES. L'Ovale dessine
// déjà ses icônes en chemins pleins (I_ACCUEIL, I_COEUR…) : ajouter ici plutôt
// que d'importer `components/Icone` garde une seule facture graphique pour
// tout l'écran — les icônes du réseau sont PLEINES, celles du jeu sont au
// TRAIT, et c'est précisément ce qui fait que L'Ovale ne ressemble pas au
// reste du jeu (« le seul écran qui sort du thème stade », voir CLAUDE.md).
const I_CROIX = 'm12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z';
const I_IMAGE = 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Zm2.4 12.9h13.2l-4.5-5.6-3 3.4-2.2-2.2-3.5 4.4ZM8.6 10a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z';
const I_STADE = 'M3 18.6v-6.4C3 8.6 7 6 12 6s9 2.6 9 6.2v6.4H3Zm3.6-2h1.8v-3.4H6.6v3.4Zm4.5 0h1.8v-4.6h-1.8v4.6Zm4.5 0h1.8v-3.4h-1.8v3.4Z';
const I_OK = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.6-4.2-4.2 1.6-1.6 2.6 2.6 5.4-5.8 1.7 1.6-7.1 7.4Z';
const I_BALLON = 'M4.9 19.1C2.8 17 3.6 11 7.4 7.2S17 2.9 19.1 4.9s1.3 8-2.5 11.8-9.6 4.5-11.7 2.4Zm3.9-3.5 6.8-6.8-1.4-1.4-6.8 6.8 1.4 1.4Z';

const EMOJIS_PROFIL = ['🏉', '💪', '🔥', '🐐', '⚡', '🦁', '🐓', '🌊', '🎯', '👑', '🥇', '😎'];

function LogoOvale() {
  return (
    <span className="x-logo" title="L’Ovale">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path d="M2.5 2h5.2l4.6 6.2L17.2 2H21l-6.8 8.6L21.6 22h-5.2l-5-6.7L5.6 22H2l7.2-9.1L2.5 2Z" />
      </svg>
      <b><Icone d={I_BALLON} /></b>
    </span>
  );
}

function Certifie() {
  return (
    <svg className="x-verifie" viewBox="0 0 24 24" width="16" height="16" aria-label={t('ov.certifie')}>
      <path d="M12 1.6 14.4 4l3.3-.4.9 3.2 3 1.4-1.4 3 1.4 3-3 1.4-.9 3.2-3.3-.4L12 22.4 9.6 20l-3.3.4-.9-3.2-3-1.4 1.4-3-1.4-3 3-1.4.9-3.2 3.3.4L12 1.6Zm-1.2 13.9 5.5-5.5-1.5-1.5-4 4-1.8-1.8-1.5 1.5 3.3 3.3Z" />
    </svg>
  );
}

// Une photo de profil qui ne casse jamais : si le portrait ne se charge pas,
// on retombe sur une pastille d'initiales générée en local.
function Photo({ src, nom }: { src: string; nom: string }) {
  const [url, setUrl] = useState(src);
  useEffect(() => setUrl(src), [src]);
  return (
    <img
      className="x-photo"
      src={url}
      alt=""
      /* ⚠️ PAS de loading="lazy" ici : sur des vignettes de 42 px empilées dans
         un conteneur défilant, le navigateur ne déclenchait jamais le
         chargement — le fil restait plein de cases vides. Le gain serait de
         toute façon nul à cette taille. */
      decoding="async"
      onError={() => setUrl(avatarInitiales(nom))}
    />
  );
}

// L'avatar comprend six écritures : 'moi' (le joueur, avec sa photo choisie),
// 'club:<nom>' (écusson officiel), 'compet:<id>' (logo de championnat),
// 'photo:<url>' (portrait d'une personne), 'initiales:<nom>' (monogramme d'une
// rédaction), et enfin un emoji brut pour les vieilles sauvegardes.
function Avatar({
  avatar, club, taille = 42, nom = '',
}: { avatar: string; club?: string; taille?: number; nom?: string }) {
  const joueur = useGame((s) => s.joueur);
  const style = { width: taille, height: taille };
  // Les conversations et les anciennes publications peuvent encore porter
  // l'ancien hébergeur. Leur affichage bénéficie aussi des portraits locaux.
  if (avatar?.startsWith('photo:') && (avatar.includes('randomuser.me/') || avatar.startsWith('photo:initiales:'))) {
    avatar = avatarPourCompte(nom, 'joueur');
  }

  if (avatar?.startsWith('photo:')) {
    return (
      <span className="x-avatar" style={style}>
        <Photo src={avatar.slice(6)} nom={nom || avatar} />
      </span>
    );
  }
  if (avatar?.startsWith('initiales:')) {
    return (
      <span className="x-avatar" style={style}>
        <img className="x-photo" src={avatarInitiales(avatar.slice(10))} alt="" />
      </span>
    );
  }

  if (avatar === 'moi') {
    const choix = joueur?.profilSocial?.avatar;
    const data = clubParNom(club ?? joueur?.club ?? '');
    return (
      <span className="x-avatar moi" style={style}>
        {choix?.startsWith('data:')
          ? <img className="x-photo" src={choix} alt="" />
          : choix && choix !== 'club'
            ? <span style={{ fontSize: taille * 0.55 }}>{choix}</span>
            : data ? <Blason club={data} taille={taille} /> : <span><Icone d={I_BALLON} /></span>}
      </span>
    );
  }
  if (avatar.startsWith('club:')) {
    const data = clubParNom(avatar.slice(5));
    return (
      <span className="x-avatar" style={style}>
        {data ? <Blason club={data} taille={taille} /> : <span><Icone d={I_STADE} /></span>}
      </span>
    );
  }
  if (avatar.startsWith('compet:')) {
    return (
      <span className="x-avatar" style={style}>
        <LogoCompet id={avatar.slice(7)} taille={taille - 4} />
      </span>
    );
  }
  return (
    <span className="x-avatar" style={style}>
      <span style={{ fontSize: taille * 0.5 }}>{avatar}</span>
    </span>
  );
}

// Retrouve un compte par son @ — dans l'annuaire, sinon reconstruit depuis les
// publications (comptes inventés par l'IA), sinon une fiche minimale. Un profil
// s'ouvre TOUJOURS.
/**
 * ⚠️ ELLE NE PREND PLUS UN `Joueur`, MAIS UN CONTEXTE SOCIAL. C'est ce qui
 * permet à l'entraîneur d'ouvrir les mêmes profils que le joueur : `annuaire`
 * n'a jamais eu besoin que du club, de la saison et de la division — le reste
 * de la fiche du joueur ne servait à rien ici, et exiger un `Joueur` entier
 * fermait la fonction au mode manager, qui n'en a pas.
 */
function compteDepuis(
  contexte: Pick<Joueur, 'club' | 'saison' | 'division'>,
  pseudo: string, posts: PostSocial[], fiches: CompteSuivi[] = [],
): CompteSuivi {
  const connu = annuaire(contexte).find((c) => c.pseudo === pseudo)
    // ⚠️ Puis les fiches DÉJÀ AFFICHÉES (comptes suivis, suggestions d'Explorer).
    // Sans elles, ouvrir un compte hors annuaire recalculait ses abonnés à
    // partir des vues d'un post : le chiffre du profil ne collait pas à celui
    // qu'on venait de lire dans la liste.
    ?? fiches.find((c) => c.pseudo === pseudo);
  if (connu) return connu;
  const tous = posts.flatMap((p) => [p, ...(p.reponses ?? [])]);
  const vu = tous.find((p) => p.pseudo === pseudo);
  return {
    pseudo,
    nom: vu?.auteur ?? `@${pseudo}`,
    avatar: vu?.avatar ?? '🏉',
    type: (vu?.type as CompteSuivi['type']) ?? 'fan',
    bio: vu ? t('ov.compteCroise') : t('ov.aucunePublicationCompte'),
    certifie: vu?.certifie,
    abonnes: Math.max(120, Math.round((vu?.vues ?? 2000) / 6)),
    banniere: banniereDe(pseudo),
  };
}

// Rend le texte d'un post avec ses MENTIONS et ses hashtags cliquables.
function TexteRiche({
  texte, onProfil, onRecherche,
}: {
  texte: string;
  onProfil: (pseudo: string) => void;
  onRecherche: (mot: string) => void;
}) {
  const morceaux = texte.split(/(@[A-Za-z0-9_]{2,32}|#[A-Za-zÀ-ÿ0-9_]{2,30})/g);
  return (
    <p className="x-texte">
      {morceaux.map((m, i) => {
        if (m.startsWith('@')) {
          return (
            <button key={i} className="x-mention" onClick={() => onProfil(m.slice(1))}>{m}</button>
          );
        }
        if (m.startsWith('#')) {
          return (
            <button key={i} className="x-mention" onClick={() => onRecherche(m.slice(1))}>{m}</button>
          );
        }
        return <span key={i}>{m}</span>;
      })}
    </p>
  );
}

// Une image de publication qui ne casse JAMAIS : si la source ne répond pas,
// on bascule sur une vignette peinte à la main, sans requête réseau.
function Media({ media, legende }: { media: NonNullable<PostSocial['media']>; legende: string }) {
  const [src, setSrc] = useState(media.url);
  return (
    <span className="x-media">
      <img
        src={src}
        alt={media.legende ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setSrc(vignetteLocale(media.legende || legende))}
      />
      {media.gif && <span className="x-tag-gif">GIF</span>}
    </span>
  );
}

// --- Un post ---------------------------------------------------------------
function Post({
  post, reponse, lectureSeule = false, onProfil, onRecherche,
}: {
  post: PostSocial;
  reponse?: boolean;
  lectureSeule?: boolean;
  onProfil: (pseudo: string) => void;
  onRecherche: (mot: string) => void;
}) {
  const aimerPost = useGame((s) => s.aimerPost);
  const reposter = useGame((s) => s.reposter);
  const repondre = useGame((s) => s.repondreAuPost);
  const joueur = useGame((s) => s.joueur);
  const [deploye, setDeploye] = useState(false);
  const [commentaire, setCommentaire] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const reponses = post.reponses ?? [];

  const envoyer = async () => {
    const t = (commentaire ?? '').trim();
    if (!t) return;
    setEnvoi(true);
    setCommentaire(null);
    setDeploye(true);
    try {
      await repondre(post.id, t);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <article className={`x-post${reponse ? ' reponse' : ''}`}>
        <button className="x-lien-profil" onClick={() => onProfil(post.pseudo)} title={t('ov.profilDe', { pseudo: post.pseudo })}>
          <Avatar avatar={post.avatar} club={post.moi ? joueur?.club : undefined} nom={post.auteur} />
        </button>
        <div className="x-corps">
          <header className="x-entete">
            <button className="x-nom-lien" onClick={() => onProfil(post.pseudo)}>{post.auteur}</button>
            {post.certifie && <Certifie />}
            <span className="x-pseudo">@{post.pseudo}</span>
            <span className="x-sep">·</span>
            <span className="x-date">{post.date}</span>
          </header>
          <TexteRiche texte={post.texte} onProfil={onProfil} onRecherche={onRecherche} />
          {post.media?.url && <Media media={post.media} legende={post.texte} />}
          {post.action?.type === 'transfert' && post.action.joueur && (
            <div className="x-annonce">
              <Icone d={I_REPOST} /> <b>{post.action.joueur}</b> : {post.action.de} → {post.action.vers}
              <span>{t('ov.transfertApplique')}</span>
            </div>
          )}
          <div className="x-actions">
            <button
              className={`x-action reponses${commentaire != null ? ' actif' : ''}`}
              disabled={lectureSeule}
              onClick={() => !lectureSeule && (reponse ? setDeploye((v) => !v) : setCommentaire((c) => (c == null ? '' : null)))}
              title={reponse ? t('ov.reponses') : t('car.repondre')}
            >
              <Icone d={I_REPONSE} />
              <span>{reponses.length || ''}</span>
            </button>
            <button
              className={`x-action reposts${post.repostee ? ' actif' : ''}`}
              disabled={lectureSeule}
              onClick={() => !lectureSeule && reposter(post.id)}
              title={post.repostee ? t('ov.annulerRepost') : t('ov.reposter')}
            >
              <Icone d={I_REPOST} />
              <span>{compact(post.reposts)}</span>
            </button>
            <button
              className={`x-action likes${post.aime ? ' actif' : ''}`}
              disabled={lectureSeule}
              onClick={() => !lectureSeule && aimerPost(post.id)}
              title={t('ov.jaime')}
            >
              <Icone d={I_COEUR} />
              <span>{compact(post.likes)}</span>
            </button>
            <button className="x-action vues" title={t('ov.vues')}>
              <Icone d={I_VUES} />
              <span>{compact(post.vues)}</span>
            </button>
            {reponses.length > 0 && !reponse && (
              <button className="x-voir-rep" onClick={() => setDeploye((v) => !v)}>
                {deploye ? t('ov.masquer') : t('ov.nombreReponses', { n: reponses.length })}
              </button>
            )}
          </div>

          {!lectureSeule && commentaire != null && (
            <div className="x-repondre">
              <Avatar avatar="moi" club={joueur?.club} taille={30} />
              <input
                autoFocus
                value={commentaire}
                maxLength={LIMITE_CARACTERES}
                placeholder={t('ov.repondreA', { pseudo: post.pseudo })}
                onChange={(e) => setCommentaire(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void envoyer(); }}
              />
              <button className="x-poster" disabled={!commentaire.trim() || envoi} onClick={() => void envoyer()}>
                {envoi ? '…' : t('car.repondre')}
              </button>
            </div>
          )}
        </div>
      </article>
      {deploye && reponses.map((r) => (
        <Post key={r.id} post={r} reponse lectureSeule={lectureSeule} onProfil={onProfil} onRecherche={onRecherche} />
      ))}
    </>
  );
}

// --- Rédaction (aucune suggestion : tu écris ce que tu veux) ---------------
function Composer() {
  const joueur = useGame((s) => s.joueur);
  const publier = useGame((s) => s.publier);
  const chargement = useGame((s) => s.chargementSocial);
  const tenorKey = useGame((s) => s.tenorKey);
  const [texte, setTexte] = useState('');
  const [ton, setTon] = useState('humble');
  const [media, setMedia] = useState<PostSocial['media'] | undefined>();
  const [galerie, setGalerie] = useState<MediaTrouve[] | null>(null);
  const [requete, setRequete] = useState('');
  const [chargeMedia, setChargeMedia] = useState(false);
  const zone = useRef<HTMLTextAreaElement>(null);
  if (!joueur) return null;

  const restant = LIMITE_CARACTERES - texte.length;
  const tonChoisi = TONS.find((t) => t.id === ton)!;

  // MENTIONS : dès qu'on tape « @… », on propose les comptes du monde.
  const mention = /(^|\s)@([A-Za-z0-9_]{1,20})$/.exec(texte);
  const propositions = mention ? chercherComptes(joueur, mention[2], 5) : [];
  const completer = (pseudo: string) => {
    setTexte((t) => t.replace(/@[A-Za-z0-9_]{1,32}$/, `@${pseudo} `));
    zone.current?.focus();
  };

  const lancerRecherche = async (q: string) => {
    setChargeMedia(true);
    try {
      setGalerie(await chercherMedias(q, tenorKey, 8));
    } catch {
      setGalerie([]);
    } finally {
      setChargeMedia(false);
    }
  };

  return (
    <div className="x-composer">
      <Avatar avatar="moi" club={joueur.club} />
      <div className="x-composer-corps">
        <textarea
          ref={zone}
          value={texte}
          maxLength={LIMITE_CARACTERES}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={t('ov.quoiDeNeuf')}
          rows={2}
        />

        {propositions.length > 0 && (
          <div className="x-mentions">
            {propositions.map((c) => (
              <button key={c.pseudo} onClick={() => completer(c.pseudo)}>
                <Avatar avatar={c.avatar} club={c.club} taille={26} nom={c.nom} />
                <b>{c.nom}</b>
                <span>@{c.pseudo}</span>
              </button>
            ))}
          </div>
        )}

        {media?.url && (
          <div className="x-media-choisi">
            <img src={media.url} alt="" />
            <button onClick={() => setMedia(undefined)} title={t('ov.retirer')}><Icone d={I_CROIX} /></button>
          </div>
        )}

        {galerie && (
          <div className="x-galerie">
            <div className="x-galerie-recherche">
              <input
                value={requete}
                placeholder={tenorKey ? t('ov.chercherGif') : t('ov.chercherImage')}
                onChange={(e) => setRequete(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void lancerRecherche(requete); }}
              />
              <button className="x-poster" onClick={() => void lancerRecherche(requete)} disabled={chargeMedia}>
                {chargeMedia ? '…' : t('ov.chercher')}
              </button>
              <button className="x-fermer-galerie" onClick={() => setGalerie(null)}><Icone d={I_CROIX} /></button>
            </div>
            <div className="x-galerie-grille">
              {galerie.length === 0 && !chargeMedia && <p className="x-vide">{t('ov.rienTrouve')}</p>}
              {galerie.map((m) => (
                <button
                  key={m.url}
                  onClick={() => { setMedia({ url: m.url, gif: m.gif, legende: m.legende }); setGalerie(null); }}
                >
                  <img src={m.url} alt={m.legende} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="x-tons">
          {TONS.map((tone) => (
            <button
              key={tone.id}
              className={`x-ton${ton === tone.id ? ' actif' : ''}`}
              onClick={() => setTon(tone.id)}
              title={t(`ov.tonDesc.${tone.id}`)}
            >
              {tone.emoji} {t(`ov.ton.${tone.id}`)}
            </button>
          ))}
        </div>
        <p className="x-ton-desc">
          {t(`ov.tonDesc.${tonChoisi.id}`)}
          {tonChoisi.risque > 0.2 && <b className="x-risque"> {t('ov.risqueTon')}</b>}
        </p>
        <div className="x-composer-pied">
          <button
            className="x-media-btn"
            title={tenorKey ? t('ov.ajouterMedia') : t('ov.ajouterImage')}
            onClick={() => { setGalerie([]); void lancerRecherche(requete || 'rugby'); }}
          >
            {tenorKey ? 'GIF' : <Icone d={I_IMAGE} />}
          </button>
          <span className={`x-compteur${restant < 40 ? ' bas' : ''}`}>{restant}</span>
          <button
            className="x-poster"
            disabled={!texte.trim() || chargement}
            onClick={() => { const t = texte; const m = media; setTexte(''); setMedia(undefined); void publier(t, ton, m); }}
          >
            {chargement ? t('ov.publicationEnCours') : t('ov.poster')}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Profil d'un compte ----------------------------------------------------
function Profil({
  compte, onFermer, onMessage, onProfil, onRecherche,
}: {
  compte: CompteSuivi;
  onFermer: () => void;
  onMessage: (pseudo: string) => void;
  onProfil: (pseudo: string) => void;
  onRecherche: (mot: string) => void;
}) {
  const posts = useGame((s) => s.posts ?? []);
  const suivis = useGame((s) => s.comptesSuivis);
  const suivre = useGame((s) => s.suivreCompte);
  const nePlusSuivre = useGame((s) => s.nePlusSuivre);
  const relations = useGame((s) => s.relationsSociales ?? {});
  const abonne = suivis.some((c) => c.pseudo === compte.pseudo);
  const relation = relations[compte.pseudo] ?? 0;
  const siens = posts.filter((p) => p.pseudo === compte.pseudo);

  const ETAT: Record<string, string> = {
    ami: t('ov.relationAmi'), cordial: t('ov.relationCordial'), neutre: t('ov.relationNeutre'),
    froid: t('ov.relationFroid'), ennemi: t('ov.relationEnnemi'),
  };

  return (
    <div className="x-profil">
      <div className="x-profil-tete">
        <button className="x-retour" onClick={onFermer}>←</button>
        <div>
          <b>{compte.nom}</b>
          <span>{siens.length} {t(siens.length > 1 ? 'ov.publication.pluriel' : 'ov.publication')}</span>
        </div>
      </div>
      <div className="x-banniere" style={{ background: compte.banniere ?? banniereDe(compte.pseudo) }} />
      <div className="x-profil-corps">
        <div className="x-profil-avatar">
          <Avatar avatar={compte.avatar} club={compte.club} taille={76} nom={compte.nom} />
        </div>
        <div className="x-profil-boutons">
          <button className="x-suivre secondaire" onClick={() => onMessage(compte.pseudo)}>{t('ov.message')}</button>
          <button
            className={abonne ? 'x-suivre abonne' : 'x-suivre'}
            onClick={() => (abonne ? nePlusSuivre(compte.pseudo) : suivre(compte))}
          >
            {abonne ? t('gen.abonne') : t('gen.suivre')}
          </button>
        </div>
        <h2>{compte.nom}{compte.certifie && <Certifie />}</h2>
        <span className="x-pseudo">@{compte.pseudo}</span>
        {compte.bio && <p className="x-bio">{compte.bio}</p>}
        <div className="x-profil-chiffres">
          <span><b>{compact(compte.abonnes)}</b> {t('gen.abonnes')}</span>
          {compte.club && <span><Icone d={I_STADE} /> {compte.club}</span>}
          <span className="x-relation" data-etat={humeur(relation)}>
            {ETAT[humeur(relation)]}
          </span>
        </div>
      </div>
      <div className="x-fil">
        {siens.length === 0 && <p className="x-vide">{t('ov.aucunePublicationCompte')}</p>}
        {siens.map((p) => <Post key={p.id} post={p} onProfil={onProfil} onRecherche={onRecherche} />)}
      </div>
    </div>
  );
}

// --- Mon profil (personnalisable) -----------------------------------------
function MonProfil({ onProfil, onRecherche }: { onProfil: (pseudo: string) => void; onRecherche: (mot: string) => void }) {
  const joueur = useGame((s) => s.joueur)!;
  const posts = useGame((s) => s.posts ?? []);
  const suivis = useGame((s) => s.comptesSuivis);
  const majProfil = useGame((s) => s.majProfilSocial);
  const p = joueur.profilSocial ?? {};
  // ⚠️ RIEN N'EST APPLIQUÉ AVANT « Enregistrer ». Le formulaire travaille sur un
  // BROUILLON local ; le profil affiché au-dessus reste celui qui est enregistré,
  // et le brouillon se voit dans un bloc « Aperçu » explicite. Sans cette
  // séparation, changer un emoji modifiait le profil en direct, sans validation.
  const enregistre = {
    nomAffiche: p.nomAffiche ?? joueur.nom,
    pseudo: joueur.pseudo ?? pseudoDe(joueur.nom),
    bio: p.bio ?? '',
    avatar: p.avatar ?? 'club',
    banniere: p.banniere ?? BANNIERES[0],
  };
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(enregistre);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const miens = posts.filter((x) => x.moi);
  const reposts = posts.filter((x) => x.repostee && !x.moi);
  const modifie = (JSON.stringify(brouillon) !== JSON.stringify(enregistre));
  const maj = (champ: Partial<typeof enregistre>) => setBrouillon((b) => ({ ...b, ...champ }));

  const ouvrirEdition = () => {
    setBrouillon(enregistre); // on repart TOUJOURS de ce qui est enregistré
    setErreurPhoto(null);
    setEdition(true);
  };

  return (
    <div className="x-profil">
      <div className="x-banniere" style={{ background: enregistre.banniere }} />
      <div className="x-profil-corps">
        <div className="x-profil-avatar"><Avatar avatar="moi" club={joueur.club} taille={76} /></div>
        <div className="x-profil-boutons">
          <button
            className="x-suivre secondaire"
            onClick={() => (edition ? setEdition(false) : ouvrirEdition())}
          >
            {edition ? t('ov.fermer') : t('ov.modifierProfil')}
          </button>
        </div>
        <h2>{enregistre.nomAffiche}{estCertifie(joueur) && <Certifie />}</h2>
        <span className="x-pseudo">@{enregistre.pseudo}</span>
        <p className="x-bio">{enregistre.bio || `${joueur.club} · saison ${joueur.saison}`}</p>
        <div className="x-profil-chiffres">
          <span><b>{compact(joueur.abonnes ?? 0)}</b> {t('gen.abonnes')}</span>
          <span><b>{suivis.length}</b> {t('ov.abonnements')}</span>
          <span><b>{miens.length}</b> {t('ov.publications')}</span>
          <span><b>{reposts.length}</b> {t('ov.reposts')}</span>
        </div>
      </div>

      {edition && (
        <div className="x-edition">
          {/* L'aperçu montre le brouillon — le profil du dessus, lui, ne bouge
              pas tant qu'on n'a pas cliqué « Enregistrer ». */}
          <div className="x-apercu" style={{ background: brouillon.banniere }}>
            <span className="x-apercu-tag">{t('ov.apercuNonEnregistre')}</span>
            <div className="x-apercu-carte">
              <span className="x-avatar" style={{ width: 46, height: 46 }}>
                {brouillon.avatar.startsWith('data:')
                  ? <img className="x-photo" src={brouillon.avatar} alt="" />
                  : brouillon.avatar === 'club'
                    ? (clubParNom(joueur.club) ? <Blason club={clubParNom(joueur.club)!} taille={46} /> : <span><Icone d={I_BALLON} /></span>)
                    : <span style={{ fontSize: 26 }}>{brouillon.avatar}</span>}
              </span>
              <div>
                <b>{brouillon.nomAffiche || '-'}</b>
                <i>@{brouillon.pseudo || '-'}</i>
                <p>{brouillon.bio || t('ov.aucuneBio')}</p>
              </div>
            </div>
          </div>
          <label>
            {t('ov.nomAffiche')}
            <input value={brouillon.nomAffiche} maxLength={40} onChange={(e) => maj({ nomAffiche: e.target.value })} />
          </label>
          <label>
            {t('ov.identifiant')}
            <input value={brouillon.pseudo} maxLength={20} onChange={(e) => maj({ pseudo: e.target.value })} />
          </label>
          <label>
            {t('ov.bio')}
            <textarea value={brouillon.bio} maxLength={160} rows={2} onChange={(e) => maj({ bio: e.target.value })} />
          </label>
          <div className="x-choix">
            <span>{t('ov.photoProfil')}</span>
            {/* Un fichier du disque : redimensionné en 160×160 avant d'être
                rangé dans la sauvegarde (le localStorage plafonne à ~5 Mo). */}
            <label className="x-fichier">
              {t('ov.importerPhoto')}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setErreurPhoto(null);
                  try {
                    maj({ avatar: await reduirePourAvatar(f) });
                  } catch (err) {
                    setErreurPhoto((err as Error).message);
                  }
                }}
              />
            </label>
            {erreurPhoto && <span className="x-risque">{erreurPhoto}</span>}
            <div className="x-emojis">
              {brouillon.avatar.startsWith('data:') && (
                <button className="actif" title={t('ov.taPhoto')}>
                  <img src={brouillon.avatar} alt="" />
                </button>
              )}
              <button
                className={brouillon.avatar === 'club' ? 'actif' : ''}
                onClick={() => maj({ avatar: 'club' })}
                title={t('ov.ecussonClub')}
              >
                🛡️
              </button>
              {EMOJIS_PROFIL.map((e) => (
                <button key={e} className={brouillon.avatar === e ? 'actif' : ''} onClick={() => maj({ avatar: e })}>{e}</button>
              ))}
            </div>
          </div>
          <div className="x-choix">
            <span>{t('ov.banniere')}</span>
            <div className="x-bannieres">
              {BANNIERES.map((b) => (
                <button
                  key={b}
                  className={brouillon.banniere === b ? 'actif' : ''}
                  style={{ background: b }}
                  onClick={() => maj({ banniere: b })}
                />
              ))}
            </div>
          </div>
          <div className="x-edition-pied">
            <button className="x-suivre secondaire" onClick={() => { setBrouillon(enregistre); setEdition(false); }}>
              {t('ov.annuler')}
            </button>
            <button
              className="x-poster"
              disabled={!modifie}
              onClick={() => {
                majProfil({
                  nomAffiche: brouillon.nomAffiche, pseudo: brouillon.pseudo,
                  bio: brouillon.bio, avatar: brouillon.avatar, banniere: brouillon.banniere,
                });
                setEdition(false);
              }}
            >
              {modifie ? t('ov.enregistrer') : t('ov.aucuneModification')}
            </button>
          </div>
        </div>
      )}

      <div className="x-fil">
        {miens.length === 0 && reposts.length === 0 && <p className="x-vide">{t('ov.aucunePublicationMoi')}</p>}
        {miens.map((x) => <Post key={x.id} post={x} onProfil={onProfil} onRecherche={onRecherche} />)}
        {reposts.length > 0 && (
          <>
            <div className="x-bloc-tete"><h3>🔁 {t('ov.tesReposts')}</h3></div>
            {reposts.map((x) => <Post key={x.id} post={x} onProfil={onProfil} onRecherche={onRecherche} />)}
          </>
        )}
      </div>
    </div>
  );
}

// --- Succès & défis --------------------------------------------------------
function PanneauSucces() {
  const joueur = useGame((s) => s.joueur);
  const debloques = useGame((s) => s.succesDebloques ?? {});
  const defisFaits = useGame((s) => s.defis ?? { cle: '', faits: [] });
  const ovasDefis = useGame((s) => s.compteurs.ovasDefis ?? 0);
  if (!joueur) return null;

  const { faits, total } = progression(debloques);
  const sem = joueur.semaine ?? 1;
  const actifs = defisDeLaSemaine(joueur.saison, sem);
  const coches = defisFaits.cle === cleSemaine(joueur.saison, sem) ? defisFaits.faits : [];
  // ⚠️ LE PLAFOND DE SAISON EST AFFICHÉ, PAS SUBI. Les défis ne versent plus
  // que `PLAFOND_OVAS_DEFIS_PAR_SAISON` Ovas par saison (voir `useGame`) : sans
  // ce compteur, un défi annoncé « +2 🪙 » n'aurait rien rapporté sans un mot
  // d'explication. L'objectif, lui, reste à cocher.
  const restant = Math.max(0, PLAFOND_OVAS_DEFIS_PAR_SAISON - ovasDefis);

  return (
    <div className="x-succes">
      <div className="x-defis">
        <h3>🎯 {t('ov.defisHebdo')}</h3>
        <p className="x-note">{t('ov.defisAide')}</p>
        <p className="x-note">
          🪙 {ovasDefis} / {PLAFOND_OVAS_DEFIS_PAR_SAISON} {t('ov.defisPlafond')}
        </p>
        {actifs.map((d) => {
          const fait = coches.includes(d.id);
          const paye = Math.min(d.ovas, restant);
          return (
            <div key={d.id} className={`x-defi${fait ? ' fait' : ''}`}>
              <span className="x-defi-emoji">{d.emoji}</span>
              <span className="x-defi-texte">{texteDefi(d.id, d.texte)}</span>
              <span className="x-defi-gain">{fait ? '✅' : paye > 0 ? `+${paye} 🪙` : '-'}</span>
            </div>
          );
        })}
      </div>

      <div className="x-succes-tete">
        <h3>🏅 {t('ov.succes')}</h3>
        <span>{faits} / {total}</span>
      </div>
      <div className="x-barre"><i style={{ width: `${(faits / total) * 100}%` }} /></div>

      <div className="x-succes-grille">
        {SUCCES.map((s) => {
          const ok = debloques[s.id] != null;
          const cache = s.secret && !ok;
          return (
            <div key={s.id} className={`x-succes-carte${ok ? ' obtenu' : ''}`}>
              <span className="x-succes-emoji">{cache ? '❔' : s.emoji}</span>
              <div>
                <b>{cache ? t('ov.succesSecret') : nomSucces(s)}</b>
                <p>{cache ? t('ov.succesSecretAide') : descriptionSucces(s)}</p>
              </div>
              <span className="x-succes-gain">{ok ? `${t('gen.saison')} ${debloques[s.id]}` : `+${s.ovas} 🪙`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** La carrière d'entraîneur possède sa collection propre. Le palmarès affiche
 * les coupes réellement gagnées ; les succès en racontent les grandes étapes. */
function PanneauSuccesManager() {
  const manager = useGame((s) => s.manager);
  const debloques = useGame((s) => s.succesDebloques ?? {});
  if (!manager) return null;
  const { faits, total } = progressionSuccesManager(debloques);

  return (
    <div className="x-succes x-succes-manager">
      <div className="x-defis x-palmares-manager">
        <h3>Palmarès de {manager.nom}</h3>
        <p className="x-note">Les trophées viennent des finales réellement remportées par ton équipe.</p>
        {manager.palmares.length ? (
          <div className="x-palmares-liste">
            {manager.palmares.slice().reverse().map((titre, index) => (
              <article key={`${titre.trophee}-${titre.saison}-${index}`}>
                <span><Icone d={I_TROPHEE} /></span>
                <div>
                  <b>{TROPHEES[titre.trophee]?.nom ?? titre.nom}</b>
                  <small>{titre.club} · saison {titre.saison}</small>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="x-note">La première coupe remportée ouvrira l’armoire à trophées.</p>}
      </div>

      <div className="x-succes-tete">
        <h3>Succès d’entraîneur</h3>
        <span>{faits} / {total}</span>
      </div>
      <div className="x-barre"><i style={{ width: `${total ? (faits / total) * 100 : 0}%` }} /></div>
      <div className="x-succes-grille">
        {SUCCES_MANAGER.map((succes) => {
          const ok = debloques[succes.id] != null;
          const cache = succes.secret && !ok;
          return (
            <div key={succes.id} className={`x-succes-carte${ok ? ' obtenu' : ''}`}>
              <span className="x-succes-emoji">{cache ? '❔' : succes.emoji}</span>
              <div>
                <b>{cache ? t('ov.succesSecret') : succes.nom}</b>
                <p>{cache ? t('ov.succesSecretAide') : succes.desc}</p>
              </div>
              <span className="x-succes-gain">
                {ok ? `${t('gen.saison')} ${debloques[succes.id]}` : `+${succes.ovas}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Négociation d'un contrat, DANS la conversation -------------------------
// ⚠️ CE BLOC EST LE MARCHÉ DES TRANSFERTS. Il a remplacé le panneau « Choix de
// carrière », qui présentait des cartes à prendre ou à laisser sans un mot
// échangé. Ici, un club écrit, on répond, il tranche — et son PLAFOND reste
// caché : c'est ce qui rend la discussion intéressante. On voit seulement sa
// patience s'user.
function Negociation({ pseudo }: { pseudo: string }) {
  const approche = useGame((s) => s.approches.find((a) => a.pseudo === pseudo && a.etat === 'ouverte'));
  const accord = useGame((s) => s.approches.find((a) => a.pseudo === pseudo && a.etat === 'accord'));
  const repondre = useGame((s) => s.repondreApproche);
  const accepter = useGame((s) => s.accepterApproche);
  const refuser = useGame((s) => s.refuserApproche);
  const [confirme, setConfirme] = useState(false);

  if (accord) {
    return (
      <div className="x-nego x-nego-accord">
        <b>{t('ov.accordTrouve')}</b> : {resumerTermes(accord.offre)}.
        <span>{t('ov.accordIntersaison')}</span>
      </div>
    );
  }
  if (!approche) return null;

  return (
    <div className="x-nego">
      <div className="x-nego-tete">
        <b>{approche.prolongation ? t('ov.prolongation') : t('ov.propositionContrat')}</b>
        {/* La patience se voit : c'est le seul indice sur ce qu'il reste à jouer. */}
        <span className="x-nego-patience" title={t('ov.patienceAide')}>
          {'●'.repeat(Math.max(0, approche.patience))}
          {'○'.repeat(Math.max(0, 4 - approche.patience))}
        </span>
      </div>
      <p className="x-nego-offre">{resumerTermes(approche.offre)}</p>
      <div className="x-nego-leviers">
        {LEVIERS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => repondre(approche.id, l.id)}
            title={tn('ov.coutPatience', l.cout, { phrase: phraseLevier(l.id) })}
            disabled={l.id === 'garantie' && approche.offre.garantie}
          >
            {l.emoji} {nomLevier(l.id)}
          </button>
        ))}
      </div>
      <div className="x-nego-fin">
        <button className="x-nego-oui" onClick={() => accepter(approche.id)}>
          {t('ov.accepterOffre')}
        </button>
        {confirme ? (
          <button className="x-nego-non" onClick={() => refuser(approche.id)}>
            {t('ov.confirmerRefus')}
          </button>
        ) : (
          <button className="x-nego-non" onClick={() => setConfirme(true)}>{t('ov.decliner')}</button>
        )}
      </div>
    </div>
  );
}

// --- Signer avec un agent, depuis sa conversation ---------------------------
// ⚠️ Décision de l'utilisateur : « les agents te démarchent, ET tu peux aussi
// démarcher ». Les deux sens passent par le même endroit — la conversation avec
// l'agent. Il refuse simplement si on n'est pas à son niveau, et ça coûte du
// moral : c'est ce qui remplace la liste où l'on cochait un nom gratuitement.
function CabinetAgent({ pseudo }: { pseudo: string }) {
  const joueur = useGame((s) => s.joueur);
  const choisir = useGame((s) => s.choisirAgent);
  if (!joueur || !pseudo.startsWith('agent:')) return null;
  const agent = AGENT_PAR_ID[pseudo.slice('agent:'.length)];
  if (!agent) return null;

  const sien = joueur.agent === agent.id;
  const niveau = niveauPourAgent(cote(joueur), joueur.reputation);
  const seuil = SEUIL_AGENT[agent.id] ?? 99;

  return (
    <div className="x-nego">
      <div className="x-nego-tete">
        <b>{agent.emoji} {nomAgent(agent)}</b>
        <span className="x-nego-patience">
          {t('ov.niveauAgent', { niveau: Math.round(niveau), seuil: Math.round(seuil) })}
        </span>
      </div>
      <p className="x-nego-offre">
        {descriptionAgent(agent)} {t('ov.commissionAgent', { n: Math.round(agent.commission * 100) })}
      </p>
      <div className="x-nego-fin">
        {sien ? (
          <button className="x-nego-non" onClick={() => choisir('')}>
            {t('ov.rompreMandat')}
          </button>
        ) : (
          <button className="x-nego-oui" onClick={() => choisir(agent.id)}>
            {t('ov.confierInterets')}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Messagerie ------------------------------------------------------------
function Messages({ ouvrirSur, onProfil }: { ouvrirSur: string | null; onProfil: (p: string) => void }) {
  const joueur = useGame((s) => s.joueur)!;
  const suivis = useGame((s) => s.comptesSuivis);
  const conversations = useGame((s) => s.conversations ?? {});
  const relations = useGame((s) => s.relationsSociales ?? {});
  const envoyer = useGame((s) => s.envoyerMessage);
  const lireConversation = useGame((s) => s.lireConversation);
  const approches = useGame((s) => s.approches ?? []);
  const dossiersRecrutement = useGame((s) => s.dossiersRecrutement ?? {});
  const chargement = useGame((s) => s.chargementSocial);

  // Les interlocuteurs : comptes suivis + toute conversation déjà ouverte.
  const tous = useMemo(() => {
    const monde = annuaire(joueur);
    const pseudos = new Set([
      ...suivis.map((c) => c.pseudo),
      ...Object.keys(conversations),
      ...Object.keys(dossiersRecrutement),
      // Une négociation reste visible même si une ancienne sauvegarde a perdu
      // son premier message. Le store réparera le fil à l'ouverture ; cette
      // ligne empêche déjà l'interlocuteur de disparaître de la liste.
      ...approches
        .filter((a) => a.etat === 'ouverte' || a.etat === 'accord')
        .map((a) => a.pseudo),
    ]);
    if (ouvrirSur) pseudos.add(ouvrirSur);
    return [...pseudos].map((p) => {
      const connu = suivis.find((c) => c.pseudo === p) ?? monde.find((c) => c.pseudo === p);
      if (connu) return connu;
      const approche = approches.find((a) => a.pseudo === p);
      if (approche) {
        return { pseudo: p, nom: approche.club, avatar: `club:${approche.club}`, type: 'club', club: approche.club } as CompteSuivi;
      }
      const dossier = dossiersRecrutement[p];
      if (dossier) {
        return { pseudo: p, nom: dossier.club, avatar: `club:${dossier.club}`, type: 'club', club: dossier.club } as CompteSuivi;
      }
      if (p.startsWith('club:')) {
        const club = p.slice('club:'.length);
        return { pseudo: p, nom: club, avatar: `club:${club}`, type: 'club', club } as CompteSuivi;
      }
      // ⚠️ UNE CONVERSATION NE DISPARAÎT JAMAIS FAUTE DE FICHE. C'était le bug :
      // un interlocuteur absent de l'annuaire était silencieusement `undefined`,
      // puis retiré par `.filter(Boolean)` — le message existait, la
      // conversation non. Un club qui te propose un contrat ou un agent qui te
      // démarche écrivaient donc dans le vide. Même principe que `compteDepuis`
      // pour les profils : on fabrique une fiche minimale plutôt que rien.
      const nom = p.startsWith('agent:')
        ? (() => {
            const agent = AGENT_PAR_ID[p.slice('agent:'.length)];
            return agent ? nomAgent(agent) : p;
          })()
        : p.replace(/_officiel$/, '').replace(/_/g, ' ');
      return { pseudo: p, nom, avatar: '💼', type: 'media' } as CompteSuivi;
    }).sort((a, b) => {
      const date = (p: string) => conversations[p]?.at(-1)?.creeLe ?? 0;
      return date(b.pseudo) - date(a.pseudo);
    });
  }, [suivis, conversations, ouvrirSur, joueur, approches, dossiersRecrutement]);

  const [actif, setActif] = useState<string | null>(ouvrirSur ?? tous[0]?.pseudo ?? null);
  const [texte, setTexte] = useState('');
  const bas = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ouvrirSur) setActif(ouvrirSur); }, [ouvrirSur]);
  const fil = actif ? conversations[actif] ?? [] : [];
  useEffect(() => { bas.current?.scrollIntoView({ block: 'end' }); }, [fil.length]);
  useEffect(() => { if (actif) lireConversation(actif); }, [actif, lireConversation]);

  if (!tous.length) {
    return <p className="x-vide">{t('ov.comptesASuivre')}</p>;
  }
  const compte = tous.find((c) => c.pseudo === actif);
  const dossierActif = actif ? dossiersRecrutement[actif] : undefined;

  return (
    <div className="x-messagerie">
      <div className="x-conversations">
        {tous.map((c) => {
          const filConversation = conversations[c.pseudo] ?? [];
          const nonLu = filConversation.some((m) => m.de === 'lui' && !m.lu);
          const dernierMessage = filConversation.at(-1);
          const horodatage = dateEtHeure(dernierMessage);
          return (
          <button
            key={c.pseudo}
            className={`x-conv${actif === c.pseudo ? ' actif' : ''}${nonLu ? ' non-lu' : ''}`}
            onClick={() => setActif(c.pseudo)}
          >
            <Avatar avatar={c.avatar} club={c.club} taille={36} nom={c.nom} />
            <span>
              <b>{c.nom}</b>
              <i>@{c.pseudo}{horodatage && ` · ${horodatage}`}</i>
            </span>
          </button>
          );
        })}
      </div>

      <div className="x-fil-messages">
        {compte && (
          <div className="x-conv-tete">
            <button className="x-lien-profil" onClick={() => onProfil(compte.pseudo)}>
              <Avatar avatar={compte.avatar} club={compte.club} taille={36} nom={compte.nom} />
            </button>
            <div>
              <b>{compte.nom}{compte.certifie && <Certifie />}</b>
              <span className="x-pseudo">@{compte.pseudo}</span>
            </div>
            <span className="x-relation" data-etat={humeur(relations[compte.pseudo] ?? 0)}>
              {humeur(relations[compte.pseudo] ?? 0)}
            </span>
          </div>
        )}
        {dossierActif && (
          <div className="x-suivi-recrutement" role="status">
            <b>{t('recrut.suivi.titre', { club: dossierActif.club })}</b>
            <span>{t('recrut.suivi.examen')}</span>
          </div>
        )}
        <div className="x-bulles">
          {fil.length === 0 && <p className="x-vide">{t('ov.premierMessage')}</p>}
          {fil.map((m, rang) => {
            const heure = actif ? heureDuFil(actif, m, rang) : null;
            return (
              <div key={m.id} className={`x-bulle ${m.de === 'moi' ? 'moi' : 'lui'}`}>
                <span>{m.texte}</span>
                {heure && <time>{heure}</time>}
              </div>
            );
          })}
          {chargement && <div className="x-bulle lui ecrit">{t('ov.ecrit')}</div>}
          <div ref={bas} />
        </div>

        {/* ═══ LA NÉGOCIATION DE CONTRAT ═══════════════════════════════════
            ⚠️ Demande explicite : « refaire tout le système de transfert, que
            ça se passe par X ». Quand l'interlocuteur est un club qui t'a
            approché, la conversation porte les LEVIERS. Ce sont eux qui
            décident — l'IA n'écrit que l'habillage (`lib/negociation.ts`), donc
            tout fonctionne à l'identique quand l'IA locale est désactivée. */}
        {actif && <Negociation pseudo={actif} />}
        {actif && <CabinetAgent pseudo={actif} />}

        <div className="x-envoi">
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && texte.trim() && actif) {
                const t = texte; setTexte(''); void envoyer(actif, t);
              }
            }}
            placeholder={t('ov.ecrireMessage')}
            maxLength={400}
          />
          <button
            className="x-poster"
            disabled={!texte.trim() || !actif || chargement}
            onClick={() => { const t = texte; setTexte(''); if (actif) void envoyer(actif, t); }}
          >
            {t('ov.envoyer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Bureau de recrutement du manager, dans L'Ovale ------------------------
function NegociationRecrueManager({ pseudo }: { pseudo: string }) {
  const manager = useGame((s) => s.manager)!;
  const negocier = useGame((s) => s.negocierJoueurManager);
  const accepterDemandes = useGame((s) => s.accepterDemandesJoueurManager);
  const signer = useGame((s) => s.signerJoueurManager);
  const rompre = useGame((s) => s.rompreNegociationManager);
  const nego = [...manager.negociations].reverse().find((n) => n.pseudo === pseudo);
  if (!nego) return null;

  const accordClub = manager.negociationsClubs.find(
    (n) => n.cible.id === nego.joueur.id && n.etat === 'accord',
  );
  const interne = nego.nature === 'prolongation' || nego.nature === 'revalorisation';
  const salaireActuel = interne ? salairesEffectif(manager.club, manager.saison, manager.recrues, manager.avancee?.contratsJoueurs)
    .find((j) => j.joueurId === nego.joueur.id || j.nom === nego.joueur.nom)?.salaire ?? 0 : 0;
  const cout = interne ? nego.offre.prime : coutPremiereSaison(nego, accordClub?.offre);
  const margeSalaire = situationSalariale(manager).disponible + salaireActuel;
  const budgetOk = manager.budgetTransferts >= cout && margeSalaire >= nego.offre.salaire;
  const role = t(`mgr.role.${nego.offre.role}`);

  return (
    <div className="x-nego x-nego-manager" data-etat={nego.etat}>
      <div className="x-nego-tete">
        <b>{interne ? nego.nature === 'revalorisation' ? 'Revalorisation' : 'Prolongation' : t('mgr.x.offreContrat')}</b>
        {nego.etat === 'ouverte' && (
          <span className="x-nego-patience" title={t('mgr.x.patience')}>
            {'●'.repeat(nego.patience)}{'○'.repeat(Math.max(0, 4 - nego.patience))}
          </span>
        )}
      </div>
      <div className="manager-x-termes">
        <span><small>{t('mgr.salaire')}</small><b>{nombre(nego.offre.salaire)} €</b></span>
        <span><small>{t('mgr.x.prime')}</small><b>{nombre(nego.offre.prime)} €</b></span>
        <span><small>{t('mgr.x.duree')}</small><b>{nego.offre.duree} {t('mgr.x.ans')}</b></span>
        <span><small>{t('mgr.x.role')}</small><b>{role}</b></span>
        <span><small>Primes performance</small><b>{nombre((nego.offre.primeTitularisation ?? 0) + (nego.offre.primeVictoire ?? 0) + (nego.offre.primeEssai ?? 0) + (nego.offre.primeTitre ?? 0))} €</b></span>
        <span><small>Option</small><b>{nego.offre.option ?? 'aucune'}{nego.offre.optionMatchs ? ` · ${nego.offre.optionMatchs} matchs` : ''}</b></span>
        <span><small>Clause</small><b>{nego.offre.clauseLiberation ? `${nombre(nego.offre.clauseLiberation)} €` : nego.offre.clauseRelegation ? 'départ si relégation' : 'aucune'}</b></span>
      </div>
      {!interne && <p className="x-nego-offre">
        {t('mgr.x.indemniteClub', {
          club: nego.joueur.club,
          montant: nombre(accordClub?.offre ?? nego.joueur.indemnite),
        })}
      </p>}
      <div className="nego-contexte-reel">
        <p><b>Priorités :</b> {(nego.motivations ?? []).map((m) => `${m.type} ${m.importance}`).join(' · ') || 'profil en cours'}</p>
        <p><b>Intérêt :</b> {nego.interet ?? 50}/100 · <b>Concurrence :</b> {nego.offresConcurrentes?.length ? nego.offresConcurrentes.map((o) => `${o.club} (${o.niveau})`).join(', ') : 'aucune offre connue'}</p>
        {nego.examenMedical && <p className={`examen-${nego.examenMedical.risque}`}><b>Visite médicale :</b> risque {nego.examenMedical.risque} · {nego.examenMedical.reserve}</p>}
      </div>

      {nego.etat === 'ouverte' && (
        <>
          <div className="x-nego-leviers">
            <button onClick={() => negocier(nego.id, 'salaire')}>{t('mgr.x.augmenterSalaire')}</button>
            <button onClick={() => negocier(nego.id, 'prime')}>{t('mgr.x.augmenterPrime')}</button>
            <button onClick={() => negocier(nego.id, 'duree')}>{t('mgr.x.allonger')}</button>
            <button onClick={() => negocier(nego.id, 'role')}>{t('mgr.x.meilleurRole')}</button>
            <button onClick={() => negocier(nego.id, 'bonus')}>Primes de performance</button>
            <button onClick={() => negocier(nego.id, 'option')}>Option contractuelle</button>
            <button onClick={() => negocier(nego.id, 'clause')}>Clauses et garanties</button>
          </div>
          <div className="x-nego-fin">
            <button className="x-nego-oui" onClick={() => accepterDemandes(nego.id)}>{t('mgr.x.accepterDemandes')}</button>
            <button className="x-nego-non" onClick={() => rompre(nego.id)}>{t('mgr.x.arreter')}</button>
          </div>
        </>
      )}
      {nego.etat === 'accord' && (
        <div className="manager-x-signature">
          <p className={budgetOk ? 'budget-ok' : 'budget-non'}>
            {budgetOk
              ? t('mgr.x.budgetValide', { cout: nombre(cout) })
              : t('mgr.x.budgetInsuffisant', { cout: nombre(cout) })}
          </p>
          <button className="x-nego-oui" disabled={!budgetOk} onClick={() => signer(nego.id)}>{t('mgr.x.signerJoueur')}</button>
          <button className="x-nego-non" onClick={() => rompre(nego.id)}>{t('mgr.x.arreter')}</button>
        </div>
      )}
      {nego.etat === 'signee' && <div className="x-nego-accord"><Icone d={I_OK} /> <b>{t('mgr.x.transfertFinalise')}</b></div>}
      {nego.etat === 'rompue' && <div className="x-nego-accord"><b>{t('mgr.x.discussionClose')}</b></div>}
    </div>
  );
}

function NegociationClubVendeur({ pseudo }: { pseudo: string }) {
  const manager = useGame((s) => s.manager)!;
  const negocier = useGame((s) => s.negocierClubManager);
  const contacterJoueur = useGame((s) => s.contacterJoueurManager);
  const nego = [...manager.negociationsClubs].reverse().find((n) => n.pseudo === pseudo);
  if (!nego) return null;
  const transfertFinalise = joueurDejaRecrute(manager, nego.cible.id);
  return (
    <div className="x-nego x-nego-manager" data-etat={nego.etat}>
      <div className="x-nego-tete"><b><Icone d={I_STADE} /> Accord entre clubs</b>{nego.etat === 'ouverte' && <span className="x-nego-patience">{'●'.repeat(nego.patience)}{'○'.repeat(Math.max(0, 4 - nego.patience))}</span>}</div>
      <div className="manager-x-termes manager-x-termes-club">
        <span><small>Demande</small><b>{nombre(nego.demande)} €</b></span>
        <span><small>Ton offre</small><b>{nombre(nego.offre)} €</b></span>
        <span><small>Bonus différés</small><b>{nombre(nego.bonus ?? 0)} €</b></span>
        <span><small>Part à la revente</small><b>{nego.pourcentageRevente ?? 0}%</b></span>
      </div>
      {nego.etat === 'ouverte' && <>
        <p className="x-nego-offre">Besoin vendeur : {nego.besoinVendeur ?? 'non communiqué'} · urgence {nego.urgence ?? 50}/100 · {nego.alternatives ?? 0} alternative(s). Le prix minimum reste caché.</p>
        <div className="x-nego-leviers">
          <button onClick={() => negocier(nego.id, 'monter')}>Monter l’offre</button>
          <button onClick={() => negocier(nego.id, 'bonus')}>Ajouter des bonus</button>
          <button onClick={() => negocier(nego.id, 'revente')}>10% à la revente</button>
          <button onClick={() => negocier(nego.id, 'accepter')}>Accepter {nombre(nego.demande)} €</button>
        </div>
      </>}
      {nego.etat === 'accord' && (transfertFinalise
        ? <div className="x-nego-accord"><Icone d={I_OK} /> <b>{t('mgr.x.transfertFinalise')}</b></div>
        : <div className="manager-x-signature"><p className="budget-ok">Accord à {nombre(nego.offre)} €. Tu peux maintenant parler au joueur.</p><button className="x-nego-oui" onClick={() => contacterJoueur(nego.cible)}>Écrire à {nego.cible.nom}</button></div>)}
      {nego.etat === 'rompue' && <div className="x-nego-accord"><b>Le club a quitté la table des négociations pour cette saison.</b></div>}
    </div>
  );
}

/**
 * L'APPROCHE REÇUE — un club vient chercher un joueur qu'on garde.
 *
 * ⚠️ LES QUATRE RÉPONSES NE SE VALENT PAS, et l'écran doit le dire avant le
 * clic. « Refuser » laisse la porte entrouverte ; « pas disponible » la ferme
 * pour la saison mais s'entend dans le vestiaire ; « négocier » ouvre la table
 * et engage à vendre si l'accord tombe. Un bouton qui ne prévient pas de ce
 * qu'il déclenche est un piège, pas une décision.
 */
function ApprocheClubCarte({ pseudo }: { pseudo: string }) {
  const manager = useGame((s) => s.manager)!;
  const repondre = useGame((s) => s.repondreApprocheManager);
  const negocier = useGame((s) => s.negocierApprocheManager);
  const exiger = useGame((s) => s.exigerSurApprocheManager);
  const approche = [...(manager.avancee?.approches ?? [])].reverse().find((a) => a.pseudo === pseudo);
  if (!approche) return null;
  const besoins: Record<typeof approche.besoin, string> = {
    poste: 'trou au poste', blessure: 'aucune solution disponible',
    ambition: 'renforcement ambitieux', remplacement: 'remplacement anticipé',
  };
  return (
    <div className="x-nego x-nego-manager x-approche" data-etat={approche.etat}>
      <div className="x-nego-tete">
        <b><Icone d={I_STADE} /> Offre pour {approche.nom}</b>
        {approche.etat === 'negociation' && <span className="x-nego-patience">{'●'.repeat(approche.patience)}{'○'.repeat(Math.max(0, 4 - approche.patience))}</span>}
      </div>
      <div className="manager-x-termes manager-x-termes-club">
        <span><small>Leur offre</small><b>{nombre(approche.offre)} €</b></span>
        <span><small>Ta demande</small><b>{nombre(approche.demande)} €</b></span>
        <span><small>Bonus différés</small><b>{nombre(approche.bonus)} €</b></span>
        <span><small>Part à la revente</small><b>{approche.pourcentageRevente}%</b></span>
      </div>
      <p className="x-nego-offre">
        {approche.club} · {approche.division} · {nomPoste(approche.poste)} {approche.age} ans, note {approche.note}.
        Contrat restant : {approche.saisonsRestantes} saison(s). Motif : {besoins[approche.besoin]} ·
        urgence {approche.urgence}/100 · {approche.alternatives} alternative(s) dans leur groupe.
      </p>
      {approche.etat === 'ouverte' && <div className="x-nego-leviers">
        <button className="x-nego-oui" onClick={() => repondre(approche.id, 'accepter')}>Accepter {nombre(approche.offre)} €</button>
        <button onClick={() => repondre(approche.id, 'negocier')}>Négocier</button>
        <button onClick={() => repondre(approche.id, 'refuser')}>Refuser</button>
        <button className="x-nego-non" onClick={() => repondre(approche.id, 'indisponible')}>Il n’est pas disponible</button>
      </div>}
      {approche.etat === 'negociation' && <>
        <label className="x-approche-exigence">
          <span>Ce que tu réclames</span>
          <input type="number" step={25_000} min={0} value={approche.demande}
            onChange={(e) => exiger(approche.id, Number(e.target.value))} />
        </label>
        <div className="x-nego-leviers">
          <button onClick={() => negocier(approche.id, 'exiger')}>Qu’ils montent</button>
          <button onClick={() => negocier(approche.id, 'bonus')}>Accepter des bonus</button>
          <button onClick={() => negocier(approche.id, 'revente')}>+10% à la revente</button>
          <button className="x-nego-oui" onClick={() => negocier(approche.id, 'accepter')}>Prendre {nombre(approche.offre)} €</button>
        </div>
      </>}
      {approche.etat === 'conclue' && <div className="x-nego-accord"><Icone d={I_OK} /> <b>Transfert conclu avec {approche.club}.</b></div>}
      {approche.etat === 'rompue' && <div className="x-nego-accord"><b>Négociations terminées : le club s’est retiré.</b></div>}
      {(approche.etat === 'refusee' || approche.etat === 'indisponible') && <div className="x-nego-accord">
        <b>{approche.etat === 'refusee' ? 'Offre refusée.' : 'Joueur déclaré indisponible.'}</b>
        {approche.reaction && <span>{approche.reaction === 'demandeDepart'
          ? ' Le joueur a demandé son départ.' : ' Le joueur a accepté la décision.'}</span>}
      </div>}
    </div>
  );
}

function DemandeVestiaireManager({ pseudo }: { pseudo: string }) {
  const manager = useGame((s) => s.manager)!;
  const repondre = useGame((s) => s.repondreDemandeManager);
  const ouvrirContrat = useGame((s) => s.ouvrirRenegociationJoueurManager);
  const demande = [...manager.demandes].reverse().find((d) => d.pseudo === pseudo);
  if (!demande) return null;
  return (
    <div className="x-nego x-nego-manager" data-etat={demande.etat}>
      <div className="x-nego-tete"><b>{demande.type === 'depart' ? 'Demande de départ' : 'Temps de jeu'}</b></div>
      <p className="x-nego-offre">{demande.nom} · {nomPoste(demande.poste)} · note {demande.note} · raison : {(demande.raison ?? demande.type).replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
      {demande.etat === 'ouverte' ? <div className="x-nego-fin">
        <button className="x-nego-oui" onClick={() => repondre(demande.id, true)}>{demande.type === 'depart' ? 'Accepter et le mettre en vente' : 'Promettre plus de temps de jeu'}</button>
        {demande.type === 'depart' && <button onClick={() => ouvrirContrat(demande.joueurId)}>Proposer un nouveau contrat</button>}
        <button className="x-nego-non" onClick={() => repondre(demande.id, false)}>Refuser</button>
      </div> : <div className="x-nego-accord">{demande.etat === 'acceptee' ? 'Demande acceptée' : 'Demande refusée'}</div>}
    </div>
  );
}

function VentesManager({ recherche = '' }: { recherche?: string }) {
  const manager = useGame((s) => s.manager)!;
  const mettreEnVente = useGame((s) => s.mettreEnVenteManager);
  const retirer = useGame((s) => s.retirerVenteManager);
  const accepter = useGame((s) => s.accepterOffreVenteManager);
  const filtre = recherche.trim().toLowerCase();
  const effectif = effectifDuClub(manager.club, manager.saison).filter((joueur) => (
    !filtre || `${joueur.nom} ${nomPoste(joueur.poste)}`.toLowerCase().includes(filtre)
  ));
  return (
    <div className="manager-x-ventes">
      <section className="manager-x-vente-intro"><div><span className="eyebrow">Direction sportive</span><h2>Gérer les départs</h2><p>Place un joueur sur la liste, compare les projets reçus puis valide sa destination. Dans le rugby amateur, le départ reste gratuit mais il fonctionne vraiment.</p></div><strong>{nombre(manager.budgetTransferts)} €<small>budget transferts</small></strong></section>
      {manager.ventes.map((vente) => (
        <article className="manager-x-vente" key={vente.joueurId}>
          <header><div><b>{vente.nom}</b><span>{nomPoste(vente.poste)} · {vente.age} ans · note {vente.note} · potentiel {vente.potentiel}</span></div><strong>{vente.valeur > 0 ? `${nombre(vente.valeur)} €` : 'Départ libre'}</strong><button onClick={() => retirer(vente.joueurId)}>Retirer</button></header>
          {vente.offres.length ? <div className="manager-x-offres">{vente.offres.map((offre) => {
            const club = clubParNom(offre.club);
            return <div key={offre.id}><span>{club && <Blason club={club} taille={34} />}<b>{offre.club}</b><small>{offre.division}</small></span><strong>{offre.montant > 0 ? `${nombre(offre.montant)} €` : 'Projet amateur'}</strong><button className="x-poster" onClick={() => accepter(vente.joueurId, offre.id)}>{offre.montant > 0 ? 'Accepter' : 'Valider le départ'}</button></div>;
          })}</div> : <p className="manager-x-sans-offre">Aucun club ne s’est encore positionné sur ce joueur.</p>}
        </article>
      ))}
      <section className="manager-x-effectif">
        <h3>Effectif du club</h3>
        <div>{effectif.map((joueur) => {
          const liste = manager.ventes.some((v) => v.joueurId === joueur.id);
          const profilMedical = manager.avancee?.profilsMedicaux[joueur.id];
          const contratJoueur = manager.avancee?.contratsJoueurs[joueur.id];
          const valeur = valeurDeVente(joueur, manager.club, manager.saison, {
            historiqueMedical: profilMedical?.historique.length,
            sequelles: Object.values(profilMedical?.sequelles ?? {}).reduce((n, x) => n + (x ?? 0), 0),
            contratFin: contratJoueur?.fin,
          });
          return <article key={joueur.id}><em>{joueur.note}</em><span><b>{joueur.nom}</b><small>{nomPoste(joueur.poste)} · {joueur.age} ans</small></span><strong>{valeur > 0 ? `${nombre(valeur)} €` : 'Libre'}</strong><button disabled={liste} onClick={() => mettreEnVente(joueur.id)}>{liste ? 'Sur la liste' : valeur > 0 ? 'Mettre en vente' : 'Proposer un départ'}</button></article>;
        })}</div>
      </section>
    </div>
  );
}

type DossierManagerSocial = {
  id: string;
  pseudo: string;
  type: 'club' | 'joueur' | 'demande' | 'approche' | 'libre';
  nom: string;
  sous: string;
  avatar: string;
};

/**
 * ⚠️ « compte » EST NOUVEAU, et c'est ce qui manquait pour rendre les profils
 * cliquables côté entraîneur (demande : « pouvoir cliquer sur les profils,
 * aussi dans le X de l'entraîneur »). L'onglet existait déjà dans le L'Ovale du
 * joueur ; celui du manager passait `onProfil={() => {}}` — un clic sur un nom
 * ne faisait littéralement rien, sans même un curseur pour le signaler.
 */
type OngletManagerSocial =
  | 'timeline' | 'explorer' | 'messages' | 'notifs' | 'succes' | 'profil' | 'compte';

interface OvaleManagerProps {
  embarque?: boolean;
  onRetour?: (destination?: 'bureau' | 'marche') => void;
}

export function OvaleManager({ embarque = false, onRetour }: OvaleManagerProps = {}) {
  const manager = useGame((s) => s.manager)!;
  const conversations = useGame((s) => s.conversations ?? {});
  const posts = useGame((s) => s.posts ?? []);
  const notifs = useGame((s) => s.notifsSocial ?? []);
  const setEcran = useGame((s) => s.setEcran);
  const lireConversation = useGame((s) => s.lireConversation);
  const vivreSemaine = useGame((s) => s.vivreSemaineSociale);
  const marquerNotifsLues = useGame((s) => s.marquerNotifsLues);
  const ouvrirSocialSur = useGame((s) => s.ouvrirSocialSur);
  const conversationCible = useGame((s) => s.conversationSocialeCible);
  const consommerCible = useGame((s) => s.consommerConversationSocialeCible);
  const consommerOuverture = useGame((s) => s.consommerOuvertureSociale);
  const [recherche, setRecherche] = useState('');
  const [contactLibre,setContactLibre] = useState<string | null>(conversationCible);
  const [texteLibre,setTexteLibre] = useState('');
  const envoyerLibre = useGame(s => s.envoyerMessage);
  const suivisManager = useGame(s => s.comptesSuivis);
  const suivreManager = useGame(s => s.suivreCompte);
  const dossiers = useMemo(() => {
    const parPseudo = new Map<string, DossierManagerSocial>();
    for (const n of manager.negociationsClubs) parPseudo.set(n.pseudo, {
      id: n.id, pseudo: n.pseudo, type: 'club', nom: n.club,
      sous: `${n.cible.nom} · ${n.etat}`, avatar: `club:${n.club}`,
    });
    for (const n of manager.negociations) parPseudo.set(n.pseudo, {
      id: n.id, pseudo: n.pseudo, type: 'joueur', nom: n.joueur.nom,
      sous: `${nomPoste(n.joueur.poste)} · ${t(`mgr.etat.${n.etat}`)}`,
      avatar: `initiales:${n.joueur.nom}`,
    });
    for (const d of manager.demandes) parPseudo.set(d.pseudo, {
      id: d.id, pseudo: d.pseudo, type: 'demande', nom: d.nom,
      sous: `${d.type === 'depart' ? 'Demande de départ' : 'Temps de jeu'} · ${d.etat}`,
      avatar: `initiales:${d.nom}`,
    });
    // ⚠️ LES APPROCHES PASSENT APRÈS LES AUTRES DOSSIERS, et ce n'est pas un
    // détail d'ordre : elles utilisent le compte `_recrutement` du club, jamais
    // son compte `_officiel`. Sans ce suffixe, un club à qui on achète un
    // joueur et qui vient en même temps chercher un des nôtres écraserait la
    // conversation de l'autre dossier — deux négociations dans un seul fil.
    for (const a of manager.avancee?.approches ?? []) parPseudo.set(a.pseudo, {
      id: a.id, pseudo: a.pseudo, type: 'approche', nom: a.club,
      sous: `Offre pour ${a.nom} · ${a.etat}`, avatar: `club:${a.club}`,
    });
    for (const pseudo of [...Object.keys(conversations), ...(contactLibre ? [contactLibre] : [])]) {
      if (parPseudo.has(pseudo)) continue;
      const compte = suivisManager.find(c => c.pseudo === pseudo) ?? annuaire({club:manager.club,saison:manager.saison,division:manager.division}).find(c => c.pseudo === pseudo);
      if (compte) parPseudo.set(pseudo,{id:pseudo,pseudo,type:'libre',nom:compte.nom,sous:'Message privé',avatar:compte.avatar});
    }
    return [...parPseudo.values()].sort((a, b) => {
      const date = (p: string) => conversations[p]?.at(-1)?.creeLe ?? 0;
      return date(b.pseudo) - date(a.pseudo);
    });
  }, [manager.negociationsClubs, manager.negociations, manager.demandes, manager.avancee?.approches, conversations, contactLibre, suivisManager, manager.club, manager.saison, manager.division]);
  const [onglet, setOnglet] = useState<OngletManagerSocial>(
    conversationCible || ouvrirSocialSur === 'messages' ? 'messages' : 'timeline',
  );
  const [actif, setActif] = useState<string | null>(dossiers[0]?.pseudo ?? null);
  const [profilVu, setProfilVu] = useState<string | null>(null);
  const messagesActifs = actif ? conversations[actif] ?? [] : [];
  const bas = useRef<HTMLDivElement>(null);
  const nonLuesNotifs = notifs.filter((n) => !n.lue).length;
  const nonLusMessages = dossiers.filter((d) => (conversations[d.pseudo] ?? []).some((m) => m.de === 'lui' && !m.lu)).length;
  const club = clubParNom(manager.club);
  const postsFiltres = recherche.trim()
    ? chercherPosts(posts, recherche).slice(0, 50)
    : posts.slice(0, 80);
  const resultatsComptes = useMemo(
    () => recherche.trim() ? chercherComptes({
      club: manager.club, saison: manager.saison, division: manager.division,
    }, recherche) : [],
    [manager.club, manager.division, manager.saison, recherche],
  );

  useEffect(() => { vivreSemaine(); }, [vivreSemaine]);
  useEffect(() => {
    // Ne jamais déplacer la page entière jusqu'au dernier message : cela
    // cachait l'offre et ses boutons sous le clavier/la navigation mobile.
    const fil = bas.current?.parentElement;
    if (fil) fil.scrollTop = fil.scrollHeight;
  }, [messagesActifs.length, actif]);
  useEffect(() => { if (!actif && dossiers[0]) setActif(dossiers[0].pseudo); }, [actif, dossiers]);
  useEffect(() => { if (actif) lireConversation(actif); }, [actif, lireConversation]);
  useEffect(() => {
    if (ouvrirSocialSur === 'messages') setOnglet('messages');
    consommerOuverture();
  }, [ouvrirSocialSur, consommerOuverture]);
  useEffect(() => {
    if (!conversationCible) return;
    setOnglet('messages');
    setContactLibre(conversationCible); setActif(conversationCible);
    consommerCible();
  }, [conversationCible, consommerCible]);
  const dossier = dossiers.find((n) => n.pseudo === actif);

  const ouvrirOnglet = (cible: OngletManagerSocial) => {
    setOnglet(cible);
    if (cible === 'notifs') marquerNotifsLues();
  };
  const retournerAuManager = (destination: 'bureau' | 'marche' = 'bureau') => {
    if (embarque && onRetour) onRetour(destination);
    else setEcran('manager');
  };

  /**
   * Ouvrir le profil d'un compte, exactement comme le fait le L'Ovale du
   * joueur : annuaire d'abord, repli reconstruit depuis les publications
   * ensuite (`compteDepuis`). Le sien renvoie sur son propre onglet.
   */
  const monPseudo = pseudoDe(manager.club);
  const contexteSocial = {
    club: manager.club, saison: manager.saison, division: manager.division,
  };
  const compteVu = profilVu
    ? compteDepuis(contexteSocial, profilVu, posts, resultatsComptes)
    : undefined;
  const ouvrirProfil = (pseudo: string) => {
    if (pseudo === monPseudo) { setOnglet('profil'); setProfilVu(null); return; }
    setProfilVu(pseudo);
    setOnglet('compte');
  };
  const lien = (cible: OngletManagerSocial, icone: string, label: string, badge?: number) => (
    <button className={onglet === cible ? 'actif' : ''} onClick={() => ouvrirOnglet(cible)}>
      <span className="x-cloche"><Icone d={icone} width={24} height={24} />{!!badge && <i className="x-pastille">{badge > 99 ? '99+' : badge}</i>}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <motion.section className={`x-app x-manager${embarque ? ' x-manager-embarque' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <aside className="x-rail">
        <LogoOvale />
        <nav>
          {lien('timeline', I_ACCUEIL, t('ov.accueil'))}
          {lien('explorer', I_LOUPE, t('ov.explorer'))}
          {lien('messages', I_MESSAGE, t('ov.messages'), nonLusMessages)}
          {lien('notifs', I_CLOCHE, t('ov.notifications'), nonLuesNotifs)}
          {lien('profil', I_PROFIL, t('nav.profil'))}
          {lien('succes', I_TROPHEE, t('ov.succes'))}
          {/* ⚠️ LE BOUTON « BUREAU » A ÉTÉ RETIRÉ (demande explicite). Il était
              là du temps où L'Ovale du manager s'ouvrait en plein écran ; il
              est devenu un ONGLET du bureau (`vue === 'ovale'`), donc le bouton
              faisait sortir d'un onglet vers l'onglet d'à côté, en doublon avec
              la barre d'onglets qui reste visible juste au-dessus. Deux chemins
              pour le même geste, dont un qui ressemble à une sortie de secours :
              c'est ce qui faisait croire qu'on quittait le réseau. */}
        </nav>
        <button className="x-compte" onClick={() => setOnglet('profil')}>
          <Avatar avatar={`club:${manager.club}`} club={manager.club} taille={36} nom={manager.club} />
          <div><b>{manager.nom}</b><span>@{pseudoDe(manager.club)}</span></div>
        </button>
      </aside>

      <div className="x-centre">
        <header className="x-tetes x-tetes-six">
          <button className={onglet === 'timeline' ? 'actif' : ''} onClick={() => ouvrirOnglet('timeline')}>{t('ov.pourVous')}</button>
          <button className={onglet === 'explorer' ? 'actif' : ''} onClick={() => ouvrirOnglet('explorer')}>{t('ov.explorer')}</button>
          <button className={onglet === 'messages' ? 'actif' : ''} onClick={() => ouvrirOnglet('messages')}>{t('ov.messages')}{nonLusMessages > 0 && <i className="x-point" />}</button>
          <button className={onglet === 'notifs' ? 'actif' : ''} onClick={() => ouvrirOnglet('notifs')}>{t('ov.notifs')}{nonLuesNotifs > 0 && <i className="x-point" />}</button>
          <button className={onglet === 'profil' ? 'actif' : ''} onClick={() => ouvrirOnglet('profil')}>{t('nav.profil')}</button>
          <button className={onglet === 'succes' ? 'actif' : ''} onClick={() => ouvrirOnglet('succes')}>{t('ov.succes')}</button>
        </header>

        <form className="x-recherche x-recherche-mobile" onSubmit={(e) => { e.preventDefault(); setOnglet('timeline'); }}>
          <Icone d={I_LOUPE} />
          <input value={recherche} onChange={(e) => { setRecherche(e.target.value); setOnglet('timeline'); }} placeholder={t('ov.rechercheComplete')} />
          {recherche && <button type="button" className="x-vider" onClick={() => setRecherche('')} title={t('ov.effacer')}><Icone d={I_CROIX} /></button>}
        </form>

        {onglet === 'timeline' && <>
          {recherche.trim() && <div className="x-explorer manager-x-comptes-recherche">
            <div className="x-bloc-tete"><h3>Comptes pour « {recherche} »</h3></div>
            {/* Le compte entier est cliquable, comme dans L'Ovale du joueur. */}
            {resultatsComptes.map((compte) => <div key={compte.pseudo} className="x-compte-carte">
              <button className="x-lien-profil" onClick={() => ouvrirProfil(compte.pseudo)}>
                <Avatar avatar={compte.avatar} club={compte.club} taille={40} nom={compte.nom} />
              </button>
              <button className="x-compte-infos x-lien-profil" onClick={() => ouvrirProfil(compte.pseudo)}>
                <b>{compte.nom}{compte.certifie && <Certifie />}</b>
                <span className="x-pseudo">@{compte.pseudo} · {compact(compte.abonnes)} {t('gen.abonnes')}</span>
                {compte.bio && <p>{compte.bio}</p>}
              </button>
            </div>)}
            {!resultatsComptes.length && <p className="x-vide">{t('ov.aucunCompte')}</p>}
            <div className="x-bloc-tete"><h3>Publications</h3></div>
          </div>}
          <div className="manager-x-timeline">
            {postsFiltres.length
              ? postsFiltres.map((post) => <Post key={post.id} post={post} lectureSeule onProfil={ouvrirProfil} onRecherche={(mot) => { setRecherche(mot); setOnglet('timeline'); }} />)
              : <div className="x-vide manager-x-vide"><b>{recherche ? 'Aucune publication' : 'Le fil se prépare'}</b><p>{recherche ? `Aucune publication ne correspond à « ${recherche} ».` : 'Les clubs, médias et supporters publieront au rythme des semaines et des résultats.'}</p></div>}
          </div>
        </>}

        {onglet === 'explorer' && (
          <>
            <div className="manager-x-explorer-tete">
              <div><b>Mercato du manager</b><span>Arrivées depuis le marché mondial · départs depuis L’Ovale</span></div>
              {/* Le bouton mène là où L'Ovale ne va pas : le MARCHÉ, pas le
                  bureau. « Ouvrir le bureau » renvoyait à l'onglet d'à côté. */}
              <button className="x-poster" onClick={() => retournerAuManager('marche')}>
                {t('mgr.marche')}
              </button>
            </div>
            <VentesManager recherche={recherche} />
          </>
        )}

        {onglet === 'messages' && (dossiers.length ? (
          <div className="x-messagerie">
            <div className="x-conversations">
              {dossiers.map((n) => {
                const nonLu = (conversations[n.pseudo] ?? []).some((m) => m.de === 'lui' && !m.lu);
                return <button key={n.id} className={`x-conv${actif === n.pseudo ? ' actif' : ''}${nonLu ? ' non-lu' : ''}`} onClick={() => setActif(n.pseudo)}><Avatar avatar={n.avatar} taille={36} nom={n.nom} /><span><b>{n.nom}</b><i>{n.sous}</i></span></button>;
              })}
            </div>
            <div className="x-fil-messages">
              {dossier && (
                <div className="x-conv-tete">
                  <Avatar avatar={dossier.avatar} taille={36} nom={dossier.nom} />
                  {/* Le nom en tête de conversation ouvre la fiche : c'est là
                      qu'on se demande « c'est qui, ce joueur ? ». */}
                  <button className="x-lien-profil" onClick={() => ouvrirProfil(dossier.pseudo)}>
                    <b>{dossier.nom}</b>
                    <span className="x-pseudo">@{dossier.pseudo} · {dossier.sous}</span>
                  </button>
                </div>
              )}
              <div className="x-bulles">{messagesActifs.map((m, rang) => {
                const heure = actif ? heureDuFil(actif, m, rang) : null;
                return <div key={m.id} className={`x-bulle ${m.de === 'moi' ? 'moi' : 'lui'}`}><span>{m.texte}</span>{heure && <time>{heure}</time>}</div>;
              })}<div ref={bas} /></div>
              {actif && dossier?.type === 'club' && <NegociationClubVendeur pseudo={actif} />}
              {actif && dossier?.type === 'joueur' && <NegociationRecrueManager pseudo={actif} />}
              {actif && dossier?.type === 'demande' && <DemandeVestiaireManager pseudo={actif} />}
              {actif && dossier?.type === 'approche' && <ApprocheClubCarte pseudo={actif} />}
              {actif && dossier?.type === 'libre' && <form className="x-envoi" onSubmit={e=>{e.preventDefault();if(texteLibre.trim()){void envoyerLibre(actif,texteLibre);setTexteLibre('');}}}>
                <input aria-label="Écrire un message" value={texteLibre} maxLength={400} onChange={e=>setTexteLibre(e.target.value)} placeholder="Écrire un message" />
                <button className="x-poster" disabled={!texteLibre.trim()}>Envoyer</button>
              </form>}
            </div>
          </div>
        ) : <div className="x-vide manager-x-vide"><b>Aucune discussion en cours</b><p>Recherche un compte ou un joueur pour lui écrire.</p><button className="x-poster" onClick={() => setOnglet('explorer')}>Chercher un destinataire</button></div>)}

        {onglet === 'notifs' && <div className="x-fil">
          {notifs.length === 0 && <p className="x-vide">Les résultats, offres et demandes du vestiaire apparaîtront ici.</p>}
          {notifs.map((n) => <div key={n.id} className="x-notif"><span className="x-notif-emoji">{n.emoji}</span><div><b>{n.titre}</b><p>{n.texte}</p>{dateEtHeure(n) && <time className="x-notif-date">{dateEtHeure(n)}</time>}</div></div>)}
        </div>}

        {onglet === 'profil' && <div className="x-profil manager-x-profil">
          <div className="x-banniere" />
          <div className="x-profil-corps">
            <div className="x-profil-avatar"><Avatar avatar={`club:${manager.club}`} club={manager.club} taille={76} nom={manager.club} /></div>
            {/* Plus de « Ouvrir le bureau » ici non plus : sur SON PROPRE
                profil, le bouton ne parlait même pas du profil. */}
            <h2>{manager.club}<Certifie /></h2>
            <span className="x-pseudo">@{pseudoDe(manager.club)} · entraîné par {manager.nom}</span>
            <p className="x-bio">{manager.divisionNom} · saison {manager.saison}. Actualité officielle, résultats et coulisses du club.</p>
            <div className="x-profil-chiffres"><span><b>{Math.round(manager.prestige)}</b> prestige</span><span><b>{Math.round(manager.confiance)}%</b> confiance</span><span><b>{manager.ventes.length}</b> départs ouverts</span><span><b>{dossiers.length}</b> discussions</span></div>
          </div>
        </div>}

        {onglet === 'compte' && compteVu && (
          <Profil
            compte={compteVu}
            onFermer={() => { setProfilVu(null); setOnglet('timeline'); }}
            // Un profil ouvre aussi un fil privé libre en carrière entraîneur.
            onMessage={() => { suivreManager(compteVu); setContactLibre(compteVu.pseudo); setActif(compteVu.pseudo); setOnglet('messages'); }}
            onProfil={ouvrirProfil}
            onRecherche={(mot) => { setRecherche(mot); setOnglet('timeline'); }}
          />
        )}

        {onglet === 'succes' && <PanneauSuccesManager />}
      </div>

      <aside className="x-droite">
        <form className="x-recherche" onSubmit={(e) => { e.preventDefault(); setOnglet(onglet === 'explorer' ? 'explorer' : 'timeline'); }}>
          <Icone d={I_LOUPE} />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher dans L’Ovale" />
          {recherche && <button type="button" className="x-vider" onClick={() => setRecherche('')} title={t('ov.effacer')}><Icone d={I_CROIX} /></button>}
        </form>
        <div className="x-bloc">
          <h3>Ton club</h3>
          <div className="manager-x-club-droite">{club && <Blason club={club} taille={46} />}<span><b>{manager.club}</b><small>{manager.divisionNom}</small></span></div>
          <div className="x-audience"><div><b>{Math.round(manager.confiance)}%</b><span>confiance</span></div><div><b>{manager.ventes.length}</b><span>départs</span></div><div><b>{dossiers.length}</b><span>dossiers</span></div></div>
        </div>
        <div className="x-bloc">
          <h3>Mercato</h3>
          <button className="x-tendance" onClick={() => setOnglet('messages')}><span className="x-tendance-cat">Négociations</span><b>#Messages</b><span className="x-tendance-vol">{dossiers.length} dossier(s) · {nonLusMessages} non lu(s)</span></button>
          <button className="x-tendance" onClick={() => setOnglet('explorer')}><span className="x-tendance-cat">Direction sportive</span><b>#Départs</b><span className="x-tendance-vol">{manager.ventes.length} dossier(s) ouvert(s)</span></button>
          <button className="x-tendance" onClick={() => retournerAuManager('marche')}><span className="x-tendance-cat">Base mondiale</span><b>#Recrutement</b><span className="x-tendance-vol">tous les championnats</span></button>
        </div>
        <div className="x-bloc manager-x-budget"><h3>Budget transferts</h3><b>{nombre(manager.budgetTransferts)} €</b><span>Marge salariale : {nombre(situationSalariale(manager).disponible)} € / an</span></div>
      </aside>
    </motion.section>
  );
}

// --- Écran -----------------------------------------------------------------
type Onglet = 'timeline' | 'explorer' | 'messages' | 'notifs' | 'succes' | 'profil' | 'compte';

function SocialJoueur() {
  const joueur = useGame((s) => s.joueur);
  const posts = useGame((s) => s.posts ?? []);
  const notifs = useGame((s) => s.notifsSocial ?? []);
  const suivis = useGame((s) => s.comptesSuivis ?? []);
  const suggestions = useGame((s) => s.suggestionsComptes ?? []);
  const iaActivee = useGame((s) => s.iaActivee);
  const chargement = useGame((s) => s.chargementSocial);
  const erreur = useGame((s) => s.erreurSocial);
  const marquerNotifsLues = useGame((s) => s.marquerNotifsLues);
  const rafraichirFil = useGame((s) => s.rafraichirFil);
  const chargerSuggestions = useGame((s) => s.chargerSuggestions);
  const vivreSemaine = useGame((s) => s.vivreSemaineSociale);
  const filSemaine = useGame((s) => s.filSemaine);
  const suivre = useGame((s) => s.suivreCompte);
  const nePlusSuivre = useGame((s) => s.nePlusSuivre);
  const setEcran = useGame((s) => s.setEcran);

  const [onglet, setOnglet] = useState<Onglet>('timeline');
  const [recherche, setRecherche] = useState('');
  const [profilVu, setProfilVu] = useState<string | null>(null);
  const [messageAvec, setMessageAvec] = useState<string | null>(null);

  // ⚠️ Abonnement, pas lecture ponctuelle : quand le quota Groq se libère, le
  // fil doit repasser tout seul aux publications écrites sur mesure.
  const etat = useSyncExternalStore(ecouterEtatIA, etatIA, etatIA);
  const avecIA = iaActivee && etat.disponible;

  // LE FIL SUIT LE CALENDRIER, PAS L'HORLOGE.
  //
  // ⚠️ Il y avait ici un `setInterval` de 8 s qui faisait tomber un post au
  // hasard pendant la lecture : fil illisible et incohérent. Désormais on
  // génère la fournée de la SEMAINE en cours (une seule fois, `filSemaine` sert
  // de verrou), et la suivante arrive quand tu joues la semaine suivante.
  useEffect(() => {
    if (!joueur) return;
    vivreSemaine();
    if (suggestions.length === 0) void chargerSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filSemaine]);

  // Avec l'IA locale, le modèle écrit par-dessus la fournée locale — une fois par
  // semaine de jeu elle aussi, pas toutes les 90 secondes.
  useEffect(() => {
    if (!joueur || !avecIA || !filSemaine) return;
    void rafraichirFil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filSemaine, avecIA]);

  const tend = useMemo(() => (joueur ? tendances(joueur) : []), [joueur]);
  const resultatsComptes = useMemo(
    () => (joueur && recherche.trim() ? chercherComptes(joueur, recherche) : []),
    [joueur, recherche],
  );
  const resultatsPosts = useMemo(
    () => (recherche.trim() ? chercherPosts(posts, recherche).slice(0, 30) : []),
    [posts, recherche],
  );

  /**
   * ⚠️ SUR QUEL ONGLET S’OUVRIR — et le hook vit AVANT le premier retour
   * anticipé. Posé après `if (!joueur) return null`, il n’est pas appelé au
   * même rang à chaque rendu : React l’interdit, et `oxlint` l’a signalé
   * immédiatement (`rules-of-hooks`).
   *
   * ⚠️ ET ON CONSOMME L’ORDRE, comme l’écran consomme la percée du moteur :
   * sans ça, revenir sur 𝕏 trois écrans plus tard rouvrirait les messages à
   * chaque fois.
   */
  const ouvrirSocialSur = useGame((s) => s.ouvrirSocialSur);
  const consommerOuvertureSociale = useGame((s) => s.consommerOuvertureSociale);
  const conversationCible = useGame((s) => s.conversationSocialeCible);
  const consommerConversationCible = useGame((s) => s.consommerConversationSocialeCible);
  useEffect(() => {
    if (!ouvrirSocialSur) return;
    setOnglet(ouvrirSocialSur);
    consommerOuvertureSociale();
  }, [ouvrirSocialSur, consommerOuvertureSociale]);
  useEffect(() => {
    if (!conversationCible) return;
    setMessageAvec(conversationCible);
    setOnglet('messages');
    consommerConversationCible();
  }, [conversationCible, consommerConversationCible]);

  if (!joueur) return null;
  const nonLues = notifs.filter((n) => !n.lue).length;
  const fil = [...posts].sort((a, b) => b.saison - a.saison || b.semaine - a.semaine);
  // ⚠️ Le profil doit s'ouvrir pour N'IMPORTE QUEL compte : ceux de l'annuaire,
  // mais aussi ceux inventés par l'IA ou croisés dans une réponse. Sans ce
  // repli, cliquer sur un joueur n'affichait rien du tout.
  const compteVu = profilVu
    ? compteDepuis(joueur, profilVu, posts, [...suivis, ...suggestions])
    : undefined;
  const monPseudo = joueur.pseudo ?? pseudoDe(joueur.nom);

  const ouvrirProfil = (pseudo: string) => {
    if (pseudo === monPseudo) { setOnglet('profil'); setProfilVu(null); return; }
    setProfilVu(pseudo);
    setOnglet('compte');
  };
  const ouvrirMessage = (pseudo: string) => { setMessageAvec(pseudo); setOnglet('messages'); };
  const chercher = (mot: string) => { setRecherche(mot); setOnglet('explorer'); };

  const lien = (cible: Onglet, icone: string, label: string, badge?: number) => (
    <button
      className={onglet === cible ? 'actif' : ''}
      onClick={() => { setOnglet(cible); if (cible === 'notifs') marquerNotifsLues(); }}
    >
      <span className="x-cloche">
        <Icone d={icone} width={24} height={24} />
        {!!badge && <i className="x-pastille">{badge > 99 ? '99+' : badge}</i>}
      </span>
      <span>{label}</span>
    </button>
  );

  const carteCompte = (c: CompteSuivi) => {
    const abonne = suivis.some((x) => x.pseudo === c.pseudo);
    return (
      <div key={c.pseudo} className="x-compte-carte">
        <button className="x-lien-profil" onClick={() => ouvrirProfil(c.pseudo)}>
          <Avatar avatar={c.avatar} club={c.club} taille={40} nom={c.nom} />
        </button>
        <div className="x-compte-infos">
          <button className="x-nom-lien" onClick={() => ouvrirProfil(c.pseudo)}>
            <b>{c.nom}</b>
          </button>
          {c.certifie && <Certifie />}
          <span className="x-pseudo">@{c.pseudo} · {compact(c.abonnes)} {t('gen.abonnes')}</span>
          {c.bio && <p>{c.bio}</p>}
        </div>
        <button
          className={abonne ? 'x-suivre abonne' : 'x-suivre'}
          onClick={() => (abonne ? nePlusSuivre(c.pseudo) : suivre(c))}
        >
          {abonne ? t('gen.abonne') : t('gen.suivre')}
        </button>
      </div>
    );
  };

  return (
    <motion.section
      className="x-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <aside className="x-rail">
        <LogoOvale />
        <nav>
          {lien('timeline', I_ACCUEIL, t('ov.accueil'))}
          {lien('explorer', I_LOUPE, t('ov.explorer'))}
          {lien('messages', I_MESSAGE, t('ov.messages'))}
          {lien('notifs', I_CLOCHE, t('ov.notifications'), nonLues)}
          {lien('profil', I_PROFIL, t('nav.profil'))}
          {lien('succes', I_TROPHEE, t('ov.succes'))}
          <button onClick={() => setEcran('carriere')}>
            <span className="x-cloche"><Icone d={I_BALLON} /></span> <span>{t('ov.maCarriere')}</span>
          </button>
        </nav>
        <button className="x-compte" onClick={() => setOnglet('profil')}>
          <Avatar avatar="moi" club={joueur.club} taille={36} />
          <div>
            <b>{joueur.profilSocial?.nomAffiche ?? joueur.nom}{estCertifie(joueur) && <Certifie />}</b>
            <span>@{monPseudo}</span>
          </div>
        </button>
      </aside>

      <div className="x-centre">
        <header className="x-tetes">
          <button className={onglet === 'timeline' ? 'actif' : ''} onClick={() => setOnglet('timeline')}>
            {t('ov.pourVous')}
          </button>
          <button className={onglet === 'explorer' ? 'actif' : ''} onClick={() => setOnglet('explorer')}>
            {t('ov.explorer')}
          </button>
          <button className={onglet === 'messages' ? 'actif' : ''} onClick={() => setOnglet('messages')}>
            {t('ov.messages')}
          </button>
          <button
            className={onglet === 'notifs' ? 'actif' : ''}
            onClick={() => { setOnglet('notifs'); marquerNotifsLues(); }}
          >
            {t('ov.notifs')}{nonLues > 0 && <i className="x-point" />}
          </button>
          <button className={onglet === 'profil' ? 'actif' : ''} onClick={() => setOnglet('profil')}>
            {t('nav.profil')}
          </button>
        </header>

        <form
          className="x-recherche x-recherche-mobile"
          onSubmit={(e) => { e.preventDefault(); setOnglet('explorer'); }}
        >
          <Icone d={I_LOUPE} />
          <input
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); if (e.target.value) setOnglet('explorer'); }}
            placeholder={t('ov.rechercheComplete')}
          />
          {recherche && <button type="button" className="x-vider" onClick={() => setRecherche('')} title={t('ov.effacer')}><Icone d={I_CROIX} /></button>}
        </form>

        {erreur && <div className="x-erreur">{erreur}</div>}

        {onglet === 'timeline' && (
          <>
            <Composer />
            <div className="x-actualiser">
              <span className={`x-vivant${chargement ? ' occupe' : ''}`}>
                ● {chargement
                  ? t('ov.reseauEcrit')
                  : t('ov.semaineActuelle', { n: joueur.semaine ?? 1, libelle: libelleSemaine(semaine(joueur.semaine ?? 1), joueur.saison) })}
              </span>
              <span>{t('ov.filSemaine')}</span>
              {!avecIA && <span>{t('ov.cleIA')}</span>}
            </div>
            <div className="x-fil">
              {fil.map((p) => <Post key={p.id} post={p} onProfil={ouvrirProfil} onRecherche={chercher} />)}
              {fil.length === 0 && <p className="x-vide">{t('ov.filVide')}</p>}
            </div>
          </>
        )}

        {onglet === 'explorer' && (
          <div className="x-explorer">
            {recherche.trim() ? (
              <>
                <div className="x-bloc-tete"><h3>{t('ov.comptesRecherche', { recherche })}</h3></div>
                {resultatsComptes.length === 0 && <p className="x-vide">{t('ov.aucunCompte')}</p>}
                {resultatsComptes.map(carteCompte)}
                <div className="x-bloc-tete"><h3>{t('ov.publicationsRecherche', { recherche })}</h3></div>
                {resultatsPosts.length === 0 && <p className="x-vide">{t('ov.aucunePublication')}</p>}
                {resultatsPosts.map((p) => <Post key={p.id} post={p} onProfil={ouvrirProfil} onRecherche={chercher} />)}
              </>
            ) : (
              <>
                <div className="x-bloc-tete">
                  <h3>{t('ov.comptesASuivre')}</h3>
                  <button className="x-rafraichir" onClick={() => void chargerSuggestions()} disabled={chargement}>
                    {chargement ? '…' : `↻ ${t('ov.autresComptes')}`}
                  </button>
                </div>
                {suggestions.map(carteCompte)}
                {suivis.length > 0 && (
                  <>
                    <div className="x-bloc-tete"><h3>{t('ov.abonnements')} ({suivis.length})</h3></div>
                    {suivis.map(carteCompte)}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {onglet === 'messages' && <Messages ouvrirSur={messageAvec} onProfil={ouvrirProfil} />}
        {onglet === 'profil' && <MonProfil onProfil={ouvrirProfil} onRecherche={chercher} />}
        {onglet === 'compte' && compteVu && (
          <Profil
            compte={compteVu}
            onFermer={() => setOnglet('timeline')}
            onMessage={ouvrirMessage}
            onProfil={ouvrirProfil}
            onRecherche={chercher}
          />
        )}

        {onglet === 'notifs' && (
          <div className="x-fil">
            {notifs.length === 0 && (
              <p className="x-vide">{t('ov.aucuneNotification')}</p>
            )}
            {notifs.map((n) => (
              <div key={n.id} className="x-notif">
                <span className="x-notif-emoji">{n.emoji}</span>
                <div>
                  <b>{n.titre}</b>
                  <p>{n.texte}</p>
                  {dateEtHeure(n) && <time className="x-notif-date">{dateEtHeure(n)}</time>}
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === 'succes' && <PanneauSucces />}
      </div>

      <aside className="x-droite">
        <form
          className="x-recherche"
          onSubmit={(e) => { e.preventDefault(); setOnglet('explorer'); }}
        >
          <Icone d={I_LOUPE} />
          <input
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); if (e.target.value) setOnglet('explorer'); }}
            placeholder={t('ov.rechercheComplete')}
          />
          {recherche && (
            <button type="button" className="x-vider" onClick={() => setRecherche('')} title={t('ov.effacer')}><Icone d={I_CROIX} /></button>
          )}
        </form>
        <div className="x-bloc">
          <h3>{t('ov.audience')}</h3>
          <div className="x-audience">
            <div><b>{compact(joueur.abonnes ?? 0)}</b><span>{t('gen.abonnes')}</span></div>
            <div><b>{suivis.length}</b><span>{t('ov.abonnements')}</span></div>
            <div><b>{Math.round(joueur.popularite ?? 50)}</b><span>{t('ov.popularite')}</span></div>
          </div>
        </div>
        <div className="x-bloc">
          <h3>{t('ov.tendances')}</h3>
          {tend.map((t) => (
            <button
              key={t.sujet}
              className="x-tendance"
              onClick={() => { setRecherche(t.sujet.replace('#', '')); setOnglet('explorer'); }}
            >
              <span className="x-tendance-cat">{t.categorie}</span>
              <b>{t.sujet}</b>
              <span className="x-tendance-vol">{t.volume}</span>
            </button>
          ))}
        </div>
      </aside>
    </motion.section>
  );
}

/** L'Ovale garde son interface joueur complète et ouvre un bureau de messages
 * dédié quand la carrière active est celle d'un entraîneur. */
export function Social() {
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  if (manager && !joueur) return <OvaleManager />;
  if (joueur) return <SocialJoueur />;
  return null;
}
