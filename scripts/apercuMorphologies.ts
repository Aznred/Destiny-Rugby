import { CharacterRenderer } from '../src/lib/spritesGenerateur/renderer';
import { createRestPose } from '../src/lib/spritesGenerateur/models';
import type { Character, Orientation } from '../src/lib/spritesGenerateur/models';
import { apparenceJoueurMatch } from '../src/lib/moteur/apparenceMatch';
import { morphologieSprite } from '../src/lib/moteur/morphologieSprite';
import type { MorphologieMatch } from '../src/lib/moteur/apparenceMatch';
import type { PosteId } from '../src/types';

const exemples: { nom: string; poste: PosteId; profil: MorphologieMatch; taille?: number; poids?: number; photo?: string; orientation?: Orientation }[] = [
  { nom: 'Antoine Dupont', poste: 'demi_melee', profil: 'arriere', photo: '/photos/antoine_dupont.webp' },
  { nom: 'Tadhg Furlong', poste: 'pilier_droit', profil: 'pilier', photo: '/photos/new%20maj/urc_tadhg_furlong.webp' },
  { nom: 'Eben Etzebeth', poste: 'deuxieme_ligne_g', profil: 'avant', photo: '/photos/new%20maj/urc_eben_etzebeth.webp' },
  { nom: 'Sevu Reece', poste: 'ailier_droit', profil: 'ailier', photo: '/photos/monde/srp_sevu_reece.webp' },
  { nom: 'Grand mince (simulation)', poste: 'deuxieme_ligne_g', profil: 'avant', taille: 208, poids: 88 },
  { nom: 'Petit massif (simulation)', poste: 'pilier_droit', profil: 'pilier', taille: 174, poids: 140 },
  { nom: 'Massif de profil (simulation)', poste: 'pilier_droit', profil: 'pilier', taille: 174, poids: 140, orientation: 'right' },
];
const grille = document.querySelector<HTMLDivElement>('#grille')!;
const renderer = new CharacterRenderer();
for (const [index, exemple] of exemples.entries()) {
  const apparence = apparenceJoueurMatch(exemple.nom, exemple.poste);
  const taille = exemple.taille ?? apparence.tailleCm, poids = exemple.poids ?? apparence.poidsKg;
  const forme = morphologieSprite(taille, poids, 68, exemple.profil);
  const character: Character = {
    id: `apercu-${index}`, name: exemple.nom, position: exemple.poste,
    appearance: {
      skin: apparence.peau, eyes: apparence.yeux, bodyType: forme.type,
      hair: { style: apparence.coiffure, color: apparence.cheveux },
      facialHair: { style: apparence.barbe, color: apparence.cheveux }, body: forme.corps,
      kit: { primary: '#a81727', secondary: '#101c22', accent: '#ffffff', pattern: 'HOOPS', shorts: '#171d25', socks: '#ac2333', boots: '#111111' }, number: index + 1,
    },
  };
  const card = document.createElement('div'); card.className = 'carte';
  if (exemple.photo) { const img = document.createElement('img'); img.src = exemple.photo; card.append(img); }
  const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160; card.append(canvas);
  const title = document.createElement('b'); title.textContent = exemple.nom; card.append(title);
  const details = document.createElement('small'); details.textContent = `${taille} cm · ${poids} kg · ${apparence.coiffure} · ${apparence.barbe}`; card.append(details);
  grille.append(card);
  const pose = createRestPose(); pose.orientation = exemple.orientation ?? 'front';
  renderer.draw(canvas.getContext('2d')!, character, pose, { width: 160, height: 160, zoom: .36, pan: { x: 0, y: 2 - (forme.corps.height - 1) * 35 }, showField: false });
}
