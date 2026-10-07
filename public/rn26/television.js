import * as THREE from '/rn26/vendor/three/build/three.module.js';

// ---------------------------------------------------------------------------
// LA RÉALISATION : plans de caméra, ralentis et volets
// ---------------------------------------------------------------------------
// Rien ici ne touche au match. La réalisation REGARDE l'état du match et
// choisit un plan ; le ralenti rejoue des IMAGES déjà affichées (positions et
// os des corps, ballon), pas la simulation — le moteur continue d'avancer
// dessous, à son heure, et une décision en attente coupe le ralenti.

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const OUVERT=['jeuCourant','ballonEnLAir','ballonLibre'];
/** Plans que l'utilisateur peut choisir lui-même ; `tv` laisse la réalisation décider. */
export const PLANS=['tv','follow','close','wide','aerienne','basse','enbut'];

/**
 * @param {object} o
 * @param {HTMLElement} o.conteneur
 * @param {Map<string,object>} o.actors   acteurs de la scène, par identifiant de pion
 * @param {object[]} o.officials
 * @param {THREE.Object3D} o.ballMesh
 * @param {THREE.Object3D} o.teeMesh
 * @param {boolean} o.leger
 * @param {{nom?:string,logo?:string,teintes?:string[]}} o.habillage
 * @param {{ralenti?:string}} o.textes
 */
