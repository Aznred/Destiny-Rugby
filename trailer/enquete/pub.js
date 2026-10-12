// PUB « L'HOMME QUI A DISPARU DEVANT 80 000 TÉMOINS » — ses décors, ses extraits de vrai jeu et leur cadrage.
// Le lecteur commun (../catastrophe/lecteur.js) fait le reste : chaîne d'image, chronologie, sous-titres, carton final.
//
// La chute est du vrai jeu : la caméra de surveillance dézoome — c'est un stade — et l'on revoit l'action. L'essai est
// calé pour tomber juste après le nom du joueur (« C'était juste Antoine Dupont ! » / « That's just Cheslin Kolbe! »).
import { lancerLecteur } from '../catastrophe/lecteur.js';
import { creerEnquete } from './scene/enquete.js';
import { sortieDouce, lisser, borner, melange } from '../catastrophe/scene/bruit.js';

const HEURES = { fr: { heure: '21:04', date: '12/10' }, en: { heure: '9:04 PM', date: 'OCT 12' } };
const surveillance = document.getElementById('surveillance');
let essai = null;                                           // { intro, tEssai } : les repères de la chute, en secondes depuis son début

await lancerLecteur({
  // L'extrait de l'essai se cale sur la voix : l'image où le ballon est aplati doit tomber `apres` seconde après le nom.
  preparer(C, M, langue) {
    const e = M.essai[langue];
    const [debut, fin] = C.jeu.essai;
    const tEssai = C.voix[3].fin + (M.essai.delai ?? 0.15) - debut;
    const avant = Math.round((tEssai - M.essai.intro) * M.essai.ips);       // images d'action avant l'essai
    const suite = Math.ceil((fin - debut - tEssai) * M.essai.ips) + 2;         // et après
    let coupe = null;
    if (e.geste && e.essai - avant > e.geste[0]) {
      // La course est plus longue que la réplique (Kolbe : 63 mètres) : on montre le geste qui compte — la feinte —, puis on
      // coupe sur la fin de la course. Deux morceaux du même match, dans l'ordre.
      const n1 = e.geste[1] - e.geste[0] + 1;
      e.segments = [{ dossier: e.dossier, de: e.geste[0], a: e.geste[1] }, { dossier: e.dossier, de: e.essai - (avant - n1), a: e.essai + suite }];
      coupe = n1 / M.essai.ips;
    } else e.segments = [{ dossier: e.dossier, de: Math.max(0, e.essai - avant), a: e.essai + suite }];
    // Derrière le carton final : la suite de l'action, ralentie.
    M.fond = { ips: M.essai.ips, vitesse: 0.5, segments: [{ dossier: e.dossier, de: e.essai + 24, a: e.essai + 24 + 70 }] };
    essai = { intro: M.essai.intro, tEssai, coupe, origine: e.origine || '50% 56%' };
  },

  decors({ C, langue }) {
    const enquete = creerEnquete({ langue, ...HEURES[langue] });
    const mot = C.mots.find(m => m.scene === 1 && /disparu|vanished/i.test(m.mot));
    enquete.reperes.disparition = mot ? mot.debut + 0.14 : C.scenes[0].fin * 0.6;
    return enquete.plans;
  },

  clips: { essai: 'essai', pack: 'pack', compo: 'compo', fond: 'titre' },

  jeu(t, { C, M, langue, poser, cadrer }) {
    const J = C.jeu;
    const dans = ([a, b]) => t >= a && t < b;
    let zoom = 1, clarte = 0, origine = '50% 50%', filtre = '';
    surveillance.style.visibility = 'hidden';
    if (dans(J.essai)) {
      const tau = t - J.essai[0];
      const enAction = tau - essai.intro;
      poser('essai', Math.max(0, enAction));
      // 1. L'image de la caméra de surveillance, serrée sur l'herbe, qui dézoome : c'est un stade.
      const recul = sortieDouce(tau / (essai.intro * 0.9));
      zoom = melange(3.4, 1.0, recul) + 0.035 * borner(enAction / 4);
      origine = essai.origine;
      // 2. L'action reprend : la couleur revient, l'habillage s'efface.
      const vert = 1 - lisser(0, 0.5, enAction);
      filtre = vert > 0.001 ? `grayscale(${vert.toFixed(3)}) sepia(${(vert * 0.55).toFixed(3)}) hue-rotate(${(vert * 62).toFixed(1)}deg) saturate(${(1 + vert * 0.9).toFixed(3)}) contrast(${(1 + vert * 0.22).toFixed(3)}) brightness(${(1 - vert * 0.12).toFixed(3)})` : '';
      surveillance.style.visibility = vert > 0.01 ? 'visible' : 'hidden';
      surveillance.style.opacity = Math.min(1, vert * 1.3).toFixed(3);
      const h = { fr: `12/10   21:04:${String(7 + Math.floor(tau)).padStart(2, '0')}`, en: `OCT 12   9:04:${String(7 + Math.floor(tau)).padStart(2, '0')} PM` }[langue];
      surveillance.querySelector('.sv-bas').textContent = h;
      surveillance.querySelector('.sv-rec i').style.opacity = Math.floor(tau * 2.5) % 2 ? '0.25' : '1';
      const depuisEssai = tau - essai.tEssai;
      clarte = Math.exp(-tau / 0.09) * 0.9 + (depuisEssai > 0 ? Math.exp(-depuisEssai / 0.12) * 0.45 : 0)
        + (essai.coupe !== null && enAction >= essai.coupe ? Math.exp(-(enAction - essai.coupe) / 0.06) * 0.5 : 0);
    } else if (dans(J.pack)) {
      const tau = t - J.pack[0];
      poser('pack', tau);
      const cartes = tau - M.pack.morceaux[langue][1].a;                      // le pack d'abord, puis ses trois cartes plein cadre
      if (cartes < 0) { zoom = 1.22 - 0.10 * sortieDouce(tau / 0.3); origine = '50% 42%'; clarte = Math.exp(-tau / 0.06) * 0.6; }
      else { zoom = 1.60 - 0.08 * sortieDouce(cartes / 0.3); origine = '9% 58%'; clarte = Math.exp(-cartes / 0.06) * 0.7; }
    } else if (dans(J.compo)) {
      const tau = t - J.compo[0];
      poser('compo', tau);
      zoom = 1.10 - 0.07 * sortieDouce(tau / 0.25);
      clarte = Math.exp(-tau / 0.06) * 0.55;
    } else {
      const tau = t - J.titre[0];
      poser('fond', tau);
      zoom = 1.06 + 0.02 * tau;
      clarte = Math.exp(-tau / 0.07) * 0.6;
    }
    cadrer(zoom, origine, filtre);
    return clarte;
  },

  // Hors du vrai jeu, l'habillage de surveillance n'a rien à faire à l'image.
  calques(t, { C }) { if (t < C.jeu.essai[0] || t >= C.jeu.essai[1]) surveillance.style.visibility = 'hidden'; },
});
