import { useEffect, useRef, useState } from 'react';
import { frapperPiedHumain, type EtatMatch } from '../../lib/moteur/moteur';
import { LecteurManette, libellesManette } from '../../lib/controleDirect/manette';
import { lirePreferencesControle } from '../../lib/controleDirect/prefs';
import './ViseePiedArrete.css';

export function ViseePiedArrete({ etat }: { etat: EtatMatch }) {
  const attente = etat.piedHumain;
  return attente ? <Visee key={attente.auteurId + attente.type} etat={etat} /> : null;
}
function Visee({ etat }: { etat: EtatMatch }) {
  const attente = etat.piedHumain!;
  const auteur = etat.pions.find(p => p.id === attente.auteurId)!;
  const sens = auteur.cote === 'A' ? 1 : -1;
  const [cible, setCible] = useState({ x: Math.max(12, Math.min(110, attente.origine.x + sens * 22)), y: attente.type === 'penaltouche' ? (attente.origine.y < 35 ? -1 : 71) : attente.origine.y });
  const courante = useRef(cible); courante.current = cible;
  const [bouton, setBouton] = useState('A / Croix');
  const viser = (x: number, y: number) => setCible({x: Math.max(12, Math.min(110, x)), y: Math.max(-1, Math.min(71, y))});
  useEffect(() => {
    const touches = new Set<string>();
    const clavier = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLButtonElement || ev.target instanceof HTMLInputElement) return;
      const t = lirePreferencesControle().touches;
      if (['Enter', ...t.action, ...t.haut, ...t.bas, ...t.gauche, ...t.droite].includes(ev.code)) {
        ev.preventDefault(); ev.stopImmediatePropagation();
        if (!ev.repeat && (ev.code === 'Enter' || t.action.includes(ev.code))) frapperPiedHumain(etat, courante.current);
        else touches.add(ev.code);
      }
    };
    const relacher = (ev: KeyboardEvent) => touches.delete(ev.code);
    const pad = new LecteurManette(); pad.lire();
    const timer = window.setInterval(() => {
      const m = pad.lire(), t = lirePreferencesControle().touches;
      const tenu = (codes: string[]) => codes.some(c => touches.has(c));
      const dx = m.stick.x + Number(tenu(t.droite)) - Number(tenu(t.gauche));
      const dy = -m.stick.y + Number(tenu(t.bas)) - Number(tenu(t.haut));
      if (dx || dy) viser(courante.current.x + dx, courante.current.y + dy);
      if (m.connectee) setBouton(libellesManette(m.type).a);
      if (m.fronts.includes(0)) frapperPiedHumain(etat, courante.current);
    }, 30);
    window.addEventListener('keydown', clavier, true); window.addEventListener('keyup', relacher, true);
    return () => { clearInterval(timer); window.removeEventListener('keydown', clavier, true); window.removeEventListener('keyup', relacher, true); };
  }, [etat]);
  const maximum = attente.type === 'box' ? 22 + auteur.pied * .2 : 30 + auteur.pied * .35;
  const distance = Math.hypot(cible.x-attente.origine.x, cible.y-attente.origine.y);
  return <section className="visee-arretee" aria-label="Viser le coup de pied">
    <h3>{attente.type === 'box' ? 'Box kick' : 'Pénaltouche'} · {auteur.nom}</h3>
    <p>Temps arrêté. Choisis ta cible, puis frappe.</p>
    <svg preserveAspectRatio="none" viewBox="0 -3 124 77" role="img" aria-label="Terrain : cliquer ou glisser pour viser" onPointerDown={ev => { ev.currentTarget.setPointerCapture(ev.pointerId); const r=ev.currentTarget.getBoundingClientRect(); viser((ev.clientX-r.left)/r.width*124,(ev.clientY-r.top)/r.height*77-3); }} onPointerMove={ev => { if (!ev.buttons) return; const r=ev.currentTarget.getBoundingClientRect(); viser((ev.clientX-r.left)/r.width*124,(ev.clientY-r.top)/r.height*77-3); }}>
      <rect x="11" y="0" width="100" height="70" fill="#174c36" stroke="#d4ddc5" strokeWidth=".5" />
      {[33,61,89].map(x=><path key={x} d={'M'+x+' 0v70'} stroke="#d4ddc5" strokeWidth=".35" />)}
      <text x={sens>0?106:13} y="37" fill="white" fontSize="5">{sens>0?'→':'←'}</text>
      {etat.pions.filter(p => p.surLeTerrain && p.sanction <= 0).map(p => <circle key={p.id} cx={p.pos.x} cy={p.pos.y} r=".9" fill={p.cote === auteur.cote ? '#9bcafa' : '#f79f92'} />)}
      <path d={'M'+attente.origine.x+' '+attente.origine.y+'L'+cible.x+' '+cible.y} stroke="#e8c16d" strokeWidth=".8" strokeDasharray="2 1" />
      <circle cx={attente.origine.x} cy={attente.origine.y} r="1.5" fill="white" />
      <circle cx={cible.x} cy={cible.y} r="2" fill="none" stroke="#ffd989" strokeWidth=".7" />
    </svg>
    <p>{Math.round(distance)} m · portée maximale {Math.round(maximum)} m{distance>maximum ? ' — cible trop lointaine, le ballon retombera avant.' : ''}</p>
    <div className="visee-coordonnees"><label>Longueur<input aria-label="Longueur de la cible" type="range" min="12" max="110" value={cible.x} onChange={ev=>viser(Number(ev.target.value),cible.y)} /></label><label>Côté<input aria-label="Côté de la cible" type="range" min="-1" max="71" value={cible.y} onChange={ev=>viser(cible.x,Number(ev.target.value))} /></label></div>
    <button className="btn primaire" onClick={()=>frapperPiedHumain(etat,cible)}>Frapper</button>
    <small>Flèches ou stick pour viser · Entrée / bouton {bouton} pour frapper</small>
  </section>;
}
