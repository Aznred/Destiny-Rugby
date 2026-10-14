import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { t, tn } from '../lib/i18n';
import { useModalDialog } from '../lib/useModalDialog';
import type { Coequipier } from '../lib/effectif';
import type { MaillotMatch } from '../lib/moteur/apparenceMatch';
import { EMPLACEMENTS, emplacementsOccupes, MAX_COMBINAISONS, SITUATIONS_CAHIER, situationDuPlan, type Combinaison, type SituationCahier } from '../lib/ligue/combinaisons';
import {
  ajouterAuCahier, difficulteDuPlan, ECHANTILLON_MINIMUM, echantillonSuffisant, indicateurs, MATCHS_MINIMUM, mettreAJour, MOTIFS_SIGNALEMENT, TYPES_COMBINAISON, typeDuPlan,
  type DetailPublie, type DifficulteCombinaison, type MotifSignalement, type ResumePublie, type StatsCombinaison, type TypeCombinaison,
} from '../lib/ligue/marcheCombinaisons';
import { apiMarche, ErreurMarche, type ApiMarche } from '../lib/marcheCombinaisonsClient';
import './MarcheCombinaisons.css';

const TestCombinaison3D = lazy(() => import('./TestCombinaison3D').then((m) => ({ default: m.TestCombinaison3D })));

