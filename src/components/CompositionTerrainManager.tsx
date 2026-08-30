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

import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import { POSTES_BANC_MANAGER, POSTES_XV_MANAGER } from '../lib/compositionManager';
import {
  EMOJI_BADGE, adequationAuPoste, alertesDeComposition, badgesDe,
  facteurDePerformance, notesDeLEquipe, statsDeCarte, statutDe, valeurAxe,
  attributsDe, ABREVIATION, axesDe,
} from '../lib/carteJoueur';
import type { Adequation, EtatDuJoueur, StatutCarte } from '../lib/carteJoueur';
import {
  SECTEURS_COHESION, cohesionGlobale, connexion, libelleCohesion,
} from '../lib/cohesion';
import type { Automatismes } from '../lib/cohesion';
import type { Coequipier } from '../lib/effectif';
import type { CompositionManager, PosteId } from '../types';
import { photoReelle } from '../lib/avatars';

type ZoneComposition = 'titulaires' | 'remplacants';

interface Props {
  effectif: Coequipier[];
  composition: CompositionManager;
  onPlacer: (zone: ZoneComposition, index: number, joueurId: string) => void;
  /** Facultatif : condition, forme, blessure, suspension, sélection. */
  etats?: Map<string, EtatDuJoueur>;
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

const PASTILLE_ADEQUATION: Record<Adequation, string> = {
  naturel: '🟢', secondaire: '🟡', horsPoste: '🔴',
};

/**
 * Un portrait de composition ne fabrique jamais un autre visage. On montre la
 * photo officielle présente dans public/photos ; à défaut (ou si le fichier
 * ne charge plus), la silhouette grise explicite demandée par l'interface.
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
  surSelection, surDrag, surDrop,
}: {
  joueur?: Coequipier;
  numero: number;
  posteSlot: PosteId;
  selectionne: boolean;
  capitaine: boolean;
  buteur: boolean;
  etat?: EtatDuJoueur;
  compact?: boolean;
  surSelection: () => void;
  surDrag: (e: DragEvent<HTMLButtonElement>) => void;
  surDrop: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  const adequation: Adequation = joueur
    ? adequationAuPoste(joueur.poste, posteSlot) : 'naturel';
  const statut: StatutCarte | undefined = joueur ? statutDe(joueur) : undefined;
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
        statut ? `ct-${statut}` : 'ct-vide',
        `ct-adq-${adequation}`,
        selectionne ? 'ct-selection' : '',
        compact ? 'ct-compacte' : '',
      ].filter(Boolean).join(' ')}
      draggable={!!joueur}
      onClick={surSelection}
      onDragStart={surDrag}
      onDragOver={(e) => e.preventDefault()}
      onDrop={surDrop}
      aria-pressed={selectionne}
      aria-label={joueur
        ? `${numero}, ${nomPoste(posteSlot)}, ${joueur.nom}, ${t('compo.note')} ${joueur.note}`
          + `, ${t(`compo.adq.${adequation}`)}`
        : `${numero}, ${nomPoste(posteSlot)}, ${t('compo.vide')}`}
      title={joueur ? `${joueur.nom} · ${nomPoste(joueur.poste)} · ${joueur.age} ${t('compo.ans')}` : nomPoste(posteSlot)}
    >
      <span className="ct-talon" aria-hidden="true">{numero}</span>
      <span className="ct-tete">
        <strong className="ct-note">{joueur?.note ?? '—'}</strong>
        <em className="ct-poste">{nomPoste(posteSlot).slice(0, 3).toUpperCase()}</em>
      </span>
      {joueur && <PortraitComposition nom={joueur.nom} />}
      <b className="ct-nom">{joueur ? nomCarte(joueur.nom) : t('compo.vide')}</b>
      {joueur && (
        <span className="ct-sous">
          <i>{joueur.age} {t('compo.ans')}</i>
          <i className="ct-adq" title={t(`compo.adq.${adequation}`)}>{PASTILLE_ADEQUATION[adequation]}</i>
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
        {etat?.condition !== undefined && <i className="ct-cond">🟢 {etat.condition}%</i>}
        {etat?.forme !== undefined && <i className="ct-forme">🔥 {etat.forme}</i>}
        {badges.map((b) => <i key={b} className="ct-badge" title={t(`compo.badge.${b}`)}>{EMOJI_BADGE[b]}</i>)}
        {capitaine && <i className="ct-role" title={t('compo.capitaine')}>©️</i>}
        {buteur && <i className="ct-role" title={t('compo.buteur')}>🎯</i>}
      </span>
    </button>
  );
}

/** Le panneau latéral, ouvert quand une carte est sélectionnée. */
function PanneauJoueur({
  joueur, posteSlot, etat, automatismes, coequipiers, capitaine, buteur,
  onCapitaine, onButeur, onFermer,
}: {
  joueur: Coequipier;
  posteSlot?: PosteId;
  etat?: EtatDuJoueur;
  automatismes?: Automatismes;
  coequipiers: Map<PosteId, Coequipier>;
  capitaine: boolean;
  buteur: boolean;
  onCapitaine?: (id: string) => void;
  onButeur?: (id: string) => void;
  onFermer: () => void;
}) {
  const attributs = attributsDe(joueur);
  const adequation = posteSlot ? adequationAuPoste(joueur.poste, posteSlot) : 'naturel';
  const liaisons = (PARTENAIRES[joueur.poste] ?? [])
    .map((p) => ({ poste: p, joueur: coequipiers.get(p) }))
    .filter((l): l is { poste: PosteId; joueur: Coequipier } => !!l.joueur);

  return (
    <aside className="ct-panneau" aria-label={t('compo.panneau')}>
      <button type="button" className="ct-fermer" onClick={onFermer} aria-label={t('compo.fermer')}>✕</button>
      <header>
        <PortraitComposition nom={joueur.nom} panneau />
        <b>{joueur.nom}</b>
        <strong>{joueur.note}</strong>
      </header>
      <p className="ct-ident">
        {nomPoste(joueur.poste)} · {joueur.nation} · {joueur.age} {t('compo.ans')}
        {posteSlot && adequation !== 'naturel' && (
          <em className={`ct-adq-txt ct-adq-${adequation}`}>
            {PASTILLE_ADEQUATION[adequation]} {t(`compo.adq.${adequation}`)}
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
            ©️ {t('compo.capitaine')}
          </button>
        )}
        {onButeur && (
          <button type="button" onClick={() => onButeur(joueur.id)} aria-pressed={buteur}>
            🎯 {t('compo.buteur')}
          </button>
        )}
      </div>
    </aside>
  );
}

export function CompositionTerrainManager({
  effectif, composition, onPlacer, etats, automatismes, onCapitaine, onButeur,
}: Props) {
  const [selection, setSelection] = useState<string | null>(null);
  const parId = useMemo(() => new Map(effectif.map((j) => [j.id, j])), [effectif]);
  const surFeuille = useMemo(
    () => new Set([...composition.titulaires, ...composition.remplacants]),
    [composition.titulaires, composition.remplacants],
  );
  const reserves = useMemo(
    () => effectif.filter((j) => !surFeuille.has(j.id)).sort((a, b) => b.note - a.note),
    [effectif, surFeuille],
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

  const choisirOuPlacer = (zone: ZoneComposition, index: number, joueurId?: string) => {
    if (selection && selection !== joueurId) {
      onPlacer(zone, index, selection);
      setSelection(null);
      return;
    }
    setSelection(selection === joueurId ? null : joueurId ?? null);
  };

  const demarrerDrag = (e: DragEvent<HTMLButtonElement>, joueurId?: string) => {
    if (!joueurId) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', joueurId);
    setSelection(joueurId);
  };

  const deposer = (e: DragEvent<HTMLButtonElement>, zone: ZoneComposition, index: number) => {
    e.preventDefault();
    const joueurId = e.dataTransfer.getData('text/plain') || selection;
    if (joueurId) onPlacer(zone, index, joueurId);
    setSelection(null);
  };

  const joueurSelectionne = selection ? parId.get(selection) : undefined;
  const slotDuSelectionne = selection
    ? POSTES_XV_MANAGER[composition.titulaires.indexOf(selection)] : undefined;

  return (
    <section className="manager-feuille-visuelle" aria-label={t('compo.titre')}>
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
              {a.gravite === 'ok' ? '🟢' : a.gravite === 'bloquant' ? '⛔' : '⚠️'}
              {' '}{t(a.cle, a.valeur ? { n: a.valeur } : undefined)}
            </li>
          ))}
        </ul>
      </div>

