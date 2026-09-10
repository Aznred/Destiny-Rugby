import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DirectCinema} from '../src/components/match/DirectCinema';
import {NotificationsMatch} from '../src/components/NotificationsMatch';
import type {VueMatchEnLigne} from '../src/lib/ligue/matchCarriere';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
const match:VueMatchEnLigne={id:'apercu',minute:32,horloge:32.4,termine:false,score:{domicile:10,exterieur:7},essais:{domicile:2,exterieur:1},penalites:{domicile:0,exterieur:0},fil:[],remplacementsFaits:0,surLeBanc:[],surLeTerrain:[],monCote:'domicile',
 stats:{domicile:{possession:58,metres:264,plaquages:54,essais:2,penalitesTentees:1,penalitesReussies:0,turnovers:4,cartons:0},exterieur:{possession:42,metres:192,plaquages:71,essais:1,penalitesTentees:1,penalitesReussies:0,turnovers:2,cartons:1}},
 terrain:{pions:[],ballon:{x:76,y:35},phase:'jeu',systeme:'',possession:'domicile',cadence:1,horloge:32.4},moments:[
 {id:'apercu:1',seconde:900,type:'essai',videoId:'essai_2',duree:10,texte:'Martin trouve l’intervalle. Bernard termine dans l’en-but !',cote:'domicile',score:{domicile:5,exterieur:0},points:5},
 {id:'apercu:2',seconde:1140,type:'but',videoId:'transformation_1',duree:7,texte:'La transformation passe entre les poteaux.',cote:'exterieur',score:{domicile:5,exterieur:7},points:2},
 {id:'apercu:3',seconde:1870,type:'essai',videoId:'essai_3',duree:10,texte:'Le ballon arrive à l’aile. Moreau résiste au retour et aplatit !',cote:'domicile',score:{domicile:10,exterieur:7},points:5},
 ]};
function Apercu(){const [mobile,setMobile]=useState(false);const [m,setM]=useState(match);return <main className="cel" style={{maxWidth:mobile?390:1020,margin:'30px auto',padding:mobile?8:20}}><p>Aperçu du direct · match fictif</p><div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}><button className="btn" onClick={()=>setMobile(!mobile)}>{mobile?'Format ordinateur':'Format téléphone'}</button><button className="btn" onClick={()=>{const seconde=m.horloge*60;setM({...m,moments:[...m.moments!,{...m.moments![0],id:`apercu:${Date.now()}`,seconde,score:{domicile:15,exterieur:7}}],score:{domicile:15,exterieur:7}});}}>Simuler un essai</button><button className="btn" onClick={()=>setM({...m,decision:m.decision?undefined:{cote:'domicile',distance:22,angle:0,probabilite:.8,buteur:'Martin',horloge:m.horloge,aPortee:true,jusqua:Date.now()+20000}})}>Décision de pénalité</button></div><div className="cel-tableau-bord" style={{marginBottom:14,textAlign:'center'}}><span>Colin RFC · {m.horloge.toFixed(0)}′ · Hugo XV</span><strong style={{fontSize:38}}>{m.score.domicile} – {m.score.exterieur}</strong></div><DirectCinema match={m} domicile="Colin RFC" exterieur="Hugo XV" couleurs={{domicile:'#dd6554',exterieur:'#5e8fbe'}}/><details style={{marginTop:20}}><summary>Vérifier le panneau des notifications</summary><NotificationsMatch ligue="apercu"/></details></main>};
createRoot(document.getElementById('root')!).render(<Apercu/>);
