import { Fragment, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame, classementComplet, palmaresDepuisLibelles } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste, nomPoste } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { TROPHEES } from '../data/trophees';
import { LIMITES, ficheDepuisJoueur, verifierFiche } from '../lib/classementMondial';
import { nombre, t } from '../lib/i18n';
import type { LegendeSauvegardee, TitreGagne } from '../types';
import { clubParNom } from '../data/clubs';
import { Blason } from '../components/Blason';
import {
  lireClassementMondial, ficheDisponible,
  type EtatMondial, type LigneMondiale,
} from '../lib/classementEnLigne';

// ⚠️ L'ARMOIRE EST CHARGÉE À LA DEMANDE. Elle embarque three.js, ses modèles et
// son décodeur Draco : la mettre dans le chunk du classement ferait payer
// plusieurs centaines de kilo-octets à quelqu'un qui vient juste voir un
// tableau de scores.
const ArmoireTrophees = lazy(() =>
  import('../components/ArmoireTrophees').then((m) => ({ default: m.ArmoireTrophees })));

// ═══════════════════════════════════════════════════════════════════════════
// LA FICHE D'UNE CARRIÈRE — la même, qu'elle vienne d'ici ou du monde entier
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Demande explicite : « dans le classement mondial, qu'on puisse voir les
// stats des autres joueurs, leurs profils, armoires à trophées, clubs qu'ils ont
// faits ». Le tableau mondial n'affichait qu'un pseudo et un score — et pour
// cause : la base ne stockait rien d'autre (voir `serveur/schema-vercel.sql`,
// section v2, et le revirement assumé qui y est documenté).
//
// Les deux tableaux de l'écran — le local (Hall) et le mondial — ne parlent pas
// la même structure. On les ramène donc à CE format commun, et il n'y a qu'un
// seul panneau de fiche à écrire, à styler et à traduire.
interface FicheAffichable {
  cle: string;
  nom: string;
  poste?: string;
  nation?: string;
  age?: number;
  saisons?: number;
  note?: number;
  reputation?: number;
  matchs?: number;
  essais?: number;
  selections?: number;
  score: number;
  /** Libellés de titres (Hall) OU ids de trophées (mondial) : on gère les deux. */
  titres: string[];
  /**
   * Le palmarès au format de l'armoire 3D.
   *
   * ⚠️ IL EST DISTINCT DE `titres`, et il le faut : l'armoire a besoin d'IDS de
   * trophées (pour retrouver le `.glb` et la traduction), tandis que `titres`
   * peut contenir des LIBELLÉS quand la fiche vient du Hall. Les reconstruire
   * dans le composant d'affichage aurait dispersé la conversion à deux endroits.
   */
  palmares: TitreGagne[];
  clubs: string[];
  /** Fiche d'avant la v2 du schéma : on n'a que le score, et on le dit. */
  partielle?: boolean;
}

function depuisLegende(l: LegendeSauvegardee): FicheAffichable {
  // ⚠️ `tropheeIds` D'ABORD, les libellés en repli. Une sauvegarde d'avant ce
  // champ n'a que « Bouclier de Brennus (S4) » : `palmaresDepuisLibelles` sait
  // en retrouver l'id, et c'est le seul chemin qui rende son armoire à une
  // vieille légende.
  const palmares: TitreGagne[] = l.tropheeIds?.length
    ? l.tropheeIds.map((id) => ({ trophee: id, nom: id, saison: 0, club: '' }))
    : palmaresDepuisLibelles(l.titres ?? []);
  return {
    palmares,
    cle: l.id,
    nom: l.nom,
    poste: l.poste,
    nation: l.nation,
    age: l.age,
    saisons: l.saisons,
    note: l.note,
    reputation: l.reputation,
    matchs: l.matchsJoues,
    essais: l.essais,
    score: l.score,
    titres: l.titres,
    clubs: l.clubs ?? [],
  };
}

/**
 * L'identité d'une ligne mondiale à l'écran.
 *
 * ⚠️ CE N'EST PLUS LE PSEUDO, et c'est la moitié visible du correctif « si on a
 * le même pseudo qu'un joueur, notre classement apparaît pas ». Deux joueurs
 * peuvent maintenant figurer sous le même nom : deux lignes avec la même clé
 * React, c'est un rendu qui mélange les deux et une fiche qui s'ouvre sous la
 * mauvaise. L'identifiant vient de la base ; le repli sur le pseudo ne sert
 * qu'aux lignes d'une base restée à un schéma antérieur.
 */
