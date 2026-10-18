const path = require('node:path');
const racine = path.resolve(__dirname,'../..');
const sortie = path.join(racine,'trailer/cartes-tiktok-2026-10-18');
const langues = {
  fr:{
    hook:['TA CARTE EXISTE','PEUT-ÊTRE DÉJÀ !'],
    decouverte:'DU TOP 14 À LA RÉGIONALE 3', joueuses:'LES JOUEUSES AUSSI',amateurs:'LE RUGBY AMATEUR AUSSI',
    profil:'TA CARTE EST INCOMPLÈTE ?',reglages:'PARAMÈTRES DU JEU',menu:'COMPLÈTE TA CARTE',
    recherche:'CHERCHE TON NOM',champs:'PHOTO. POSTE. CLUB.',photo:'PROPOSE TES INFORMATIONS',
    examen:'PROPOSITIONS SOUMISES À VÉRIFICATION', collection:'ENVOIE LA VIDÉO À TON ÉQUIPE',
    final:['ET SI T’ÉTAIS','DÉJÀ DANS LE JEU ?'],gratuit:'GRATUIT',commentaire:'« JE VAIS CHERCHER MA CARTE »',
    voix:[
      [0,3,"Tu joues au rugby ? T’es peut-être déjà dans un jeu vidéo !"],
      [3,8,"Du Top 14 jusqu’en Régionale 3, retrouve les vrais joueurs et clubs de rugby !"],
      [8,15,"Et si ta carte est incomplète, tu peux proposer ta photo, corriger ton poste, ton club et tes infos !"],
      [15,21,"Alors cherche ton nom, complète ta carte et envoie-la à tes coéquipiers !"],
      [21,25,"Destiny Rugby. Et si t’étais déjà dans le jeu ?"],
    ],
    sousTitres:[
      [0,.85,'Tu joues au rugby ?'],[.85,1.7,'T’es peut-être déjà'],[1.7,3,'dans un JEU VIDÉO !'],
      [3,4.2,'Du TOP 14'],[4.2,5.4,'jusqu’en RÉGIONALE 3'],[5.4,6.8,'les vrais joueurs'],[6.8,8,'et clubs de rugby !'],
      [8,9.35,'Ta carte est incomplète ?'],[9.35,10.8,'Tu peux PROPOSER'],[10.8,12.3,'ta PHOTO, ton POSTE,'],[12.3,13.6,'ton CLUB'],[13.6,15,'et tes INFOS !'],
      [15,16.5,'Alors CHERCHE TON NOM'],[16.5,18,'complète ta carte'],[18,19.5,'et envoie-la'],[19.5,21,'à tes COÉQUIPIERS !'],
      [21,22.6,'DESTINY RUGBY'],[22.6,25,'Et si t’étais déjà dans le jeu ?'],
    ],
  },
  en:{
    hook:['YOU MIGHT ALREADY','HAVE A CARD!'],
    decouverte:'PRO STARS. GRASSROOTS PLAYERS.',joueuses:'WOMEN’S RUGBY TOO',amateurs:'REAL CLUBS. REAL PLAYERS.',
    profil:'IS YOUR CARD INCOMPLETE?',reglages:'OPEN THE GAME SETTINGS',menu:'COMPLETE YOUR CARD',
    recherche:'SEARCH YOUR NAME',champs:'PHOTO. POSITION. CLUB.',photo:'SUBMIT YOUR PLAYER DETAILS',
    examen:'SUGGESTIONS ARE REVIEWED BEFORE PUBLICATION',collection:'SHARE THIS WITH YOUR TEAM',
    final:['ARE YOU ALREADY','IN THE GAME?'],gratuit:'FREE TO PLAY',commentaire:'“I’M GOING TO FIND MY CARD”',
    voix:[
      [0,3,'Play rugby? You might already be in a video game!'],
      [3,8,'From professional stars to grassroots rugby players, discover real players and clubs!'],
      [8,15,"And if your card isn’t right, you can submit your photo, update your position, club and player details!"],
      [15,21,'Search your name, complete your card and challenge your teammates to find theirs!'],
      [21,25,'Destiny Rugby. Are you already in the game?'],
    ],
    sousTitres:[
      [0,.85,'Play RUGBY?'],[.85,1.7,'You might already be'],[1.7,3,'in a VIDEO GAME!'],
      [3,4.2,'From PROFESSIONAL STARS'],[4.2,5.4,'to GRASSROOTS rugby'],[5.4,6.8,'discover REAL PLAYERS'],[6.8,8,'and REAL CLUBS!'],
      [8,9.35,'Your card isn’t right?'],[9.35,10.8,'You can SUBMIT'],[10.8,12.3,'your PHOTO, POSITION,'],[12.3,13.6,'CLUB'],[13.6,15,'and PLAYER DETAILS!'],
      [15,16.5,'SEARCH YOUR NAME'],[16.5,18,'complete your card'],[18,19.5,'and challenge your TEAMMATES'],[19.5,21,'to find theirs!'],
      [21,22.6,'DESTINY RUGBY'],[22.6,25,'Are you already in the game?'],
    ],
  },
};
const scenes = [
  {nom:'mystere',debut:0,fin:1.2,type:'pack',titre:'hook'},
  {nom:'revelation',debut:1.2,fin:3,type:'carte',i:0,titre:'hook',revelation:true},
  {nom:'clubs',debut:3,fin:4.2,type:'carte',i:3,titre:'decouverte'},
  {nom:'joueuses',debut:4.2,fin:5.4,type:'carte',i:1,titre:'joueuses'},
  {nom:'amateurs',debut:5.4,fin:6.8,type:'duo',indices:[4,5],titre:'amateurs'},
  {nom:'terrain',debut:6.8,fin:8,type:'match',titre:'decouverte'},
  {nom:'profil',debut:8,fin:9.2,type:'carte',i:0,titre:'profil'},
  {nom:'parametres',debut:9.2,fin:10.6,type:'ecran',image:'parametres',titre:'reglages'},
  {nom:'menu',debut:10.6,fin:12,type:'ecran',image:'menu',titre:'menu'},
  {nom:'champs',debut:12,fin:13.5,type:'ecran',image:'champs',titre:'champs'},
  {nom:'photo',debut:13.5,fin:15,type:'ecran',image:'photo',titre:'photo'},
  {nom:'recherche',debut:15,fin:16.5,type:'ecran',image:'recherche',titre:'recherche'},
  {nom:'ta-carte',debut:16.5,fin:18,type:'carte',i:5,titre:'recherche',revelation:true},
  {nom:'collection',debut:18,fin:19.5,type:'collection',titre:'collection'},
  {nom:'equipe',debut:19.5,fin:21,type:'match',titre:'collection'},
  {nom:'signature',debut:21,fin:23,type:'final',titre:'final'},
  {nom:'adresse',debut:23,fin:25,type:'final',titre:'final',adresse:true},
];
module.exports={racine,sortie,langues,scenes};
