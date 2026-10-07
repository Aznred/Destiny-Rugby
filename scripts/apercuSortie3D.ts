import type { Object3D, Skeleton, Texture, WebGLRenderer, SkinnedMesh } from 'three';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { creerScene3D, detruireScene, scenesRendues, tenueDepuisCouleurs } from '../src/lib/match3D';

const params = new URLSearchParams(location.search);
if (params.get('ios') === '1') {
  // Fixture réservée à cette page : même branche que l'iPad identifié comme Mac tactile.
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
}
type Acteur = { model: Object3D; kit: Texture | null; bande?: { donnees: Float32Array } | null };
type Interne = { actors: Map<string, Acteur>; officials: Acteur[]; scene: Object3D; renderer: WebGLRenderer; stadesEnCache(): number };
const bouton = document.querySelector<HTMLButtonElement>('#lancer')!;
const cadre = document.querySelector<HTMLElement>('#terrain')!;
const etat = document.querySelector<HTMLElement>('#etat')!;
const lignes = document.querySelector<HTMLElement>('#lignes')!;
const verifier = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
bouton.onclick = async () => {
  bouton.disabled = true;lignes.replaceChildren();
  try {
    for (let cycle = 1; cycle <= 10; cycle++) {
      etat.textContent = `Cycle ${cycle}/10 : chargement et rendu…`;
      const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, 'sortie3d', undefined,
        { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: 5 });
      const scene = await creerScene3D(cadre, { leger: params.get('leger') !== '0', son: false, stade: 'international', camera: 'follow',
        equipes: [{nom:'Stade Toulousain',maillot:tenueDepuisCouleurs('#c71c32','#111111','A')},{nom:'RC Toulon',maillot:tenueDepuisCouleurs('#111111','#c71c32','B')}],
      });
      try {
        scene.brancher(e);
        await new Promise<void>(fin => {
          let n = 0;
          // Ce banc mesure la restitution, pas les FPS. Une tâche par image
          // permet aussi de vérifier une fermeture avec l'onglet masqué.
          const image = () => { avancer(e, 1/60);scene.image(1/60);if (++n < 45) setTimeout(image, 0);else fin(); };
          setTimeout(image, 0);
        });
        const i = (scene as unknown as {interne: Interne}).interne;
        verifier((scene.mesures?.().appels || 0)>0, 'La scène doit avoir été réellement dessinée');
        const acteurs = [...i.actors.values(), ...i.officials], images = acteurs.map(a => a.kit?.image).filter(Boolean) as HTMLCanvasElement[];
        const os = new Set<Skeleton>();
        for (const a of acteurs) a.model.traverse(o => { if ((o as SkinnedMesh).skeleton) os.add((o as SkinnedMesh).skeleton); });
        const taille = `${i.renderer.domElement.width} × ${i.renderer.domElement.height}`;
        if (params.get('ios') === '1') verifier(i.renderer.domElement.width*i.renderer.domElement.height<=921600, 'Définition iOS excessive');
        const ralentis = acteurs.reduce((n,a) => n+(a.bande?.donnees.byteLength || 0), 0)/1048576;
        const debut = performance.now(), rendu = detruireScene(scene);
        verifier(detruireScene(scene) === rendu, 'Destruction concurrente différente');
        await rendu;await scenesRendues();
        const ms = performance.now()-debut, contextePerdu = i.renderer.getContext().isContextLost();
        const libres = !i.actors.size && !i.officials.length && !i.scene.children.length && !cadre.querySelector('canvas')
          && images.every(c => c.width===1&&c.height===1) && [...os].every(s => !s.boneTexture) && acteurs.every(a => !a.bande)
          && i.renderer.info.memory.geometries===0 && i.renderer.info.memory.textures===0;
        verifier(contextePerdu&&libres,`Des ressources survivent à la sortie du match : ${JSON.stringify({contextePerdu,geometries:i.renderer.info.memory.geometries,textures:i.renderer.info.memory.textures,toiles:cadre.querySelectorAll('canvas').length,images:images.filter(c=>c.width!==1||c.height!==1).length,os:[...os].filter(s=>s.boneTexture).length,bandes:acteurs.filter(a=>a.bande).length})}`);
        const tr = document.createElement('tr');
        for (const valeur of [cycle,acteurs.length,taille,`${ralentis.toFixed(1)} Mo`,`${ms.toFixed(0)} ms`,contextePerdu?'Oui':'Non',libres?'Oui':'Non',i.stadesEnCache()]) {
          const td=document.createElement('td');td.textContent=String(valeur);tr.append(td);
        }
        lignes.append(tr);
        // Le bureau récupère l'espace après la destruction : aucune toile ne
        // doit se redimensionner pendant le retour paysage/portrait.
        cadre.style.height=cycle%2?'960px':'420px';
      } finally { await detruireScene(scene); }
    }
    etat.textContent='Dix sorties vérifiées : contextes, maillots, squelettes, ralentis et scènes rendus.';
  } catch (erreur) { etat.textContent=`Échec : ${erreur instanceof Error ? erreur.message : String(erreur)}`; }
  finally { bouton.disabled=false; }
};
