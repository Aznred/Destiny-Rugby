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

import { useEffect, useMemo, useRef, useState } from 'react';
import { locale, t } from '../lib/i18n';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { clubParNom } from '../data/clubs';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { TONS } from '../data/social';
import { LEVIERS, resumerTermes } from '../lib/negociation';
import { AGENT_PAR_ID, niveauPourAgent, SEUIL_AGENT } from '../data/agents';
import { cote } from '../lib/offres';
import { compact, estCertifie, LIMITE_CARACTERES, pseudoDe, tendances } from '../lib/social';
import { annuaire, chercherComptes, chercherPosts, banniereDe, BANNIERES } from '../lib/comptes';
import { humeur } from '../lib/vie';
import { SUCCES, descriptionSucces, nomSucces, texteDefi } from '../data/succes';
import { defisDeLaSemaine, cleSemaine, progression } from '../lib/succes';
import { CLE_ENV } from '../lib/groq';
import { chercherMedias, reduirePourAvatar, vignetteLocale, type Media as MediaTrouve } from '../lib/images';
import { semaine } from '../data/calendrier';
import { avatarInitiales } from '../lib/avatars';
import type { CompteSuivi, Joueur, PostSocial } from '../types';

function dateEtHeure(instant?: number): string | null {
  if (!instant) return null;
  return new Intl.DateTimeFormat(locale(), {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(instant));
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

const EMOJIS_PROFIL = ['🏉', '💪', '🔥', '🐐', '⚡', '🦁', '🐓', '🌊', '🎯', '👑', '🥇', '😎'];

function LogoOvale() {
  return (
    <span className="x-logo" title="L’Ovale">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path d="M2.5 2h5.2l4.6 6.2L17.2 2H21l-6.8 8.6L21.6 22h-5.2l-5-6.7L5.6 22H2l7.2-9.1L2.5 2Z" />
      </svg>
      <b>🏉</b>
    </span>
  );
}

function Certifie() {
  return (
    <svg className="x-verifie" viewBox="0 0 24 24" width="16" height="16" aria-label="certifié">
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
            : data ? <Blason club={data} taille={taille} /> : <span>🏉</span>}
      </span>
    );
  }
  if (avatar.startsWith('club:')) {
    const data = clubParNom(avatar.slice(5));
    return (
      <span className="x-avatar" style={style}>
        {data ? <Blason club={data} taille={taille} /> : <span>🏟️</span>}
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
function compteDepuis(
  joueur: Joueur, pseudo: string, posts: PostSocial[], fiches: CompteSuivi[] = [],
): CompteSuivi {
  const connu = annuaire(joueur).find((c) => c.pseudo === pseudo)
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
    bio: vu ? 'Compte croisé sur L’Ovale.' : 'Ce compte n’a encore rien publié.',
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
  post, reponse, onProfil, onRecherche,
}: {
  post: PostSocial;
  reponse?: boolean;
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
        <button className="x-lien-profil" onClick={() => onProfil(post.pseudo)} title={`Profil de @${post.pseudo}`}>
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
              🔁 <b>{post.action.joueur}</b> — {post.action.de} → {post.action.vers}
              <span>transfert appliqué au jeu</span>
            </div>
          )}
          <div className="x-actions">
            <button
              className={`x-action reponses${commentaire != null ? ' actif' : ''}`}
              onClick={() => (reponse ? setDeploye((v) => !v) : setCommentaire((c) => (c == null ? '' : null)))}
              title={reponse ? 'Réponses' : 'Répondre'}
            >
              <Icone d={I_REPONSE} />
              <span>{reponses.length || ''}</span>
            </button>
            <button
              className={`x-action reposts${post.repostee ? ' actif' : ''}`}
              onClick={() => reposter(post.id)}
              title={post.repostee ? 'Annuler le repost' : 'Reposter'}
            >
              <Icone d={I_REPOST} />
              <span>{compact(post.reposts)}</span>
            </button>
            <button
              className={`x-action likes${post.aime ? ' actif' : ''}`}
              onClick={() => aimerPost(post.id)}
              title="J’aime"
            >
              <Icone d={I_COEUR} />
              <span>{compact(post.likes)}</span>
            </button>
            <button className="x-action vues" title="Vues">
              <Icone d={I_VUES} />
              <span>{compact(post.vues)}</span>
            </button>
            {reponses.length > 0 && !reponse && (
              <button className="x-voir-rep" onClick={() => setDeploye((v) => !v)}>
                {deploye ? 'Masquer' : `${reponses.length} réponse${reponses.length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          {commentaire != null && (
            <div className="x-repondre">
              <Avatar avatar="moi" club={joueur?.club} taille={30} />
              <input
                autoFocus
                value={commentaire}
                maxLength={LIMITE_CARACTERES}
                placeholder={`Répondre à @${post.pseudo}…`}
                onChange={(e) => setCommentaire(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void envoyer(); }}
              />
              <button className="x-poster" disabled={!commentaire.trim() || envoi} onClick={() => void envoyer()}>
                {envoi ? '…' : 'Répondre'}
              </button>
            </div>
          )}
        </div>
      </article>
      {deploye && reponses.map((r) => (
        <Post key={r.id} post={r} reponse onProfil={onProfil} onRecherche={onRecherche} />
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
          placeholder="Quoi de neuf ?"
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
            <button onClick={() => setMedia(undefined)} title="Retirer">✕</button>
          </div>
        )}

        {galerie && (
          <div className="x-galerie">
            <div className="x-galerie-recherche">
              <input
                value={requete}
                placeholder={tenorKey ? 'Chercher un GIF…' : 'Chercher une image (mots-clés)'}
                onChange={(e) => setRequete(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void lancerRecherche(requete); }}
              />
              <button className="x-poster" onClick={() => void lancerRecherche(requete)} disabled={chargeMedia}>
                {chargeMedia ? '…' : 'Chercher'}
              </button>
              <button className="x-fermer-galerie" onClick={() => setGalerie(null)}>✕</button>
            </div>
            <div className="x-galerie-grille">
              {galerie.length === 0 && !chargeMedia && <p className="x-vide">Rien trouvé.</p>}
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
          {TONS.map((t) => (
            <button
              key={t.id}
              className={`x-ton${ton === t.id ? ' actif' : ''}`}
              onClick={() => setTon(t.id)}
              title={t.desc}
            >
              {t.emoji} {t.nom}
            </button>
          ))}
        </div>
        <p className="x-ton-desc">
          {tonChoisi.desc}
          {tonChoisi.risque > 0.2 && <b className="x-risque"> ⚠️ Le club surveille ce genre de sortie.</b>}
        </p>
        <div className="x-composer-pied">
          <button
            className="x-media-btn"
            title={tenorKey ? 'Ajouter un GIF ou une image' : 'Ajouter une image libre'}
            onClick={() => { setGalerie([]); void lancerRecherche(requete || 'rugby'); }}
          >
            {tenorKey ? 'GIF' : '🖼️'}
          </button>
          <span className={`x-compteur${restant < 40 ? ' bas' : ''}`}>{restant}</span>
          <button
            className="x-poster"
            disabled={!texte.trim() || chargement}
            onClick={() => { const t = texte; const m = media; setTexte(''); setMedia(undefined); void publier(t, ton, m); }}
          >
            {chargement ? 'Publication…' : 'Poster'}
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
    ami: '💚 Proche', cordial: '🙂 Cordial', neutre: '· Neutre',
    froid: '🧊 Tendu', ennemi: '💢 Conflit ouvert',
  };

  return (
    <div className="x-profil">
      <div className="x-profil-tete">
        <button className="x-retour" onClick={onFermer}>←</button>
        <div>
          <b>{compte.nom}</b>
          <span>{siens.length} publication{siens.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="x-banniere" style={{ background: compte.banniere ?? banniereDe(compte.pseudo) }} />
      <div className="x-profil-corps">
        <div className="x-profil-avatar">
          <Avatar avatar={compte.avatar} club={compte.club} taille={76} nom={compte.nom} />
        </div>
        <div className="x-profil-boutons">
          <button className="x-suivre secondaire" onClick={() => onMessage(compte.pseudo)}>Message</button>
          <button
            className={abonne ? 'x-suivre abonne' : 'x-suivre'}
            onClick={() => (abonne ? nePlusSuivre(compte.pseudo) : suivre(compte))}
          >
            {abonne ? 'Abonné' : 'Suivre'}
          </button>
        </div>
        <h2>{compte.nom}{compte.certifie && <Certifie />}</h2>
        <span className="x-pseudo">@{compte.pseudo}</span>
        {compte.bio && <p className="x-bio">{compte.bio}</p>}
        <div className="x-profil-chiffres">
          <span><b>{compact(compte.abonnes)}</b> {t('gen.abonnes')}</span>
          {compte.club && <span>🏟️ {compte.club}</span>}
          <span className="x-relation" data-etat={humeur(relation)}>
            {ETAT[humeur(relation)]}
          </span>
        </div>
      </div>
      <div className="x-fil">
        {siens.length === 0 && <p className="x-vide">Ce compte n’a encore rien publié ici.</p>}
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
            {edition ? 'Fermer' : 'Modifier le profil'}
          </button>
        </div>
        <h2>{enregistre.nomAffiche}{estCertifie(joueur) && <Certifie />}</h2>
        <span className="x-pseudo">@{enregistre.pseudo}</span>
        <p className="x-bio">{enregistre.bio || `${joueur.club} · saison ${joueur.saison}`}</p>
        <div className="x-profil-chiffres">
          <span><b>{compact(joueur.abonnes ?? 0)}</b> {t('gen.abonnes')}</span>
          <span><b>{suivis.length}</b> {t('ov.abonnements')}</span>
          <span><b>{miens.length}</b> {t('ov.publications')}</span>
          <span><b>{reposts.length}</b> reposts</span>
        </div>
      </div>

      {edition && (
        <div className="x-edition">
          {/* L'aperçu montre le brouillon — le profil du dessus, lui, ne bouge
              pas tant qu'on n'a pas cliqué « Enregistrer ». */}
          <div className="x-apercu" style={{ background: brouillon.banniere }}>
            <span className="x-apercu-tag">Aperçu — non enregistré</span>
            <div className="x-apercu-carte">
              <span className="x-avatar" style={{ width: 46, height: 46 }}>
                {brouillon.avatar.startsWith('data:')
                  ? <img className="x-photo" src={brouillon.avatar} alt="" />
                  : brouillon.avatar === 'club'
                    ? (clubParNom(joueur.club) ? <Blason club={clubParNom(joueur.club)!} taille={46} /> : <span>🏉</span>)
                    : <span style={{ fontSize: 26 }}>{brouillon.avatar}</span>}
              </span>
              <div>
                <b>{brouillon.nomAffiche || '—'}</b>
                <i>@{brouillon.pseudo || '—'}</i>
                <p>{brouillon.bio || 'Aucune bio.'}</p>
              </div>
            </div>
          </div>
          <label>
            Nom affiché
            <input value={brouillon.nomAffiche} maxLength={40} onChange={(e) => maj({ nomAffiche: e.target.value })} />
          </label>
          <label>
            Identifiant
            <input value={brouillon.pseudo} maxLength={20} onChange={(e) => maj({ pseudo: e.target.value })} />
          </label>
          <label>
            Bio
            <textarea value={brouillon.bio} maxLength={160} rows={2} onChange={(e) => maj({ bio: e.target.value })} />
          </label>
          <div className="x-choix">
            <span>Photo de profil</span>
            {/* Un fichier du disque : redimensionné en 160×160 avant d'être
                rangé dans la sauvegarde (le localStorage plafonne à ~5 Mo). */}
            <label className="x-fichier">
              📁 Importer une photo
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
                <button className="actif" title="Ta photo">
                  <img src={brouillon.avatar} alt="" />
                </button>
              )}
              <button
                className={brouillon.avatar === 'club' ? 'actif' : ''}
                onClick={() => maj({ avatar: 'club' })}
                title="L’écusson de ton club"
              >
                🛡️
              </button>
              {EMOJIS_PROFIL.map((e) => (
                <button key={e} className={brouillon.avatar === e ? 'actif' : ''} onClick={() => maj({ avatar: e })}>{e}</button>
              ))}
            </div>
          </div>
          <div className="x-choix">
            <span>Bannière</span>
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
              Annuler
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
              {modifie ? 'Enregistrer' : 'Aucune modification'}
            </button>
          </div>
        </div>
      )}

      <div className="x-fil">
        {miens.length === 0 && reposts.length === 0 && <p className="x-vide">Tu n’as encore rien publié.</p>}
        {miens.map((x) => <Post key={x.id} post={x} onProfil={onProfil} onRecherche={onRecherche} />)}
        {reposts.length > 0 && (
          <>
            <div className="x-bloc-tete"><h3>🔁 Tes reposts</h3></div>
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
  if (!joueur) return null;

  const { faits, total } = progression(debloques);
  const sem = joueur.semaine ?? 1;
  const actifs = defisDeLaSemaine(joueur.saison, sem);
  const coches = defisFaits.cle === cleSemaine(joueur.saison, sem) ? defisFaits.faits : [];

  return (
    <div className="x-succes">
      <div className="x-defis">
        <h3>🎯 {t('ov.defisHebdo')}</h3>
        <p className="x-note">{t('ov.defisAide')}</p>
        {actifs.map((d) => {
          const fait = coches.includes(d.id);
          return (
            <div key={d.id} className={`x-defi${fait ? ' fait' : ''}`}>
              <span className="x-defi-emoji">{d.emoji}</span>
              <span className="x-defi-texte">{texteDefi(d.id, d.texte)}</span>
              <span className="x-defi-gain">{fait ? '✅' : `+${d.ovas} 🪙`}</span>
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
        🤝 <b>Accord trouvé</b> — {resumerTermes(accord.offre)}.
        <span>Le transfert s’officialise à l’intersaison. D’ici là, tu finis ta saison.</span>
      </div>
    );
  }
  if (!approche) return null;

  return (
    <div className="x-nego">
      <div className="x-nego-tete">
        <b>{approche.prolongation ? '📄 Prolongation' : '✍️ Proposition de contrat'}</b>
        {/* La patience se voit : c'est le seul indice sur ce qu'il reste à jouer. */}
        <span className="x-nego-patience" title="Le club se braquera si tu pousses trop loin">
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
            title={`${l.phrase} (coûte ${l.cout} tour${l.cout > 1 ? 's' : ''} de patience)`}
            disabled={l.id === 'garantie' && approche.offre.garantie}
          >
            {l.emoji} {l.nom}
          </button>
        ))}
      </div>
      <div className="x-nego-fin">
        <button className="x-nego-oui" onClick={() => accepter(approche.id)}>
          🤝 Accepter cette offre
        </button>
        {confirme ? (
          <button className="x-nego-non" onClick={() => refuser(approche.id)}>
            Confirmer le refus
          </button>
        ) : (
          <button className="x-nego-non" onClick={() => setConfirme(true)}>Décliner</button>
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
        <b>{agent.emoji} {agent.nom}</b>
        <span className="x-nego-patience">
          niveau {Math.round(niveau)} / {Math.round(seuil)}
        </span>
      </div>
      <p className="x-nego-offre">
        {agent.desc} Commission : {Math.round(agent.commission * 100)} % du salaire.
      </p>
      <div className="x-nego-fin">
        {sien ? (
          <button className="x-nego-non" onClick={() => choisir('')}>
            Rompre le mandat
          </button>
        ) : (
          <button className="x-nego-oui" onClick={() => choisir(agent.id)}>
            🤝 Lui confier mes intérêts
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
  const chargement = useGame((s) => s.chargementSocial);

  // Les interlocuteurs : comptes suivis + toute conversation déjà ouverte.
  const tous = useMemo(() => {
    const monde = annuaire(joueur);
    const pseudos = new Set([...suivis.map((c) => c.pseudo), ...Object.keys(conversations)]);
    if (ouvrirSur) pseudos.add(ouvrirSur);
    return [...pseudos].map((p) => {
      const connu = suivis.find((c) => c.pseudo === p) ?? monde.find((c) => c.pseudo === p);
      if (connu) return connu;
      const approche = approches.find((a) => a.pseudo === p);
      if (approche) {
        return { pseudo: p, nom: approche.club, avatar: `club:${approche.club}`, type: 'club', club: approche.club } as CompteSuivi;
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
        ? AGENT_PAR_ID[p.slice('agent:'.length)]?.nom ?? p
        : p.replace(/_officiel$/, '').replace(/_/g, ' ');
      return { pseudo: p, nom, avatar: '💼', type: 'media' } as CompteSuivi;
    }).sort((a, b) => {
      const date = (p: string) => conversations[p]?.at(-1)?.creeLe ?? 0;
      return date(b.pseudo) - date(a.pseudo);
    });
  }, [suivis, conversations, ouvrirSur, joueur, approches]);

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

  return (
    <div className="x-messagerie">
      <div className="x-conversations">
        {tous.map((c) => {
          const filConversation = conversations[c.pseudo] ?? [];
          const nonLu = filConversation.some((m) => m.de === 'lui' && !m.lu);
          const dernierMessage = filConversation.at(-1);
          const horodatage = dateEtHeure(dernierMessage?.creeLe);
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
        <div className="x-bulles">
          {fil.length === 0 && <p className="x-vide">{t('ov.premierMessage')}</p>}
          {fil.map((m) => (
            <div key={m.id} className={`x-bulle ${m.de === 'moi' ? 'moi' : 'lui'}`}>
              <span>{m.texte}</span>
              {dateEtHeure(m.creeLe) && <time>{dateEtHeure(m.creeLe)}</time>}
            </div>
          ))}
          {chargement && <div className="x-bulle lui ecrit">{t('ov.ecrit')}</div>}
          <div ref={bas} />
        </div>

        {/* ═══ LA NÉGOCIATION DE CONTRAT ═══════════════════════════════════
            ⚠️ Demande explicite : « refaire tout le système de transfert, que
            ça se passe par X ». Quand l'interlocuteur est un club qui t'a
            approché, la conversation porte les LEVIERS. Ce sont eux qui
            décident — l'IA n'écrit que l'habillage (`lib/negociation.ts`), donc
            tout fonctionne à l'identique sans clé Groq. */}
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

// --- Écran -----------------------------------------------------------------
type Onglet = 'timeline' | 'explorer' | 'messages' | 'notifs' | 'succes' | 'profil' | 'compte';

export function Social() {
  const joueur = useGame((s) => s.joueur);
  const posts = useGame((s) => s.posts ?? []);
  const notifs = useGame((s) => s.notifsSocial ?? []);
  const suivis = useGame((s) => s.comptesSuivis ?? []);
  const suggestions = useGame((s) => s.suggestionsComptes ?? []);
  const groqKey = useGame((s) => s.groqKey);
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

  const avecIA = !!(groqKey || CLE_ENV);

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

  // Avec une clé, l'IA écrit par-dessus la fournée locale — une fois par
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
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>🏉</span> <span>{t('ov.maCarriere')}</span>
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

        {erreur && <div className="x-erreur">⚠️ {erreur}</div>}

        {onglet === 'timeline' && (
          <>
            <Composer />
            <div className="x-actualiser">
              <span className={`x-vivant${chargement ? ' occupe' : ''}`}>
                ● {chargement ? 'le réseau écrit…' : `semaine ${joueur.semaine ?? 1} · ${semaine(joueur.semaine ?? 1).libelle}`}
              </span>
              <span>{t('ov.filSemaine')}</span>
              {!avecIA && <span>Ajoute une clé Groq dans ⚙️ pour un fil écrit par l’IA.</span>}
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
                <div className="x-bloc-tete"><h3>Comptes — « {recherche} »</h3></div>
                {resultatsComptes.length === 0 && <p className="x-vide">{t('ov.aucunCompte')}</p>}
                {resultatsComptes.map(carteCompte)}
                <div className="x-bloc-tete"><h3>Publications — « {recherche} »</h3></div>
                {resultatsPosts.length === 0 && <p className="x-vide">{t('ov.aucunePublication')}</p>}
                {resultatsPosts.map((p) => <Post key={p.id} post={p} onProfil={ouvrirProfil} onRecherche={chercher} />)}
              </>
            ) : (
              <>
                <div className="x-bloc-tete">
                  <h3>Comptes à suivre</h3>
                  <button className="x-rafraichir" onClick={() => void chargerSuggestions()} disabled={chargement}>
                    {chargement ? '…' : '↻ Autres comptes'}
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
              <p className="x-vide">Rien pour l’instant. Publie quelque chose, ça viendra vite.</p>
            )}
            {notifs.map((n) => (
              <div key={n.id} className="x-notif">
                <span className="x-notif-emoji">{n.emoji}</span>
                <div>
                  <b>{n.titre}</b>
                  <p>{n.texte}</p>
                  {dateEtHeure(n.creeLe) && <time className="x-notif-date">{dateEtHeure(n.creeLe)}</time>}
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
            <button type="button" className="x-vider" onClick={() => setRecherche('')} title="Effacer">✕</button>
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
