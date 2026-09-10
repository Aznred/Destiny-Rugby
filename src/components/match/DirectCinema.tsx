import { useState } from 'react';
import type { VueMatchEnLigne } from '../../lib/ligue/matchCarriere';
import TerrainEnDirect, { type CouleursDirect } from './TerrainEnDirect';
import './DirectCinema.css';
const heure=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
export function DirectCinema({match:m,domicile,exterieur,couleurs}:{match:VueMatchEnLigne;domicile:string;exterieur:string;couleurs:CouleursDirect}) {
 const [selection,setSelection]=useState<string|null>(null);
 const moments=m.moments??[];
 const action=moments.find(v=>v.id===selection)??moments.at(-1);
 return <section className="dc" aria-label="Direct du match en 2D">
 <header className="dc-entete"><span><i/>{m.termine?'TERMINÉ':'EN DIRECT'} <b>VUE 2D · MATCH</b></span><span>Positions du match · vue du dessus</span></header>
 <div className="dc-score"><time>{heure(m.horloge*60)}</time><span style={{borderColor:couleurs.domicile}}>{domicile}</span><strong>{m.score.domicile} – {m.score.exterieur}</strong><span style={{borderColor:couleurs.exterieur}}>{exterieur}</span></div>
 <div className="dc-ecran">{m.terrain?<TerrainEnDirect key={m.id} terrain={m.terrain} nomDomicile={domicile} nomExterieur={exterieur} couleurs={couleurs} monCote={m.monCote}/>:<p className="dc-attente">{m.termine?'Match terminé. Retrouve toutes les actions ci-dessous.':'Les équipes prennent place…'}</p>}</div>
 <div className="dc-commentaire" aria-live="polite"><span>{m.decision?'DÉCISION DU MANAGER':action?`${heure(action.seconde)} · ${action.score.domicile}–${action.score.exterieur}`:'LE JEU'}</span><p>{m.decision?'Une pénalité à jouer : choisis ton option dans le panneau de décision.':action?.texte??'Le match suit son cours.'}</p>{selection&&<button onClick={()=>setSelection(null)}>Dernière action ↗</button>}</div>
 <div className="dc-chiffres">{[['Possession',`${m.stats.domicile.possession}%`,`${m.stats.exterieur.possession}%`],['Mètres gagnés',m.stats.domicile.metres,m.stats.exterieur.metres],['Plaquages',m.stats.domicile.plaquages,m.stats.exterieur.plaquages]].map(([label,a,b])=><div key={label}><span>{label}</span><b>{a} <i>–</i> {b}</b></div>)}</div>
 <div className="dc-moments"><div className="dc-titre"><h3>Moments forts</h3><span>{moments.length} actions</span></div><div className="dc-liste">{[...moments].reverse().map(v=><button key={v.id} aria-pressed={selection===v.id} onClick={()=>setSelection(v.id)}><time>{heure(v.seconde)}</time><span><b>{v.cote==='domicile'?domicile:v.cote==='exterieur'?exterieur:'Le match'}{v.points?` · +${v.points} pts`:''}</b><small>{v.texte}</small></span><strong>{v.score.domicile}–{v.score.exterieur}</strong></button>)}</div>{!moments.length&&<p className="dc-attente">Les actions importantes s’afficheront ici.</p>}</div>
 </section>;
}
