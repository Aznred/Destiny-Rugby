// Grille de voisinage : mêmes joueurs et même ordre, seuls les corps éloignés sont écartés.
export class GrilleProximite {
  constructor(joueurs, corps, taille=1.5){
    this.taille=taille;this.cellules=new Map();this.cases=new Map();this.ordre=new Map(joueurs.map((p,i)=>[p.id,i]));
    for(const p of joueurs)this.actualiser(p,corps.get(p.id));
  }
  cle(x,z){return `${Math.floor(x/this.taille)},${Math.floor(z/this.taille)}`;}
  actualiser(p,b){
    const cle=this.cle(b.x,b.z),avant=this.cases.get(p.id);if(cle===avant)return;
    if(avant!==undefined){const lot=this.cellules.get(avant);lot.delete(p);if(!lot.size)this.cellules.delete(avant);}
    let lot=this.cellules.get(cle);if(!lot)this.cellules.set(cle,lot=new Set());lot.add(p);this.cases.set(p.id,cle);
  }
  voisins(b){
    const x=Math.floor(b.x/this.taille),z=Math.floor(b.z/this.taille),liste=[];
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const lot=this.cellules.get(`${x+dx},${z+dz}`);if(lot)liste.push(...lot);}
    return liste.sort((a,b)=>this.ordre.get(a.id)-this.ordre.get(b.id));
  }
}