function cleLigne(l: LigneMondiale, rang: number): string {
  return l.id != null ? `#${l.id}` : `p${rang}:${l.pseudo}`;
}

function depuisLigneMondiale(l: LigneMondiale): FicheAffichable {
  const complete = ficheDisponible(l);
  return {
    // La base ne stocke que les IDS (voir `serveur/MIGRATION-FICHES.md`) : pas
    // de saison, pas de club. L'armoire s'en accommode — elle n'affiche une
    // année que si elle en connaît une.
    palmares: (l.titres ?? []).map((id) => ({ trophee: id, nom: id, saison: 0, club: '' })),
    cle: l.id != null ? `#${l.id}` : l.pseudo,
    nom: l.nom?.trim() || l.pseudo,
    poste: l.poste ?? undefined,
    nation: l.nation ?? undefined,
    age: l.age ?? undefined,
    saisons: l.saisons ?? undefined,
    note: l.note ?? undefined,
    reputation: l.reputation ?? undefined,
    matchs: l.matchs ?? undefined,
    essais: l.essais ?? undefined,
    selections: l.selections ?? undefined,
    score: l.score,
    titres: l.titres ?? [],
    clubs: l.clubs ?? [],
    partielle: !complete,
  };
}

/**
 * Une tuile de statistique : le CHIFFRE d'abord, son nom en dessous.
 *
 * ⚠️ ELLE REMPLACE LES PASTILLES, et ce n'est pas cosmétique. Les pastilles
 * (`Note 34`, `Saisons 1`, `🏉 0 matchs`…) mettaient le libellé et la valeur sur
 * la même ligne, à la même taille : on lisait sept étiquettes grises avant de
 * trouver un chiffre. Une carrière se juge d'un coup d'œil sur ses nombres.
 */
function Tuile({ valeur, libelle, fort }: { valeur: string | number; libelle: string; fort?: boolean }) {
  return (
    <div className="fc-tuile" data-fort={fort ? 'oui' : undefined}>
      <b>{valeur}</b>
      <span>{libelle}</span>
    </div>
  );
}