type Tri = 'score' | 'note' | 'recent' | 'populaire';
const TRIS: readonly Tri[] = ['score', 'note', 'recent', 'populaire'];
const uid = () => crypto.randomUUID();
const pourcent = (v: number) => `${Math.round(v * 100)} %`;
const decimal = (v: number) => (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const messageDeRefus = (erreur: unknown) => {
  const refus = erreur instanceof ErreurMarche ? erreur.refus : undefined;
  return refus && refus !== 'note' && refus !== 'signalement' ? t(`mc.refus.${refus}`) : erreur instanceof ErreurMarche && erreur.statut === 503 ? t('mc.indisponible') : t('mc.refus.autre');
};

function Puces({ niveau }: { niveau: DifficulteCombinaison }) {
  return <span className="mc-puces" role="img" aria-label={`${t('mc.difficulte')} : ${t(`mc.difficulte.${niveau}`)}`}>{[1, 2, 3].map((n) => <i key={n} className={n <= niveau ? 'pleine' : ''} />)}</span>;
}
function Etoiles({ note, votes }: { note: number | null; votes: number }) {
  if (note === null) return <span className="mc-note vide">{t('mc.stat.sansNote')}</span>;
  return <span className="mc-note"><Icone nom="etoile" taille={13} />{decimal(note)}<small>{tn('mc.stat.votes', votes)}</small></span>;
}
function Segments<T extends string>({ valeur, options, onChange, libelle }: { valeur: T; options: readonly { valeur: T; libelle: string }[]; onChange: (v: T) => void; libelle: string }) {
  return <span className="mc-segments" role="group" aria-label={libelle}>{options.map((o) => (
    <button key={o.valeur} type="button" aria-pressed={o.valeur === valeur} onClick={() => onChange(o.valeur)}>{o.libelle}</button>))}</span>;
}

/** Les chiffres d'une combinaison en match : plusieurs indicateurs, jamais un seul taux de réussite. */
function Statistiques({ stats }: { stats: StatsCombinaison }) {
  const i = indicateurs(stats);
  const assez = echantillonSuffisant(stats);
  const cases: [string, string, string?][] = [
    [t('mc.stat.utilisations'), String(stats.utilisations)],
    [t('mc.stat.matchs'), String(stats.matchs)],
    [t('mc.stat.metres'), stats.utilisations ? decimal(i.metres) : '—'],
    [t('mc.stat.franchissements'), stats.utilisations ? pourcent(i.franchissements) : '—'],
    [t('mc.stat.battus'), stats.utilisations ? decimal(i.battus) : '—', t('mc.stat.parUtilisation')],
    [t('mc.stat.conservation'), stats.utilisations ? pourcent(i.conservation) : '—'],
    [t('mc.stat.essais'), stats.utilisations ? pourcent(i.essais) : '—'],
    [t('mc.stat.pertes'), stats.utilisations ? pourcent(i.pertes) : '—'],
    [t('mc.stat.penalites'), stats.utilisations ? pourcent(i.penalites) : '—'],
  ];
  return (
    <div className="mc-stats">
      <dl>{cases.map(([nom, valeur, sous]) => <div key={nom}><dt>{nom}</dt><dd>{valeur}{sous && <small>{sous}</small>}</dd></div>)}</dl>
      {!assez && <p className="mc-info">{t('mc.echantillon.aide', { n: ECHANTILLON_MINIMUM, m: MATCHS_MINIMUM })}</p>}
    </div>
  );
}

export function MarcheCombinaisons({ api = apiMarche, plans, joueurs, effectif, maillot, bloque, moderateur = false, ranger }: {
  api?: ApiMarche;
  /** Le cahier (brouillon compris) : pour savoir ce qui y est déjà, et où il reste de la place. */
  plans: Combinaison[];
  joueurs: Record<number, string>; effectif?: Coequipier[]; maillot?: MaillotMatch;
  bloque: boolean; moderateur?: boolean;
  /** Écrit le cahier (le brouillon de l'atelier) : l'enregistrement reste le geste de l'entraîneur. */
  ranger: (plans: Combinaison[]) => void;
}) {
  const [fiches, setFiches] = useState<ResumePublie[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [situation, setSituation] = useState<SituationCahier | 'toutes'>('toutes');
  const [type, setType] = useState<TypeCombinaison | 'tous'>('tous');
  const [tri, setTri] = useState<Tri>('score');
  const [recherche, setRecherche] = useState('');
  const [miennes, setMiennes] = useState(false);
  const [ouverte, setOuverte] = useState<DetailPublie | null>(null);
  const [essai, setEssai] = useState<Combinaison | null>(null);

  const charger = useCallback(() => {
    api.liste().then((liste) => { setFiches(liste); setErreur(''); }).catch(() => { setFiches((avant) => avant ?? []); setErreur(t('mc.indisponible')); });
  }, [api]);
  useEffect(() => { charger(); }, [charger]);

  const dansLeCahier = useMemo(() => new Map(plans.flatMap((p) => (p.origine ? [[p.origine.publication, p] as const] : []))), [plans]);
  const visibles = useMemo(() => {
    const mots = recherche.trim().toLowerCase();
    const liste = (fiches ?? []).filter((f) => (situation === 'toutes' || f.situation === situation) && (type === 'tous' || f.type === type)
      && (!miennes || f.mienne) && (!mots || `${f.nom} ${f.description} ${f.pseudo}`.toLowerCase().includes(mots)));
    const cle: Record<Tri, (f: ResumePublie) => number> = {
      // Sans score (échantillon trop petit), une combinaison passe après celles qui en ont un — jamais devant.
      score: (f) => (f.score ?? -1) * 1000 + f.stats.utilisations, note: (f) => (f.note ?? 0) * 1000 + f.votes,
      recent: (f) => f.majLe, populaire: (f) => f.telechargements,
    };
    return [...liste].sort((a, b) => cle[tri](b) - cle[tri](a));
  }, [fiches, situation, type, tri, recherche, miennes]);

  const ouvrir = (id: string) => { api.detail(id).then(setOuverte).catch(() => setErreur(t('mc.indisponible'))); };
  const apresAction = (detail: DetailPublie) => { setOuverte(detail); charger(); };

  return (
    <div className="mc">
      <header className="mc-tete">
        <div><h3><Icone nom="marche" taille={18} />{t('mc.titre')}</h3><p>{t('mc.sous')}</p></div>
        <label className="mc-recherche"><Icone nom="loupe" taille={15} /><input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('mc.chercher')} aria-label={t('mc.chercher')} /></label>
      </header>
      <div className="mc-filtres">
        <Segments libelle={t('mc.situation')} valeur={situation} onChange={setSituation}
          options={[{ valeur: 'toutes', libelle: t('mc.toutes') }, ...SITUATIONS_CAHIER.map((s) => ({ valeur: s, libelle: t(`cb.empl.${s}`) }))]} />
        <Segments libelle={t('mc.type')} valeur={type} onChange={setType}
          options={[{ valeur: 'tous', libelle: t('mc.toutes') }, ...TYPES_COMBINAISON.map((x) => ({ valeur: x, libelle: t(`mc.type.${x}`) }))]} />
        <Segments libelle={t('mc.tri')} valeur={tri} onChange={setTri} options={TRIS.map((x) => ({ valeur: x, libelle: t(`mc.tri.${x}`) }))} />
        <button type="button" className="mc-bascule" aria-pressed={miennes} onClick={() => setMiennes((v) => !v)}>{t('mc.miennes')}</button>
      </div>
      {erreur && <p className="mc-info" role="status">{erreur}</p>}
      {fiches === null ? <p className="mc-info" role="status">{t('mc.chargement')}</p>
        : !visibles.length ? <p className="mc-info">{fiches.length ? t('mc.vide') : t('mc.videTotal')}</p>
        : <ul className="mc-liste">{visibles.map((f) => {
          const copie = dansLeCahier.get(f.id);
          const maj = !!copie?.origine && copie.origine.version < f.version && f.etat === 'publiee';
          return (
            <li key={f.id}>
              <button type="button" className={`mc-carte${f.etat !== 'publiee' ? ' attente' : ''}`} onClick={() => ouvrir(f.id)}>
                <span className="mc-carte-tete"><b>{f.nom}</b><span className="mc-version">{t('mc.version', { n: f.version })}</span></span>
                <span className="mc-meta">{t('mc.par', { p: f.pseudo })} · {t(`cb.empl.${f.situation}`)} · {t(`mc.type.${f.type}`)} <Puces niveau={f.difficulte} /></span>
                <span className="mc-chiffres">
                  <span className={`mc-score${f.score === null ? ' vide' : ''}`}><strong>{f.score === null ? '—' : Math.round(f.score)}</strong><small>{f.score === null ? t('mc.echantillon') : t('mc.score')}</small></span>
                  {f.reussite !== null && <span><strong>{pourcent(f.reussite)}</strong><small>{t('mc.stat.reussite')}</small></span>}
                  {f.stats.utilisations > 0 && <span><strong>{decimal(indicateurs(f.stats).metres)} m</strong><small>{t('mc.stat.parUtilisation')}</small></span>}
                  <Etoiles note={f.note} votes={f.votes} />
                </span>
                <span className="mc-badges">
                  <small>{tn('mc.stat.ajouts', f.telechargements)}</small>
                  {f.mienne && <em>{t('mc.mienne')}</em>}
                  {copie && !maj && <em className="ok"><Icone nom="check" taille={12} />{t('mc.ajoutee')}</em>}
                  {maj && <em className="maj">{t('mc.maj')}</em>}
                  {f.etat === 'attente' && <em className="alerte">{t('mc.etat.attente')}</em>}
                  {f.etat === 'retiree' && <em className="alerte">{t('mc.etat.retiree')}</em>}
                </span>
              </button>
            </li>
          );
        })}</ul>}
      {ouverte && !essai && <Fiche api={api} detail={ouverte} plans={plans} bloque={bloque} moderateur={moderateur} ranger={ranger}
        fermer={() => setOuverte(null)} voir={() => setEssai(ouverte.plan)} apresAction={apresAction} />}
      {essai && <Suspense fallback={null}><TestCombinaison3D combinaison={essai} variante={essai.variantes[0]} joueurs={joueurs} effectif={effectif} maillot={maillot} fermer={() => setEssai(null)} /></Suspense>}
    </div>
  );
}

/** La fiche d'une combinaison du marché : ce qu'elle est, ce qu'elle a donné, et ce qu'on peut en faire. */
function Fiche({ api, detail, plans, bloque, moderateur, ranger, fermer, voir, apresAction }: {
  api: ApiMarche; detail: DetailPublie; plans: Combinaison[]; bloque: boolean; moderateur: boolean;
  ranger: (plans: Combinaison[]) => void; fermer: () => void; voir: () => void; apresAction: (detail: DetailPublie) => void;
}) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  const [choixEmplacement, setChoixEmplacement] = useState(false);
  const [signalement, setSignalement] = useState(false);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const copie = plans.find((p) => p.origine?.publication === detail.id);
  const maj = !!copie?.origine && copie.origine.version < detail.version;
  const situation = situationDuPlan(detail.plan);
  const actifs = plans.filter((p) => p.active && situationDuPlan(p) === situation);
  const libre = emplacementsOccupes(plans).occupes[situation] < EMPLACEMENTS[situation];
  const plein = plans.length >= MAX_COMBINAISONS;
  const agir = async (faire: () => Promise<DetailPublie>, apres?: (d: DetailPublie) => void) => {
    setOccupe(true); setMessage('');
    try { const d = await faire(); apres?.(d); apresAction(d); } catch (e) { setMessage(messageDeRefus(e)); } finally { setOccupe(false); }
  };
  const ajouter = (remplacer?: string, rangee = false) => agir(() => api.ajouter(detail.id), (d) => {
    const suite = ajouterAuCahier(plans, d, uid(), remplacer);
    if (!suite) { setMessage(t('mc.empl.cahierPlein')); return; }
    ranger(rangee ? suite.map((p, i) => (i === suite.length - 1 ? { ...p, active: false } : p)) : suite);
    setChoixEmplacement(false); setMessage(t('mc.ajout.fait'));
  });
  return createPortal(
    <div ref={overlayRef} className="mc-fond" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div ref={dialogRef} className="mc-fiche" role="dialog" aria-modal="true" aria-labelledby="mc-fiche-titre" tabIndex={-1}>
        <header>
          <div>
            <span className="eyebrow">{t(`cb.empl.${detail.situation}`)} · {t(`mc.type.${detail.type}`)} · {t(`mc.difficulte.${detail.difficulte}`)}</span>
            <h3 id="mc-fiche-titre">{detail.nom} <span className="mc-version">{t('mc.version', { n: detail.version })}</span></h3>
            <p className="mc-meta">{t('mc.par', { p: detail.pseudo })} · {new Date(detail.majLe).toLocaleDateString()} · {tn('mc.stat.ajouts', detail.telechargements)}</p>
          </div>
          <button type="button" className="mc-fermer" onClick={fermer} aria-label={t('ctr.fermer')}><Icone nom="croix" taille={18} /></button>
        </header>
        {detail.etat !== 'publiee' && <p className="mc-info alerte">{t(`mc.etat.${detail.etat}`)}{detail.signalements !== undefined ? ` · ${tn('mc.signalements', detail.signalements)}` : ''}</p>}
        {detail.description && <p className="mc-description">{detail.description}</p>}
        <div className="mc-resume">
          <div className={`mc-score grand${detail.score === null ? ' vide' : ''}`} title={t('mc.score.aide')}>
            <strong>{detail.score === null ? '—' : Math.round(detail.score)}</strong><small>{detail.score === null ? t('mc.echantillon') : t('mc.score')}</small>
          </div>
          <p>{t('mc.score.aide')}</p>
          <Etoiles note={detail.note} votes={detail.votes} />
        </div>
        <Statistiques stats={detail.stats} />
        <div className="mc-actions">
          <button type="button" className="btn primaire" onClick={voir}><Icone nom="lecture" taille={16} />{t('mc.voir')}</button>
          {!copie && <button type="button" className="btn" disabled={bloque || occupe || plein || detail.etat === 'retiree'} onClick={() => setChoixEmplacement((v) => !v)} aria-expanded={choixEmplacement}><Icone nom="ajouter" taille={16} />{t('mc.ajouter')}</button>}
          {copie && !maj && <span className="mc-pastille ok"><Icone nom="check" taille={14} />{t('mc.ajoutee')}</span>}
          {copie && maj && <button type="button" className="btn" disabled={bloque} onClick={() => { ranger(plans.map((p) => (p.id === copie.id ? mettreAJour(p, detail) : p))); setMessage(t('mc.ajout.fait')); }}>{t('mc.maj.bouton', { n: detail.version })}</button>}
        </div>
        {copie && maj && <p className="mc-info">{t('mc.maj')} — {t('mc.maj.aide')}</p>}
        {!copie && plein && <p className="mc-info alerte">{t('mc.empl.cahierPlein')}</p>}
        {choixEmplacement && !copie && (
          <div className="mc-emplacements" role="group" aria-label={t('mc.empl.titre')}>
            <b>{t('mc.empl.titre')} · {t(`cb.empl.${situation}`)} {actifs.length}/{EMPLACEMENTS[situation]}</b>
            {libre && <button type="button" className="btn" disabled={occupe} onClick={() => { void ajouter(); }}><Icone nom="ok" taille={15} />{t('mc.empl.libre')}</button>}
            {!libre && actifs.map((p) => <button key={p.id} type="button" className="btn" disabled={occupe} onClick={() => { void ajouter(p.id); }}>{t('mc.empl.remplacer', { n: p.nom })}</button>)}
            <button type="button" className="btn fantome" disabled={occupe} onClick={() => { void ajouter(undefined, true); }}>{t('mc.empl.ranger')}</button>
          </div>
        )}
        {message && <p className="mc-info" role="status">{message}</p>}
        {!detail.mienne && detail.etat === 'publiee' && (
          <div className="mc-avis">
            <span>{t('mc.noter')}</span>
            <span className="mc-etoiles" role="group" aria-label={t('mc.noter')}>{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={n <= (detail.maNote ?? 0) ? 'pleine' : ''} disabled={occupe} aria-pressed={detail.maNote === n} aria-label={t('mc.noter.etoiles', { n })}
                onClick={() => { void agir(() => api.noter(detail.id, n)); }}><Icone nom="etoile" taille={18} /></button>))}</span>
            {detail.signalee ? <small>{t('mc.signaler.fait')}</small>
              : <button type="button" className="mc-lien" onClick={() => setSignalement((v) => !v)} aria-expanded={signalement}><Icone nom="alerte" taille={14} />{t('mc.signaler')}</button>}
          </div>
        )}
        {signalement && !detail.signalee && (
          <div className="mc-emplacements" role="group" aria-label={t('mc.signaler')}>
            {MOTIFS_SIGNALEMENT.map((motif: MotifSignalement) => <button key={motif} type="button" className="btn fantome" disabled={occupe}
              onClick={() => { void agir(() => api.signaler(detail.id, motif), () => setSignalement(false)); }}>{t(`mc.motif.${motif}`)}</button>)}
          </div>
        )}
        <details className="mc-versions">
          <summary>{t('mc.versions')} ({detail.versions.length})</summary>
          <ul>{detail.versions.map((v) => (
            <li key={v.numero}><b>{t('mc.version', { n: v.numero })}</b><span>{new Date(v.publieLe).toLocaleDateString()}</span>
              <span>{v.note || '—'}</span><small>{v.stats.utilisations} · {t('mc.stat.utilisations').toLowerCase()}</small></li>))}</ul>
        </details>
        {(detail.mienne || moderateur) && (
          <footer className="mc-moderation">
            {detail.etat !== 'retiree' && <button type="button" className="btn fantome ec-danger" disabled={occupe} onClick={() => { void agir(() => api.retirer(detail.id)); }}><Icone nom="corbeille" taille={15} />{t('mc.retirer')}</button>}
            {moderateur && detail.etat !== 'publiee' && <button type="button" className="btn fantome" disabled={occupe} onClick={() => { void agir(() => api.retablir(detail.id)); }}>{t('mc.retablir')}</button>}
          </footer>
        )}
      </div>
    </div>, document.body);
}

