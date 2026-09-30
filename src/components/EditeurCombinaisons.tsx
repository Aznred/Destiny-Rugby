import { useState } from 'react';
import { Icone } from './Icone';
import { TerrainCombinaison } from './TerrainCombinaison';
import { combinaisonsValides, creerCombinaison, erreursVariante, etapesCombinaison, MAX_ACTIONS, MAX_ETAPES, MAX_COMBINAISONS, MAX_VARIANTES, origineApercu, placementsPersonnalises } from '../lib/ligue/combinaisons';
import { imageDebutEtape } from '../lib/ligue/apercuCombinaisons';
import type { Coequipier } from '../lib/effectif';
import type { ActionCombinaison, Combinaison, PhaseCombinaison, PiedCombinaison, PointCombinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import type { MaillotMatch } from '../lib/moteur/apparenceMatch';
import './EditeurCombinaisons.css';

const PHASES = { melee: 'Mêlée', touche: 'Touche', ruck: 'Ruck' };
const ZONES = { toutes: 'Partout', nos22: 'Dans nos 22', milieu: 'Entre les 22', leurs22: 'Dans leurs 22' };
const COULOIRS = { tous: 'Tous les côtés', gauche: 'À gauche', centre: 'Au centre', droite: 'À droite' };
const PIEDS: Record<PiedCombinaison, string> = { occupation: 'Occupation', degagement: 'Dégagement en touche', chandelle: 'Chandelle', rasant: 'Rasant', transversale: 'Transversale', cinquanteVingtDeux: '50/22', drop: 'Drop' };
const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const uid = () => crypto.randomUUID();
const choix = (valeurs: Record<string, string>) => Object.entries(valeurs).map(([valeur, nom]) => <option key={valeur} value={valeur}>{nom}</option>);

export function EditeurCombinaisons({ combinaisons = [], mode = 'automatique', joueurs = {}, effectif, maillot, occupe = false, enregistrer }: {
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
  const c = plans.find(c => c.id === selection) ?? plans[0];
  const v = c?.variantes[Math.min(varianteIndex, c.variantes.length - 1)];
  const origine = c ? origineApercu(c) : { x: 50, y: 35 };
  const bloque = occupe || sauvegarde;
  const erreurs = c && v ? erreursVariante(c.phase, v) : [];
  const etapes = etapesCombinaison(v?.actions ?? []);
  const cahierIncomplet = plans.some(c => c.variantes.some(v => erreursVariante(c.phase, v).length));
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
  const ajouter = (phase: PhaseCombinaison, vide = false) => {
    if (plans.length >= MAX_COMBINAISONS) return;
    const nouveau = creerCombinaison(uid(), phase);
    if (vide) { nouveau.nom = 'Ma combinaison'; nouveau.variantes[0].nom = 'Variante 1'; nouveau.variantes[0].actions = []; }
    modifie([...plans, nouveau]); setSelection(nouveau.id); setVarianteIndex(0); choisirEtape(null);
  };
  const placer = (numero: number, p: PointCombinaison) => {
    if (!v) return;
    modifierVariante({ ...v, placements: [...placementsPersonnalises(v).filter(p => p.numero !== numero),
      { numero, x: borner(p.x - origine.x, -35, 35), y: p.y - origine.y }] });
  };
  const numeros = (valeur: number, onChange: (v: number) => void, filtre = (n: number) => n >= 1) => <select value={valeur} onChange={e => onChange(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => i + 1).filter(filtre).map(n => <option key={n} value={n}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}</option>)}</select>;

  return <section className="ec cel-panneau">
    <header className="ec-entete"><div><span className="eyebrow">Cahier de jeu <span className="ec-beta">Bêta Kiri</span></span><h2>Crée tes combinaisons</h2><p>Place ton XV, dessine les appels et choisis chaque passe. Ton équipe les joue quand la situation se présente.</p></div>
      <div className="ec-enregistrement"><label>Utilisation en match<select value={modeChoisi} disabled={bloque} onChange={e => modifie(plans, e.target.value as typeof modeChoisi)}><option value="automatique">Jeu automatique</option><option value="configure">Mes combinaisons</option></select></label>
        <button className="btn primaire" disabled={bloque || !brouillon || cahierIncomplet} onClick={async () => {
          setSauvegarde(true);
          try { if (await enregistrer(combinaisonsValides(plans), modeChoisi)) { setBrouillon(null); setStatut('Cahier enregistré. Il sera utilisé lors des prochains matchs.'); } else setStatut('Enregistrement impossible. Ton brouillon est conservé.'); }
          catch { setStatut('Enregistrement impossible. Ton brouillon est conservé.'); }
          finally { setSauvegarde(false); }
        }}><Icone nom="disquette" taille={16} />{sauvegarde ? 'Enregistrement…' : 'Enregistrer le cahier'}</button></div>
    </header>
    <p className="ec-info">Les situations sans combinaison active suivent tes consignes habituelles. Le placement s’adapte au sens d’attaque ; les contacts, la conquête et les erreurs de passe restent joués.</p>
    {statut && <p role="status" className="ec-statut">{statut}</p>}
    {cahierIncomplet && <p className="ec-statut">Complète ou corrige les variantes avant d’enregistrer le cahier.</p>}
    <div className="ec-atelier">
      <aside className="ec-cahier"><div className="ec-titre-liste"><h3>Mes combinaisons</h3><span>{plans.length}/{MAX_COMBINAISONS}</span></div>
        {plans.map(p => <button key={p.id} className={`ec-plan ${p.id === c?.id ? 'selectionne' : ''}`} onClick={() => { setSelection(p.id); setVarianteIndex(0); choisirEtape(null); }}><b>{p.nom}</b><small>{PHASES[p.phase]} · {ZONES[p.zone]}</small><small>{COULOIRS[p.couloir]}{!p.active ? ' · Désactivée' : ''}{p.variantes.some(v => erreursVariante(p.phase, v).length) ? ' · À corriger' : ''}</small></button>)}
        {!plans.length && <p className="ec-info">Ton cahier est vide. Commence sur un terrain libre ou adapte un exemple.</p>}
        <button className="btn ec-creer" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter('melee', true)}><Icone nom="ajouter" taille={16} />Créer une combinaison</button>
        <details><summary>Partir d’un exemple</summary><div className="ec-exemples">{(Object.keys(PHASES) as PhaseCombinaison[]).map(phase => <button key={phase} className="btn" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter(phase)}>{PHASES[phase]}</button>)}</div></details>
      </aside>
      {c && v && <div className="ec-edition"><fieldset disabled={bloque}><div className="ec-reglages">
        <label>Nom<input maxLength={40} value={c.nom} onChange={e => modifier({ ...c, nom: e.target.value })} /></label>
        <label>Situation<select value={c.phase} onChange={e => {
          const phase = e.target.value as PhaseCombinaison;
          const ancienne = origineApercu(c); const nouvelle = origineApercu({ ...c, phase });
          // Conserver les joueurs visibles lorsque l'on passe du centre à une touche.
          modifier({ ...c, phase, couloir: phase === 'touche' && c.couloir === 'centre' ? 'tous' : c.couloir, variantes: c.variantes.map(v => ({ ...v, depart: phase === 'melee' && v.depart !== 8 ? 9 : v.depart, placements: placementsPersonnalises(v).map(p => ({ ...p, y: borner(ancienne.y + p.y, 2, 68) - nouvelle.y })) })) }); choisirEtape(null);
        }}>{choix(PHASES)}</select></label>
        <label>Zone<select value={c.zone} onChange={e => modifier({ ...c, zone: e.target.value as Combinaison['zone'] })}>{choix(ZONES)}</select></label>
        <label>Côté<select value={c.couloir} onChange={e => {
          const couloir = e.target.value as Combinaison['couloir'];
          const reflet = (c.couloir === 'droite') !== (couloir === 'droite');
          modifier({ ...c, couloir, variantes: reflet ? c.variantes.map(v => ({ ...v, placements: placementsPersonnalises(v).map(p => ({ ...p, y: -p.y })), actions: v.actions.map(a => a.type === 'course' || a.type === 'leurre' ? { ...a, destination: { ...a.destination, y: -a.destination.y } } : a) })) : c.variantes });
        }}>{Object.entries(COULOIRS).map(([valeur, nom]) => <option key={valeur} value={valeur} disabled={c.phase === 'touche' && valeur === 'centre'}>{nom}</option>)}</select></label>
      </div><div className="ec-actions-cahier"><label className="ec-case"><input type="checkbox" checked={c.active} onChange={e => modifier({ ...c, active: e.target.checked })} />Active dans les matchs</label>
        <button className="btn fantome" disabled={plans.length >= MAX_COMBINAISONS} onClick={() => { const copie = { ...structuredClone(c), id: uid(), nom: `${c.nom.slice(0, 32)} (copie)` }; modifie([...plans, copie]); setSelection(copie.id); choisirEtape(null); }}><Icone nom="dossier" taille={15} />Dupliquer</button>
        <button className="btn fantome ec-danger" onClick={() => { modifie(plans.filter(p => p.id !== c.id)); setSelection(null); setVarianteIndex(0); choisirEtape(null); }}><Icone nom="corbeille" taille={15} />Supprimer</button>
      </div>
      <div className="ec-variantes" role="group" aria-label="Variantes">{c.variantes.map((v, i) => <button className="btn fantome" aria-pressed={i === varianteIndex} key={i} onClick={() => { setVarianteIndex(i); choisirEtape(null); }}>{v.nom || `Variante ${i + 1}`}</button>)}<button className="btn ec-creer" disabled={c.variantes.length >= MAX_VARIANTES} onClick={() => { modifier({ ...c, variantes: [...c.variantes, { ...structuredClone(v), nom: `Variante ${c.variantes.length + 1}` }] }); setVarianteIndex(c.variantes.length); choisirEtape(null); }}><Icone nom="ajouter" taille={15} />Ajouter une variante</button></div>
      <div className="ec-reglages ec-variante-reglages"><label>Nom de la variante<input maxLength={40} value={v.nom} onChange={e => modifierVariante({ ...v, nom: e.target.value })} /></label><label>Fréquence relative<input type="number" min="1" max="100" value={v.poids} onChange={e => modifierVariante({ ...v, poids: borner(Number(e.target.value) || 1, 1, 100) })} /></label>
        {c.phase === 'ruck' && <label>Premier porteur{numeros(v.depart, n => modifierVariante({ ...v, depart: n }), n => n <= 9)}</label>}
        {c.variantes.length > 1 && <button className="btn fantome" onClick={() => { modifier({ ...c, variantes: c.variantes.filter((_, i) => i !== varianteIndex) }); setVarianteIndex(0); choisirEtape(null); }}>Retirer cette variante</button>}
      </div></fieldset>
      <TerrainCombinaison key={`${c.id}-${varianteIndex}`} combinaison={c} variante={v} joueurs={joueurs} effectif={effectif} maillot={maillot} joueur={joueur} actionIndex={actionIndex} etapeIndex={etapeIndex} choisirEtape={choisirEtape} bloque={bloque} selectionner={(numero, libre) => { setJoueur(numero); if (libre) setActionIndex(null); }} placer={placer} modifierAction={a => { if (actionIndex !== null) changerAction(actionIndex, a); }} modifierVariante={modifierVariante} />
      <fieldset disabled={bloque}><div className="ec-titre-liste"><h3>Enchaînement par étapes</h3><span>{etapes.length}/{MAX_ETAPES} étapes · {v.actions.length} gestes</span></div>
      <p className="ec-info">Tous les gestes d’une étape démarrent ensemble. Sélectionne une étape pour préparer la suite depuis les positions atteintes à la fin de la précédente.</p>
      <ol className="ec-sequence">{etapes.map((etape, s) => <li className={`ec-etape-edition ${etapeIndex === s ? 'selectionne' : ''}`} key={s}>
        <header className="ec-entete-etape"><div><button className="btn fantome" aria-label={`Préparer l’étape ${s + 1}`} aria-pressed={etapeIndex === s} onClick={() => choisirEtape(s)}>Étape {s + 1}<Icone nom="formation" taille={15} /></button><small>{etape.actions.length > 1 ? `${etape.actions.length} gestes en même temps` : 'Un geste'} · Porteur n° {porteurAvant(s)}</small></div>
          <div className="ec-ordre"><button className="btn fantome ec-bouton-icone" disabled={s === 0} aria-label={`Monter l’étape ${s + 1}`} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); [groupes[s - 1], groupes[s]] = [groupes[s], groupes[s - 1]]; remplacerEtapes(groupes); }}><Icone nom="fleche-droite" taille={15} className="ec-fleche-haut" /></button><button className="btn fantome ec-bouton-icone" disabled={s === etapes.length - 1} aria-label={`Descendre l’étape ${s + 1}`} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); [groupes[s + 1], groupes[s]] = [groupes[s], groupes[s + 1]]; remplacerEtapes(groupes); }}><Icone nom="fleche-droite" taille={15} className="ec-fleche-bas" /></button><button className="btn fantome ec-bouton-icone ec-danger" aria-label={`Supprimer l’étape ${s + 1}`} onClick={() => remplacerEtapes(etapes.filter((_, i) => i !== s).map(e => e.actions.map(a => a.action)))}><Icone nom="corbeille" taille={15} /></button></div>
        </header>
        {etape.actions.map(({ action: a, index: i }, j) => <div key={i} className={`ec-geste ${actionIndex === i ? 'selectionne' : ''}`}><button className="ec-numero-action" onClick={() => { setEtapeIndex(s); setActionIndex(actionIndex === i ? null : i); setJoueur(a.type === 'leurre' ? a.numero : null); }} aria-label={`Modifier l’action ${i + 1} sur le terrain`} aria-pressed={actionIndex === i}>{j + 1}</button>
        <label>Action<select value={a.type} onChange={e => { const type = e.target.value; changerAction(i, type === 'passe' ? { type, destinataire: joueurAction } : type === 'pied' ? { type, intention: 'occupation' } : type === 'leurre' ? { type, numero: joueurAction, destination: { x: 8, y: 0 } } : { type: 'course', destination: { x: 12, y: 0 } }); setActionIndex(i); }}>{choix({ passe: 'Passe', course: 'Course du porteur', leurre: 'Appel / leurre', pied: 'Jeu au pied' })}</select></label>
        {a.type === 'passe' && <label>Destinataire{numeros(a.destinataire, n => changerAction(i, { ...a, destinataire: n }))}</label>}
        {a.type === 'pied' && <label>Coup de pied<select value={a.intention} onChange={e => changerAction(i, { ...a, intention: e.target.value as PiedCombinaison })}>{choix(PIEDS)}</select></label>}
        {a.type === 'leurre' && <label>Joueur{numeros(a.numero, n => changerAction(i, { ...a, numero: n }))}</label>}
        {(a.type === 'course' || a.type === 'leurre') && <><label>Avancée (m)<input type="number" min="-35" max="35" step=".5" value={a.destination.x} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, x: borner(Number(e.target.value), -35, 35) } })} /></label><label>Largeur (m)<input type="number" min="-65" max="65" step=".5" value={a.destination.y} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, y: borner(Number(e.target.value), -65, 65) } })} /></label></>}
        <div className="ec-ordre">{j > 0 && <button className="btn fantome" disabled={etapes.length >= MAX_ETAPES} onClick={() => { const groupes = etapes.map(e => e.actions.map(a => a.action)); const suite = groupes[s].splice(j); groupes.splice(s + 1, 0, suite); remplacerEtapes(groupes); }}>Étape séparée</button>}<button className="btn fantome ec-bouton-icone ec-danger" aria-label={`Supprimer l’action ${i + 1}`} onClick={() => remplacerEtapes(etapes.map(e => e.actions.filter(a => a.index !== i).map(a => a.action)).filter(g => g.length))}><Icone nom="corbeille" taille={15} /></button></div>
      </div>)}
      <button className="btn ec-creer ec-appel" disabled={v.actions.length >= MAX_ACTIONS || etape.actions.length >= 15} onClick={() => ajouterAppel(s)}><Icone nom="ajouter" taille={16} />Ajouter un déplacement simultané</button>
      </li>)}</ol>
      {erreurs.filter(e => e.type !== 'vide').map((e, i) => <p className="ec-statut" key={i}>Action {e.action} : {e.type === 'passeASoi' ? 'le porteur ne peut pas se faire une passe à lui-même.' : e.type === 'ballonsMultiples' ? 'garde un seul geste du porteur dans cette étape. Les autres joueurs peuvent se déplacer en même temps.' : e.type === 'joueurDouble' ? 'ce joueur a déjà un déplacement dans cette étape. Choisis un autre joueur.' : e.type === 'tropEtapes' ? `limite l’enchaînement à ${MAX_ETAPES} étapes.` : 'le coup de pied termine la combinaison. Retire les étapes suivantes.'}</p>)}
      <button className="btn ec-creer" disabled={etapes.length >= MAX_ETAPES || v.actions.length >= MAX_ACTIONS || v.actions.some(a => a.type === 'pied')} onClick={() => { const porteur = porteurAvant(etapes.length); modifierVariante({ ...v, actions: [...v.actions, { type: 'passe', destinataire: joueurAction === porteur ? porteur === 10 ? 12 : 10 : joueurAction }] }); setActionIndex(v.actions.length); setEtapeIndex(etapes.length); setJoueur(null); }}><Icone nom="ajouter" taille={16} />Ajouter une étape</button>
      {!v.actions.length && <p className="ec-info">Ajoute au moins une action pour pouvoir enregistrer cette variante.</p>}
      <p className="ec-info">Une variante est tirée au départ selon sa fréquence relative. À situation identique, la combinaison la plus précise est prioritaire, puis la première du cahier. Les avants gardent leur formation pendant la conquête ; tes placements s’appliquent au lancement. « Tracé » montre tes consignes ; « Avec opposition » les teste avec la défense et les contacts du moteur de match.</p>
      </fieldset></div>}
    </div>
  </section>;
}