export function creerTelevision({conteneur,actors,officials,ballMesh,teeMesh,leger=false,habillage={},textes={},surVolet=null}){
  // ── Bande d'images : quelques secondes de ce qui vient d'être affiché ─────
  const CADENCE=leger?20:30,DUREE=leger?6:9.5,N=Math.ceil(CADENCE*DUREE);
  const temps=new Float64Array(N).fill(-1),ballon=new Float32Array(N*8),tee=new Float32Array(N*4);
  let curseur=-1,dernier=-1e9,nombre=0;
  const EN_TETE=11;
  const osDe=a=>a.osComplets||a.pose.bones;
  const bande=a=>a.bande??={pas:EN_TETE+osDe(a).length*4+3,donnees:new Float32Array(N*(EN_TETE+osDe(a).length*4+3))};
  const tous=()=>[...actors.values(),...officials];

  function enregistrer(t){
    // Le temps du match peut repartir en arrière (nouveau match) : la bande est alors périmée.
    if(t<dernier-.5){temps.fill(-1);nombre=0;curseur=-1;dernier=-1e9;}
    if(t-dernier<1/CADENCE-.002)return;
    dernier=t;curseur=(curseur+1)%N;nombre=Math.min(N,nombre+1);temps[curseur]=t;
    for(const a of tous()){
      const b=bande(a),d=b.donnees;let i=curseur*b.pas;
      d[i]=a.group.visible?1:0;if(!d[i])continue;
      a.group.position.toArray(d,i+1);a.group.quaternion.toArray(d,i+4);a.model.position.toArray(d,i+8);i+=EN_TETE;
      for(const os of osDe(a)){os.bone.quaternion.toArray(d,i);i+=4;}
      a.pose.hips.position.toArray(d,i);
    }
    ballMesh.position.toArray(ballon,curseur*8);ballMesh.quaternion.toArray(ballon,curseur*8+3);ballon[curseur*8+7]=ballMesh.visible?1:0;
    teeMesh.position.toArray(tee,curseur*4);tee[curseur*4+3]=teeMesh.visible?1:0;
  }
  /** Les deux images qui encadrent l'instant `t`, et le dosage entre elles. */
  function encadrer(t){
    let avant=-1,apres=-1;
    for(let k=0;k<nombre;k++){
      const i=(curseur-k+N)%N;
      if(temps[i]<0)continue;
      if(temps[i]<=t){avant=i;break;}
      apres=i;
    }
    if(avant<0)avant=apres;if(apres<0)apres=avant;
    if(avant<0)return null;
    const ecart=temps[apres]-temps[avant];
    return {avant,apres,k:ecart>1e-4?clamp((t-temps[avant])/ecart,0,1):0};
  }
  const q=new THREE.Quaternion(),q2=new THREE.Quaternion(),v=new THREE.Vector3(),v2=new THREE.Vector3(),tampon=new Float32Array(4);
  function appliquer(t){
    const c=encadrer(t);if(!c)return false;
    const {avant,apres,k}=c;
    for(const a of tous()){
      const b=a.bande;if(!b){a.group.visible=false;continue;}
      const d=b.donnees;let i=avant*b.pas,j=apres*b.pas;
      // Un joueur entré ou sorti entre deux images n'est pas fondu : il suit la plus ancienne.
      if(!d[i]){a.group.visible=false;continue;}
      const kk=d[j]?k:0;
      a.group.visible=true;
      a.group.position.fromArray(d,i+1).lerp(v.fromArray(d,j+1),kk);
      a.group.quaternion.fromArray(d,i+4).slerp(q.fromArray(d,j+4),kk);
      a.model.position.fromArray(d,i+8).lerp(v.fromArray(d,j+8),kk);
      i+=EN_TETE;j+=EN_TETE;
      for(const os of osDe(a)){THREE.Quaternion.slerpFlat(tampon,0,d,i,d,j,kk);os.bone.quaternion.fromArray(tampon);i+=4;j+=4;}
      a.pose.hips.position.fromArray(d,i).lerp(v.fromArray(d,j),kk);
      a.group.updateMatrixWorld(true);
    }
    ballMesh.position.fromArray(ballon,avant*8).lerp(v.fromArray(ballon,apres*8),k);
    ballMesh.quaternion.copy(q.fromArray(ballon,avant*8+3)).slerp(q2.fromArray(ballon,apres*8+3),k);
    ballMesh.visible=ballon[avant*8+7]>.5;
    teeMesh.position.fromArray(tee,avant*4);teeMesh.visible=tee[avant*4+3]>.5;
    return true;
  }
  const plusAncien=()=>{let m=Infinity;for(let i=0;i<N;i++)if(temps[i]>=0&&temps[i]<m)m=temps[i];return m;};

  // ── Habillage à l'écran : volet de transition et pastille « ralenti » ─────
  if(getComputedStyle(conteneur).position==='static')conteneur.style.position='relative';
  const [t1,t2]=[habillage.teintes?.[0]||'#0d2a1c',habillage.teintes?.[1]||'#e2b64a'];
  const calque=document.createElement('div');
  calque.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;contain:layout paint';
  const volet=document.createElement('div');
  volet.style.cssText=`position:absolute;top:-25%;left:0;width:150%;height:150%;transform:translateX(-170%) skewX(-16deg);display:flex;align-items:center;justify-content:center;will-change:transform;`
    +`background:linear-gradient(90deg,transparent 0,${t1} 5%,${t1} 41%,${t2} 41%,${t2} 43%,${t1} 43%,${t1} 57%,${t2} 57%,${t2} 59%,${t1} 59%,${t1} 95%,transparent 100%)`;
  const marque=document.createElement('div');
  marque.style.cssText='transform:skewX(16deg);display:flex;flex-direction:column;align-items:center;gap:.5rem;color:#f6efdc;font:400 clamp(1.1rem,3.4vw,2.2rem)/1 Anton,Impact,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,.45)';
  if(habillage.logo){const im=new Image();im.alt='';im.decoding='async';im.src=habillage.logo;im.style.cssText='height:clamp(56px,16vh,150px);width:auto;object-fit:contain;filter:drop-shadow(0 4px 14px rgba(0,0,0,.5))';im.onerror=()=>im.remove();marque.append(im);}
  const nomMarque=document.createElement('span');nomMarque.textContent=habillage.nom||'Destiny Rugby';marque.append(nomMarque);
  volet.append(marque);
  const pastille=document.createElement('div');
  pastille.style.cssText=`position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));display:none;align-items:center;gap:.5em;padding:.38em .8em .34em;border-left:3px solid ${t2};`
    +`background:rgba(8,16,12,.78);color:#f6efdc;font:400 clamp(.72rem,1.5vw,.95rem)/1 Anton,Impact,sans-serif;letter-spacing:.2em;text-transform:uppercase`;
  const voyant=document.createElement('i');voyant.style.cssText=`width:.55em;height:.55em;border-radius:50%;background:${t2}`;
  const libelle=document.createElement('span');libelle.textContent=textes.ralenti||'Ralenti';
  pastille.append(voyant,libelle);calque.append(volet,pastille);conteneur.append(calque);
  const sobre=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let clignote=null;

  /** Le volet traverse l'écran ; `auMilieu` est appelé quand il le couvre entièrement. */
  function passerVolet(auMilieu){
    surVolet?.();
    if(sobre||!volet.animate){auMilieu();return;}
    const s='skewX(-16deg)';
    volet.animate([{transform:`translateX(-170%) ${s}`},{transform:`translateX(-25%) ${s}`,offset:.42},{transform:`translateX(-25%) ${s}`,offset:.58},{transform:`translateX(120%) ${s}`}],{duration:880,easing:'cubic-bezier(.55,0,.35,1)'});
    setTimeout(auMilieu,400);
  }

  // ── Le ralenti ────────────────────────────────────────────────────────────
  const ralenti={actif:false,attendu:false,t:0,fin:0,vitesse:.5,plan:'ralenti',debut:0,motif:''};
  let surChangement=null;
  function lancerRalenti({debut,fin,vitesse=.5,plan='ralenti',motif=''}={}){
    if(ralenti.actif||ralenti.attendu)return false;
    const d=Math.max(debut,plusAncien()+.05);
    if(!(fin-d>1.2))return false;
    ralenti.attendu=true;
    passerVolet(()=>{
      if(!ralenti.attendu)return;
      Object.assign(ralenti,{actif:true,attendu:false,t:d,debut:d,fin,vitesse,plan,motif,premiere:true});
      pastille.style.display='flex';
      if(!sobre&&voyant.animate)clignote=voyant.animate([{opacity:1},{opacity:.25},{opacity:1}],{duration:1100,iterations:Infinity});
      surChangement?.(true,motif);
    });
    return true;
  }
  function finirRalenti(avecVolet=true){
    if(ralenti.attendu){ralenti.attendu=false;return;}
    if(!ralenti.actif||ralenti.sortie)return;
    const fermer=()=>{ralenti.actif=false;ralenti.sortie=false;pastille.style.display='none';clignote?.cancel();clignote=null;surChangement?.(false,ralenti.motif);};
    if(!avecVolet){fermer();return;}
    ralenti.sortie=true;passerVolet(fermer);
  }
  /** Avance le ralenti d'une image ; rend faux quand il n'y a plus rien à montrer. */
  function imageRalenti(dt){
    if(!ralenti.actif)return false;
    if(!ralenti.sortie)ralenti.t+=dt*ralenti.vitesse;
    if(ralenti.t>=ralenti.fin){ralenti.t=ralenti.fin;if(!ralenti.sortie)finirRalenti(true);}
    return appliquer(ralenti.t);
  }

  // ── Le choix du plan ──────────────────────────────────────────────────────
  const etat={plan:'follow',depuis:-10,essai:null,essaiVu:null};
  /**
   * Le plan que montrerait un réalisateur. Un plan tient au moins deux secondes
   * et demie, sauf quand l'action l'impose (un tir qui part, un essai).
   */
  function choisirPlan(match,maintenant){
    const e=match.e,tir=match.tir||e.tir;
    let voulu='follow',force=false;
    const changement=match.remplacement;
    if(match.cortege){voulu=match.cortege.k<.42?'tunnel':'aerienne';force=true;}
    // Un remplacement : la caméra va chercher la touche le temps que les deux hommes se croisent.
    else if(changement&&maintenant-changement.debut<4.2&&maintenant>=changement.debut&&!OUVERT.includes(e.phase)&&!tir){voulu='banc';force=true;}
    else if(tir&&tir.etape!=='celebration'){
      if(tir.volLance){voulu='poteaux';force=true;}
      else if(['pose','pret','elan'].includes(tir.etape)){voulu='buteur';force=true;}
    }else if(tir?.etape==='celebration'){voulu='close';force=true;}
    else if(e.phase==='tirAuBut'||e.phase==='transformation'){voulu=e.vol?'poteaux':'buteur';force=true;}
    else if(e.phase==='melee'){const m=match.melee||e.conquete?.melee;if(!m||['impact','introduction','poussee'].includes(m.etape))voulu='basse';}
    else if(e.phase==='coupEnvoi'||e.phase==='renvoi22')voulu='aerienne';
    else if(match.flight?.type==='pied'&&(match.flight.duree||0)>1.7&&OUVERT.includes(e.phase))voulu='aerienne';
    else if(OUVERT.includes(e.phase)||e.phase==='ruck'||e.phase==='maul'){
      // Près de la ligne, la caméra de l'en-but : on voit venir l'essai.
      const x=e.ballon?.x??61,reste=e.possession==='A'?111-x:x-11;
      if(reste<(etat.plan==='enbut'?13:8.5)&&reste>-1)voulu='enbut';
    }
    if(voulu!==etat.plan&&(force||maintenant-etat.depuis>2.5||maintenant<etat.depuis)){etat.plan=voulu;etat.depuis=maintenant;return {plan:voulu,coupe:true};}
    return {plan:etat.plan,coupe:false};
  }

  return {
    enregistrer,choisirPlan,passerVolet,
    ralenti,lancerRalenti,finirRalenti,imageRalenti,
    get disponible(){return nombre>CADENCE*2;},
    set surChangement(f){surChangement=f;},
    set textes(t){if(t?.ralenti)libelle.textContent=t.ralenti;},
    detruire(){clignote?.cancel();calque.remove();for(const a of tous())a.bande=null;nombre=0;surChangement=null;},
  };
}
