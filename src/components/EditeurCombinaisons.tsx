import { tn, t } from '../lib/i18n';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Icone } from './Icone';
import { TerrainCombinaison } from './TerrainCombinaison';
import { combinaisonsValides, creerCombinaison, EMPLACEMENTS, emplacementsOccupes, erreursVariante, etapesCombinaison, MAX_ACTIONS, MAX_ETAPES, MAX_COMBINAISONS, MAX_VARIANTES, origineApercu, placementsPersonnalises, rangerEnTrop, SITUATIONS_CAHIER, situationDuPlan } from '../lib/ligue/combinaisons';
import { imageDebutEtape } from '../lib/ligue/apercuCombinaisons';
import type { Coequipier } from '../lib/effectif';
import type { ActionCombinaison, Combinaison, PhaseCombinaison, PiedCombinaison, PointCombinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import type { MaillotMatch } from '../lib/moteur/apparenceMatch';
import { ChronologieCombinaison } from './ChronologieCombinaison';
import { OrdresCombinaison } from './OrdresCombinaison';
import type { ResultatOrdre } from '../lib/ligue/ordresCombinaisons';
import { OptionsCombinaison } from './OptionsCombinaison';
import { MarcheCombinaisons, PublierCombinaison } from './MarcheCombinaisons';
import { EXEMPLES_COMBINAISONS, exempleCombinaison } from '../lib/ligue/exemplesCombinaisons';
import { indicateurs, versionsDisponibles, type ResumePublie, type StatsCombinaison } from '../lib/ligue/marcheCombinaisons';
import { apiMarche, type ApiMarche } from '../lib/marcheCombinaisonsClient';
import './EditeurCombinaisons.css';

// La fenêtre d'essai n'est chargée que si on l'ouvre : elle monte la scène 3D du match.
const TestCombinaison3D = lazy(() => import('./TestCombinaison3D').then((m) => ({ default: m.TestCombinaison3D })));

const PHASES = { melee: 'Mêlée', touche: 'Touche', ruck: 'Ruck' };
const ZONES = { toutes: 'Partout', nos22: 'Dans nos 22', milieu: 'Entre les 22', leurs22: 'Dans leurs 22', ligne10: 'Zone des 10 mètres' };
// Le niveau de l'atelier est un goût de CET appareil, pas une donnée du cahier.
const CLE_NIVEAU = 'destiny-rugby:combinaisons-niveau';
const niveauRetenu = (): 'simple' | 'avance' => { try { return localStorage.getItem(CLE_NIVEAU) === 'avance' ? 'avance' : 'simple'; } catch { return 'simple'; } };
const COULOIRS = { tous: 'Tous les côtés', gauche: 'À gauche', centre: 'Au centre', droite: 'À droite' };
const PIEDS: Record<PiedCombinaison, string> = { occupation: 'Occupation', degagement: 'Dégagement en touche', chandelle: 'Chandelle', rasant: 'Rasant', transversale: 'Transversale', cinquanteVingtDeux: '50/22', drop: 'Drop' };
const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** « Mêlée : départ du 8 » → « Départ du 8 » : la situation est déjà le titre du groupe. */
const nomCourtExemple = (nom: string) => { const court = nom.slice(Math.max(nom.indexOf(':'), nom.indexOf('：')) + 1).trim(); return court.charAt(0).toUpperCase() + court.slice(1); };
const uid = () => crypto.randomUUID();
const choix = (valeurs: Record<string, string>) => Object.entries(valeurs).map(([valeur, nom]) => <option key={valeur} value={valeur}>{nom}</option>);

export function EditeurCombinaisons({ combinaisons = [], mode = 'automatique', joueurs = {}, effectif, maillot, occupe = false, enregistrer, marche = apiMarche, moderateur = false, statsCombinaisons }: {
  /** Le marché des combinaisons. `null` : pas de marché sur cet écran. */
  marche?: ApiMarche | null;
  moderateur?: boolean;
  /** Ce que chaque plan a donné en match (par identifiant), relevé par le serveur. */
  statsCombinaisons?: Record<string, StatsCombinaison>;
  combinaisons?: Combinaison[];
  mode?: 'automatique' | 'configure';
  joueurs?: Record<number, string>;
  effectif?: Coequipier[];
  maillot?: MaillotMatch;
  occupe?: boolean;
  enregistrer: (combinaisons: Combinaison[], mode: 'automatique' | 'configure') => Promise<boolean>;
}) {
  const [brouillon, setBrouillon] = useState<{ plans: Combinaison[]; mode: 'automatique' | 'configure' } | null>(null);
  const plans = brouillon?.plans ?? combinaisons;
  const modeChoisi = brouillon?.mode ?? mode;
  const [selection, setSelection] = useState<string | null>(null);
  const [varianteIndex, setVarianteIndex] = useState(0);
  const [joueur, setJoueur] = useState<number | null>(null);
  const joueurAction = joueur ?? 10;
  const [actionIndex, setActionIndex] = useState<number | null>(null);
  const [etapeIndex, setEtapeIndex] = useState<number | null>(null);
  const [statut, setStatut] = useState('');
  const [sauvegarde, setSauvegarde] = useState(false);
  const [essai3D, setEssai3D] = useState(false);
  const [vue, setVue] = useState<'cahier' | 'marche'>('cahier');
  const [publication, setPublication] = useState(false);
  // Les versions courantes du marché : une lecture à l'ouverture du cahier, pour dire « nouvelle version disponible ».
  const [resumes, setResumes] = useState<ResumePublie[]>([]);
  useEffect(() => { if (marche) marche.liste().then(setResumes).catch(() => {}); }, [marche]);
  // Simple : on donne des ordres, le jeu calcule. Avancé : chaque geste, chaque variante et chaque poids se règle à la main.
  const [niveau, setNiveau] = useState(niveauRetenu);
  const choisirNiveau = (suivant: 'simple' | 'avance') => { setNiveau(suivant); try { localStorage.setItem(CLE_NIVEAU, suivant); } catch { /* le choix vaut pour la session */ } };
  const avance = niveau === 'avance';
  const c = plans.find(c => c.id === selection) ?? plans[0];
  const v = c?.variantes[Math.min(varianteIndex, c.variantes.length - 1)];
  const origine = c ? origineApercu(c) : { x: 50, y: 35 };
  const bloque = occupe || sauvegarde;
  const erreurs = c && v ? erreursVariante(c.phase, v) : [];
  const etapes = etapesCombinaison(v?.actions ?? []);
  const cahierIncomplet = plans.some(c => c.variantes.some(v => erreursVariante(c.phase, v).length));
  const nombreActives = plans.filter(c => c.active).length;
  const emplacements = emplacementsOccupes(plans);
  const nouvellesVersions = versionsDisponibles(plans, resumes);
  /** Activer un plan demande un emplacement libre dans sa situation ; le ranger n'en demande jamais. */
  const peutActiver = (plan: Combinaison, situation = situationDuPlan(plan)) => plans.filter(p => p.active && p.id !== plan.id && situationDuPlan(p) === situation).length < EMPLACEMENTS[situation];
  const modifie = (suivants: Combinaison[], nouveauMode = modeChoisi) => { setBrouillon({ plans: suivants, mode: nouveauMode }); setStatut(''); };
  const modifier = (suite: Combinaison) => modifie(plans.map(p => p.id === suite.id ? suite : p));
  const modifierVariante = (suite: VarianteCombinaison) => { if (c) modifier({ ...c, variantes: c.variantes.map((v, i) => i === Math.min(varianteIndex, c.variantes.length - 1) ? suite : v) }); };
  const choisirEtape = (i: number | null) => { setEtapeIndex(i); setActionIndex(null); setJoueur(null); };
  const changerAction = (i: number, action: ActionCombinaison) => {
    if (!v) return;
    setEtapeIndex(etapes.findIndex(e => e.actions.some(a => a.index === i)));
    setActionIndex(i); setJoueur(action.type === 'leurre' ? action.numero : null);
    modifierVariante({ ...v, actions: v.actions.map((a, j) => j === i ? { ...action, simultanee: a.simultanee } : a) });
  };
  const remplacerEtapes = (groupes: ActionCombinaison[][]) => {
    if (!v) return;
    const actions = groupes.flatMap(g => g.map((a, i) => { const copie = { ...a }; delete copie.simultanee; return i ? { ...copie, simultanee: true } : copie; }));
    modifierVariante({ ...v, actions }); choisirEtape(null);
  };
  const porteurAvant = (etape: number) => {
    let porteur = c?.phase === 'touche' ? v?.sauteur ?? 4 : v?.depart ?? 9;
    etapes.slice(0, etape).forEach(e => e.actions.forEach(({ action }) => { if (action.type === 'passe') porteur = action.destinataire; }));
    return porteur;
  };
  const ajouterAppel = (etape: number) => {
    if (!v || !c) return;
    const groupe = etapes[etape];
    const pris = [porteurAvant(etape), ...groupe.actions.filter(a => a.action.type === 'leurre').map(a => a.action.type === 'leurre' ? a.action.numero : 0)];
    const numero = [joueurAction, 12, 13, 11, 14, 15, 10, 9, 8, 7, 6, 5, 4, 3, 1, 2].find(n => !pris.includes(n));
    if (!numero) return;
    const p = imageDebutEtape(c, v, etape)!.positions[numero];
    const index = groupe.actions.at(-1)!.index + 1;
    const appel: ActionCombinaison = { type: 'leurre', numero, destination: { x: borner(p.x - origine.x + 8, -35, 35), y: p.y - origine.y }, simultanee: true };
    modifierVariante({ ...v, actions: [...v.actions.slice(0, index), appel, ...v.actions.slice(index)] });
    setJoueur(numero); setActionIndex(index); setEtapeIndex(etape);
  };
  const ajouter = (phase: PhaseCombinaison, vide = false, exemple?: string) => {
    if (plans.length >= MAX_COMBINAISONS) return;
    const nouveau = (exemple ? exempleCombinaison(exemple, uid(), t(`cb.ex.${exemple}`)) : null) ?? creerCombinaison(uid(), phase);
    if (vide) { nouveau.nom = 'Ma combinaison'; nouveau.variantes[0].nom = 'Variante 1'; nouveau.variantes[0].actions = []; }
    // Sans emplacement libre dans sa situation, le nouveau plan arrive rangé : rien n'est désactivé à la place de l'entraîneur.
    if (!peutActiver(nouveau)) nouveau.active = false;
    modifie([...plans, nouveau], plans.length ? modeChoisi : 'configure'); setSelection(nouveau.id); setVarianteIndex(0); choisirEtape(null);
  };
  const placer = (numero: number, p: PointCombinaison) => {
    if (!v) return;
    modifierVariante({ ...v, placements: [...placementsPersonnalises(v).filter(p => p.numero !== numero),
      { numero, x: borner(p.x - origine.x, -35, 35), y: p.y - origine.y }] });
  };
  /** Un ordre rapide vient d'être traduit en gestes : on sélectionne celui dont la course se trace sur le terrain. */
  const appliquerOrdre = (resultat: ResultatOrdre, numero: number) => {
    modifierVariante(resultat.variante);
    const geste = resultat.action === null ? undefined : resultat.variante.actions[resultat.action];
    if (resultat.action !== null && (geste?.type === 'course' || geste?.type === 'leurre')) {
      setActionIndex(resultat.action);
      setEtapeIndex(etapesCombinaison(resultat.variante.actions).findIndex(e => e.actions.some(a => a.index === resultat.action)));
      setJoueur(geste.type === 'leurre' ? geste.numero : null);
    } else {
      // Une passe : son destinataire reste sélectionné — c'est lui qui a le ballon, ses ordres sont ceux du porteur.
      setActionIndex(null); setEtapeIndex(null); setJoueur(numero);
    }
  };
  const retirerDernier = () => {
    if (!v) return;
    const groupes = etapes.map(e => e.actions.map(a => a.action));
    const derniere = groupes.at(-1);
    if (!derniere) return;
    derniere.pop();
    remplacerEtapes(groupes.filter(g => g.length));
  };
  const numeros = (valeur: number, onChange: (v: number) => void, filtre = (n: number) => n >= 1) => <select value={valeur} onChange={e => onChange(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => i + 1).filter(filtre).map(n => <option key={n} value={n}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}</option>)}</select>;
  const sauvegarderCahier = async (nouveauMode = modeChoisi) => {
    if (nouveauMode !== modeChoisi) setBrouillon({ plans, mode: nouveauMode });
    setSauvegarde(true);
    try {
      if (await enregistrer(rangerEnTrop(combinaisonsValides(plans)), nouveauMode)) {
        setBrouillon(null);
        setStatut(nouveauMode === 'configure' && nombreActives
          ? 'Cahier enregistré et activé. Il rejoint aussi tes matchs en cours à la prochaine situation correspondante.'
          : nouveauMode === 'automatique' ? 'Cahier enregistré. Le jeu automatique reste utilisé en match.' : 'Cahier enregistré. Active une combinaison pour l’utiliser en match.');
      } else setStatut('Enregistrement impossible. Ton brouillon est conservé.');
    } catch { setStatut('Enregistrement impossible. Ton brouillon est conservé.'); }
    finally { setSauvegarde(false); }
  };

  return <section className="ec cel-panneau">
    <header className="ec-entete"><div><span className="eyebrow">{t("ui.98cc7b152631")}<span className="ec-beta">{t("ui.37bd64e1da34")}</span></span><h2>{t("ui.6088dc3c7ad2")}</h2><p>{t("ui.71d66ed98bcf")}</p></div>
      <div className="ec-enregistrement"><label>{t("ui.b84080fb111e")}<select value={modeChoisi} disabled={bloque} onChange={e => modifie(plans, e.target.value as typeof modeChoisi)}><option value="automatique">{t("ui.c09a7f4cadd4")}</option><option value="configure">{t("ui.6aee308f6bf7")}</option></select></label>
        <button className="btn primaire" disabled={bloque || !brouillon || cahierIncomplet} onClick={() => { void sauvegarderCahier(); }}><Icone nom="disquette" taille={16} />{sauvegarde ? t("ui.0f02d9ec0f50") : t("ui.503d6c65b26c")}</button></div>
    </header>
    <p className="ec-info">{t("ui.bd59ac10a308")}</p>
    <div className="ec-niveau"><div className="ec-segments" role="group" aria-label={t('cb.mode.simple')}>
      <button type="button" className="btn fantome" aria-pressed={!avance} onClick={() => choisirNiveau('simple')}>{t('cb.mode.simple')}</button>
      <button type="button" className="btn fantome" aria-pressed={avance} onClick={() => choisirNiveau('avance')}>{t('cb.mode.avance')}</button>
    </div><small>{t('cb.mode.aide')}</small></div>
    <div className={`ec-utilisation ${modeChoisi === 'configure' && nombreActives ? 'active' : ''}`}><Icone nom="sifflet" taille={18} /><p>{modeChoisi === 'automatique' ? t("ui.c34bd71a3d74") : nombreActives ? tn("ui.37d942709c4d", nombreActives, { v0: nombreActives, v3: brouillon ? ' à enregistrer' : ' en match' }) : t("ui.a2e84131981d")}</p>{modeChoisi === 'automatique' && nombreActives > 0 && <button className="btn primaire" disabled={bloque || cahierIncomplet} onClick={() => { void sauvegarderCahier('configure'); }}>{t("ui.f561aee0ac24")}</button>}</div>
    {statut && <p role="status" className="ec-statut">{statut}</p>}
    {cahierIncomplet && <p className="ec-statut">{t("ui.ab9107297629")}</p>}
    {marche && <div className="ec-onglets" role="tablist" aria-label={t('mc.titre')}>
      <button type="button" role="tab" aria-selected={vue === 'cahier'} onClick={() => setVue('cahier')}><Icone nom="livre" taille={16} />{t('mc.onglet.cahier')}</button>
      <button type="button" role="tab" aria-selected={vue === 'marche'} onClick={() => setVue('marche')}><Icone nom="marche" taille={16} />{t('mc.onglet.marche')}</button>
    </div>}
    {marche && vue === 'marche' && <MarcheCombinaisons api={marche} plans={plans} joueurs={joueurs} effectif={effectif} maillot={maillot} bloque={bloque} moderateur={moderateur}
      ranger={suite => { modifie(suite, plans.length ? modeChoisi : 'configure'); if (suite.length > plans.length) setSelection(suite[suite.length - 1].id); }} />}
    {publication && c && marche && <PublierCombinaison api={marche} plan={c} fermer={() => setPublication(false)}
      publiee={detail => { modifier({ ...c, origine: { publication: detail.id, version: detail.version } }); marche.liste().then(setResumes).catch(() => {}); }} />}
    <div className="ec-atelier" hidden={vue === 'marche'}>
      <aside className="ec-cahier"><div className="ec-titre-liste"><h3>{t("ui.6aee308f6bf7")}</h3><span>{plans.length}/{MAX_COMBINAISONS}</span></div>
        {plans.map(p => <button key={p.id} className={`ec-plan ${p.id === c?.id ? 'selectionne' : ''}`} onClick={() => { setSelection(p.id); setVarianteIndex(0); choisirEtape(null); }}><b>{p.nom}</b><small>{PHASES[p.phase]} · {ZONES[p.zone]}</small><small>{COULOIRS[p.couloir]}{!p.active ? t("ui.ec191f7b5243") : ''}{p.variantes.some(v => erreursVariante(p.phase, v).length) ? t("ui.190a5172c231") : ''}</small>{nouvellesVersions[p.id] && <small className="ec-maj">{t('mc.maj')}</small>}</button>)}
        {!plans.length && <p className="ec-info">{t("ui.30032975f8e0")}</p>}
        <button className="btn ec-creer" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter('melee', true)}><Icone nom="ajouter" taille={16} />{t("ui.420e06439c62")}</button>
        <div className="ec-emplacements" aria-label={t('cb.empl.titre')}><b>{t('cb.empl.titre')}</b>
          {SITUATIONS_CAHIER.map(s => <span key={s} className={emplacements.occupes[s] >= EMPLACEMENTS[s] ? 'plein' : ''}>{t(`cb.empl.${s}`)}<i>{emplacements.occupes[s]}/{EMPLACEMENTS[s]}</i></span>)}
          <small>{t('cb.empl.aide')}</small></div>
        <details><summary>{t('cb.ex.titre')}</summary>{SITUATIONS_CAHIER.map(s => <div className="ec-exemples" key={s}><span>{t(`cb.empl.${s}`)}</span>
          {EXEMPLES_COMBINAISONS.filter(x => x.situation === s).map(x => <button key={x.id} className="btn" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter('ruck', false, x.id)}>{nomCourtExemple(t(`cb.ex.${x.id}`))}</button>)}</div>)}</details>
      </aside>
      {c && v && <div className="ec-edition"><fieldset disabled={bloque}><div className="ec-reglages">
        <label>{t("mgr.creation.nom")}<input maxLength={40} value={c.nom} onChange={e => modifier({ ...c, nom: e.target.value })} /></label>
        <label>{t("ui.00e3bd2e750b")}<select value={c.phase} onChange={e => {
          const phase = e.target.value as PhaseCombinaison;
          const ancienne = origineApercu(c); const nouvelle = origineApercu({ ...c, phase });
          // Conserver les joueurs visibles lorsque l'on passe du centre à une touche.
          modifier({ ...c, phase, couloir: phase === 'touche' && c.couloir === 'centre' ? 'tous' : c.couloir, variantes: c.variantes.map(v => ({ ...v, depart: phase === 'melee' && v.depart !== 8 ? 9 : v.depart, placements: placementsPersonnalises(v).map(p => ({ ...p, y: borner(ancienne.y + p.y, 2, 68) - nouvelle.y })) })) }); choisirEtape(null);
        }}>{choix(PHASES)}</select></label>
        <label>{t("ui.a8a06e4a5695")}<select value={c.zone} onChange={e => { const zone = e.target.value as Combinaison['zone']; modifier({ ...c, zone, active: c.active && peutActiver(c, situationDuPlan({ ...c, zone })) }); }}>{choix(ZONES)}</select></label>
        <label>{t("ui.3084d90c7200")}<select value={c.couloir} onChange={e => {
          const couloir = e.target.value as Combinaison['couloir'];
          const reflet = (c.couloir === 'droite') !== (couloir === 'droite');
          modifier({ ...c, couloir, variantes: reflet ? c.variantes.map(v => ({ ...v, placements: placementsPersonnalises(v).map(p => ({ ...p, y: -p.y })), actions: v.actions.map(a => a.type === 'course' || a.type === 'leurre' ? { ...a, destination: { ...a.destination, y: -a.destination.y } } : a) })) : c.variantes });
        }}>{Object.entries(COULOIRS).map(([valeur, nom]) => <option key={valeur} value={valeur} disabled={c.phase === 'touche' && valeur === 'centre'}>{nom}</option>)}</select></label>
      </div><div className="ec-actions-cahier"><label className="ec-case"><input type="checkbox" checked={c.active} disabled={!c.active && !peutActiver(c)} onChange={e => modifier({ ...c, active: e.target.checked })} />{t("ui.519639d3b8eb")}</label>
        {!c.active && !peutActiver(c) && <small className="ec-plein">{t('cb.empl.plein', { s: t(`cb.empl.${situationDuPlan(c)}`) })}</small>}
        {marche && <button className="btn fantome" disabled={erreurs.length > 0 || !v.actions.length} onClick={() => setPublication(true)}><Icone nom="partage" taille={15} />{t('mc.publier')}</button>}
        <button className="btn fantome" disabled={plans.length >= MAX_COMBINAISONS} onClick={() => { const copie = { ...structuredClone(c), id: uid(), nom: `${c.nom.slice(0, 32)} (copie)` }; modifie([...plans, copie]); setSelection(copie.id); choisirEtape(null); }}><Icone nom="dossier" taille={15} />{t("ui.9d726e2b316d")}</button>
        <button className="btn fantome ec-danger" onClick={() => { modifie(plans.filter(p => p.id !== c.id)); setSelection(null); setVarianteIndex(0); choisirEtape(null); }}><Icone nom="corbeille" taille={15} />{t("compoSolo.deleteTeamBtn")}</button>
      </div>
      {/* En Simple on ne règle pas les variantes — mais un plan qui en a plusieurs doit rester lisible : on peut passer de l'une à l'autre. */}
      {(avance || c.variantes.length > 1) && <div className="ec-variantes" role="group" aria-label={t("ui.64774cce5542")}>{c.variantes.map((v, i) => <button className="btn fantome" aria-pressed={i === varianteIndex} key={i} onClick={() => { setVarianteIndex(i); choisirEtape(null); }}>{v.nom || t("ui.78b9497ce082", { v0: i + 1 })}</button>)}<button className="btn ec-creer" disabled={c.variantes.length >= MAX_VARIANTES} onClick={() => { modifier({ ...c, variantes: [...c.variantes, { ...structuredClone(v), nom: `Variante ${c.variantes.length + 1}` }] }); setVarianteIndex(c.variantes.length); choisirEtape(null); }}><Icone nom="ajouter" taille={15} />{t("ui.6ea355ebf218")}</button></div>}
      {avance && <div className="ec-reglages ec-variante-reglages"><label>{t("ui.3d92b07fe758")}<input maxLength={40} value={v.nom} onChange={e => modifierVariante({ ...v, nom: e.target.value })} /></label><label>{t("ui.414e318cb036")}<input type="number" min="1" max="100" value={v.poids} onChange={e => modifierVariante({ ...v, poids: borner(Number(e.target.value) || 1, 1, 100) })} /></label>
        {c.phase === 'ruck' && <label>{t("ui.5c6ea912cc2b")}{numeros(v.depart, n => modifierVariante({ ...v, depart: n }), n => n <= 9)}</label>}
        {c.variantes.length > 1 && <button className="btn fantome" onClick={() => { modifier({ ...c, variantes: c.variantes.filter((_, i) => i !== varianteIndex) }); setVarianteIndex(0); choisirEtape(null); }}>{t("ui.cff24f0458d3")}</button>}
      </div>}</fieldset>
      <div className="ec-essai-3d">
        <button type="button" className="btn primaire" disabled={!v.actions.length || erreurs.length > 0} onClick={() => setEssai3D(true)}><Icone nom="lecture" taille={16} />{t('cb.essai.bouton')}</button>
        <span>{t('cb.essai.aide')}</span>
      </div>
      {essai3D && <Suspense fallback={null}><TestCombinaison3D combinaison={c} variante={v} joueurs={joueurs} effectif={effectif} maillot={maillot} fermer={() => setEssai3D(false)} /></Suspense>}
      <TerrainCombinaison key={`${c.id}-${varianteIndex}`} combinaison={c} variante={v} joueurs={joueurs} effectif={effectif} maillot={maillot} joueur={joueur} actionIndex={actionIndex} etapeIndex={etapeIndex} choisirEtape={choisirEtape} bloque={bloque} ordres={!avance} selectionner={(numero, libre) => { setJoueur(numero); if (libre) setActionIndex(null); }} placer={placer} modifierAction={a => { if (actionIndex !== null) changerAction(actionIndex, a); }} modifierVariante={modifierVariante} />
      <OrdresCombinaison combinaison={c} variante={v} joueur={joueur} joueurs={joueurs} bloque={bloque} appliquer={appliquerOrdre} />
      <ChronologieCombinaison combinaison={c} variante={v} effectif={effectif} etape={etapeIndex} choisirEtape={choisirEtape} />
      <OptionsCombinaison combinaison={c} variante={v} joueurs={joueurs} bloque={bloque} modifier={modifierVariante} />
      {nouvellesVersions[c.id] && <p className="ec-info ec-maj">{t('mc.maj')} ({t('mc.version', { n: nouvellesVersions[c.id] })}) — {t('mc.maj.aide')} <button type="button" className="btn fantome" onClick={() => setVue('marche')}>{t('mc.onglet.marche')}</button></p>}
      <p className="ec-stats-plan"><b><Icone nom="resultats" taille={14} />{t('cb.stats.titre')}</b>{statsCombinaisons?.[c.id]?.utilisations
        ? t('cb.stats.ligne', { n: statsCombinaisons[c.id].utilisations, m: (Math.round(indicateurs(statsCombinaisons[c.id]).metres * 10) / 10).toLocaleString(), r: Math.round(indicateurs(statsCombinaisons[c.id]).reussite * 100) })
        : t('cb.stats.aucune')}</p>
      {!avance && <div className="ec-simple-actions">
        <button type="button" className="btn fantome" disabled={bloque || !v.actions.length} onClick={retirerDernier}><Icone nom="moins" taille={15} />{t('cb.simple.retirer')}</button>
        <button type="button" className="btn fantome ec-danger" disabled={bloque || !v.actions.length} onClick={() => { modifierVariante({ ...v, actions: [] }); choisirEtape(null); }}><Icone nom="corbeille" taille={15} />{t('cb.simple.effacer')}</button>
        <button type="button" className="btn fantome" onClick={() => choisirNiveau('avance')}><Icone nom="reglages" taille={15} />{t('cb.simple.regler')}</button>
      </div>}
      {avance && <fieldset disabled={bloque}><div className="ec-titre-liste"><h3>{t("ui.e14f38b13e7d")}</h3><span>{t("ui.96874db39f11", { v0: etapes.length, v1: MAX_ETAPES, v2: v.actions.length })}</span></div>
      <p className="ec-info">{t("ui.02a55ecc9d75")}</p>
      <ol className="ec-sequence">{etapes.map((etape, s) => <li className={`ec-etape-edition ${etapeIndex === s ? 'selectionne' : ''}`} key={s}>
        <header className="ec-entete-etape"><div><button className="btn fantome" aria-label={t("ui.92a477b713b9", { v0: s + 1 })} aria-pressed={etapeIndex === s} onClick={() => choisirEtape(s)}>{t("ui.87cfceb4c31d", { v0: s + 1 })}<Icone nom="formation" taille={15} /></button><small>{t("ui.f3229874bc7d", { v0: etape.actions.length > 1 ? t("ui.8ee58bc29c21", { v0: etape.actions.length }) : t("ui.410cc636472b"), v1: porteurAvant(s) })}</small></div>
          <div className="ec-ordre"><button className="btn fantome ec-bouton-icone" disabled={s === 0} aria-label={t("ui.6aadca0ccd48", { v0: s + 1 })} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); [groupes[s - 1], groupes[s]] = [groupes[s], groupes[s - 1]]; remplacerEtapes(groupes); }}><Icone nom="fleche-droite" taille={15} className="ec-fleche-haut" /></button><button className="btn fantome ec-bouton-icone" disabled={s === etapes.length - 1} aria-label={t("ui.c376549d98dc", { v0: s + 1 })} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); [groupes[s + 1], groupes[s]] = [groupes[s], groupes[s + 1]]; remplacerEtapes(groupes); }}><Icone nom="fleche-droite" taille={15} className="ec-fleche-bas" /></button><button className="btn fantome ec-bouton-icone ec-danger" aria-label={t("ui.3097aa7c70d6", { v0: s + 1 })} onClick={() => remplacerEtapes(etapes.filter((_, i) => i !== s).map(e => e.actions.map(a => a.action)))}><Icone nom="corbeille" taille={15} /></button></div>
        </header>
        {etape.actions.map(({ action: a, index: i }, j) => <div key={i} className={`ec-geste ${actionIndex === i ? 'selectionne' : ''}`}><button className="ec-numero-action" onClick={() => { setEtapeIndex(s); setActionIndex(actionIndex === i ? null : i); setJoueur(a.type === 'leurre' ? a.numero : null); }} aria-label={t("ui.25ad6c1449a5", { v0: i + 1 })} aria-pressed={actionIndex === i}>{j + 1}</button>
        <label>{t("ui.64cff1319d2f")}<select value={a.type} onChange={e => { const type = e.target.value; changerAction(i, type === 'passe' ? { type, destinataire: joueurAction } : type === 'pied' ? { type, intention: 'occupation' } : type === 'leurre' ? { type, numero: joueurAction, destination: { x: 8, y: 0 } } : { type: 'course', destination: { x: 12, y: 0 } }); setActionIndex(i); }}>{choix({ passe: 'Passe', course: 'Course du porteur', leurre: 'Appel / leurre', pied: 'Jeu au pied' })}</select></label>
        {a.type === 'passe' && <label>{t("ui.046ba55e23a5")}{numeros(a.destinataire, n => changerAction(i, { ...a, destinataire: n }))}</label>}
        {a.type === 'pied' && <label>{t("ml.gain.pied")}<select value={a.intention} onChange={e => changerAction(i, { ...a, intention: e.target.value as PiedCombinaison })}>{choix(PIEDS)}</select></label>}
        {a.type === 'leurre' && <label>{t("ml.joueur")}{numeros(a.numero, n => changerAction(i, { ...a, numero: n }))}</label>}
        {(a.type === 'course' || a.type === 'leurre') && <><label>{t("ui.75c997eb839c")}<input type="number" min="-35" max="35" step=".5" value={a.destination.x} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, x: borner(Number(e.target.value), -35, 35) } })} /></label><label>{t("ui.99907dd0b2f5")}<input type="number" min="-65" max="65" step=".5" value={a.destination.y} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, y: borner(Number(e.target.value), -65, 65) } })} /></label></>}
        <div className="ec-ordre">{j > 0 && <button className="btn fantome" disabled={etapes.length >= MAX_ETAPES} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); const suite = groupes[s].splice(j); groupes.splice(s + 1, 0, suite); remplacerEtapes(groupes); }}>{t("ui.e57115e96c40")}</button>}<button className="btn fantome ec-bouton-icone ec-danger" aria-label={t("ui.d05f064103b6", { v0: i + 1 })} onClick={() => remplacerEtapes(etapes.map(e => e.actions.filter(a => a.index !== i).map(a => a.action)).filter(g => g.length))}><Icone nom="corbeille" taille={15} /></button></div>
      </div>)}
      <button className="btn ec-creer ec-appel" disabled={v.actions.length >= MAX_ACTIONS || etape.actions.length >= 15} onClick={() => ajouterAppel(s)}><Icone nom="ajouter" taille={16} />{t("ui.3c20f8452447")}</button>
      </li>)}</ol>
      {erreurs.filter(e => e.type !== 'vide').map((e, i) => <p className="ec-statut" key={i}>{t("ui.8f284950af74", { v0: e.action, v1: e.type === 'passeASoi' ? t("ui.3de4995ab269") : e.type === 'ballonsMultiples' ? t("ui.d783035727bb") : e.type === 'joueurDouble' ? t("ui.02d3d7c484f0") : e.type === 'tropEtapes' ? t("ui.922b24306f2f", { v0: MAX_ETAPES }) : t("ui.465ef6cbe0c3") })}</p>)}
      <button className="btn ec-creer" disabled={etapes.length >= MAX_ETAPES || v.actions.length >= MAX_ACTIONS || v.actions.some(a => a.type === 'pied')} onClick={() => { const porteur = porteurAvant(etapes.length); modifierVariante({ ...v, actions: [...v.actions, { type: 'passe', destinataire: joueurAction === porteur ? porteur === 10 ? 12 : 10 : joueurAction }] }); setActionIndex(v.actions.length); setEtapeIndex(etapes.length); setJoueur(null); }}><Icone nom="ajouter" taille={16} />{t("ui.4dced1adb9e8")}</button>
      {!v.actions.length && <p className="ec-info">{t("ui.acca4875f9bf")}</p>}
      <p className="ec-info">{t("ui.f4cecef9e654")}</p>
      </fieldset>}</div>}
    </div>
  </section>;
}
