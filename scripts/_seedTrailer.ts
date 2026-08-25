// Sauvegarde de tournage : un joueur crédible, un journal rempli, un match qui
// arrive. Sert uniquement à filmer le jeu — rien de tout ça n'est livré.
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { TEXTES_SOCIAUX } from '../src/data/textesSociaux';
chargerTextes({ ...TEXTES, ...TEXTES_SOCIAUX });
import { useGame } from '../src/store/useGame';
import { writeFileSync } from 'node:fs';

useGame.getState().creerJoueur({
  nom: 'Liam Carter', poste: 'demi_ouverture', nation: 'Angleterre',
  club: 'Stade Toulousain', division: 'top14', age: 24, traits: [],
});
const j0 = useGame.getState().joueur!;
// Un vrai niveau : on filme un joueur qui compte, pas un débutant à 34.
useGame.setState({
  joueur: {
    ...j0,
    attributs: { vitesse: 84, force: 78, endurance: 82, plaquage: 76, passe: 88, jeuAuPied: 86, vision: 87, mental: 83 },
    reputation: 74, noteSaison: 8.1, argent: 240_000, popularite: 78, abonnes: 41_500,
    contrat: { club: j0.club, division: 'top14', saisons: 1, salaire: 420_000 },
  },
  langue: 'en', langueManuelle: true, tutoVu: true, guideFerme: true, tutoMatchVu: true,
});

// Quelques semaines jouées : le journal se remplit, le classement bouge.
for (let i = 0; i < 6; i++) {
  const s = useGame.getState();
  if (!s.joueur) break;
  if (s.evenementHebdo) s.abandonnerEvenement();
  s.semaineSuivante();
}
useGame.getState().susciterApproches(3, true);

const etat = useGame.getState() as unknown as Record<string, unknown>;
const garde = ['joueur','journal','approches','conversations','notifsSocial','ecran','coins','posts',
  'comptesSuivis','relationsSociales','tutoVu','guideFerme','ecransVus','langue','langueManuelle',
  'succesDebloques','dossiersRecrutement','iaActivee','theme','statsReelles','journeesReelles','tutoMatchVu'];
const sauve: Record<string, unknown> = {};
for (const k of garde) if (etat[k] !== undefined) sauve[k] = etat[k];
sauve.ecran = 'carriere'; sauve.tutoVu = true; sauve.guideFerme = true; sauve.tutoMatchVu = true;
writeFileSync('scripts/_seedTrailer.json', JSON.stringify({ state: sauve, version: 17 }));
const j = useGame.getState().joueur!;
console.log(`${j.nom} · ${j.club} · semaine ${j.semaine} · ${useGame.getState().journal.length} entrées de journal · ${useGame.getState().approches.length} approches`);
