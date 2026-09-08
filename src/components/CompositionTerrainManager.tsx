import { useGlisserDeposer } from './GlisserDeposer';
// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCRAN DE COMPOSITION — le terrain, les cartes, le panneau
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « un terrain vertical avec les 15 cartes placées à leur poste »,
// « les cartes pourraient donner toutes les infos importantes sans avoir à
// ouvrir le profil du joueur », et surtout :
//
//   « Ce qui pourrait rendre ton jeu vraiment identifiable visuellement, ce
//     serait de reprendre le plaisir du squad builder FUT mais avec un design
//     original rugby, par exemple cartes type billet/stade/vestiaire plutôt que
//     de trop ressembler aux cartes EA. »
//
// ⚠️ TOUTE LA LOGIQUE VIT DANS `lib/carteJoueur.ts`, PAS ICI. Quels axes montrer
// pour quel poste, comment classer un statut, ce qu'est un poste secondaire :
// ce sont des règles de jeu, elles se mesurent sans navigateur
// (`scripts/verifCarteJoueur.ts`). Ce fichier ne fait que les rendre.
//
// ⚠️ ET LES INDICATEURS QU'ON N'A PAS, ON NE LES INVENTE PAS. La condition et la
// forme d'un joueur d'effectif n'existent pas encore en mode manager : les
// afficher au jugé donnerait des chiffres crédibles et faux, ce qui est pire que
// de ne rien montrer. `etats` est donc facultatif, et les deux jauges du bas de
// carte disparaissent quand il est absent.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, RefObject, ReactNode } from 'react';
import { nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import { POSTES_BANC_MANAGER, POSTES_XV_MANAGER } from '../lib/compositionManager';
import {
  adequationAuPoste, alertesDeComposition, badgesDe,
  facteurDePerformance, notesDeLEquipe, statsDeCarte, statutDe, valeurAxe,
  attributsDe, ABREVIATION, axesDe, rareteDe, estPepite, NOM_RARETE,
} from '../lib/carteJoueur';
import type {
  Adequation, BadgeCarte, EtatDuJoueur, RareteCarte, StatutCarte,
} from '../lib/carteJoueur';
import { Icone } from './Icone';
import type { NomIcone } from './Icone';
import {
  SECTEURS_COHESION, cohesionGlobale, connexion, libelleCohesion,
} from '../lib/cohesion';
import type { Automatismes } from '../lib/cohesion';
import type { Coequipier } from '../lib/effectif';
import type { CompositionManager, PosteId } from '../types';
import { photoReelle } from '../lib/avatars';

type ZoneComposition = 'titulaires' | 'remplacants';

interface Props {
  rendreCarte?: (joueur: Coequipier) => ReactNode;
  /**
   * Ce qui se glisse SOUS la ligne d'indicateurs (numero, adequation, forme).
   * Le mode en ligne y pose la barre de collectif du joueur : elle appartient
   * a la carte, mais elle se lit avec la forme, pas par-dessus le portrait.
   */
  rendreSousCarte?: (joueur: Coequipier) => ReactNode;
  /** Joueurs alignables cette semaine. */
  effectif: Coequipier[];
  /** Tout le groupe sous contrat, indisponibles compris. */
  effectifComplet?: Coequipier[];
  composition: CompositionManager;
  onPlacer: (zone: ZoneComposition, index: number, joueurId: string) => void;
  /** Facultatif : condition, forme, blessure, suspension, sélection. */
  etats?: Map<string, EtatDuJoueur>;
  /** Joueurs visibles dans le groupe mais impossibles à aligner. */
  indisponibles?: ReadonlySet<string>;
  /** Facultatif : les cinq secteurs d'automatismes (`lib/cohesion.ts`). */
  automatismes?: Automatismes;
  onCapitaine?: (joueurId: string) => void;
  onButeur?: (joueurId: string) => void;
}

/** Placement visuel d'un XV de rugby, du pack (bas) vers l'en-but adverse. */
const PLACEMENT_XV = [
  [26, 84], [50, 88], [74, 84],
  [39, 71], [61, 71],
  [23, 57], [77, 57], [50, 58],
  [40, 45], [56, 36],
  [12, 18], [36, 24], [64, 23], [88, 18], [50, 9],
] as const;

/**
 * ⚠️ LES PARTENAIRES DIRECTS D'UN POSTE, pour les liaisons du panneau. La
 * demande donne les trois qui comptent : la charnière, la première ligne, et le
 * couple talonneur-sauteur en touche. Les afficher toutes ferait un plat de
 * spaghettis illisible ; ce sont ces trois-là qu'un entraîneur regarde.
 */
const PARTENAIRES: Partial<Record<PosteId, PosteId[]>> = {
  demi_melee: ['demi_ouverture', 'numero_8'],
  demi_ouverture: ['demi_melee', 'premier_centre'],
  premier_centre: ['deuxieme_centre', 'demi_ouverture'],
  deuxieme_centre: ['premier_centre', 'ailier_droit'],
  pilier_gauche: ['talonneur', 'deuxieme_ligne_g'],
  talonneur: ['pilier_gauche', 'pilier_droit', 'deuxieme_ligne_g'],
  pilier_droit: ['talonneur', 'deuxieme_ligne_d'],
  deuxieme_ligne_g: ['deuxieme_ligne_d', 'talonneur'],
  deuxieme_ligne_d: ['deuxieme_ligne_g', 'talonneur'],
  ailier_gauche: ['premier_centre', 'arriere'],
  ailier_droit: ['deuxieme_centre', 'arriere'],
  arriere: ['ailier_gauche', 'ailier_droit'],
};

function nomCarte(nom: string): string {
  const morceaux = nom.trim().split(/\s+/);
  if (morceaux.length <= 2) return nom;
  return `${morceaux[0]} ${morceaux.at(-1)}`;
}

/**
 * ⚠️ TROIS PASTILLES DESSINÉES, PLUS TROIS EMOJI. 🟢🟡🔴 sont trois disques de
 * la police emoji du système : ils n'ont ni la même taille ni le même vert d'un
 * appareil à l'autre, et aucun de ces verts n'est celui du jeu. Ce sont
 * désormais trois cercles pleins en `currentColor`, coloriés par leur classe.
 */
function PastilleAdequation({ adequation }: { adequation: Adequation }) {
  return (
    <svg
      className={`ct-pastille ct-pastille-${adequation}`}
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="4.6" fill="currentColor" />
    </svg>
  );
}

/** Les badges temporaires, en tracés plutôt qu'en emoji système. */
const ICONE_BADGE: Record<BadgeCarte, NomIcone> = {
  enForme: 'flamme', blesse: 'soin', suspendu: 'carton', espoir: 'pousse',
  international: 'drapeau', fatigue: 'batterie',
};


/**
 * Un portrait de composition ne fabrique jamais un autre visage. On montre la
 * photo officielle présente dans public/photos ; à défaut (ou si le fichier
 * ne charge plus), la silhouette grise explicite demandée par l'interface.
 *
 * ⚠️ ON VOIT LA TÊTE ENTIÈRE, ET C'ÉTAIT LE BUG SIGNALÉ (« déjà sur le terrain
 * voir la tête du joueur, pas la moitié »). Les photos officielles font
 * 800 × 1200 avec le visage dans le tiers haut ; le portrait mesurait 36 px de
 * haut pour 110 de large, soit une bande de rapport 3 : 1 recadrée à
 * `object-position: 50% 16%`. Le front et le menton tombaient hors du cadre à
 * chaque fois, quel que soit le décalage — un rapport aussi plat NE PEUT PAS
 * contenir un visage. Le portrait est désormais un carré (`aspect-ratio: 1`)
 * calé sur le haut de l'image : c'est la géométrie qui règle le problème, pas
 * un réglage de recadrage.
 */
function PortraitComposition({ nom, panneau = false }: { nom: string; panneau?: boolean }) {
  const photo = photoReelle(nom);
  const [erreur, setErreur] = useState(false);
  useEffect(() => setErreur(false), [photo, nom]);

  return (
    <span className={`ct-portrait${panneau ? ' ct-portrait-panneau' : ''}`} aria-hidden="true">
      {photo && !erreur ? (
        <img src={photo} alt="" decoding="async" onError={() => setErreur(true)} />
      ) : (
        <svg className="ct-portrait-vide" viewBox="0 0 48 48">
          <circle cx="24" cy="17" r="9" />
          <path d="M8 43c1.8-10.3 7.2-15.5 16-15.5S38.2 32.7 40 43H8Z" />
        </svg>
      )}
    </span>
  );
}

function CarteJoueur({
  joueur, numero, posteSlot, selectionne, capitaine, buteur, etat, compact,
  poignee, depot, rendreCarte, rendreSousCarte, enGlisse, cibleDepot, surSelection, surDrag, surDragFin, surSurvolDepot, surDrop,
}: {
  joueur?: Coequipier;
  poignee?: ReturnType<typeof useGlisserDeposer>['poignee'] extends (...args: never[]) => infer R ? R : never;
  depot?: string;
  rendreCarte?: Props['rendreCarte'];
  rendreSousCarte?: Props['rendreSousCarte'];
  numero: number;
  posteSlot: PosteId;
  selectionne: boolean;
  capitaine: boolean;
  buteur: boolean;
  etat?: EtatDuJoueur;
  compact?: boolean;
  enGlisse: boolean;
  cibleDepot: boolean;
  surSelection: () => void;
  surDrag: (e: DragEvent<HTMLButtonElement>) => void;
  surDragFin: () => void;
  surSurvolDepot: (survole: boolean) => void;
  surDrop: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  const adequation: Adequation = joueur
    ? adequationAuPoste(joueur.poste, posteSlot) : 'naturel';
  const statut: StatutCarte | undefined = joueur ? statutDe(joueur) : undefined;
  // ⚠️ LA RARETÉ ET LE STATUT COHABITENT, ils ne disent pas la même chose : la
  // rareté est le MÉTAL de la carte (ce qu'elle vaut), le statut reste la bande
  // du haut (le rôle dans l'effectif). Voir `lib/carteJoueur.ts`.
  const rarete: RareteCarte | undefined = joueur && !rendreCarte ? rareteDe(joueur) : undefined;
  const pepite = joueur ? estPepite(joueur) : false;
  const badges = joueur ? badgesDe(joueur, etat ?? {}).slice(0, 2) : [];
  // ⚠️ LES SIX STATS SORTENT DU POSTE OÙ IL EST ALIGNÉ, pas de son poste
  // naturel. Déplacer un ailier à l'arrière doit changer ce qu'on lit sur sa
  // carte : c'est à ce poste-là qu'on va le juger dimanche.
  const stats = joueur ? statsDeCarte({ ...joueur, poste: posteSlot }) : [];

  return (
    <button
      type="button"
      className={[
        'ct-carte',
        joueur && rendreCarte ? 'ct-fut' : '',
        statut ? `ct-${statut}` : 'ct-vide',
        rarete ? `ct-r-${rarete}` : '',
        pepite ? 'ct-pepite' : '',
        `ct-adq-${adequation}`,
        selectionne ? 'ct-selection' : '',
        compact ? 'ct-compacte' : '',
        enGlisse ? 'ct-en-drag' : '',
        cibleDepot ? 'ct-cible-depot' : '',
      ].filter(Boolean).join(' ')}
      {...poignee}
      data-depot={depot}
      draggable={false}
      onClick={surSelection}
      onDragStart={surDrag}
      onDragEnd={surDragFin}
      onDragEnter={() => surSurvolDepot(true)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) surSurvolDepot(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={surDrop}
      aria-pressed={selectionne}
      aria-label={joueur
        ? `${numero}, ${nomPoste(posteSlot)}, ${joueur.nom}, ${t('compo.note')} ${joueur.note}`
          + `, ${rarete ? NOM_RARETE[rarete] : ''}, ${t(`compo.adq.${adequation}`)}`
        : `${numero}, ${nomPoste(posteSlot)}, ${t('compo.vide')}`}
      title={joueur
        ? `${joueur.nom} · ${nomPoste(joueur.poste)} · ${joueur.age} ${t('compo.ans')}`
          + `${rarete ? ` · ${NOM_RARETE[rarete]}` : ''}`
        : nomPoste(posteSlot)}
    >
      {joueur && rendreCarte ? <>{rendreCarte(joueur)}<span className="ct-fut-nom">{nomCarte(joueur.nom)}</span><span className="ct-fut-indicateurs"><b>{numero}</b><span title={t(`compo.adq.${adequation}`)}><PastilleAdequation adequation={adequation} /></span>{capitaine && <i title="Capitaine">C</i>}{buteur && <i title="Buteur">B</i>}{etat?.condition !== undefined && <small>{etat.condition}%</small>}</span>{rendreSousCarte?.(joueur)}</> : <>
      {/* ⚠️ LE TALON NE PORTE PLUS LE NUMÉRO. Il l'écrivait à la verticale
          dans dix-sept pixels de large : illisible, et redondant depuis que la
          tête l'affiche. Il reste ce qu'il a toujours été — la perforation qui
          fait de la carte un billet de match plutôt qu'un écusson FUT. */}
      <span className="ct-talon" aria-hidden="true" />
      <span className="ct-tete">
        <strong className="ct-note">{joueur?.note ?? '—'}</strong>
        {/* ⚠️ LE NUMÉRO DE MAILLOT, PAS L'ABRÉGÉ DU POSTE. Retour de jeu :
            « mets le numéro qui joue au lieu de l'abrégé du poste, c'est pas
            très lisible ». Trois lettres tronquées ne se lisent pas — « DEM »
            vaut pour demi de mêlée ET demi d'ouverture, « TRO » pour les trois
            troisièmes lignes, « DEU » pour les deux deuxièmes lignes. Le numéro
            de maillot, lui, est la convention du rugby : il DIT le poste, sans
            ambiguïté et en deux caractères. */}
        <em className="ct-numero">{numero}</em>
      </span>
      {joueur && <PortraitComposition nom={joueur.nom} />}
      <b className="ct-nom">{joueur ? nomCarte(joueur.nom) : t('compo.vide')}</b>
      {joueur && (
        <span className="ct-sous">
          <i>{joueur.age} {t('compo.ans')}</i>
          <i className="ct-adq" title={t(`compo.adq.${adequation}`)}>
            <PastilleAdequation adequation={adequation} />
          </i>
        </span>
      )}
      {!compact && stats.length > 0 && (
        <span className="ct-stats">
          {stats.map((s) => (
            <i key={s.axe}><u>{s.abrege}</u><b>{s.valeur}</b></i>
          ))}
        </span>
      )}
      <span className="ct-pied">
        {etat?.condition !== undefined && (
          <i className="ct-cond"><Icone nom="coeur" taille={11} /> {etat.condition}%</i>
        )}
        {etat?.forme !== undefined && (
          <i className="ct-forme"><Icone nom="flamme" taille={11} /> {etat.forme}</i>
        )}
        {badges.map((b) => (
          <i key={b} className={`ct-badge ct-badge-${b}`} title={t(`compo.badge.${b}`)}>
            <Icone nom={ICONE_BADGE[b]} taille={12} />
          </i>
        ))}
        {capitaine && (
          <i className="ct-role" title={t('compo.capitaine')}>
            <Icone nom="brassard" taille={12} />
          </i>
        )}
        {buteur && (
          <i className="ct-role" title={t('compo.buteur')}>
            <Icone nom="cible" taille={12} />
          </i>
        )}
      </span>
      </>}
    </button>
  );
}

/** Le panneau latéral, ouvert quand une carte est sélectionnée. */
function PanneauJoueur({
  joueur, posteSlot, etat, automatismes, coequipiers, capitaine, buteur,
  panneauRef, onCapitaine, onButeur, onFermer,
}: {
  joueur: Coequipier;
  posteSlot?: PosteId;
  etat?: EtatDuJoueur;
  automatismes?: Automatismes;
  coequipiers: Map<PosteId, Coequipier>;
  capitaine: boolean;
  buteur: boolean;
  panneauRef: RefObject<HTMLElement | null>;
  onCapitaine?: (id: string) => void;
  onButeur?: (id: string) => void;
  onFermer: () => void;
}) {
  const attributs = attributsDe(joueur);
  const rarete = rareteDe(joueur);
  const adequation = posteSlot ? adequationAuPoste(joueur.poste, posteSlot) : 'naturel';
  const liaisons = (PARTENAIRES[joueur.poste] ?? [])
    .map((p) => ({ poste: p, joueur: coequipiers.get(p) }))
    .filter((l): l is { poste: PosteId; joueur: Coequipier } => !!l.joueur);

  return (
    <aside ref={panneauRef} className={`ct-panneau ct-r-${rarete}`} aria-label={t('compo.panneau')}>
      <button type="button" className="ct-fermer" onClick={onFermer} aria-label={t('compo.fermer')}>
        <Icone nom="croix" taille={16} />
      </button>
      <header>
        <PortraitComposition nom={joueur.nom} panneau />
        <b>{joueur.nom}</b>
        <strong>{joueur.note}</strong>
      </header>
      <p className="ct-ident">
        {nomPoste(joueur.poste)} · {joueur.nation} · {joueur.age} {t('compo.ans')}
        <em className={`ct-rarete ct-r-txt-${rarete}`}>
          <Icone nom="etoile" taille={12} /> {NOM_RARETE[rarete]}
          {estPepite(joueur) && <b className="ct-pepite-txt"> · {t('compo.badge.espoir')}</b>}
        </em>
        {posteSlot && adequation !== 'naturel' && (
          <em className={`ct-adq-txt ct-adq-${adequation}`}>
            <PastilleAdequation adequation={adequation} /> {t(`compo.adq.${adequation}`)}
            {' '}({Math.round((1 - facteurDePerformance(adequation)) * 100)} %)
          </em>
        )}
      </p>

      {etat && (etat.condition !== undefined || etat.forme !== undefined) && (
        <div className="ct-jauges">
          {etat.condition !== undefined && (
            <label><span>{t('compo.condition')}</span>
              <progress value={etat.condition} max={100} /><i>{etat.condition} %</i>
            </label>
          )}
          {etat.forme !== undefined && (
            <label><span>{t('compo.forme')}</span>
              <progress value={etat.forme} max={100} /><i>{etat.forme}</i>
            </label>
          )}
          {etat.fatigue !== undefined && (
            <label><span>{t('compo.fatigue')}</span>
              <progress value={etat.fatigue} max={100} /><i>{etat.fatigue}</i>
            </label>
          )}
        </div>
      )}

      <ul className="ct-attributs">
        {axesDe(posteSlot ?? joueur.poste).map((axe) => (
          <li key={axe}>
            <span>{ABREVIATION[axe]}</span>
            <progress value={valeurAxe({ ...joueur, poste: posteSlot ?? joueur.poste }, axe)} max={100} />
            <b>{valeurAxe({ ...joueur, poste: posteSlot ?? joueur.poste }, axe)}</b>
          </li>
        ))}
      </ul>
      <details className="ct-brut">
        <summary>{t('compo.attributsBruts')}</summary>
        <ul>
          {Object.entries(attributs).map(([k, v]) => (
            <li key={k}><span>{t(`attr.${k}`)}</span><b>{v}</b></li>
          ))}
        </ul>
      </details>

      {/* ⚠️ LES LIAISONS N'APPARAISSENT QUE SI LES AUTOMATISMES EXISTENT. Sans
          eux, on afficherait un nombre inventé sur une mécanique dont tout
          l'intérêt est d'être vraie. */}
      {automatismes && liaisons.length > 0 && (
        <div className="ct-liaisons">
          <b>{t('compo.liaisons')}</b>
          {liaisons.map((l) => {
            const v = connexion(0, joueur.poste, l.poste, automatismes);
            return (
              <span key={l.poste} className={v >= 75 ? 'forte' : v >= 55 ? 'moyenne' : 'faible'}>
                {nomCarte(l.joueur.nom)} <b>{v}</b>
              </span>
            );
          })}
        </div>
      )}

      <div className="ct-actions">
        {onCapitaine && (
          <button type="button" onClick={() => onCapitaine(joueur.id)} aria-pressed={capitaine}>
            <Icone nom="brassard" taille={16} /> {t('compo.capitaine')}
          </button>
        )}
        {onButeur && (
          <button type="button" onClick={() => onButeur(joueur.id)} aria-pressed={buteur}>
            <Icone nom="cible" taille={16} /> {t('compo.buteur')}
          </button>
        )}
      </div>
    </aside>
  );
}

export function CompositionTerrainManager({
  effectif, effectifComplet = effectif, composition, onPlacer, etats, indisponibles,
  automatismes, onCapitaine, onButeur, rendreCarte, rendreSousCarte,
}: Props) {
  const [selection, setSelection] = useState<string | null>(null);
  const [ficheMasquee, setFicheMasquee] = useState<string | null>(null);
  const [joueurGlisse, setJoueurGlisse] = useState<string | null>(null);
  const [cibleDepot, setCibleDepot] = useState<string | null>(null);
  const [reservesOuvertes, setReservesOuvertes] = useState(!rendreCarte);
  const panneauRef = useRef<HTMLElement>(null);
  const parId = useMemo(
    () => new Map(effectifComplet.map((j) => [j.id, j])),
    [effectifComplet],
  );
  const surFeuille = useMemo(
    () => new Set([...composition.titulaires, ...composition.remplacants]),
    [composition.titulaires, composition.remplacants],
  );
  const reserves = useMemo(
    () => effectifComplet.filter((j) => !surFeuille.has(j.id)).sort((a, b) => b.note - a.note),
    [effectifComplet, surFeuille],
  );

  const titulaires = useMemo(
    () => composition.titulaires.map((id) => parId.get(id)),
    [composition.titulaires, parId],
  );
  const remplacants = useMemo(
    () => composition.remplacants.map((id) => parId.get(id)),
    [composition.remplacants, parId],
  );
  const notes = useMemo(() => notesDeLEquipe(titulaires), [titulaires]);
  const alertes = useMemo(
    () => alertesDeComposition(titulaires, remplacants, etats ?? new Map(), [...POSTES_XV_MANAGER]),
    [titulaires, remplacants, etats],
  );
  /** Le XV rangé par poste, pour les liaisons du panneau. */
  const parPoste = useMemo(() => {
    const m = new Map<PosteId, Coequipier>();
    POSTES_XV_MANAGER.forEach((p, i) => { const j = titulaires[i]; if (j) m.set(p, j); });
    return m;
  }, [titulaires]);

  // La fiche latérale se referme dès que l'entraîneur reprend son travail
  // ailleurs dans l'écran. Les cartes restent exclues de ce gestionnaire : un
  // clic sur une autre carte doit encore permettre l'échange tactile.
  useEffect(() => {
    if (!selection) return;
    const fermerHorsPanneau = (e: PointerEvent) => {
      const cible = e.target;
      if (!(cible instanceof Element)) return;
      if (panneauRef.current?.contains(cible)) return;
      if (cible.closest('.ct-carte, .manager-reserve-carte')) return;
      setSelection(null);
    };
    const fermerAvecEchap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null);
    };
    document.addEventListener('pointerdown', fermerHorsPanneau);
    window.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.removeEventListener('pointerdown', fermerHorsPanneau);
      window.removeEventListener('keydown', fermerAvecEchap);
    };
  }, [selection]);

  const choisirOuPlacer = (zone: ZoneComposition, index: number, joueurId?: string) => {
    if (selection && selection !== joueurId) {
      if (indisponibles?.has(selection)) {
        setSelection(null);
        return;
      }
      onPlacer(zone, index, selection);
      setSelection(null);
      return;
    }
    setSelection(selection === joueurId ? null : joueurId ?? null);
  };

  const glisser = useGlisserDeposer((cible, id) => {
    const [zone, index] = cible.split('-');
    if ((zone === 'titulaires' || zone === 'remplacants') && !indisponibles?.has(id)) onPlacer(zone, Number(index), id);
  });
  const demarrerDrag = (e: DragEvent<HTMLButtonElement>, joueurId?: string) => {
    if (!joueurId || indisponibles?.has(joueurId)) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', joueurId);

    // Le fantôme natif reprend maintenant la vraie carte, légèrement inclinée,
    // au lieu d'un rectangle translucide différent selon le navigateur.
    const fantome = e.currentTarget.cloneNode(true) as HTMLElement;
    const largeur = e.currentTarget.getBoundingClientRect().width;
    fantome.classList.add('ct-fantome-drag');
    fantome.style.width = `${largeur}px`;
    document.body.appendChild(fantome);
    e.dataTransfer.setDragImage(fantome, largeur / 2, 32);
    window.setTimeout(() => fantome.remove(), 0);

    setSelection(null);
    setJoueurGlisse(joueurId);
    setCibleDepot(null);
  };

  const terminerDrag = () => {
    setJoueurGlisse(null);
    setCibleDepot(null);
  };

  const deposer = (e: DragEvent<HTMLButtonElement>, zone: ZoneComposition, index: number) => {
    e.preventDefault();
    const joueurId = e.dataTransfer.getData('text/plain') || joueurGlisse;
    if (joueurId && !indisponibles?.has(joueurId)) onPlacer(zone, index, joueurId);
    setSelection(null);
    terminerDrag();
  };

  const joueurSelectionne = selection ? parId.get(selection) : undefined;
  const joueurEnMouvement = joueurGlisse ? parId.get(joueurGlisse) : joueurSelectionne;
  const slotDuSelectionne = selection
    ? POSTES_XV_MANAGER[composition.titulaires.indexOf(selection)] : undefined;

  return (
    <section className={`manager-feuille-visuelle${rendreCarte ? ' ct-feuille-fut' : ''}`} aria-label={t('compo.titre')}>
      {/* ── L'EN-TÊTE ─────────────────────────────────────────────────────── */}
      <div className="ct-entete">
        <div className="ct-note-equipe">
          <span>{t('compo.noteEquipe')}</span>
          <strong>{notes.generale}</strong>
        </div>
        <dl className="ct-secteurs">
          <div><dt>{t('compo.attaque')}</dt><dd>{notes.attaque}</dd></div>
          <div><dt>{t('compo.defense')}</dt><dd>{notes.defense}</dd></div>
          <div><dt>{t('compo.conquete')}</dt><dd>{notes.conquete}</dd></div>
        </dl>
        {automatismes && (
          <div className="ct-cohesion">
            <span>{t('compo.cohesion')} <b>{cohesionGlobale(automatismes)}</b></span>
            <progress value={cohesionGlobale(automatismes)} max={100} />
            <em>{t(`compo.cohesion.${libelleCohesion(cohesionGlobale(automatismes))}`)}</em>
            <ul>
              {SECTEURS_COHESION.map((s) => (
                <li key={s}><i>{t(`compo.secteur.${s}`)}</i><b>{Math.round(automatismes[s])}</b></li>
              ))}
            </ul>
          </div>
        )}
        <ul className="ct-alertes">
          {alertes.map((a) => (
            <li key={a.cle} className={`ct-${a.gravite}`}>
              <Icone nom={a.gravite === 'ok' ? 'ok' : a.gravite === 'bloquant' ? 'stop' : 'alerte'} taille={14} />
              {' '}{t(a.cle, a.valeur ? { n: a.valeur } : undefined)}
            </li>
          ))}
        </ul>
      </div>

      {/* ⚠️ LES DEUX AIDES ONT PERDU LEURS EMOJI DANS LE DICTIONNAIRE (↕️ et 📱),
          et c'est volontaire : un emoji collé au début d'une chaîne traduite se
          retrouve dans les sept langues, il ne se colore pas avec le texte et
          il change de taille d'un système à l'autre. L'icône est posée par
          l'écran, à côté de la phrase. */}
      <div className="manager-compo-aide" aria-live="polite">
        <span><Icone nom="equipe" taille={14} /> {t('compo.aideGlisser')}</span>
        <span><Icone nom="cible" taille={14} /> {t('compo.aideMobile')}</span>
        {joueurEnMouvement && <b>{joueurEnMouvement.nom}</b>}
      </div>

      <div className="ct-plateau">
        <div className="manager-terrain-cadre">
          <div className="manager-terrain-legende">
            <span>{t('compo.enButAdverse')}</span><b>{t('compo.tonXV')}</b><span>{t('compo.tonEnBut')}</span>
          </div>
          <div className="manager-terrain-xv">
            {POSTES_XV_MANAGER.map((posteSlot, index) => {
              const joueur = titulaires[index];
              const [x, y] = PLACEMENT_XV[index];
              return (
                <div className="manager-position" key={`${posteSlot}-${index}`} style={{ left: `${x}%`, top: `${y}%` }}>
                  <CarteJoueur
                    rendreCarte={rendreCarte}
                    rendreSousCarte={rendreSousCarte}
                    joueur={joueur}
                    numero={index + 1}
                    posteSlot={posteSlot}
                    selectionne={selection === joueur?.id}
                    capitaine={composition.capitaineId === joueur?.id}
                    buteur={composition.buteurId === joueur?.id}
                    etat={joueur ? etats?.get(joueur.id) : undefined}
                    enGlisse={joueurGlisse === joueur?.id}
                    cibleDepot={cibleDepot === `titulaires-${index}` && joueurGlisse !== joueur?.id}
                    poignee={glisser.poignee(joueur?.id, `titulaires-${index}`)} depot={`titulaires-${index}`}
                    surSelection={() => { if (!glisser.vientDeGlisser()) choisirOuPlacer('titulaires', index, joueur?.id); }}
                    surDrag={(e) => demarrerDrag(e, joueur?.id)}
                    surDragFin={terminerDrag}
                    surSurvolDepot={(survole) => setCibleDepot(survole ? `titulaires-${index}` : null)}
                    surDrop={(e) => deposer(e, 'titulaires', index)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {joueurSelectionne && (!rendreCarte || ficheMasquee !== selection) && (
          <PanneauJoueur
            joueur={joueurSelectionne}
            posteSlot={slotDuSelectionne}
            etat={etats?.get(joueurSelectionne.id)}
            automatismes={automatismes}
            coequipiers={parPoste}
            capitaine={composition.capitaineId === joueurSelectionne.id}
            buteur={composition.buteurId === joueurSelectionne.id}
            panneauRef={panneauRef}
            onCapitaine={indisponibles?.has(joueurSelectionne.id) ? undefined : onCapitaine}
            onButeur={indisponibles?.has(joueurSelectionne.id) ? undefined : onButeur}
            onFermer={() => { if (rendreCarte) setFicheMasquee(selection); else setSelection(null); }}
          />
        )}
      </div>

      <div className="manager-banc-visuel">
        <div className="comp-tete">
          <b><Icone nom="banc" taille={16} /> {t('compo.banc')}</b>
          <span className="comp-count">8</span>
        </div>
        <div className="manager-banc-cartes">
          {/* ⚠️ LE BANC N'IMPOSE PLUS DE POSTE. Retour de jeu : « sur le banc,
              pas de postes prédéfinis, on met qui on veut ». `POSTES_BANC_MANAGER`
              servait à DEUX choses qu'on avait confondues — composer le banc par
              défaut (elle le fait toujours, et c'est très bien : un banc
              automatique doit être un vrai banc de rugby), et CONTRAINDRE les
              huit emplacements à l'écran, ce qui n'a aucune raison d'être. Un
              entraîneur choisit son banc : sept avants et un arrière si son
              match l'exige.
              ⚠️ ET LA RÈGLE DE RUGBY N'EST PAS PERDUE : l'alerte « première
              ligne remplaçante » (`alertesComposition`) reste bloquante. On
              remplace un interdit par un avertissement — c'est la bonne forme,
              parce que la règle porte sur la COMPOSITION, pas sur l'ordre des
              cases. */}
          {Array.from({ length: 8 }, (_, index) => {
            const joueur = remplacants[index];
            // Le poste affiché est celui du joueur qui est là, à défaut le
            // profil par défaut de l'emplacement (une case vide doit dire à
            // quoi elle sert, sinon on ne sait pas quoi y mettre).
            const posteSlot = joueur?.poste ?? POSTES_BANC_MANAGER[index];
            return (
              <CarteJoueur
                    rendreCarte={rendreCarte}
                    rendreSousCarte={rendreSousCarte}
                key={`banc-${index}`}
                joueur={joueur}
                numero={index + 16}
                posteSlot={posteSlot}
                selectionne={selection === joueur?.id}
                capitaine={composition.capitaineId === joueur?.id}
                buteur={composition.buteurId === joueur?.id}
                etat={joueur ? etats?.get(joueur.id) : undefined}
                compact
                enGlisse={joueurGlisse === joueur?.id}
                cibleDepot={cibleDepot === `remplacants-${index}` && joueurGlisse !== joueur?.id}
                poignee={glisser.poignee(joueur?.id, `remplacants-${index}`)} depot={`remplacants-${index}`}
                surSelection={() => { if (!glisser.vientDeGlisser()) choisirOuPlacer('remplacants', index, joueur?.id); }}
                surDrag={(e) => demarrerDrag(e, joueur?.id)}
                surDragFin={terminerDrag}
                surSurvolDepot={(survole) => setCibleDepot(survole ? `remplacants-${index}` : null)}
                surDrop={(e) => deposer(e, 'remplacants', index)}
              />
            );
          })}
        </div>
      </div>

      <details
        className="manager-reserves"
        open={reservesOuvertes}
        onToggle={(e) => setReservesOuvertes(e.currentTarget.open)}
      >
        <summary>{t('compo.effectifDispo')} <span>{reserves.length}</span></summary>
        <p>{t('compo.aideReserve')}</p>
        <div>
          {reserves.map((joueur) => {
            const etat = etats?.get(joueur.id) ?? {};
            const indisponible = indisponibles?.has(joueur.id) ?? false;
            const raison = etat.enSelection
              ? t('compo.badge.international')
              : etat.suspendu
                ? t('compo.badge.suspendu')
                : etat.blesse ? t('compo.badge.blesse') : '';
            return (
              <button
                type="button"
                key={joueur.id}
                className={[
                  'manager-reserve-carte',
                  rendreCarte ? 'ct-reserve-fut' : '',
                  `ct-${statutDe(joueur)}`,
                  `ct-r-${rareteDe(joueur)}`,
                  estPepite(joueur) ? 'ct-pepite' : '',
                  indisponible ? 'ct-indisponible' : '',
                  selection === joueur.id ? 'selectionnee' : '',
                  joueurGlisse === joueur.id ? 'ct-en-drag' : '',
                ].filter(Boolean).join(' ')}
                {...glisser.poignee(indisponible ? undefined : joueur.id, null)}
                draggable={false}
                onClick={() => { if (!glisser.vientDeGlisser()) setSelection(selection === joueur.id ? null : joueur.id); }}
                onDragStart={(e) => demarrerDrag(e, joueur.id)}
                onDragEnd={terminerDrag}
                aria-pressed={selection === joueur.id}
                aria-disabled={indisponible}
                title={`${joueur.nom} · ${NOM_RARETE[rareteDe(joueur)]}${raison ? ` · ${raison}` : ''}`}
              >
                {!rendreCarte && <PortraitComposition nom={joueur.nom} />}
                {rendreCarte ? <>{rendreCarte(joueur)}{raison && <small className="ct-fut-raison">{raison}</small>}</> : <>
                <strong>{joueur.note}</strong>
                <span>
                  <b>{joueur.nom}</b>
                  <small>{nomPoste(joueur.poste)} · {joueur.age} {t('compo.ans')}{raison && <em> · {raison}</em>}</small>
                </span>
                {badgesDe(joueur, etat).slice(0, 1)
                  .map((b) => (
                    <i key={b} className={`ct-badge ct-badge-${b}`} title={t(`compo.badge.${b}`)}>
                      <Icone nom={ICONE_BADGE[b]} taille={13} />
                    </i>
                  ))}
                </>}
              </button>
            );
          })}
        </div>
      </details>
    </section>
  );
}