/** Publier une combinaison du cahier — ou une nouvelle version de celle qu'on a déjà publiée. */
export function PublierCombinaison({ api = apiMarche, plan, fermer, publiee }: {
  api?: ApiMarche; plan: Combinaison; fermer: () => void;
  /** La publication a réussi : le plan du cahier en devient la copie (statistiques, versions suivantes). */
  publiee: (detail: DetailPublie) => void;
}) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  const [nom, setNom] = useState(plan.nom);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<TypeCombinaison>(() => typeDuPlan(plan));
  const [difficulte, setDifficulte] = useState<DifficulteCombinaison>(() => difficulteDuPlan(plan));
  const [existante, setExistante] = useState<DetailPublie | null>(null);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [faite, setFaite] = useState(false);
  const origine = plan.origine?.publication;
  // Le plan vient-il d'une de MES publications ? Alors c'est une nouvelle version, pas une nouvelle fiche.
  useEffect(() => {
    if (!origine) return;
    let vivant = true;
    api.detail(origine).then((d) => { if (vivant && d.mienne) { setExistante(d); setNom(d.nom); setDescription(d.description); setType(d.type); setDifficulte(d.difficulte); } }).catch(() => {});
    return () => { vivant = false; };
  }, [api, origine]);
  const envoyer = async () => {
    setOccupe(true); setMessage('');
    try {
      const detail = await api.publier({ plan, nom, description, type, difficulte, ...(existante ? { publication: existante.id, note } : {}) });
      publiee(detail); setFaite(true); setMessage(t('mc.publier.fait'));
    } catch (e) { setMessage(messageDeRefus(e)); } finally { setOccupe(false); }
  };
  return createPortal(
    <div ref={overlayRef} className="mc-fond" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div ref={dialogRef} className="mc-fiche etroite" role="dialog" aria-modal="true" aria-labelledby="mc-publier-titre" tabIndex={-1}>
        <header>
          <div><span className="eyebrow">{t(`cb.empl.${situationDuPlan(plan)}`)}</span>
            <h3 id="mc-publier-titre">{existante ? `${t('mc.publier.version')} · ${t('mc.version', { n: existante.version + 1 })}` : t('mc.publier.titre')}</h3></div>
          <button type="button" className="mc-fermer" onClick={fermer} aria-label={t('ctr.fermer')}><Icone nom="croix" taille={18} /></button>
        </header>
        <label className="mc-champ">{t('mc.publier.nom')}<input maxLength={40} value={nom} disabled={faite} onChange={(e) => setNom(e.target.value)} /></label>
        <label className="mc-champ">{t('mc.publier.description')}<textarea maxLength={240} rows={3} value={description} disabled={faite} placeholder={t('mc.publier.descriptionAide')} onChange={(e) => setDescription(e.target.value)} /></label>
        {existante && <label className="mc-champ">{t('mc.publier.note')}<input maxLength={120} value={note} disabled={faite} onChange={(e) => setNote(e.target.value)} /></label>}
        <div className="mc-champ"><span>{t('mc.type')}</span>
          <Segments libelle={t('mc.type')} valeur={type} onChange={setType} options={TYPES_COMBINAISON.map((x) => ({ valeur: x, libelle: t(`mc.type.${x}`) }))} /></div>
        <div className="mc-champ"><span>{t('mc.difficulte')}</span>
          <Segments libelle={t('mc.difficulte')} valeur={String(difficulte) as '1' | '2' | '3'} onChange={(v) => setDifficulte(Number(v) as DifficulteCombinaison)}
            options={(['1', '2', '3'] as const).map((n) => ({ valeur: n, libelle: t(`mc.difficulte.${n}`) }))} /></div>
        <p className="mc-info">{t('mc.publier.regle')}</p>
        {message && <p className={`mc-info${faite ? '' : ' alerte'}`} role="status">{message}</p>}
        <footer className="mc-moderation">
          <button type="button" className="btn fantome" onClick={fermer}>{t('ctr.fermer')}</button>
          {!faite && <button type="button" className="btn primaire" disabled={occupe || nom.trim().length < 3} onClick={() => { void envoyer(); }}><Icone nom="partage" taille={16} />{t('mc.publier.envoyer')}</button>}
        </footer>
      </div>
    </div>, document.body);
}
