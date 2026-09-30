import { useState } from 'react';
import { Icone } from './Icone';
import { TerrainCombinaison } from './TerrainCombinaison';
import { combinaisonsValides, creerCombinaison, erreursVariante, MAX_ACTIONS, MAX_COMBINAISONS, MAX_VARIANTES, origineApercu } from '../lib/ligue/combinaisons';
import type { ActionCombinaison, Combinaison, PhaseCombinaison, PiedCombinaison, PointCombinaison, VarianteCombinaison } from '../lib/ligue/combinaisons';
import './EditeurCombinaisons.css';

const PHASES = { melee: 'Mêlée', touche: 'Touche', ruck: 'Ruck' };
const ZONES = { toutes: 'Partout', nos22: 'Dans nos 22', milieu: 'Entre les 22', leurs22: 'Dans leurs 22' };
const COULOIRS = { tous: 'Tous les côtés', gauche: 'À gauche', centre: 'Au centre', droite: 'À droite' };
const PIEDS: Record<PiedCombinaison, string> = { occupation: 'Occupation', degagement: 'Dégagement en touche', chandelle: 'Chandelle', rasant: 'Rasant', transversale: 'Transversale', cinquanteVingtDeux: '50/22', drop: 'Drop' };
const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const uid = () => crypto.randomUUID();
const choix = (valeurs: Record<string, string>) => Object.entries(valeurs).map(([valeur, nom]) => <option key={valeur} value={valeur}>{nom}</option>);

