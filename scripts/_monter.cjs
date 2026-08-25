// MONTAGE — les images capturées deviennent une vidéo de présentation.
//
//   node scripts/_monter.cjs paysage
//   node scripts/_monter.cjs portrait
//
// ⚠️ AUCUNE MUSIQUE, ET C'EST DÉLIBÉRÉ. Une piste sous licence n'a rien à faire
// dans un dépôt, et les vidéos de présentation d'un portail sont de toute façon
// lues SANS SON dans les listes de jeux : une bande-son ne servirait qu'à la
// page du jeu, au prix d'un risque de droits. Le montage est donc cadencé pour
// se lire en silence — pas de temps mort, l'action dès la première seconde.
//
// ⚠️ ET AUCUN HABILLAGE PAR-DESSUS. Pas de carton-titre, pas de logo incrusté,
// pas de texte marketing : ce qu'on montre est l'écran du jeu, tel quel. C'est
// ce que demandent les portails (une vidéo qui ressemble à une publicité est
// refusée) et c'est aussi plus honnête.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const format = process.argv[2] === 'portrait' ? 'portrait' : 'paysage';
const SOURCE = path.join('trailer', `images-${format}`);
const LARGE = format === 'portrait' ? 1080 : 1920;
const HAUT = format === 'portrait' ? 1920 : 1080;
const SORTIE = path.join('trailer', `crazygames-${format}.mp4`);

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ ${SOURCE} est vide : lance d'abord scripts/_trailer.cjs ${format}`);
  process.exit(1);
}
const images = fs.readdirSync(SOURCE).filter((f) => f.endsWith('.jpg'));
if (images.length < 40) {
  console.error(`❌ seulement ${images.length} images — le tournage a échoué`);
  process.exit(1);
}

// Les captures font la moitié de la définition finale (voir `_trailer.cjs`) :
// `lanczos` est le filtre d'agrandissement qui garde le texte le plus net.
const args = [
  '-y',
  '-framerate', '20',
  '-i', path.join(SOURCE, '%05d.jpg'),
  // ⚠️ CONVERSION DE PLAGE EXPLICITE. Les images sources sont des JPEG, donc en
  // plage COMPLÈTE (0-255) ; la vidéo web se lit en plage TÉLÉVISION (16-235).
  // Sans le dire à ffmpeg, il sort du  que certains lecteurs
  // réinterprètent : les noirs se bouchent et les ors se saturent. Le jeu est
  // sombre — c'est exactement là que ça se voit.
  '-vf', `scale=${LARGE}:${HAUT}:flags=lanczos:in_range=full:out_range=tv,format=yuv420p`,
  '-color_range', 'tv',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '20',
  // `+faststart` place l'index au début du fichier : la vidéo démarre sans
  // attendre le téléchargement complet, ce qui compte sur une page de portail.
  '-movflags', '+faststart',
  '-r', '30',
  '-an',
  SORTIE,
];

console.log(`▶ montage ${format} : ${images.length} images → ${LARGE}x${HAUT}`);
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

const octets = fs.statSync(SORTIE).size;
const secondes = (images.length / 20).toFixed(1);
console.log(`✅ ${SORTIE} · ${secondes} s · ${(octets / 1048576).toFixed(1)} Mo`);
