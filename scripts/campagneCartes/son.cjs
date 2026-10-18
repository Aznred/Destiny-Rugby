// Composition originale pour cette campagne : percussions, basse et arpège.
// Les effets de pochettes et l'ambiance viennent du jeu. Aucune voix de substitution.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ffmpeg=require('ffmpeg-static');
const {racine,sortie,scenes}=require('./configuration.cjs');
function executer(args){const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',windowsHide:true,timeout:180000});if(r.status!==0)throw new Error(r.stderr);}
function composer(travail){
  const hz=48000,n=hz*25,pcm=Buffer.alloc(n*4);let graine=20261018;
  const basses=[36.7081,36.7081,29.1352,32.7032];
  const notes=[293.665,440,349.228,523.251,293.665,440,587.33,523.251];
  for(let i=0;i<n;i++){
    const t=i/hz,beat=t%.4,demi=t%.2,decalage=(t+.4)%.8;
    graine=(Math.imul(graine,1664525)+1013904223)>>>0;
    const bruit=graine/4294967296*2-1;
    const puissance=t<1.2?.5:t<3?.8:t<8?1:t<15?.60:t<21?1:.82;
    const kick=Math.sin(2*Math.PI*(48*beat+3.6*(1-Math.exp(-beat*42))))*Math.exp(-beat*23)*.58;
    const caisse=(bruit*.32+Math.sin(2*Math.PI*185*t)*.1)*Math.exp(-decalage*42);
    const charley=bruit*Math.exp(-demi*95)*.09;
    const freq=basses[Math.floor(t/3.2)%4],envB=.85-.65*Math.exp(-beat*16);
    const basse=(Math.sin(2*Math.PI*freq*t)+Math.sin(4*Math.PI*freq*t)*.25)*.16*envB;
    const note=notes[Math.floor(t/.2)%notes.length],enveloppe=Math.exp(-demi*12);
    const arpege=(Math.sin(2*Math.PI*note*t)+.17*Math.sin(6*Math.PI*note*t))*.075*enveloppe;
    let transition=0;
    for(const coupe of scenes.slice(1)){
      const d=t-coupe.debut;
      if(d>-.18&&d<0)transition+=bruit*.13*(1+d/.18);
      if(d>=0&&d<.16)transition+=Math.sin(2*Math.PI*(65*d+1.2*(1-Math.exp(-d*40))))*Math.exp(-d*32)*.26;
    }
    const fondu=Math.min(1,t/.015,(25-t)/.5);
    const signal=(kick+caisse+charley+basse+arpege)*puissance+transition;
    const gauche=Math.tanh(signal)*fondu*.88;
    const droite=Math.tanh(signal+Math.sin(2*Math.PI*notes[(Math.floor(t/.2)+2)%8]*t)*.012*enveloppe)*fondu*.88;
    pcm.writeInt16LE(Math.round(gauche*32767),i*4);pcm.writeInt16LE(Math.round(droite*32767),i*4+2);
  }
  const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(hz,24);h.writeUInt32LE(hz*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
  const original=path.join(travail,'composition.wav');fs.writeFileSync(original,Buffer.concat([h,pcm]));
  const jeu=path.join(racine,'public/rn26/sons');
  const sortieSon=path.join(sortie,'Musique-et-effets-25s.wav');
  executer(['-i',original,'-i',path.join(jeu,'pack1.ogg'),'-i',path.join(jeu,'pack2.ogg'),'-stream_loop','-1','-i',path.join(jeu,'foule_pleine.ogg'),
    '-filter_complex','[1:a]volume=0.26,adelay=1200|1200[p1];[2:a]volume=0.20,adelay=16500|16500[p2];[3:a]volume=0.055,afade=t=in:st=0:d=1,afade=t=out:st=24:d=1[f];[0:a][p1][p2][f]amix=inputs=4:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000[o]',
    '-map','[o]','-t','25','-c:a','pcm_s16le',sortieSon]);
  executer(['-i',sortieSon,'-af','volume=0.40','-c:a','pcm_s16le',path.join(sortie,'Fond-pour-doublage-25s.wav')]);
  return sortieSon;
}
module.exports={composer};