      <div className="manager-compo-aide" aria-live="polite">
        <span>{t('compo.aideGlisser')}</span>
        <span>{t('compo.aideMobile')}</span>
        {joueurSelectionne && <b>{joueurSelectionne.nom}</b>}
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
                    joueur={joueur}
                    numero={index + 1}
                    posteSlot={posteSlot}
                    selectionne={selection === joueur?.id}
                    capitaine={composition.capitaineId === joueur?.id}
                    buteur={composition.buteurId === joueur?.id}
                    etat={joueur ? etats?.get(joueur.id) : undefined}
                    surSelection={() => choisirOuPlacer('titulaires', index, joueur?.id)}
                    surDrag={(e) => demarrerDrag(e, joueur?.id)}
                    surDrop={(e) => deposer(e, 'titulaires', index)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {joueurSelectionne && (
          <PanneauJoueur
            joueur={joueurSelectionne}
            posteSlot={slotDuSelectionne}
            etat={etats?.get(joueurSelectionne.id)}
            automatismes={automatismes}
            coequipiers={parPoste}
            capitaine={composition.capitaineId === joueurSelectionne.id}
            buteur={composition.buteurId === joueurSelectionne.id}
            onCapitaine={onCapitaine}
            onButeur={onButeur}
            onFermer={() => setSelection(null)}
          />
        )}
      </div>

      <div className="manager-banc-visuel">
        <div className="comp-tete"><b>🪑 {t('compo.banc')}</b><span className="comp-count">8</span></div>
        <div className="manager-banc-cartes">
          {POSTES_BANC_MANAGER.map((posteSlot, index) => {
            const joueur = remplacants[index];
            return (
              <CarteJoueur
                key={`${posteSlot}-${index}`}
                joueur={joueur}
                numero={index + 16}
                posteSlot={posteSlot}
                selectionne={selection === joueur?.id}
                capitaine={composition.capitaineId === joueur?.id}
                buteur={composition.buteurId === joueur?.id}
                etat={joueur ? etats?.get(joueur.id) : undefined}
                compact
                surSelection={() => choisirOuPlacer('remplacants', index, joueur?.id)}
                surDrag={(e) => demarrerDrag(e, joueur?.id)}
                surDrop={(e) => deposer(e, 'remplacants', index)}
              />
            );
          })}
        </div>
      </div>

      <details className="manager-reserves" open={reserves.length <= 8}>
        <summary>{t('compo.effectifDispo')} <span>{reserves.length}</span></summary>
        <p>{t('compo.aideReserve')}</p>
        <div>
          {reserves.map((joueur) => (
            <button
              type="button"
              key={joueur.id}
              className={`manager-reserve-carte ct-${statutDe(joueur)}${selection === joueur.id ? ' selectionnee' : ''}`}
              draggable
              onClick={() => setSelection(selection === joueur.id ? null : joueur.id)}
              onDragStart={(e) => demarrerDrag(e, joueur.id)}
              aria-pressed={selection === joueur.id}
            >
              <PortraitComposition nom={joueur.nom} />
              <strong>{joueur.note}</strong>
              <span>
                <b>{joueur.nom}</b>
                <small>{nomPoste(joueur.poste)} · {joueur.age} {t('compo.ans')}</small>
              </span>
              {badgesDe(joueur, etats?.get(joueur.id) ?? {}).slice(0, 1)
                .map((b) => <i key={b} className="ct-badge">{EMOJI_BADGE[b]}</i>)}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
