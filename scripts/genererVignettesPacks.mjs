// Vignettes légères des vraies pochettes GLB : géométrie, UV et textures existantes.
// Rendu orthographique hors ligne ; aucun canvas/WebGL ni GLB chargé par la roulette.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const largeur=384, hauteur=512, sortie='public/images/packs-roulette';
await fs.mkdir(sortie,{recursive:true});
const fichiers=[];
for(const dossier of ['public/m3d/packs','public/m3d/packs-speciaux']) {
  for(const nom of await fs.readdir(dossier)) if(nom.endsWith('.glb') && !nom.includes('ouvert')) fichiers.push(path.join(dossier,nom));
}
for(const fichier of fichiers) {
  const b=await fs.readFile(fichier), taille=b.readUInt32LE(12);
  const doc=JSON.parse(b.subarray(20,20+taille)), bin=b.subarray(28+taille);
  const donnees=index=>{
    const a=doc.accessors[index],v=doc.bufferViews[a.bufferView];
    const offset=(v.byteOffset ?? 0)+(a.byteOffset ?? 0), stride={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const copie=Uint8Array.from(bin.subarray(offset,offset+a.count*stride*({5126:4,5125:4,5123:2}[a.componentType])));
    return new ({5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType])(copie.buffer);
  };
  const primitives=doc.meshes.flatMap(m=>m.primitives).map(p=>({p,positions:donnees(p.attributes.POSITION),normales:donnees(p.attributes.NORMAL),uv:donnees(p.attributes.TEXCOORD_0),indices:donnees(p.indices)}));
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const {positions} of primitives) for(let i=0;i<positions.length;i++) {const n=i%3;min[n]=Math.min(min[n],positions[i]);max[n]=Math.max(max[n],positions[i]);}
  const centre=min.map((v,i)=>(v+max[i])/2), facteur=Math.min((largeur-42)/(max[0]-min[0]),(hauteur-40)/(max[1]-min[1]));
  const rgba=Buffer.alloc(largeur*hauteur*4), zbuffer=new Float32Array(largeur*hauteur).fill(-Infinity);
  const angle=-.08,cos=Math.cos(angle),sin=Math.sin(angle);
  for(const {p,positions,normales,uv,indices} of primitives) {
    const mat=doc.materials[p.material]?.pbrMetallicRoughness;
    const index=mat?.baseColorTexture?.index;
    if(index===undefined) throw new Error('Texture de pochette absente : '+fichier);
    const image=doc.images[doc.textures[index].source],v=doc.bufferViews[image.bufferView];
    const texture=await sharp(bin.subarray(v.byteOffset ?? 0,(v.byteOffset ?? 0)+v.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const tw=texture.info.width,th=texture.info.height;
    const sommets=Array.from({length:positions.length/3},(_,i)=>{
      const x=positions[i*3]-centre[0],y=positions[i*3+1]-centre[1],z=positions[i*3+2]-centre[2];
      const nx=normales[i*3],ny=normales[i*3+1],nz=normales[i*3+2];
      return [largeur/2+(x*cos+z*sin)*facteur,hauteur/2-y*facteur,-x*sin+z*cos,
        uv[i*2],uv[i*2+1],Math.max(.62,Math.min(1.2,.82+(-nx*.2+ny*.25+nz*.65)*.38))];
    });
    const croix=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
    for(let i=0;i<indices.length;i+=3) {
      const a=sommets[indices[i]],c=sommets[indices[i+1]],d=sommets[indices[i+2]],aire=croix(a,c,d[0],d[1]);
      if(Math.abs(aire)<.0001)continue;
      const x0=Math.max(0,Math.floor(Math.min(a[0],c[0],d[0]))),x1=Math.min(largeur-1,Math.ceil(Math.max(a[0],c[0],d[0])));
      const y0=Math.max(0,Math.floor(Math.min(a[1],c[1],d[1]))),y1=Math.min(hauteur-1,Math.ceil(Math.max(a[1],c[1],d[1])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const w0=croix(c,d,x+.5,y+.5)/aire,w1=croix(d,a,x+.5,y+.5)/aire,w2=1-w0-w1;
        if(Math.min(w0,w1,w2)<-.001)continue;
        const at=y*largeur+x,z=w0*a[2]+w1*c[2]+w2*d[2];if(z<zbuffer[at])continue;zbuffer[at]=z;
        const u=Math.max(0,Math.min(tw-1,Math.round((w0*a[3]+w1*c[3]+w2*d[3])*(tw-1))));
        const vv=Math.max(0,Math.min(th-1,Math.round((w0*a[4]+w1*c[4]+w2*d[4])*(th-1))));
        const tex=(vv*tw+u)*4,lumiere=w0*a[5]+w1*c[5]+w2*d[5];
        for(let k=0;k<3;k++)rgba[at*4+k]=Math.min(255,texture.data[tex+k]*lumiere*(mat.baseColorFactor?.[k] ?? 1));
        rgba[at*4+3]=255;
      }
    }
  }
  const nom=path.basename(fichier,'.glb').replace('-ferme','');
  const destination=path.join(sortie,nom+'.webp');
  await sharp(rgba,{raw:{width:largeur,height:hauteur,channels:4}}).resize(240,320).webp({quality:86,alphaQuality:95}).toFile(destination);
  console.log(nom, (await fs.stat(destination)).size+' octets');
}
