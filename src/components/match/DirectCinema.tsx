import { useState } from 'react';
import type { VueMatchEnLigne } from '../../lib/ligue/matchCarriere';
import { creerScenarioDirect } from '../../lib/ligue/scenarioDirect';
import TerrainEnDirect, { type CouleursDirect } from './TerrainEnDirect';
import './DirectCinema.css';
const heure=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
export function DirectCinema({match:m,domicile,exterieur,couleurs}:{match:VueMatchEnLigne;domicile:string;exterieur:string;couleurs:CouleursDirect}) {
 const [selection,setSelection]=useState<string|null>(null);
 const moments=m.moments??[];
 const momentSelectionne=moments.find(v=>v.id===selection);
 const secondeCourante=(m.terrain?.horloge??m.horloge)*60;
 const ligneDirect=[...m.fil].reverse().find(v=>!v.ordre&&v.texte&&(v.seconde??v.minute*60)<=secondeCourante+2);
 const dernierMoment=moments.at(-1);
 const momentVif=dernierMoment&&secondeCourante-dernierMoment.seconde<=15?dernierMoment:undefined;
 const scenario=m.terrain?creerScenarioDirect(m.terrain):undefined;
 const commentaire=momentSelectionne?.texte??momentVif?.texte??ligneDirect?.texte
   ??(scenario?.ballonLent?'La sortie est ralentie. La défense a le temps de se replacer.'
     :scenario?.intensite==='forte'?'La défense recule, l’action peut basculer à tout instant.'
       :scenario?.intensite==='active'?'Le ballon circule et l’attaque cherche l’intervalle.'
         :'Les deux équipes se replacent et construisent la séquence suivante.');
 const bandeau=m.decision?'DÉCISION DU MANAGER':momentSelectionne?'ACTION DU MATCH':momentVif||scenario?.momentFort?'MOMENT FORT':'COMMENTAIRE EN DIRECT';
 return <section className="dc" aria-label="Direct du match en 2D">
 <header className="dc-entete"><span><i/>{m.termine?'TERMINÉ':'EN DIRECT'} <b>SCÉNARIO 2D · 30 JOUEURS</b></span><span>Moteur rugby · vue du dessus</span></header>
 <div className="dc-score"><time>{heure(m.horloge*60)}</time><span style={{borderColor:couleurs.domicile}}>{domicile}</span><strong>{m.score.domicile} – {m.score.exterieur}</strong><span style={{borderColor:couleurs.exterieur}}>{exterieur}</span></div>
 <div className="dc-ecran">{m.terrain?<TerrainEnDirect key={m.id} terrain={m.terrain} nomDomicile={domicile} nomExterieur={exterieur} couleurs={couleurs} monCote={m.monCote}/>:<p className="dc-attente">{m.termine?'Match terminé. Retrouve toutes les actions ci-dessous.':'Les équipes prennent place…'}</p>}</div>
 <div className={`dc-commentaire ${momentVif||scenario?.momentFort?'fort':''}`} aria-live="polite"><span>{bandeau}{momentSelectionne?` · ${heure(momentSelectionne.seconde)} · ${momentSelectionne.score.domicile}–${momentSelectionne.score.exterieur}`:scenario?` · ${scenario.sequence}e phase`:''}</span><p>{m.decision?'Une pénalité à jouer : choisis ton option dans le panneau de décision.':commentaire}</p>{selection&&<button onClick={()=>setSelection(null)}>Revenir au direct</button>}</div>
 <div className="dc-chiffres">{[['Possession',`${m.stats.domicile.possession}%`,`${m.stats.exterieur.possession}%`],['Mètres gagnés',m.stats.domicile.metres,m.stats.exterieur.metres],['Plaquages',m.stats.domicile.plaquages,m.stats.exterieur.plaquages]].map(([label,a,b])=><div key={label}><span>{label}</span><b>{a} <i>–</i> {b}</b></div>)}</div>
 <div className="dc-moments"><div className="dc-titre"><h3>Temps forts du match</h3><span>{moments.length} actions</span></div><div className="dc-liste">{[...moments].reverse().map(v=><button key={v.id} aria-pressed={selection===v.id} onClick={()=>setSelection(v.id)}><time>{heure(v.seconde)}</time><span><b>{v.cote==='domicile'?domicile:v.cote==='exterieur'?exterieur:'Le match'}{v.points?` · +${v.points} pts`:''}</b><small>{v.texte}</small></span><strong>{v.score.domicile}–{v.score.exterieur}</strong></button>)}</div>{!moments.length&&<p className="dc-attente">Les actions importantes s’afficheront ici.</p>}</div>
 </section>;
}
