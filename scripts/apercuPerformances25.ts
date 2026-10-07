import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { apparencesDesJoueurs, creerScene3D, tenueDepuisCouleurs } from '../src/lib/match3D';
import { memoireJs } from '../src/lib/profileur';

const bouton = document.getElementById('lancer') as HTMLButtonElement;
const etat = document.getElementById('etat')!, conteneur = document.getElementById('terrain')!, lignes = document.getElementById('resultats')!;
bouton.onclick = async () => {
  bouton.disabled = true; lignes.replaceChildren();
  try {
    const creer = () => creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, 'mesure25', undefined,
      { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: 5 });
    for (const optimise of [false, true]) {
      etat.textContent = `${optimise ? 'Après' : 'Avant'} : chargement puis mesure…`;
      const e = creer();
      const scene = await creerScene3D(conteneur, {
        equipes: [ { nom: 'Stade Toulousain', maillot: tenueDepuisCouleurs('#d62731', '#111111', 'A') }, { nom: 'RC Toulon', maillot: tenueDepuisCouleurs('#111111', '#d62731', 'B') } ],
        apparences: apparencesDesJoueurs(e.pions), camera: 'follow', stade: 'campagne', cadence: false, leger: false,
        ...{ squelettes: optimise, soudure: optimise, elagage: optimise, animationsEconomes: optimise },
      });
      scene.brancher(e); scene.mesurerGpu?.(true);
      let debut = 0, fin = 0;
      await new Promise<void>(resolve => {
        let images = 0;
        const image = (heure: number) => {
          avancer(e, 1 / 60); scene.image(1 / 60);
          if (++images === 60) debut = heure;
          if (images < 300) requestAnimationFrame(image); else { fin = heure; resolve(); }
        };
        requestAnimationFrame(image);
      });
      const m = scene.mesures!(), memoire = memoireJs();
      const chiffres = [optimise ? 'Après' : 'Avant', document.hidden ? 'Onglet masqué' : (240000 / (fin - debut)).toFixed(1), m.cpu?.moyenne.toFixed(2) ?? '—', m.gpu?.moyenne.toFixed(2) ?? 'Indisponible', String(m.appels), m.triangles.toLocaleString('fr'), memoire?.toFixed(1) ?? 'Indisponible'];
      const ligne = document.createElement('tr');
      for (const chiffre of chiffres) { const cellule = document.createElement('td'); cellule.textContent = chiffre; ligne.append(cellule); }
      lignes.append(ligne);
      await (scene.detruireParEtapes ? scene.detruireParEtapes() : Promise.resolve(scene.detruire()));
    }
    etat.textContent = 'Mesure terminée. Comparer plusieurs passages sur le même appareil, puis sur un vrai téléphone.';
  } catch (erreur) { etat.textContent = erreur instanceof Error ? erreur.message : 'Mesure interrompue.'; }
  finally { bouton.disabled = false; }
};
