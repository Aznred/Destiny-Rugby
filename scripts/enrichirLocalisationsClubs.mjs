// Sources officielles : export FFR fourni, adresses LNR et Base Adresse Nationale.
// Aucun nom de club n'est utilisé pour deviner sa commune.
import fs from 'node:fs';
const ffrPath = fs.existsSync('../photos/effectifs_ffr_enrichis.json') ? '../photos/effectifs_ffr_enrichis.json' : '../effectifs_ffr.json';
const ffr = JSON.parse(fs.readFileSync(ffrPath, 'utf8'));
const decode = s => s.replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '').trim();
const fichiers = [
  ['Stade Toulousain', 'top14', 'toulouse'], ['Union Bordeaux Bègles', 'top14', 'bordeaux-begles'],
  ['Stade Rochelais', 'top14', 'la-rochelle'], ['Stade Français Paris', 'top14', 'paris'],
  ['Racing 92', 'top14', 'racing-92'], ['RC Toulon', 'top14', 'toulon'], ['Castres Olympique', 'top14', 'castres'],
  ['ASM Clermont Auvergne', 'top14', 'clermont'], ['Section Paloise', 'top14', 'pau'], ['USA Perpignan', 'top14', 'perpignan'],
  ['Lyon OU', 'top14', 'lyon'], ['Montpellier HR', 'top14', 'montpellier'], ['Aviron Bayonnais', 'top14', 'bayonne'], ['RC Vannes', 'top14', 'vannes'],
  ['US Montauban', 'prod2', 'montauban'], ['US Colomiers', 'prod2', 'colomiers'], ['Provence Rugby', 'prod2', 'provence-rugby'],
  ['US Oyonnax', 'prod2', 'oyonnax'], ['Valence Romans Drôme Rugby', 'prod2', 'valence-romans'], ['CA Brive', 'prod2', 'brive'],
  ['SU Agen', 'prod2', 'agen'], ['FC Grenoble', 'prod2', 'grenoble'], ['Soyaux Angoulême XV', 'prod2', 'angouleme'],
  ['Biarritz Olympique', 'prod2', 'biarritz'], ['US Dax', 'prod2', 'dax'], ['AS Béziers Hérault', 'prod2', 'beziers'],
  ['USON Nevers', 'prod2', 'nevers'], ['Stade Aurillacois', 'prod2', 'aurillac'], ['Stade Niçois', 'prod2', 'nice'], ['RC Narbonne', 'prod2', 'narbonne'],
];
const parStructure = Object.fromEntries(ffr.clubs.map(c => [c.structure_id, { sourceLocalisation: c.url, precisionLieu: 'commune', statutGeographique: 'nonVerifie' }]));
const parNom = process.argv.includes('--reprendre') && fs.existsSync('sources/data/localisations-clubs.json') ? JSON.parse(fs.readFileSync('sources/data/localisations-clubs.json','utf8')).parNom : {};
const erreurs = [];
async function charger(url) { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw Error(`${r.status} ${url}`); return r; }
async function geocoder(nom, url, stade, adresse) {
  const propre = adresse.replace(/(?<=\D)(\d{5})(?=\D|$)/g, ' $1 ').replace(/\s+/g,' ').trim();
  const postal = propre.match(/\b\d{5}\b/)?.[0];
  let sourceCoordonnees = 'https://api-adresse.data.gouv.fr/search/?q='+encodeURIComponent(propre)+'&limit=1';
  let p = (await (await charger(sourceCoordonnees)).json()).features?.[0];
  let valide = p && p.properties.score >= .75 && ['housenumber', 'street'].includes(p.properties.type)
    && (!postal || p.properties.postcode === postal);
  // Reprendre la rue et la commune textuelles de l'adresse officielle, sans inventer une ville.
  if(!valide && postal){
    const index = propre.indexOf(postal);
    const villeAdresse = propre.slice(index+5).split(/\d{5}|\s+-\s+/)[0].replace(/CEDEX\s*\d*/gi,'').trim();
    const rue = propre.slice(0,index).replace(stade,'').replace(/^,\s*/, '').replace(/[,\s-]+$/,'').trim();
    const q = rue+' '+villeAdresse;
    const source = 'https://api-adresse.data.gouv.fr/search/?q='+encodeURIComponent(q)+'&limit=1';
    const candidat = (await (await charger(source)).json()).features?.[0];
    const cle = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/gi,'').toLowerCase();
    if(candidat && candidat.properties.score >= .85 && ['housenumber','street'].includes(candidat.properties.type)
      && cle(candidat.properties.city) === cle(villeAdresse)){ p=candidat; sourceCoordonnees=source; valide=true; }
  }
  const contexte = p?.properties.context?.split(',').map(s => s.trim());
  parNom[nom] = { stade, adresseStade: adresse, pays: 'France', sourceLocalisation: url, sourceCoordonnees,
    precisionLieu: 'stade', statutGeographique: valide ? 'verifie' : 'nonVerifie', verifieLe: valide ? new Date().toISOString().slice(0, 10) : undefined,
    ...(valide ? { ville: p.properties.city, codePostal: p.properties.postcode, departementNum: contexte?.[0], departement: contexte?.[1], region: contexte?.[2], latitude: p.geometry.coordinates[1], longitude: p.geometry.coordinates[0] } : {}),
  };
  if (!valide) erreurs.push({ nom, raison: 'Adresse à valider manuellement', adresse, score: p?.properties.score });
}
async function traiter([nom, site, slug]) {
  const url = `https://${site}.lnr.fr/club/${slug}/informations`;
  if(parNom[nom]?.statutGeographique === 'verifie') return;
  try {
    const html = await (await charger(url)).text();
    const bloc = html.slice(html.indexOf('club-stadium-infos'));
    const stade = decode(bloc.match(/club-info-field__content[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
    const adresse = decode(bloc.match(/Adresse du stade[\s\S]*?club-info-field__content[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '');
    if (!stade || !adresse) throw Error('Adresse du stade absente');
    await geocoder(nom, url, stade, adresse);
    console.log(`${nom} : ${parNom[nom].ville ?? 'à valider'} · ${parNom[nom].statutGeographique}`);
  } catch (e) { erreurs.push({ nom, url, raison: e.message }); }
}
for (let i = 0; i < fichiers.length; i += 3) await Promise.all(fichiers.slice(i, i + 3).map(traiter));
if(parNom['Stade Metropolitain']?.statutGeographique !== 'verifie') await geocoder('Stade Metropolitain', 'https://www.stade-metropolitain.fr/page/3283394-nos-stades', 'Stade Boiron-Granger', '51 rue Pierre Baratin 69100 Villeurbanne');
if(parNom['CA Brive']?.statutGeographique !== 'verifie') await geocoder('CA Brive',
  'https://cabrive-association.com/lassociation/contact/',
  'Stade Amédée-Domenech', '116 Avenue Du Dr Jean Dupuy 19100 Brive-la-Gaillarde');
if(parNom['RC Narbonne']?.statutGeographique !== 'verifie') await geocoder('RC Narbonne',
  'https://www.rcnm.com/', 'Parc des Sports et de l’Amitié', 'Avenue Pierre de Coubertin 11100 Narbonne');
// Le club officiel indique plusieurs terrains seniors des deux côtés de la frontière.
// Son siège est à Grand-Lancy ; ne pas certifier un stade principal sans validation.
parNom['Servette RC de Genève'] = { ville: 'Grand-Lancy', pays: 'Suisse', region: 'Genève',
  stade: 'Plusieurs terrains seniors · à valider', adresseStade: 'Siège : Route des Jeunes 10, 1212 Grand-Lancy',
  sourceLocalisation: 'https://www.servetterc.ch/stades', precisionLieu: 'fallback', statutGeographique: 'nonVerifie' };
fs.writeFileSync('sources/data/localisations-clubs.json', JSON.stringify({ sourceFfr: ffr.source, parStructure, parNom, erreurs: erreurs.filter(e => parNom[e.nom]?.statutGeographique !== 'verifie') }, null, 2));
fs.writeFileSync('src/data/localisationsClubs.generated.ts', `// Généré par scripts/enrichirLocalisationsClubs.mjs. Sources dans sources/data/localisations-clubs.json.\nimport type { LocalisationClub } from '../lib/localisationClub.js';\nexport const SOURCES_FFR: Record<number, Partial<LocalisationClub>> = ${JSON.stringify(parStructure)};\nexport const LOCALISATIONS_OFFICIELLES: Record<string, Partial<LocalisationClub>> = ${JSON.stringify(parNom, null, 2)};\n`);
console.log(`${Object.keys(parStructure).length} sources FFR, ${Object.keys(parNom).length} stades, ${Object.values(parNom).filter(c => c.statutGeographique !== 'verifie').length} cas à vérifier.`);
