import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS } from '../src/data/amateurs.js';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels.js';
const normaliserNomFfr = (nom: string) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const root = process.cwd();
const source = path.resolve(process.argv[2] ?? '../photos-detourees');
const donnees = JSON.parse(fs.readFileSync(path.resolve('../photos/effectifs_ffr_enrichis.json'), 'utf8'));
const structures: Record<string, number> = {
  'as-macon': 1237, 'cm-floirac': 1129, 'cs-annonay': 1094,
  'cs-bourgoin-jallieu': 71, 'cs-vienne': 1273, 'ol-marcquois-rugby': 324,
  'rc-aubenas-vals': 481, 'rc-auch': 3056, 'rc-massy-essonne': 53,
  'rc-suresnes': 688, 'rennes-ec': 1258, 'rugby-club-orleans': 1457,
  'saint-jean-de-luz-olympique': 238, 'sc-albi': 49, 'servette-rc': 2812,
  'so-chambery': 488, 'stade-langonnais': 1505, 'stade-metropolitain': 3217,
  'stade-montois': 45, 'stade-nantais': 2508, 'us-carcassonne': 63,
  'us-marmande': 165, 'us-seynoise': 1085,
};
const clubsJeu = Object.values(CLUBS_AMATEURS).flat();
const signature = (nom: string) => normaliserNomFfr(nom).split(' ').sort().join('|');
const bilan: any[] = [];
const parClub: Record<string, Record<string, string>> = {};
const parId: Record<number, string> = {};
const supplements: Record<string, Record<string, { nom: string; photo: string }>> = {};
const indexGlobal = new Map<string, Set<string>>();
for (const nom of [...Object.values(EFFECTIFS_REELS).flat().map(j => j.nom), ...Object.values(EFFECTIFS_AMATEURS).flatMap(e => e.split('~').map(j => j.split('|')[0]))]) {
  const cle = signature(nom); const noms = indexGlobal.get(cle) ?? new Set(); noms.add(nom); indexGlobal.set(cle, noms);
}
const nettoyer = (f: string) => path.basename(f, path.extname(f)).replace(/^\d+[_ -]+/, '')
  .replace(/(?:^|\s)(?:\d[eè]me ligne(?: aile| centre)?|demi d['’]ouverture|demi de m[eê]l[eé]e|ouvreur|talonneur|ailier|arri[eè]re|centre)(?=\s|$)/gi, ' ')
  .replace(/([a-zà-ÿ])([A-ZÀ-Ý]{2})/g, '$1 $2').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const rapproche = (a: string, b: string) => {
  const x = normaliserNomFfr(a), y = normaliserNomFfr(b);
  if (signature(x) === signature(y) || x.replaceAll(' ', '') === y.replaceAll(' ', '')) return true;
  const mots = x.split(' '), autres = y.split(' ');
  return mots.length >= 2 && mots.every(m => autres.includes(m));
};
for (const [dossier, structureId] of Object.entries(structures)) {
  const club = clubsJeu.find(c => c.structureId === structureId);
  const ffr = donnees.clubs.find((c: any) => c.structure_id === structureId);
  const fichiers = fs.readdirSync(path.join(source, dossier)).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  if (!club || !ffr) throw new Error(`Club non reconnu : ${dossier}`);
  const noms = [...new Set([...(EFFECTIFS_AMATEURS[club.nom] ?? '').split('~').filter(Boolean).map(e => e.split('|')[0]), ...(EFFECTIFS_REELS[club.nom] ?? []).map(j => j.nom)])];
  const rapport: any = { dossier, club: club.nom, images: fichiers.length, correspondances: 0, ajouts: [] };
  for (const fichier of fichiers) {
    let nom = nettoyer(fichier);
    const id = Number(fichier.match(/^(\d+)[_ -]/)?.[1]);
    const joueur = ffr.joueurs.find((j: any) => j.id === id);
    if (joueur) nom = `${joueur.prenom} ${joueur.nom}`;
    const candidats = noms.filter(n => rapproche(nom, n) || (nom === 'MAZZELLA' && normaliserNomFfr(n).split(' ').includes('mazzella')));
    const identites = new Set(candidats.map(signature));
    if (identites.size > 1 && (ffr.joueurs.filter((j: any) => rapproche(nom, `${j.prenom} ${j.nom}`)).length > 1 || (EFFECTIFS_REELS[club.nom] ?? []).filter(j => rapproche(nom, j.nom)).length > 1)) throw new Error(`Portrait ambigu : ${dossier}/${fichier} : ${candidats.join(', ')}`);
    const connus = candidats.length ? candidats : [...(indexGlobal.get(signature(nom)) ?? [])];
    const canonique = connus[0] ?? nom;
    const nomSortie = `${path.basename(fichier, path.extname(fichier))}.webp`;
    const destination = path.join(root, 'public/photos/detourees', dossier, nomSortie);
    const url = `/photos/detourees/${encodeURIComponent(dossier)}/${encodeURIComponent(nomSortie)}`;
    if (!process.argv.includes('--analyse')) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      await sharp(path.join(source, dossier, fichier)).rotate().resize({ width: 512, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 95 }).toFile(destination);
    }
    const photos = parClub[club.nom] ??= {};
    for (const n of new Set([nom, canonique, ...connus])) photos[normaliserNomFfr(n)] = url;
    const licences = ffr.joueurs.filter((j: any) => rapproche(canonique, `${j.prenom} ${j.nom}`));
    if (joueur) parId[joueur.id] = url;
    else if (licences.length === 1) parId[licences[0].id] = url;
    if (candidats.length) rapport.correspondances++;
    else {
      (supplements[club.nom] ??= {})[normaliserNomFfr(canonique)] = { nom: canonique, photo: url };
      rapport.ajouts.push({ fichier, nom: canonique });
    }
  }
  bilan.push(rapport);
  console.log(`${club.nom} : ${fichiers.length} portraits, ${rapport.ajouts.length} nouveaux profils`);
}
fs.writeFileSync(path.join(root, 'scripts/bilanPhotosDetourees.json'), JSON.stringify(bilan, null, 2) + '\n');
if (!process.argv.includes('--analyse')) fs.writeFileSync(path.join(root, 'src/data/photosDetourees.ts'),
  '// Généré par scripts/importerPhotosDetourees.ts. Les portraits détourés remplacent les anciennes versions.\n' +
  'export const PHOTOS_DETOUREES_PAR_CLUB: Record<string, Record<string, string>> = ' + JSON.stringify(parClub, null, 2) + ';\n' +
  'export const PHOTOS_DETOUREES_PAR_ID: Record<number, string> = ' + JSON.stringify(parId, null, 2) + ';\n' +
  'export const JOUEURS_DETOURES_SUPPLEMENTAIRES: Record<string, Record<string, { nom: string; photo: string }>> = ' + JSON.stringify(supplements, null, 2) + ';\n');