function PanneauFiche({
  fiche, onFermer, onArmoire,
}: {
  fiche: FicheAffichable;
  onFermer: () => void;
  onArmoire: () => void;
}) {
  return (
    <section className="fiche-classement" aria-label={t('clst.details')}>
      {/* ═══ L'EN-TÊTE ══════════════════════════════════════════════════ */}
      <header className="fc-tete">
        <div className="fc-identite">
          <h3>{fiche.nom}</h3>
          {fiche.poste && fiche.nation && (
            <p>
              {nomPoste(migrerPoste(fiche.poste))}
              <i>·</i>
              <Drapeau nation={fiche.nation} taille={0.8} /> {nomNationTraduit(fiche.nation)}
              {fiche.age != null && <><i>·</i>{fiche.age} {t('gen.ans')}</>}
            </p>
          )}
        </div>
        {/* ⚠️ UNE CROIX, PAS UN BOUTON « Fermer ». Le panneau est un tiroir
            posé sous une ligne de tableau : un bouton pleine largeur en tête
            lui donnait l'air d'une modale, et volait la place du nom. */}
        <button type="button" className="fc-fermer" onClick={onFermer} aria-label={t('clst.fermer')}>
          ✕
        </button>
      </header>

      {fiche.partielle && <p className="fc-note">🕰️ {t('clst.ficheAncienne')}</p>}

      {/* ═══ LES CHIFFRES ═══════════════════════════════════════════════ */}
      <div className="fc-tuiles">
        <Tuile valeur={nombre(fiche.score)} libelle={t('clst.score')} fort />
        {fiche.note != null && <Tuile valeur={fiche.note} libelle={t('clst.note')} />}
        {fiche.saisons != null && <Tuile valeur={fiche.saisons} libelle={t('clst.saisons')} />}
        {fiche.matchs != null && <Tuile valeur={fiche.matchs} libelle={t('prof.matchs')} />}
        {fiche.essais != null && <Tuile valeur={fiche.essais} libelle={t('ml.essais')} />}
        {fiche.selections != null && fiche.selections > 0
          && <Tuile valeur={fiche.selections} libelle={t('clst.capes')} />}
        {fiche.reputation != null && <Tuile valeur={fiche.reputation} libelle={t('pj.reputation')} />}
        {fiche.titres.length > 0 && <Tuile valeur={fiche.titres.length} libelle={t('clst.titres')} />}
      </div>

      {/* ═══ LE PARCOURS ET LE PALMARÈS, CÔTE À CÔTE ════════════════════
          ⚠️ Deux colonnes sur grand écran, empilées sous 700 px. En une seule
          colonne, la fiche d'un joueur à dix titres faisait défiler tout le
          classement — on perdait la ligne qu'on venait d'ouvrir. */}
      <div className="fc-colonnes">
        {fiche.clubs.length > 0 && (
          <div className="fc-bloc">
            <div className="fc-titre">🏟️ {t('clst.clubs')}</div>
            <div className="parcours-clubs">
              {fiche.clubs.map((nom, i) => {
                const c = clubParNom(nom);
                return (
                  <span className="parcours-club" key={`${nom}-${i}`}>
                    {c ? <Blason club={c} taille={22} /> : null}
                    {nom}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="fc-bloc">
          <div className="fc-titre">🏆 {t('clst.armoire')}</div>
          {/* ⚠️ PLUS DE LISTE DE MÉDAILLES, JUSTE LA PORTE DE L'ARMOIRE (demande
              explicite). Une carrière à dix titres empilait dix étiquettes
              grises qui répétaient, en moins bien, ce que le meuble en 3D montre
              d'un seul regard — et qui faisaient défiler tout le classement, si
              bien qu'on perdait la ligne qu'on venait d'ouvrir. Le NOMBRE de
              titres, lui, n'est pas perdu : il est passé en tuile, au-dessus.
              ⚠️ Et c'est l'armoire de CE joueur-là, pas la sienne. */}
          {fiche.palmares.length > 0 ? (
            <button type="button" className="fc-armoire" onClick={onArmoire}>
              🗄️ {t('clst.ouvrirArmoire')}
            </button>
          ) : (
            <p className="fc-note">{t('clst.aucunTitre')}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Classement() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);
  const monRangId = useGame((s) => s.rangMondialId);
  const pseudoClassement = useGame((s) => s.pseudoClassement);
  const setPseudoClassement = useGame((s) => s.setPseudoClassement);

  const liste = classementComplet(pantheon, joueur);

  // ⚠️ LE TABLEAU MONDIAL EST UN BONUS, JAMAIS UNE DÉPENDANCE — mais il doit
  // TOUJOURS S'AFFICHER, avec son état. Il n'était rendu que s'il contenait au
  // moins une ligne : sans serveur, en panne, ou simplement vide, l'écran ne
  // montrait RIEN, pas même un titre. D'où le bug signalé en jeu (« le
  // classement fonctionne pas, la table se remplit pas ») : il n'y avait
  // littéralement pas de table à remplir. Voir `serveur/VERCEL.md`.
  const [mondial, setMondial] = useState<EtatMondial | null>(null);
  // ⚠️ UNE SEULE FICHE OUVERTE, quel que soit le tableau qui l'a ouverte : les
  // deux panneaux s'excluent, et on ne peut pas laisser deux cartes de détail
  // empilées sous le classement.
  // ⚠️ ON MÉMORISE LA CLÉ DE LA LIGNE, PAS LA FICHE. La fiche s'affiche
  // désormais SOUS le joueur qu'on vient de toucher (demande explicite) : il
  // faut donc savoir QUELLE ligne la porte, et la reconstruire à côté d'elle.
  // Garder l'objet aurait obligé à le comparer pour retrouver sa place.
  const [ligneOuverte, setLigneOuverte] = useState<string | null>(null);
  /** Le palmarès dont on regarde l'armoire en 3D, ou `null`. */
  const [vitrine, setVitrine] = useState<{ nom: string; palmares: TitreGagne[] } | null>(null);
  /**
   * La page du classement mondial affichée.
   *
   * ⚠️ ON PAGINE PARCE QUE LE CLASSEMENT NE S'ARRÊTE PLUS AU CENTIÈME (demande
   * explicite : « qu'on puisse avoir accès à tout le monde »). Une carrière
   * au-delà du top 100 existait en base sans exister à l'écran.
   */
  const [page, setPage] = useState(1);
  /** Le pseudo en cours de saisie, ou `null` quand on ne l'édite pas. */
  const [pseudoEnCours, setPseudoEnCours] = useState<string | null>(null);

  // Ouvrir une ligne, ou refermer celle qui l'était déjà.
  const basculer = (cle: string) => setLigneOuverte((v) => (v === cle ? null : cle));

  useEffect(() => {
    let vivant = true;
    // ⚠️ ON ENVOIE SON IDENTIFIANT DE LIGNE, PAS SA CLÉ. Le serveur s'en sert
    // pour renvoyer MON rang mondial, calculé sur le même tri que la page.
    lireClassementMondial(page, monRangId).then((r) => { if (vivant) setMondial(r); });
    return () => { vivant = false; };
  }, [page, monRangId]);

  // Le verdict que le serveur rendrait sur la carrière en cours : il sert à
  // afficher l'état de l'envoi automatique, et à dire pourquoi si ça coince.
  const envoi = useMemo(() => {
    if (!joueur) return null;
    // ⚠️ LE MÊME PSEUDO QUE CELUI QUI PART VRAIMENT (voir `useGame` →
    // `pseudoClassement`). Afficher un verdict calculé sur un autre nom que
    // celui envoyé, c'est promettre une ligne qui n'arrivera pas.
    const fiche = ficheDepuisJoueur(joueur, pseudoClassement || undefined);
    return { fiche, verdict: verifierFiche(fiche, Object.keys(TROPHEES)) };
  }, [joueur, pseudoClassement]);

  const monPseudo = envoi?.fiche.pseudo ?? '';
  /** La ligne du joueur, où qu'elle soit dans le classement. */
  const maLigne = mondial?.etat === 'ok' ? mondial.moi : null;
  const pages = mondial?.etat === 'ok'
    ? Math.max(1, Math.ceil(mondial.total / Math.max(1, mondial.parPage))) : 1;
  /** La page où se trouve ma ligne, pour pouvoir y sauter d'un clic. */
  const maPage = maLigne?.rang && mondial?.etat === 'ok'
    ? Math.ceil(maLigne.rang / Math.max(1, mondial.parPage)) : null;

  /**
   * Laquelle de ces lignes est la mienne ?
   *
   * ⚠️ PAR L'IDENTIFIANT RENVOYÉ AU DERNIER ENVOI, pas par le pseudo. C'est tout
   * l'objet du correctif : deux joueurs peuvent porter le même nom, et surligner
   * « moi » d'après le nom désignerait la ligne d'un inconnu une fois sur deux.
   *
   * ⚠️ LE REPLI SUR LE PSEUDO EXISTE, MAIS SOUS CONDITION : il ne s'applique que
   * si ce pseudo n'apparaît QU'UNE fois dans le tableau. Une carrière qui n'a
   * pas encore été envoyée (ou envoyée avant ce correctif) n'a pas
   * d'identifiant, et ne rien surligner du tout serait une régression pour
   * l'immense majorité des joueurs, dont le pseudo est unique. En cas de
   * doublon, on préfère ne rien surligner à surligner faux.
   */
  const estMoi = (l: LigneMondiale, lignes: LigneMondiale[]): boolean => {
    if (monRangId != null && l.id != null) return l.id === monRangId;
    if (monRangId != null) return false;
    if (!monPseudo || l.pseudo !== monPseudo) return false;
    return lignes.filter((a) => a.pseudo === monPseudo).length === 1;
  };

  return (
    <motion.section
      className="classement"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">{t('clst.eyebrow')}</div>
      <h1>🏆 {t('clst.h1')}</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.4rem' }}>
        {t('clst.chapo')}
      </p>

      {/* ⚠️ COMMENT BRANCHER CE CLASSEMENT SUR TOUS LES JOUEURS.
          Demande explicite : « explique comment connecter le classement à tous
          les joueurs, mets-le vierge ». Le tableau est désormais vide au départ
          (plus de légendes fictives), et voici la marche à suivre pour le rendre
          réellement mondial. Tant qu'il n'y a pas de serveur, tout reste sur
          l'appareil : localStorage ne se partage pas entre navigateurs. */}
      {/* ⚠️ LA FICHE D'ENVOI N'EST PLUS UN DÉPLIANT NI UN BOUTON.
          Demande explicite : « la fiche d'envoi, il faut que ça s'envoie
          automatiquement ». Elle partait sur un clic caché dans un pli — donc
          personne n'envoyait, donc la table restait vide. Le jeu envoie
          maintenant tout seul, à chaque fin de saison et à la retraite
          (`saisonSuivante` / `prendreRetraite`, store). Ce qu'on garde à
          l'écran : l'ÉTAT, une ligne, sous le tableau. */}

      {/* ═══ LE TABLEAU MONDIAL — TOUJOURS AFFICHÉ, AVEC SON ÉTAT ════════ */}
      <div className="carte tableau-classement mondial">
        <h2 style={{ marginTop: 0 }}>🌍 {t('clst.mondialTitre')}</h2>
        <p className="aide">{t('clst.mondialIntro')}</p>

        {mondial === null && <p className="aide">⏳ {t('clst.chargement')}</p>}

        {mondial?.etat === 'hors-ligne' && (
          <p className="aide">💻 {t('clst.horsLigne')}</p>
        )}

        {mondial?.etat === 'panne' && (
          <p className="aide">⛔ {t('clst.panne', { erreur: mondial.erreur })}</p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length === 0 && (
          <p className="aide">🌱 {t('clst.mondialVide')}</p>
        )}

        {mondial?.etat === 'ok' && mondial.lignes.length > 0 && (
          <>
            <div className="ligne-classement entete">
              <span className="c-rang">#</span>
              <span className="c-joueur">
                {t('clst.joueur')}
                {' · '}
                <small>{t('clst.carrieres', { n: nombre(mondial.total) })}</small>
              </span>
              <span className="c-score">{t('clst.score')}</span>
            </div>
            {/* ⚠️ CHAQUE LIGNE S'OUVRE. C'est la demande : voir les stats, le
                profil, l'armoire à trophées et les clubs des AUTRES joueurs.
                Même les lignes d'avant la v2 du schéma sont cliquables — leur
                fiche dit alors franchement qu'on n'a que le score. */}
            {mondial.lignes.map((l, i) => {
              const cle = cleLigne(l, i);
              // ⚠️ LE RANG NE PEUT PLUS ÊTRE L'INDEX DE LA LIGNE. Depuis qu'on
              // pagine, le premier de la page 3 est 101ᵉ, pas 1ᵉʳ — et il ne
              // porte évidemment pas la médaille d'or.
              const rang = (mondial.page - 1) * mondial.parPage + i + 1;
              return (
              <Fragment key={cle}>
              <button
                type="button"
                className={`ligne-classement ouvrable ${estMoi(l, mondial.lignes) ? 'moi' : ''}${ligneOuverte === `m:${cle}` ? ' deplie' : ''}`}
                onClick={() => basculer(`m:${cle}`)}
                aria-expanded={ligneOuverte === `m:${cle}`}
                title={t('clst.voirDetails')}
              >
                <span className="c-rang">
                  {rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : rang}
                </span>
                <span className="c-joueur">
                  {l.poste && (
                    <span className="c-emoji">
                      {POSTE_PAR_ID[migrerPoste(l.poste)].categorie === 'Avant' ? '🛡️' : '⚡'}
                    </span>
                  )}
                  <span>
                    <b>{l.pseudo}</b>
                    {ficheDisponible(l) && (
                      <small style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {l.poste ? `${nomPoste(migrerPoste(l.poste))} · ` : ''}
                        {l.nation ? <><Drapeau nation={l.nation} taille={0.72} /> {nomNationTraduit(l.nation)} · </> : null}
                        {l.saisons} {t('clst.saisons').toLowerCase()}
                      </small>
                    )}
                  </span>
                </span>
                <span className="c-score">{nombre(l.score)}</span>
              </button>
              {/* ⚠️ LA FICHE S'OUVRE SOUS LE JOUEUR QU'ON VIENT DE TOUCHER
                  (demande explicite). Elle s'affichait auparavant tout en bas
                  de la page, après les DEUX tableaux : sur un classement de
                  cent lignes, on touchait un nom et il ne se passait rien à
                  l'écran — il fallait deviner qu'il fallait faire défiler. */}
              {ligneOuverte === `m:${cle}` && (
                <PanneauFiche
                  fiche={depuisLigneMondiale(l)}
                  onFermer={() => setLigneOuverte(null)}
                  onArmoire={() => {
                    const f = depuisLigneMondiale(l);
                    setVitrine({ nom: f.nom, palmares: f.palmares });
                  }}
                />
              )}
              </Fragment>
              );
            })}

            {/* ---------- LES PAGES : LE CLASSEMENT NE S'ARRÊTE PLUS AU 100ᵉ ----------
                Demande explicite : « qu'on puisse avoir accès à tout le
                monde ». Au-delà du centième, une carrière existait en base sans
                exister à l'écran, et son auteur n'avait aucun moyen de savoir
                où il se situait. */}
            {pages > 1 && (
              <div className="pages-classement">
                <button
                  type="button"
                  className="btn fantome petit"
                  disabled={mondial.page <= 1}
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                >
                  ‹ {t('clst.precedent')}
                </button>
                <span className="pages-position">
                  {t('clst.pageSur', { page: mondial.page, pages })}
                </span>
                <button
                  type="button"
                  className="btn fantome petit"
                  disabled={mondial.page >= pages}
                  onClick={() => setPage((v) => Math.min(pages, v + 1))}
                >
                  {t('clst.suivant')} ›
                </button>
                {maPage != null && maPage !== mondial.page && (
                  <button
                    type="button"
                    className="btn fantome petit"
                    title={t('clst.maPlaceAide')}
                    onClick={() => setPage(maPage)}
                  >
                    🎯 {t('clst.maPlace')}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ---------- MA LIGNE, TOUJOURS SOUS LES YEUX ----------
            Demande explicite : « qu'on puisse voir notre classement en bas ».
            ⚠️ ELLE NE DÉPEND PAS DE LA PAGE AFFICHÉE : le rang vient du serveur,
            calculé sur le MÊME tri que le tableau. On est 4 000ᵉ et on le voit,
            sans se chercher soi-même dans quarante pages. */}
        {mondial?.etat === 'ok' && maLigne && (
          <div className="ma-ligne-mondiale">
            <div className="eyebrow">{t('clst.monRang')}</div>
            <button
              type="button"
              className="ligne-classement moi"
              disabled={maPage == null || maPage === mondial.page}
              title={t('clst.maPlaceAide')}
              onClick={() => { if (maPage != null) setPage(maPage); }}
            >
              <span className="c-rang">{maLigne.rang ?? '-'}</span>
              <span className="c-joueur">
                <span>
                  <b>{maLigne.pseudo}</b>
                  <small>
                    {maLigne.nom && maLigne.nom !== maLigne.pseudo ? `${maLigne.nom} · ` : ''}
                    {maLigne.saisons ? `${maLigne.saisons} ${t('clst.saisons').toLowerCase()}` : ''}
                  </small>
                </span>
              </span>
              <span className="c-score">{nombre(maLigne.score)}</span>
            </button>
          </div>
        )}

        {/* ---------- SOUS QUEL NOM JE FIGURE, ET COMMENT EN CHANGER ---------- */}
        {envoi && pseudoEnCours !== null && (
          <div className="edition-pseudo">
            <label htmlFor="pseudo-classement">{t('clst.tonPseudo')}</label>
            <div className="edition-pseudo-ligne">
              <input
                id="pseudo-classement"
                type="text"
                value={pseudoEnCours}
                maxLength={LIMITES.pseudoMax}
                placeholder={joueur?.nom ?? ''}
                onChange={(ev) => setPseudoEnCours(ev.target.value)}
              />
              <button
                type="button"
                className="btn vert petit"
                onClick={() => { setPseudoClassement(pseudoEnCours); setPseudoEnCours(null); }}
              >
                {t('ov.enregistrer')}
              </button>
              <button type="button" className="btn fantome petit" onClick={() => setPseudoEnCours(null)}>
                {t('ov.annuler')}
              </button>
            </div>
            <p className="aide">{t('clst.pseudoAide')}</p>
          </div>
        )}

        {/* ⚠️ PLUS DE BOUTON : L'ENVOI EST AUTOMATIQUE. Ne reste que l'état, en
            une ligne — le joueur doit savoir sous quel nom il figure et avec
            quel score, mais il n'a rien à faire. */}
        {envoi && (
          <p className="aide" style={{ marginTop: '1rem' }}>
            {envoi.verdict.valide
              ? t('clst.publie', { pseudo: monPseudo, score: nombre(envoi.verdict.score) })
              : t('clst.rejete', { erreurs: envoi.verdict.anomalies.join(' · ') })}
            {!maLigne && envoi.verdict.valide && ` ${t('clst.pasEncoreClasse')}`}
            {pseudoEnCours === null && (
              <>
                {' '}
                <button
                  type="button"
                  className="btn fantome petit"
                  onClick={() => setPseudoEnCours(pseudoClassement)}
                >
                  ✏️ {t('clst.changerPseudo')}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      {/* ⚠️ LE MODE D'EMPLOI DU CLASSEMENT A ÉTÉ RETIRÉ DE L'ÉCRAN.
          Demande explicite : « supprime la case dans le classement qui explique
          comment le setup ». Ce dépliant déroulait un schéma SQL, la liste des
          bornes de vérification et les recommandations serveur : de la
          documentation de DÉVELOPPEUR affichée à un JOUEUR. Elle vit maintenant
          là où elle sert — serveur/VERCEL.md et CLAUDE.md.
          Le dépliant « 🔐 Ma fiche d'envoi », lui, reste : voir en clair ce
          qu'on envoie fait partie du contrat de confiance. */}

      {liste.length === 0 ? (
        <div className="carte classement-vide">
          <p>
            🏟️ <b>{t('clst.vide')}</b>
          </p>
          <p className="aide">
            Aucune carrière n'a encore été menée à son terme sur cet appareil.
            Joue, raccroche les crampons, et ton nom s'inscrira ici le premier.
          </p>
        </div>
      ) : (
      <div className="carte tableau-classement">
        <div className="ligne-classement entete">
          <span className="c-rang">#</span>
          <span className="c-joueur">{t('clst.joueur')}</span>
          <span className="c-note">{t('clst.note')}</span>
          <span className="c-saisons">{t('clst.saisons')}</span>
          <span className="c-score">{t('clst.score')}</span>
        </div>
        {liste.map((l, i) => (
          <Fragment key={l.id}>
          <button
            type="button"
            className={`ligne-classement ouvrable ${l.joueur ? 'moi' : ''} ${l.enCours ? 'en-cours' : ''}${ligneOuverte === `h:${l.id}` ? ' deplie' : ''}`}
            onClick={() => basculer(`h:${l.id}`)}
            aria-expanded={ligneOuverte === `h:${l.id}`}
            title={t('clst.voirDetails')}
          >
            <span className="c-rang">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <span className="c-joueur">
              <span className="c-emoji">
                {POSTE_PAR_ID[migrerPoste(l.poste)].categorie === 'Avant' ? '🛡️' : '⚡'}
              </span>
              <span>
                <b>{l.nom}</b>
                <small style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {nomPoste(migrerPoste(l.poste))} · <Drapeau nation={l.nation} taille={0.72} /> {nomNationTraduit(l.nation)}
                </small>
              </span>
            </span>
            <span className="c-note">{l.note}</span>
            <span className="c-saisons">{l.saisons}</span>
            <span className="c-score">{nombre(l.score ?? 0)}</span>
          </button>
          {ligneOuverte === `h:${l.id}` && (
            <PanneauFiche
              fiche={depuisLegende(l)}
              onFermer={() => setLigneOuverte(null)}
              onArmoire={() => {
                const f = depuisLegende(l);
                setVitrine({ nom: f.nom, palmares: f.palmares });
              }}
            />
          )}
          </Fragment>
        ))}
      </div>
      )}

      {/* ⚠️ L'ARMOIRE EST UNE MODALE, PAS UN BLOC DE PAGE : elle monte un canvas
          three.js plein écran et se ferme au clic hors du meuble, comme depuis
          le Hall. C'est le MÊME composant — le palmarès d'un inconnu se regarde
          exactement comme le sien. */}
      <AnimatePresence>
        {vitrine && (
          <Suspense fallback={null}>
            <ArmoireTrophees
              nom={vitrine.nom}
              palmares={vitrine.palmares}
              onFermer={() => setVitrine(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '2rem' }}>
        {joueur ? (
          <button className="btn primaire" onClick={() => setEcran('carriere')}>
            {t('clst.grimper')}
          </button>
        ) : (
          <button className="btn primaire" onClick={() => setEcran('creation')}>
            {t('clst.commencer')}
          </button>
        )}
        <button className="btn fantome" onClick={() => setEcran('pantheon')}>
          {t('clst.hall')}
        </button>
      </div>
    </motion.section>
  );
}
