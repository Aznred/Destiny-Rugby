// Les modèles en cache appartiennent à la session ; les copies, textures peintes,
// ombres et squelettes appartiennent à une seule scène. Les libérer séparément
// évite de casser un aperçu encore ouvert et rend aussi les images côté CPU.
import { BufferGeometry } from './vendor/three/build/three.module.js';
const partages=new WeakSet(),imagesPartagees=new WeakSet();

function imagesDe(texture){return [texture?.image].flat().filter(i=>i&&typeof i==='object');}

export function recenserRessources(racines=[],extras=[]){
  const ressources=new Set();
  const ajouter=r=>{if(!r||ressources.has(r))return;ressources.add(r);
    if(r.isMaterial){
      for(const v of Object.values(r))if(v?.isTexture)ajouter(v);
      for(const u of Object.values(r.uniforms||{}))for(const v of [u?.value].flat())if(v?.isTexture)ajouter(v);
    }
  };
  for(const racine of racines)racine?.traverse?.(o=>{
    ajouter(o.geometry);ajouter(o.skeleton);
    for(const m of [o.material].flat())ajouter(m);
  });
  for(const r of extras)ajouter(r);
  return ressources;
}

export function protegerRessources(racines=[],extras=[]){
  for(const r of recenserRessources(racines,extras)){
    partages.add(r);if(r.isTexture)for(const i of imagesDe(r))imagesPartagees.add(i);
  }
}

/** Les écouteurs de WebGLRenderer vivent sur géométries, matériaux et textures.
 * Des objets propres à chaque scène empêchent le cache de retenir les anciens
 * renderers. Les tableaux de sommets et les images restent partagés : aucune
 * copie de leurs gros tampons CPU. Une seule copie par ressource et par scène.
 */
export function ressourcesLocales(){
  const geometries=new Map(),materiaux=new Map(),textures=new Map();
  function locale(t){
    if(!t?.isTexture||!partages.has(t))return t;
    if(!textures.has(t))textures.set(t,t.clone());
    return textures.get(t);
  }
  function matiere(m){
    if(!m)return m;
    let copie=m;
    if(partages.has(m)){
      if(!materiaux.has(m))materiaux.set(m,m.clone());
      copie=materiaux.get(m);
    }
    for(const [k,v] of Object.entries(copie))if(v?.isTexture)copie[k]=locale(v);
    for(const u of Object.values(copie.uniforms||{})){
      if(u.value?.isTexture)u.value=locale(u.value);
      else if(Array.isArray(u.value))u.value=u.value.map(v=>locale(v));
    }
    return copie;
  }
  return {
    appliquer(racine){racine.traverse(o=>{
      const src=o.geometry;
      if(src&&partages.has(src)){
        if(!geometries.has(src)){
          const g=new BufferGeometry();g.name=src.name;g.index=src.index;
          g.attributes={...src.attributes};g.morphAttributes={...src.morphAttributes};
          g.morphTargetsRelative=src.morphTargetsRelative;
          g.groups=src.groups.map(v=>({...v}));g.drawRange={...src.drawRange};
          g.boundingBox=src.boundingBox?.clone()||null;g.boundingSphere=src.boundingSphere?.clone()||null;
          g.userData={...src.userData};geometries.set(src,g);
        }
        o.geometry=geometries.get(src);
      }
      if(o.material)o.material=Array.isArray(o.material)?o.material.map(matiere):matiere(o.material);
    });},
    oublier(){geometries.clear();materiaux.clear();textures.clear();},
  };
}

/** Un plan dédupliqué, consommable par tranches ou immédiatement en cas d'échec. */
export function planLiberation(racines=[],extras=[],avecPartages=false){
  const reste=[...recenserRessources(racines,extras)].filter(r=>avecPartages||!partages.has(r));
  const imagesRendues=new WeakSet();
  function rendre(r){
    try{r.dispose?.();}
    finally{
      if(r.isTexture){
        for(const im of imagesDe(r)){
          if(imagesRendues.has(im)||(!avecPartages&&imagesPartagees.has(im)))continue;
          imagesRendues.add(im);
          im.close?.();
          if(typeof im.getContext==='function'){im.width=1;im.height=1;}
        }
        // Texture.clone partage aussi l'objet Source, pas seulement l'image.
        // Le détacher évite de vider la texture du modèle encore en cache.
        if(r.source)r.source=new r.source.constructor(null);
      }
    }
  }
  return {
    get restant(){return reste.length;},
    tranche(taille=16){
      // Une ressource en erreur ne retient pas le contexte ou les suivantes.
      for(const r of reste.splice(0,taille))try{rendre(r);}catch{ /* déjà perdue */ }
    },
    tout(){this.tranche(reste.length);},
  };
}
