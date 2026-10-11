import assert from 'node:assert/strict';
import { creerApercuDestiny } from '../src/lib/moteur/passerelle3D';
import { avancer, choisirCombinaisonTouche, DT, installerSituationCombinaison, lancerLaTouche } from '../src/lib/moteur/moteur';
import { activerDirect, classerCoupDePied, commanderDirect, demanderDirect, majVueDirecte } from '../src/lib/moteur/direct';
import { actualiserSelectionEquipe, changerJoueurEquipe, choisirOptionNeuf, configurerEquipeSolo, donnerOrdreEquipe, meilleurCoteCellule, organiserCellulesSolo, selectionnerPionEquipe } from '../src/lib/moteur/equipeSolo';
import { creerResponsabilites, humainTientLe, pionDuRole } from '../src/lib/moteur/responsabilites';
import { placerEquipes } from '../src/lib/moteur/tactique';
import { distance, sens } from '../src/lib/moteur/terrain';
import type { Pion } from '../src/lib/moteur/entites';
import { assainirTouches, TOUCHES_PAR_DEFAUT } from '../src/lib/controleDirect/touches';
import { ACTIONS_SORTIE_NEUF, BOUTONS_SORTIE_NEUF, optionNeufBalayage, optionNeufClavier, optionNeufManette } from '../src/lib/controleDirect/sortiesNeuf';
import { PilotageDirect, type Intention } from '../src/lib/controleDirect/pilotage';
import type { ActionClavier, TouchesDirectes } from '../src/lib/controleDirect/touches';
let n=0;
function ok(c:unknown,m:string){assert.ok(c,m);n++;}
for(const option of ['dix','gauche','droite','pick','box','depart'] as const) {
  ok(optionNeufClavier(ACTIONS_SORTIE_NEUF[option],true)===option,`Combinaison clavier ${option}`);
  ok(!optionNeufClavier(ACTIONS_SORTIE_NEUF[option],false),'La commande seule reste une commande normale');
  const boutons=Array.from({length:16},()=>false);boutons[6]=true;boutons[BOUTONS_SORTIE_NEUF[option]]=true;
  ok(optionNeufManette([BOUTONS_SORTIE_NEUF[option]],boutons)===option,`Gâchette + bouton ${option}`);
  ok(optionNeufManette([6],boutons)===option,'La combinaison manette accepte les deux ordres d’appui');
  ok(!optionNeufManette([],boutons),'Un bouton maintenu ne répète pas la sortie');
}
for(const [dx,dy,option] of [[-90,0,'gauche'],[90,0,'droite'],[0,-90,'dix'],[0,90,'pick'],[-80,-80,'box'],[80,-80,'depart']] as const)
  ok(optionNeufBalayage(dx,dy)===option,`Balayage ${option}`);
