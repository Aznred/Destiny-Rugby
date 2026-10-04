// Locomotion : l'arbre de mélange d'origine (marche → sprint, marche arrière,
// pas chassés), rejoué à la cadence qui correspond à la vitesse réelle du joueur.
// Les pieds ne glissent plus : chaque cycle avance d'autant que le corps.

const FAMILLES={
  avant:['walking_slow','walking_mid','walking_fast','jog_forward','running','running_fast'],
  arriere:['walking_backward','jog_backward','running_backward'],
  gauche:['left_strafe_walking','left_strafe_run'],
  droite:['right_strafe_walking','right_strafe_run'],
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** Vitesse naturelle (m/s) et durée de chaque cycle, pour une morphologie. */
export function prepareGaits(clips,scale){
  const gaits={};
  for(const [famille,noms] of Object.entries(FAMILLES)){
    gaits[famille]=noms.map(nom=>clips[nom]).filter(Boolean).map(clip=>({
      clip,duration:clip.duration,phase:clip.phase||0,
      speed:Math.hypot(clip.allure?.avant||0,clip.allure?.lateral||0)*scale,
    })).filter(g=>g.speed>.2).sort((a,b)=>a.speed-b.speed);
  }
  return gaits;
}

/** Famille d'allure selon la direction du déplacement dans le repère du joueur. */
function famille(state,avant,droite){
  const angle=Math.atan2(droite,avant)*180/Math.PI,abs=Math.abs(angle);
  // Hystérésis : on ne change de famille qu'en sortant franchement de la sienne.
  const garde=state.famille==='avant'?abs<70:state.famille==='arriere'?abs>110:state.famille==='gauche'?angle<-35&&angle>-145:state.famille==='droite'?angle>35&&angle<145:false;
  if(garde)return state.famille;
  return abs<=55?'avant':abs>=125?'arriere':angle<0?'gauche':'droite';
}

/**
 * Choisit les deux cycles qui encadrent la vitesse, leur mélange et la cadence.
 * `state` garde la phase de la foulée : changer d'allure ne la remet jamais à zéro.
 * Retourne null à l'arrêt.
 */
export function locomotion(state,gaits,avant,droite,dt){
  const speed=Math.hypot(avant,droite);
  if(speed<.12){state.moving=false;return null;}
  state.famille=famille(state,avant,droite);
  const liste=gaits[state.famille];
  if(!liste?.length)return null;
  let i=0;while(i<liste.length-1&&speed>liste[i+1].speed)i++;
  const a=liste[i],b=liste[i+1];
  let weight=0,natural=a.speed,duration=a.duration;
  if(b&&speed>a.speed){weight=clamp((speed-a.speed)/(b.speed-a.speed),0,1);natural=a.speed+(b.speed-a.speed)*weight;duration=a.duration+(b.duration-a.duration)*weight;}
  // Sous la marche la plus lente, la foulée ralentit ; au-delà du sprint, elle accélère.
  const rate=clamp(speed/natural,.45,1.38);
  if(!state.moving){state.moving=true;state.phase=state.phase||0;}
  state.phase=(state.phase+dt*rate/duration)%1;
  const at=g=>((state.phase+g.phase)%1)*g.duration;
  return {clip:a.clip,time:at(a),second:b?.clip||null,secondTime:b?at(b):0,weight,
    // Très lent : la marche se fond dans l'attente plutôt que de piétiner.
    idle:clamp(1-speed/Math.max(.3,liste[0].speed*.75),0,1),family:state.famille,rate};
}