export function EditeurCombinaisons({ combinaisons = [], mode = 'automatique', joueurs = {}, occupe = false, enregistrer }: {
  combinaisons?: Combinaison[];
  mode?: 'automatique' | 'configure';
  joueurs?: Record<number, string>;
  occupe?: boolean;
  enregistrer: (combinaisons: Combinaison[], mode: 'automatique' | 'configure') => Promise<boolean>;
}) {
  const [brouillon, setBrouillon] = useState<{ plans: Combinaison[]; mode: 'automatique' | 'configure' } | null>(null);
  const plans = brouillon?.plans ?? combinaisons;
  const modeChoisi = brouillon?.mode ?? mode;
  const [selection, setSelection] = useState<string | null>(null);
  const [varianteIndex, setVarianteIndex] = useState(0);
  const [joueur, setJoueur] = useState(10);
  const [actionIndex, setActionIndex] = useState<number | null>(null);
  const [statut, setStatut] = useState('');
  const [sauvegarde, setSauvegarde] = useState(false);
  const c = plans.find(c => c.id === selection) ?? plans[0];
  const v = c?.variantes[Math.min(varianteIndex, c.variantes.length - 1)];
  const origine = c ? origineApercu(c) : { x: 50, y: 35 };
  const bloque = occupe || sauvegarde;
  const erreurs = c && v ? erreursVariante(c.phase, v) : [];
  const cahierIncomplet = plans.some(c => c.variantes.some(v => erreursVariante(c.phase, v).length));
  const modifie = (suivants: Combinaison[], nouveauMode = modeChoisi) => { setBrouillon({ plans: suivants, mode: nouveauMode }); setStatut(''); };
  const modifier = (suite: Combinaison) => modifie(plans.map(p => p.id === suite.id ? suite : p));
  const modifierVariante = (suite: VarianteCombinaison) => { if (c) modifier({ ...c, variantes: c.variantes.map((v, i) => i === Math.min(varianteIndex, c.variantes.length - 1) ? suite : v) }); };
  const changerAction = (i: number, action: ActionCombinaison) => { if (v) modifierVariante({ ...v, actions: v.actions.map((a, j) => j === i ? action : a) }); };
  const ajouter = (phase: PhaseCombinaison, vide = false) => {
    if (plans.length >= MAX_COMBINAISONS) return;
    const nouveau = creerCombinaison(uid(), phase);
    if (vide) { nouveau.nom = 'Ma combinaison'; nouveau.variantes[0].nom = 'Variante 1'; nouveau.variantes[0].actions = []; }
    modifie([...plans, nouveau]); setSelection(nouveau.id); setVarianteIndex(0); setActionIndex(null);
  };
  const placer = (numero: number, p: PointCombinaison) => {
    if (!v) return;
    modifierVariante({ ...v, placements: [...v.placements.filter(p => p.numero !== numero),
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
        {plans.map(p => <button key={p.id} className={`ec-plan ${p.id === c?.id ? 'selectionne' : ''}`} onClick={() => { setSelection(p.id); setVarianteIndex(0); setActionIndex(null); }}><b>{p.nom}</b><small>{PHASES[p.phase]} · {ZONES[p.zone]}</small><small>{COULOIRS[p.couloir]}{!p.active ? ' · Désactivée' : ''}{p.variantes.some(v => erreursVariante(p.phase, v).length) ? ' · À corriger' : ''}</small></button>)}
        {!plans.length && <p className="ec-info">Ton cahier est vide. Commence sur un terrain libre ou adapte un exemple.</p>}
        <button className="btn" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter('melee', true)}>Créer une combinaison</button>
        <details><summary>Partir d’un exemple</summary><div className="ec-exemples">{(Object.keys(PHASES) as PhaseCombinaison[]).map(phase => <button key={phase} className="btn" disabled={bloque || plans.length >= MAX_COMBINAISONS} onClick={() => ajouter(phase)}>{PHASES[phase]}</button>)}</div></details>
      </aside>
      {c && v && <div className="ec-edition"><fieldset disabled={bloque}><div className="ec-reglages">
        <label>Nom<input maxLength={40} value={c.nom} onChange={e => modifier({ ...c, nom: e.target.value })} /></label>
        <label>Situation<select value={c.phase} onChange={e => {
          const phase = e.target.value as PhaseCombinaison;
          const ancienne = origineApercu(c); const nouvelle = origineApercu({ ...c, phase });
          // Conserver les joueurs visibles lorsque l'on passe du centre à une touche.
          modifier({ ...c, phase, couloir: phase === 'touche' && c.couloir === 'centre' ? 'tous' : c.couloir, variantes: c.variantes.map(v => ({ ...v, depart: phase === 'melee' && v.depart !== 8 ? 9 : v.depart, placements: v.placements.map(p => ({ ...p, y: borner(ancienne.y + p.y, 2, 68) - nouvelle.y })) })) }); setActionIndex(null);
        }}>{choix(PHASES)}</select></label>
        <label>Zone<select value={c.zone} onChange={e => modifier({ ...c, zone: e.target.value as Combinaison['zone'] })}>{choix(ZONES)}</select></label>
        <label>Côté<select value={c.couloir} onChange={e => {
          const couloir = e.target.value as Combinaison['couloir'];
          const reflet = (c.couloir === 'droite') !== (couloir === 'droite');
          modifier({ ...c, couloir, variantes: reflet ? c.variantes.map(v => ({ ...v, placements: v.placements.map(p => ({ ...p, y: -p.y })), actions: v.actions.map(a => a.type === 'course' || a.type === 'leurre' ? { ...a, destination: { ...a.destination, y: -a.destination.y } } : a) })) : c.variantes });
        }}>{Object.entries(COULOIRS).map(([valeur, nom]) => <option key={valeur} value={valeur} disabled={c.phase === 'touche' && valeur === 'centre'}>{nom}</option>)}</select></label>
      </div><div className="ec-actions-cahier"><label className="ec-case"><input type="checkbox" checked={c.active} onChange={e => modifier({ ...c, active: e.target.checked })} />Active dans les matchs</label>
        <button className="btn fantome" disabled={plans.length >= MAX_COMBINAISONS} onClick={() => { const copie = { ...structuredClone(c), id: uid(), nom: `${c.nom.slice(0, 32)} (copie)` }; modifie([...plans, copie]); setSelection(copie.id); }}>Dupliquer</button>
        <button className="btn fantome" onClick={() => { modifie(plans.filter(p => p.id !== c.id)); setSelection(null); setVarianteIndex(0); }}>Supprimer</button>
      </div>
      <div className="ec-variantes" role="group" aria-label="Variantes">{c.variantes.map((v, i) => <button className={`btn ${i === varianteIndex ? 'primaire' : ''}`} key={i} onClick={() => { setVarianteIndex(i); setActionIndex(null); }}>{v.nom || `Variante ${i + 1}`}</button>)}<button className="btn" disabled={c.variantes.length >= MAX_VARIANTES} onClick={() => { modifier({ ...c, variantes: [...c.variantes, { ...structuredClone(v), nom: `Variante ${c.variantes.length + 1}` }] }); setVarianteIndex(c.variantes.length); setActionIndex(null); }}>Ajouter une variante</button></div>
      <div className="ec-reglages ec-variante-reglages"><label>Nom de la variante<input maxLength={40} value={v.nom} onChange={e => modifierVariante({ ...v, nom: e.target.value })} /></label><label>Fréquence relative<input type="number" min="1" max="100" value={v.poids} onChange={e => modifierVariante({ ...v, poids: borner(Number(e.target.value) || 1, 1, 100) })} /></label>
        {c.phase !== 'touche' && <label>Premier porteur{numeros(v.depart, n => modifierVariante({ ...v, depart: n }), n => c.phase === 'melee' ? n === 8 || n === 9 : n <= 9)}</label>}
        {c.variantes.length > 1 && <button className="btn fantome" onClick={() => { modifier({ ...c, variantes: c.variantes.filter((_, i) => i !== varianteIndex) }); setVarianteIndex(0); setActionIndex(null); }}>Retirer cette variante</button>}
      </div></fieldset>
      <TerrainCombinaison key={`${c.id}-${varianteIndex}`} combinaison={c} variante={v} joueurs={joueurs} joueur={joueur} actionIndex={actionIndex} bloque={bloque} selectionner={(numero, libre) => { setJoueur(numero); if (libre) setActionIndex(null); }} placer={placer} modifierAction={a => { if (actionIndex !== null) changerAction(actionIndex, a); }} modifierVariante={modifierVariante} />
      <fieldset disabled={bloque}><div className="ec-titre-liste"><h3>Enchaînement</h3><span>{v.actions.length}/{MAX_ACTIONS} actions</span></div>
      <ol className="ec-sequence">{v.actions.map((a, i) => <li key={i} className={actionIndex === i ? 'selectionne' : ''}><button className="ec-numero-action" onClick={() => { setActionIndex(actionIndex === i ? null : i); }} aria-label={`Modifier l’action ${i + 1} sur le terrain`} aria-pressed={actionIndex === i}>{i + 1}</button>
        <label>Action<select value={a.type} onChange={e => { const type = e.target.value; changerAction(i, type === 'passe' ? { type, destinataire: joueur } : type === 'pied' ? { type, intention: 'occupation' } : type === 'leurre' ? { type, numero: joueur, destination: { x: 8, y: 0 } } : { type: 'course', destination: { x: 12, y: 0 } }); setActionIndex(i); }}>{choix({ passe: 'Passe', course: 'Course du porteur', leurre: 'Appel / leurre', pied: 'Jeu au pied' })}</select></label>
        {a.type === 'passe' && <label>Destinataire{numeros(a.destinataire, n => changerAction(i, { ...a, destinataire: n }))}</label>}
        {a.type === 'pied' && <label>Coup de pied<select value={a.intention} onChange={e => changerAction(i, { ...a, intention: e.target.value as PiedCombinaison })}>{choix(PIEDS)}</select></label>}
        {a.type === 'leurre' && <label>Joueur{numeros(a.numero, n => changerAction(i, { ...a, numero: n }))}</label>}
        {(a.type === 'course' || a.type === 'leurre') && <><label>Avancée (m)<input type="number" min="-35" max="35" step=".5" value={a.destination.x} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, x: borner(Number(e.target.value), -35, 35) } })} /></label><label>Largeur (m)<input type="number" min="-65" max="65" step=".5" value={a.destination.y} onChange={e => changerAction(i, { ...a, destination: { ...a.destination, y: borner(Number(e.target.value), -65, 65) } })} /></label></>}
        <div className="ec-ordre"><button className="btn fantome" disabled={i === 0} aria-label={`Monter l’action ${i + 1}`} onClick={() => { const actions = [...v.actions]; [actions[i - 1], actions[i]] = [actions[i], actions[i - 1]]; modifierVariante({ ...v, actions }); setActionIndex(i - 1); }}>↑</button><button className="btn fantome" disabled={i === v.actions.length - 1} aria-label={`Descendre l’action ${i + 1}`} onClick={() => { const actions = [...v.actions]; [actions[i + 1], actions[i]] = [actions[i], actions[i + 1]]; modifierVariante({ ...v, actions }); setActionIndex(i + 1); }}>↓</button><button className="btn fantome" aria-label={`Supprimer l’action ${i + 1}`} onClick={() => { modifierVariante({ ...v, actions: v.actions.filter((_, j) => j !== i) }); setActionIndex(null); }}><Icone nom="croix" taille={14} /></button></div>
      </li>)}</ol>
      {erreurs.filter(e => e.type === 'passeASoi').map(e => <p className="ec-statut" key={e.action}>Action {e.action} : le porteur ne peut pas se faire une passe à lui-même. Choisis un autre destinataire.</p>)}
      <button className="btn" disabled={v.actions.length >= MAX_ACTIONS || v.actions.at(-1)?.type === 'pied'} onClick={() => { modifierVariante({ ...v, actions: [...v.actions, { type: 'passe', destinataire: joueur }] }); setActionIndex(v.actions.length); }}>Ajouter une action</button>
      {v.actions.some((a, i) => a.type === 'pied' && i < v.actions.length - 1) && <p className="ec-statut">Le coup de pied termine la combinaison. Déplace-le à la fin ou retire les actions suivantes.</p>}
      {!v.actions.length && <p className="ec-info">Ajoute au moins une action pour pouvoir enregistrer cette variante.</p>}
      <p className="ec-info">Une variante est tirée au départ selon sa fréquence relative. À situation identique, la combinaison la plus précise est prioritaire, puis la première du cahier. Les avants gardent leur formation pendant la conquête ; tes placements s’appliquent au lancement. L’animation montre ton tracé ; la réussite se joue en match.</p>
      </fieldset></div>}
    </div>
  </section>;
}