ok(!optionNeufBalayage(10,10),'Un tapotement ne sort pas le ballon');
ok(!optionNeufBalayage(Number.NaN,90),'Un geste invalide ne crée aucune action');
{
  const pilote=new PilotageDirect({surCamera:()=>{},surPause:()=>{},vibrer:()=>{},surPrise:()=>{}});
  const entree=pilote as unknown as {clavier:{tenues:Set<string>;fronts:string[];relaches:{code:string;duree:number}[]};
    intentionsClavier:(sortie:Intention[],touches:TouchesDirectes,maintenant:number,sx:number,sy:number,neuf:boolean)=>void};
  const touches=assainirTouches({action:['KeyR'],passeGauche:['KeyM']});
  for(const option of ['dix','gauche','droite','pick','box','depart'] as const) {
    const code=touches[ACTIONS_SORTIE_NEUF[option] as ActionClavier][0];
    entree.clavier.tenues=new Set(['KeyR',code]);entree.clavier.fronts=['KeyR',code];entree.clavier.relaches=[];
    const sortie:Intention[]=[];entree.intentionsClavier(sortie,touches,100,0,0,true);
    ok(sortie.length===1 && sortie[0].type==='optionNeuf' && sortie[0].option===option,'Le pilote consomme une combinaison remappée sans geste ordinaire');
    entree.clavier.tenues.clear();entree.clavier.fronts=[];entree.clavier.relaches=[{code,duree:0.1}];
    const apres:Intention[]=[];entree.intentionsClavier(apres,touches,200,0,0,false);
    ok(!apres.length,'Relâcher une combinaison n’ajoute ni passe ni coup de pied');
  }
}
function creer(cote:'A'|'B'='A') {
  const e=creerApercuDestiny('correctif37');
  e.responsabilites=creerResponsabilites(e.pions,{});
  e.tactiques[cote]={attaque:'equilibre',defense:'glissee',rythme:'normal',penalites:'mixte',remplacements:'standard'};
  configurerEquipeSolo(e,cote,true);activerDirect(e,true);
  e.phase='jeuCourant';e.placement=null;e.cibleRenvoi=null;e.conquete=null;e.vol=null;e.minuteur=99;
  for (const p of e.pions) {p.corps=undefined;p.battu=0;p.sanction=0;p.role='ligne';}
  return e;
}
function poser(p:Pion,x:number,y:number){p.pos={x,y};p.cible={x,y};p.vitesse={x:0,y:0};p.role='ligne';p.corps=undefined;p.battu=0;}
for(const cote of ['A','B'] as const) {
  const e=creer(cote),s=sens(cote),amis=e.pions.filter(p=>p.cote===cote),neuf=amis.find(p=>p.numero===9)!;
  e.possession=cote;e.porteur=neuf;e.ballon={x:61,y:35};e.origine={...e.ballon};poser(neuf,61,35);
  actualiserSelectionEquipe(e);
  ok(neuf.moi && e.pions.filter(p=>p.moi).length===1,'Le porteur est contrôlé, dans les deux sens');
  e.porteur=null;e.vol={de:{...neuf.pos},vers:{x:61-s*2,y:48},auteur:neuf,receveur:amis.find(p=>p.numero===10)!,type:'passe',intention:'passe',duree:1,ecoule:0,hauteur:0.3};
  actualiserSelectionEquipe(e);ok(e.vol.receveur!.moi,'La sélection suit le receveur pendant la passe');
  e.vol=null; e.porteur=e.pions.find(p=>p.cote!==cote && p.numero===10)!;poser(e.porteur,61+s*4,35);
  actualiserSelectionEquipe(e);const courant=e.controleEquipe!.selectionId;
  for(let i=0;i<20;i++){e.sim+=0.015;actualiserSelectionEquipe(e);}
  ok(e.controleEquipe!.selectionId===courant,'Une petite variation ne fait pas sautiller la sélection en défense');
  ok(changerJoueurEquipe(e,{x:0,y:1}),'Changement manuel orienté disponible');
  const manuel=e.controleEquipe!.selectionId;actualiserSelectionEquipe(e);ok(e.controleEquipe!.selectionId===manuel,'La sélection manuelle est conservée');
  const exclu=e.pions.find(p=>p.id===manuel)!;exclu.surLeTerrain=false;actualiserSelectionEquipe(e);ok(e.controleEquipe!.selectionId!==manuel,'Un sortant ne reste pas contrôlé');
}
{
  const e=creer();e.possession='A';e.phase='ruck';e.porteur=null;e.ballon={x:61,y:35};e.origine={...e.ballon};
  const positions=JSON.stringify(e.pions.map(p=>p.pos));organiserCellulesSolo(e);
  ok(JSON.stringify(e.pions.map(p=>p.pos))===positions,'Former les cellules ne téléporte personne');
  const o=e.organisationSolo!;ok(o.gauche.ids.length>=2 && o.droite.ids.length>=2,'Deux cellules de deux à trois avants avant la sortie');
  ok(new Set([...o.gauche.ids,...o.droite.ids,o.pickId]).size===o.gauche.ids.length+o.droite.ids.length+1,'Le ramasseur et les deux cellules sont distincts');
  for(const cellule of [o.gauche,o.droite]) {
    const p=cellule.ids.map(id=>e.pions.find(p=>p.id===id)!);
    ok(p.every(p=>p.cible.x<e.ballon.x-2),'Les cellules attendent avec de la profondeur hors des dix mètres');
    ok(p.slice(1).every(q=>distance(q.cible,p[0].cible)>2),'Les soutiens ne sont pas collés au porteur');
  }
  ok(o.gauche.centre.y<e.ballon.y && o.droite.centre.y>e.ballon.y,'Cellules de part et d’autre du ruck');
  const ids=[...o.gauche.ids,...o.droite.ids];organiserCellulesSolo(e);ok(JSON.stringify(ids)===JSON.stringify([...o.gauche.ids,...o.droite.ids]),'La cellule conserve ses joueurs pendant la phase');
  e.ballon={x:105,y:35};e.compteurs.rucks++;organiserCellulesSolo(e);
  ok(distance(e.organisationSolo!.gauche.centre,e.ballon)<3,'Dans les dix mètres la cellule devient courte');
  e.ballon={x:61,y:2};e.compteurs.rucks++;organiserCellulesSolo(e);ok(!e.organisationSolo!.gauche.ids.length,'Pas de cellule hors du terrain côté touche');
  ok(meilleurCoteCellule(e)==='droite','L’IA choisit le côté avec de la largeur');
}
for(const option of ['gauche','droite','dix','pick','box','depart'] as const) {
  const e=creer();e.possession='A';e.phase='ruck';e.porteur=null;e.ballon={x:61,y:35};e.origine={...e.ballon};organiserCellulesSolo(e);
  const o=e.organisationSolo!,neuf=e.pions.find(p=>p.id===o.neufId)!;
  for(const p of e.pions) if(p.cote!=='A') poser(p,94,4+p.numero*4);
  for(const id of [...o.gauche.ids,...o.droite.ids]) {const p=e.pions.find(p=>p.id===id)!;p.pos={...p.cible};}
  const dix=e.pions.find(p=>p.cote==='A'&&p.numero===10)!;poser(dix,55,48);
  const pick=e.pions.find(p=>p.id===o.pickId)!;poser(pick,60,37);
  poser(neuf,60,35);neuf.passe=100;neuf.vision=100;e.phase='jeuCourant';e.porteur=neuf;
  e.controleEquipe!.sortie={neufId:neuf.id,origine:{...e.origine},depuis:e.sim};selectionnerPionEquipe(e,neuf);majVueDirecte(e);
  commanderDirect(e,0,0,false);avancer(e,0.6);ok(e.porteur===neuf && !e.vol,'Le 9 attend le choix humain');
  ok(choisirOptionNeuf(e,option),`Option ${option} acceptée`);
  let passe=false, lance=false;
  for(let i=0;i<35;i++){avancer(e,DT);if(e.vol?.type==='passe' && e.vol.auteur===neuf) {passe=true;lance=e.vol.receveur!.vitesse.x*sens(neuf.cote)>0.35;}if(!e.controleEquipe!.sortie)break;}
  if(['gauche','droite','dix'].includes(option)) ok(passe,`${option} provoque une vraie passe du 9`);
  if(option==='gauche'||option==='droite')ok(lance,'Le premier avant court déjà vers la ligne au départ de la passe');
  if(option==='pick')ok(pick.stats.pickAndGo===1 && e.porteur===pick && !e.vol,'Le pick and go ramasse le ballon sans passe');
  if(option==='box')ok(!!e.piedPrepare || e.vol?.type==='pied','Le box kick prépare une frappe réelle');
  if(option==='depart')ok(!e.controleEquipe!.sortie && e.porteur===neuf,'Le 9 peut partir lui-même');
}
{
  const e=creer();const c=e.controleEquipe!;
  ok(humainTientLe(e,'capitaine','A') && !humainTientLe(e,'capitaine','B'),'L’utilisateur tient les responsabilités de son équipe seule');
  c.reglages.touches='auto';ok(!humainTientLe(e,'lanceur','A'),'Les touches automatiques laissent lancer l’IA');
  c.reglages.touches='manuel';ok(humainTientLe(e,'lanceur','A'),'Les touches manuelles rendent le choix à l’utilisateur');
  e.responsabilites!.attente={type:'tir',depuis:0,delai:30};e.tir={buteur:pionDuRole(e,'A','buteur')!} as NonNullable<typeof e.tir>;
  actualiserSelectionEquipe(e);ok(e.tir.buteur.moi,'Un tir sélectionne le buteur réel');
  e.responsabilites!.attente=null;e.tir=null;installerSituationCombinaison(e,'melee',{x:61,y:35});
  for(let i=0;i<100 && !e.direct?.pack;i++)avancer(e,DT);
  ok(e.direct?.pack?.type==='melee','Le QTE collectif reprend la mêlée existante');
  c.reglages.melees='auto';avancer(e,DT);ok(!e.direct?.pack,'La mêlée automatique masque le QTE');
}
{
  const e=creer();installerSituationCombinaison(e,'ruck',{x:61,y:35});
  const o=e.organisationSolo!,neuf=e.pions.find(p=>p.id===o.neufId)!;
  poser(neuf,59.2,35);neuf.role='demi';
  // Un vrai regroupement, avec les nettoyeurs du moteur : la sortie doit encore attendre le joueur.
  for(const p of e.pions)if(p.cote==='B')poser(p,92,4+p.numero*4);
  e.rng=()=>0.93;
  for(let i=0;i<150 && !e.controleEquipe!.sortie;i++)avancer(e,DT);
  ok(!!e.controleEquipe!.sortie && e.porteur?.moi,'Le vrai ruck rend le ballon au relayeur contrôlé');
  for(const p of e.pions)if(p.cote==='B')poser(p,92,4+p.numero*4);
  const controle=e.porteur;avancer(e,0.6);ok(e.porteur===controle && !e.vol,'Aucune passe IA à la sortie du vrai ruck');
  ok(choisirOptionNeuf(e,'droite'),'Une cellule peut être appelée après le vrai duel au sol');
  let servi=false;
  for(let i=0;i<80;i++){avancer(e,DT);if(e.vol?.type==='passe' && e.vol.auteur===controle){servi=true;break;}}
  ok(servi,'Le receveur lancé reste derrière le relayeur jusqu’au départ de la passe');
}
{
  const e=creer();installerSituationCombinaison(e,'touche',{x:61,y:1});
  for(let i=0;i<100 && e.responsabilites!.attente?.type!=='touche';i++)avancer(e,DT);
  avancer(e,DT);
  ok(e.responsabilites!.attente?.type==='touche' && pionDuRole(e,'A','lanceur')?.moi,'La touche manuelle sélectionne et attend le talonneur');
  ok(choisirCombinaisonTouche(e,'maul'),'L’entraîneur choisit la combinaison de touche');
  ok(lancerLaTouche(e,{puissance:0.34,geste:1}),'Le talonneur effectue le lancer humain');
  for(let i=0;i<12 && e.responsabilites!.attente;i++)avancer(e,DT);
  avancer(e,DT);
  ok(e.pions.find(p=>p.id===e.conquete?.cibleId)?.moi,'Le contrôle rejoint ensuite le sauteur annoncé');
  const auto=creer();auto.controleEquipe!.reglages.touches='auto';installerSituationCombinaison(auto,'touche',{x:61,y:1});
  for(let i=0;i<50;i++)avancer(auto,DT);
  ok(auto.responsabilites!.attente?.type!=='touche' && !auto.direct?.pack,'Les touches Auto se jouent sans bloquer sur le lancer ou le saut');
}
{
  const e=creer('B');installerSituationCombinaison(e,'ruck',{x:61,y:35});
  e.minuteur=5;e.ruck!.duel=undefined;
  for(const p of e.pions)poser(p,p.cote==='A'?50:90,4+p.numero*4);
  const def=e.pions.find(p=>p.cote==='B'&&p.numero===7)!;poser(def,62,35);def.horsJeu=false;
  selectionnerPionEquipe(e,def);e.controleEquipe!.manuelJusqua=e.sim+2;
  demanderDirect(e,{action:'contreRuck'});avancer(e,DT);
  ok(e.ruck?.duel?.type==='contre','Le contre-ruck demandé déclenche un duel physique');
  ok((e.direct!.recharges.contreRuck??0)>0,'Le contre-ruck coûte un effort et ne se répète pas à volonté');
}
{
  const e=creer('B'),def=e.pions.find(p=>p.cote==='B'&&p.numero===12)!,porteur=e.pions.find(p=>p.cote==='A'&&p.numero===10)!;
  for(const p of e.pions)poser(p,p.cote==='A'?35:90,4+p.numero*4);
  poser(porteur,61,35);poser(def,64.5,35);e.possession='A';e.porteur=porteur;e.ballon={...porteur.pos};
  selectionnerPionEquipe(e,def);e.controleEquipe!.manuelJusqua=e.sim+2;commanderDirect(e,0,1,false);
  demanderDirect(e,{action:'plaquage',offensif:true});avancer(e,DT);
  ok(!!e.direct!.plaquageOffensifJusqua,'Le plaquage offensif arme son propre timing');
  for(let i=0;i<15;i++)avancer(e,DT);
  ok(e.porteur===porteur && def.stats.plaquages===0,'Un plongeon orienté à côté du porteur peut rater');
  const autre=e.pions.find(p=>p.cote==='B'&&p.numero===13)!;selectionnerPionEquipe(e,autre);
  ok(!e.direct!.plaquageOffensifJusqua,'Changer de joueur ne transmet pas le plaquage armé');
}
{
  const e=creer();const p=e.pions.find(p=>p.cote==='A'&&p.numero===10)!;poser(p,61,35);
  for(const type of ['rasant','parDessus','chandelle','transversale','degagement'] as const)ok(classerCoupDePied(e,p,{intentionPied:type}).intention===type,`Coup de pied ${type} explicite`);
  donnerOrdreEquipe(e,'large');ok(e.tactiques.A?.attaque==='large','La consigne atteint la tactique des coéquipiers');
  donnerOrdreEquipe(e,'lent');ok(e.tactiques.A?.rythme==='gestion','Le tempo lent est transmis');
  e.phase='ruck';e.possession='A';e.porteur=null;e.ballon={x:61,y:35};e.origine={...e.ballon};
  donnerOrdreEquipe(e,'large');placerEquipes(e);const large=e.organisationSolo!.droite.centre.y;
  donnerOrdreEquipe(e,'serre');placerEquipes(e);ok(e.organisationSolo!.droite.centre.y<large,'La consigne serrée rapproche réellement les cellules');
  const court=classerCoupDePied(e,p,{intentionPied:'rasant',visee:{x:1,y:0,puissance:0.1}});
  const long=classerCoupDePied(e,p,{intentionPied:'rasant',visee:{x:1,y:0,puissance:0.9}});
  ok(long.arrivee.x>court.arrivee.x,'La charge règle aussi la longueur d’un pied choisi explicitement');
  const touches=assainirTouches({changerJoueur:['KeyM']});ok(touches.changerJoueur[0]==='KeyM' && touches.contreRuck[0]===TOUCHES_PAR_DEFAUT.contreRuck[0],'Touches configurables et anciennes préférences compatibles');
  const sans=creerApercuDestiny('online-intact'),copie=creerApercuDestiny('online-intact');
  // Appeler l’organisation et la sélection sur un match réseau sans drapeau ne consomme ni état ni hasard.
  organiserCellulesSolo(copie);actualiserSelectionEquipe(copie);changerJoueurEquipe(copie,{x:1,y:0});
  for(let i=0;i<80;i++){avancer(sans,DT);avancer(copie,DT);}
  ok(JSON.stringify(sans)===JSON.stringify(copie),'Les matchs sans activation solo gardent exactement leur état');
  ok(!sans.controleEquipe && !sans.organisationSolo,'Aucun état collectif dans le moteur réseau');
}
console.log(`Correctif 37 : ${n} contrôles validés.`);
