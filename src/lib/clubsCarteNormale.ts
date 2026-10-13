import { COMPETITIONS_MASCULINES } from '../data/clubs.js';
import { competitionsFeminines } from './mondeFeminin.js';
import type { SaisieCarteNormale } from './cartesNormales.js';

const championnats = { male: COMPETITIONS_MASCULINES, female: competitionsFeminines() };
const clubs = {
  male: listerClubs('male'),
  female: listerClubs('female'),
};

function listerClubs(genre: SaisieCarteNormale['gender']) {
  return championnats[genre].flatMap(competition => competition.clubs.map(club => ({
    id: `${competition.id}:${club.nom}`, club, competition,
  }))).sort((a, b) => a.club.nom.localeCompare(b.club.nom, 'fr'));
}

export const championnatsCarteNormale = (genre: SaisieCarteNormale['gender']) => championnats[genre];
export const clubsCarteNormale = (genre: SaisieCarteNormale['gender']) => clubs[genre];

export function championnatCarteNormale(carte: SaisieCarteNormale) {
  const possibles = championnats[carte.gender].filter(c => c.nom === carte.championnat);
  return possibles.find(c => c.pays === carte.pays) ?? possibles[0];
}

export function choisirChampionnatCarte(carte: SaisieCarteNormale, id: string): SaisieCarteNormale {
  const competition = championnats[carte.gender].find(c => c.id === id);
  if (!competition) return id ? carte : { ...carte, clubReel: '', championnat: '', pays: '' };
  return { ...carte, championnat: competition.nom, pays: competition.pays,
    clubReel: competition.clubs.some(c => c.nom === carte.clubReel) ? carte.clubReel : '' };
}

export function choisirClubCarte(carte: SaisieCarteNormale, id: string): SaisieCarteNormale {
  const entree = clubs[carte.gender].find(c => c.id === id);
  if (!entree) return id ? carte : { ...carte, clubReel: '' };
  return { ...carte, clubReel: entree.club.nom, championnat: entree.competition.nom, pays: entree.competition.pays };
}

export function changerGenreCarte(carte: SaisieCarteNormale, gender: SaisieCarteNormale['gender']): SaisieCarteNormale {
  return carte.gender === gender ? carte : { ...carte, gender, clubReel: '', championnat: '', pays: '' };
}
