// PUB « ET SI UN OBJET DE 800 KM… » — ses décors, ses extraits de vrai jeu et leur cadrage.
// Le lecteur (lecteur.js) fait le reste : chaîne d'image, chronologie, sous-titres, carton final.
import { lancerLecteur } from './lecteur.js';
import { creerEspace } from './scene/espace.js';
import { creerVille } from './scene/ville.js';
import { creerLabo } from './scene/labo.js';
import { sortieDouce } from './scene/bruit.js';

await lancerLecteur({
  decors({ moteur, L, C }) {
    const espace = creerEspace(L);
    const ville = creerVille(L);
    const labo = creerLabo(L, espace, moteur);
    espace.reperes.devoile = C.scenes[3].debut;
    return {
      approche: espace.plans.approche, entree: espace.plans.entree, foule: ville.plans.foule,
      tsunami: ville.plans.tsunami, effondrement: ville.plans.effondrement, faille: ville.plans.faille, onde: espace.plans.onde,
      surface: espace.plans.surface, labo: labo.plans.salle, macro: espace.plans.macro,
      devoile: espace.plans.devoile, heros: espace.plans.heros, ruee: espace.plans.ruee,
    };
  },

  // Extrait de montage.json → fenêtre de la chronologie qui donne sa durée.
  clips: { tir: 'tir', pack: 'pack', compo: 'compo', fond: 'titre' },

  // La scène 5 : la frappe, deux aperçus de l'interface, puis le stade derrière le carton.
  jeu(t, { C, poser, cadrer }) {
    const J = C.jeu;
    const dans = ([a, b]) => t >= a && t < b;
    let zoom = 1, clarte = 0, origine = '50% 50%';
    if (dans(J.tir)) {
      const tau = t - J.tir[0];
      poser('tir', tau);
      zoom = 1.16 - 0.16 * sortieDouce(tau / 0.35);          // la coupe arrive « de près », puis le cadre se pose
      clarte = Math.exp(-tau / 0.10) * 0.95;
    } else if (dans(J.pack)) {
      const tau = t - J.pack[0];
      poser('pack', tau);
      zoom = 1.58 - 0.08 * sortieDouce(tau / 0.3);           // les trois cartes plein cadre
      origine = '9% 58%';
      clarte = Math.exp(-tau / 0.06) * 0.55;
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
    cadrer(zoom, origine);
    return clarte;
  },
});
