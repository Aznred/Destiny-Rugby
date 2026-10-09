// LE MONDE DU RUGBY FÉMININ → src/data/mondeFeminin.generated.ts
//
//   node scripts/genMondeFeminin.cjs
//
// Première pierre de la carrière solo féminine : les championnats, leurs clubs et leurs effectifs, dans la forme que le
// jeu sait lire (un club = un nom, un écusson, deux couleurs, une note ; un effectif = trente joueuses au moins).
//
// D'OÙ VIENNENT LES DONNÉES. `../Objectif Ffr/exports/feminines/cartes_feminines.json` : les joueuses réelles, notées
// (voir `noter_feminines.py`). Les écussons : `src/data/logosFeminins.generated.ts` (`copierLogosFeminins.cjs`).
// ⚠️ UN EFFECTIF RÉEL NE SUFFIT PAS TOUJOURS À JOUER : il faut deux joueuses par poste. Les places manquantes sont
// comblées par des joueuses GÉNÉRÉES (marquées `generee`), au nom tiré des prénoms et des noms de la même nation, notées
// sous le niveau du club. Elles ne remplacent jamais une joueuse réelle.
// Onze championnats jouables ; la Farah Palmer Cup réunit les douze provinces dans une ligue selon le format demandé.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const racine = path.resolve(__dirname, '..');
const cartes = JSON.parse(fs.readFileSync(path.resolve(racine, '../Objectif Ffr/exports/feminines/cartes_feminines.json'), 'utf8'));
const logos = Object.fromEntries([...fs.readFileSync(path.join(racine, 'src/data/logosFeminins.generated.ts'), 'utf8').matchAll(/^\s*("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),$/gm)]
  .map(m => [JSON.parse(m[1]), JSON.parse(m[2])]));
// Les équipes de ces unions et de Nancy portent le même écusson que le club déjà documenté dans nos ressources.
const LOGOS_PARTAGES = {
  'Canterbury Women': 'canterbury', 'Wellington Pride': 'wellington', 'Northland Women': 'northland',
  "Hawke's Bay Tui": 'hawkes_bay', 'Counties Manukau Heat': 'counties_manukau', 'North Harbour Hibiscus': 'north_harbour',
  'Tasman Women': 'tasman', 'Bay of Plenty Volcanix': 'bay_of_plenty', 'Nancy Seichamps Rugby': 'nancy_seichamps_rugby',
  'AS Bayonnaise': 'a_s_bayonnaise', 'CA Briviste Corrèze': 'brive', 'US Colomiers': 'colomiers',
};

// ── Les championnats (formats 2026-2027, d'après les règlements publiés ; `niveau` : estimation sur 100) ──
// `journees` : tours du calendrier ; `qualifies` : places en phase finale ; `finaleDirecte` : pas de demi-finales ;
// `descente` / `montee` : mouvements avec la division du même pays (`vers`).
const CHAMPIONNATS = [
  { id: 'f-pwr', nom: "Premiership Women's Rugby", pays: 'Angleterre', drapeau: 'gb-eng', niveau: 95, allerRetour: true, journees: 18, qualifies: 4,
    clubs: ['Bristol Bears Women', 'Exeter Chiefs Women', 'Gloucester-Hartpury', 'Harlequins Women', 'Leicester Tigers Women', 'Loughborough Lightning',
      'Sale Sharks Women', 'Saracens Women', 'Trailfinders Women'] },
  { id: 'f-aupiki', nom: 'Super Rugby Aupiki', pays: 'Nouvelle-Zélande', drapeau: 'nz', niveau: 92, allerRetour: true, journees: 6, qualifies: 2, finaleDirecte: true,
    clubs: ['Blues Women', 'Chiefs Manawa', 'Hurricanes Poua', 'Matatū'] },
  { id: 'f-elite1', nom: 'Élite 1 Féminine', pays: 'France', drapeau: 'fr', niveau: 89, france: true, allerRetour: true, journees: 18, qualifies: 4, descente: 1, vers: 'f-elite2',
    clubs: ['Stade Toulousain', 'Stade Bordelais', 'Blagnac Rugby Féminin', 'ASM Romagnat', 'FC Grenoble Amazones', 'Montpellier Hérault Rugby', 'LOU Rugby',
      'AC Bobigny 93', 'RC Toulon Provence Méditerranée', 'Stade Rochelais'] },
  { id: 'f-superw', nom: "Super Rugby Women's", pays: 'Australie', drapeau: 'au', niveau: 87, allerRetour: false, journees: 5, qualifies: 4,
    clubs: ['NSW Waratahs Women', 'Queensland Reds Women', 'ACT Brumbies Women', 'Western Force Women', 'Fijian Drua Women'] },
  // Farah Palmer Cup : les douze provinces dans une seule ligue (demande du 9 octobre), dans l'ordre du classement fourni.
  { id: 'f-fpc', nom: 'Farah Palmer Cup', pays: 'Nouvelle-Zélande', drapeau: 'nz', niveau: 85, allerRetour: false, journees: 11, qualifies: 4,
    clubs: ['Canterbury Women', 'Wellington Pride', 'Northland Women', 'Auckland Storm', 'Otago Spirit', 'Waikato Women',
      'Manawatū Cyclones', "Hawke's Bay Tui", 'Counties Manukau Heat', 'North Harbour Hibiscus', 'Tasman Women', 'Bay of Plenty Volcanix'] },
  { id: 'f-celtic', nom: 'Celtic Challenge', pays: 'Irlande · Écosse · Pays de Galles', drapeau: 'gb-sct', niveau: 82, allerRetour: true, journees: 10, qualifies: 4,
    clubs: ['Glasgow Warriors Women', 'Edinburgh Rugby Women', 'Wolfhounds', 'Clovers', 'Gwalia Lightning', 'Brython Thunder'] },
  { id: 'f-seriea', nom: 'Serie A Élite Femminile', pays: 'Italie', drapeau: 'it', niveau: 76, allerRetour: true, journees: 14, qualifies: 4, descente: 1,
    clubs: ['Valsugana Rugby Padova', 'Villorba Rugby', 'Benetton Rugby Femminile', 'Unione Rugby Capitolina', 'CUS Milano Rugby', 'CUS Torino', 'Volvera Rugby', 'Forum Iulii Rugby'] },
  { id: 'f-liga', nom: 'Liga Iberdrola', pays: 'Espagne', drapeau: 'es', niveau: 72, allerRetour: true, journees: 14, qualifies: 4, descente: 1,
    clubs: ['CRAT A Coruña', 'El Salvador', 'Rugby Majadahonda', 'CR Sant Cugat', 'Sevilla Cocos', 'Getxo Rugby', 'Rugby Turia', 'BUC Olímpico'] },
  { id: 'f-elite2', nom: 'Élite 2 Féminine', pays: 'France', drapeau: 'fr', niveau: 69, france: true, allerRetour: true, journees: 18, qualifies: 4, montee: 1, descente: 1, vers: 'f-elite1',
    clubs: ['Racing 92', 'Stade Français Paris', 'Lons Section Paloise Rugby Féminin', 'Valkyries Normandie Rugby Clubs', 'Stade Rennais Rugby', 'Nancy Seichamps Rugby',
      'Stade Villeneuvois Lille Métropole', 'AS Bayonnaise', 'CA Briviste Corrèze', 'US Colomiers'] },
  // All-Ireland League : deux divisions de six (calendrier officiel 2026-2027). La dernière de 1A joue un barrage contre la première de 1B.
  { id: 'f-ail', nom: "Women's All-Ireland League 1A", pays: 'Irlande', drapeau: 'ie', niveau: 67, allerRetour: true, journees: 10, qualifies: 4, barrage: 1, vers: 'f-ail2',
    clubs: ['Blackrock College RFC', 'Galwegians RFC', 'Old Belvedere RFC', 'Railway Union RFC', 'UL Bohemian RFC', 'Wicklow RFC'] },
  { id: 'f-ail2', nom: "Women's All-Ireland League 1B", pays: 'Irlande', drapeau: 'ie', niveau: 60, allerRetour: true, journees: 10, qualifies: 1, barrage: 1, vers: 'f-ail',
    clubs: ['Ballincollig RFC', 'Cooke RFC', 'Ennis RFC', 'Enniskillen RFC', 'MU Barnhall RFC', 'Tullow RFC'] },
];
// Les autres écritures d'un même club (listes de sélection, Wikipédia).
const ALIAS = {
  'Exeter Chiefs': 'Exeter Chiefs Women', 'Bristol Bears': 'Bristol Bears Women', 'Gloucester–Hartpury': 'Gloucester-Hartpury', 'Trailfinders': 'Trailfinders Women',
  'Leicester Tigers': 'Leicester Tigers Women', 'Harlequins': 'Harlequins Women', 'Saracens': 'Saracens Women', 'Sale Sharks': 'Sale Sharks Women',
  'Blagnac SC': 'Blagnac Rugby Féminin', 'Montpellier HR': 'Montpellier Hérault Rugby', 'Montpellier': 'Montpellier Hérault Rugby',
  'Queensland Reds': 'Queensland Reds Women', 'Western Force': 'Western Force Women', 'ACT Brumbies': 'ACT Brumbies Women', 'NSW Waratahs': 'NSW Waratahs Women',
  'Blackrock RFC / Leinster': 'Blackrock College RFC', 'Railway Union': 'Railway Union RFC', 'Old Belvedere': 'Old Belvedere RFC', 'UL Bohemian': 'UL Bohemian RFC',
  'Blackrock RFC': 'Blackrock College RFC', 'UL Bohemians': 'UL Bohemian RFC', 'Lyon OU': 'LOU Rugby', 'Section Paloise': 'Lons Section Paloise Rugby Féminin', 'Turia': 'Rugby Turia',
  'Fijiana Drua': 'Fijian Drua Women', 'Blues': 'Blues Women', 'Sant Cugat': 'CR Sant Cugat', 'Cocodrilas': 'Sevilla Cocos', 'Counties Manukau': 'Counties Manukau Heat', 'Edinburgh Rugby': 'Edinburgh Rugby Women', 'Glasgow Warriors': 'Glasgow Warriors Women',
  'Canterbury': 'Canterbury Women', 'Wellington': 'Wellington Pride', 'Northland': 'Northland Women', 'Auckland': 'Auckland Storm',
  'Otago': 'Otago Spirit', 'Waikato': 'Waikato Women', 'Manawatū': 'Manawatū Cyclones', 'Manawatu': 'Manawatū Cyclones',
  "Hawke's Bay": "Hawke's Bay Tui", 'North Harbour': 'North Harbour Hibiscus', 'Tasman': 'Tasman Women', 'Bay of Plenty': 'Bay of Plenty Volcanix',
  'Railway Union RFC': 'Railway Union RFC',
  'Getxo': 'Getxo Rugby', 'CRAT': 'CRAT A Coruña', 'Majadahonda': 'Rugby Majadahonda',
};
// `scrape_championnats.py` : ce que les sites des COMPÉTITIONS publient (clubs, écussons, noms des joueuses sans leur poste).
const fichierExtra = path.resolve(racine, '../Objectif Ffr/exports/feminines/championnats_extra.json');
const extra = fs.existsSync(fichierExtra) ? JSON.parse(fs.readFileSync(fichierExtra, 'utf8')) : {};
const NOMS_SERIE_A = { 'ARREDISSIMA VILLORBA RUGBY': 'Villorba Rugby', 'BENETTON RUGBY TREVISO SRL SSD': 'Benetton Rugby Femminile', 'CUS MILANO RUGBY ASD': 'CUS Milano Rugby',
  'CUS TORINO ASD': 'CUS Torino', 'FORUM IULII RUGBY F.C.ASD': 'Forum Iulii Rugby', 'UNIONE RUGBY CAPITOLINA ASD': 'Unione Rugby Capitolina',
  'VALSUGANA RUGBY PADOVA ASD': 'Valsugana Rugby Padova', 'VOLVERA RUGBY ASD': 'Volvera Rugby' };
const extraParClub = new Map(Object.entries(extra).flatMap(([ligue, clubs]) => clubs.map(c => [NOMS_SERIE_A[c.nom] ?? c.nom, { ...c, ligue }])));
const cleNom = nom => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').sort().join(' ');
const AVANTS = [0, 1, 2, 3, 4, 5, 6, 7], ARRIERES = [8, 9, 10, 11, 12, 13, 14];
/** L'écusson d'un club connu par le seul site de sa compétition : converti une fois vers public/logos/feminines. */
async function logoExtra(club) {
  if (!club) return undefined;
  const source = ['png', 'jpg', 'webp', 'gif', 'svg'].map(ext => path.resolve(racine, `../Objectif Ffr/exports/feminines/logos/${club.ligue}/${club.id}.${ext}`)).find(x => fs.existsSync(x));
  if (!source) return undefined;
  const cible = `/logos/feminines/${club.ligue}/${club.id}.png`;
  fs.mkdirSync(path.dirname(path.join(racine, 'public', cible)), { recursive: true });
  // Un écusson sur fond blanc opaque (JPEG) est laissé tel quel : `EcussonClub` le détoure à l'affichage.
  await sharp(source, source.endsWith('.svg') ? { density: 300 } : {}).trim().resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(racine, 'public', cible));
  return cible;
}
const championnatDuClub = new Map(CHAMPIONNATS.flatMap(c => c.clubs.map(nom => [nom, c])));

// ── Outils ──
const hache = texte => { let h = 2166136261; for (const c of texte) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const tirage = graine => { let a = hache(graine); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const POSTES = ['pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d', 'troisieme_aile_g', 'troisieme_aile_d', 'numero_8',
  'demi_melee', 'demi_ouverture', 'ailier_gauche', 'premier_centre', 'deuxieme_centre', 'ailier_droit', 'arriere'];
const NATION_DU_PAYS = { Angleterre: 'Angleterre', 'Nouvelle-Zélande': 'Nouvelle-Zélande', France: 'France', Australie: 'Australie', Italie: 'Italie', Espagne: 'Espagne', Irlande: 'Irlande' };
const NATION_DU_CLUB = { 'Fijian Drua Women': 'Fidji', Wolfhounds: 'Irlande', Clovers: 'Irlande', 'Gwalia Lightning': 'Pays de Galles', 'Brython Thunder': 'Pays de Galles',
  'Glasgow Warriors Women': 'Écosse', 'Edinburgh Rugby Women': 'Écosse' };

/** Deux couleurs lues sur l'écusson (les plus présentes parmi les teintes franches), sinon tirées du nom. */
async function couleurs(nom) {
  const logo = logos[nom];
  const secours = () => { const h = hache(nom) % 360; return [`hsl(${h} 58% 34%)`, `hsl(${(h + 150) % 360} 45% 62%)`]; };
  if (!logo) return secours();
  const { data } = await sharp(path.join(racine, 'public', logo)).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const comptes = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]], max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max > 235 && min > 215) continue;   // le blanc d'un fond ou d'un lettrage n'est pas une couleur de club
    const cle = [r, g, b].map(v => Math.round(v / 32) * 32).join(',');
    comptes.set(cle, (comptes.get(cle) ?? 0) + (max - min > 50 ? 3 : 1));
  }
  const rangs = [...comptes].sort((a, b) => b[1] - a[1]).map(([cle]) => cle.split(',').map(Number));
  if (!rangs.length) return secours();
  const loin = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 120;
  const premiere = rangs[0], seconde = rangs.find(c => loin(c, premiere)) ?? (premiere[0] + premiere[1] + premiere[2] > 380 ? [20, 24, 30] : [240, 240, 236]);
  const hex = c => '#' + c.map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
  return [hex(premiere), hex(seconde)];
}

(async () => {
  // Les joueuses réelles, club par club.
  const parClub = new Map();
  const sansClub = new Map();
  for (const c of cartes) {
    const affiliations = texte => (texte ?? '').split(/\s*\/\s*/).map(n => ALIAS[n] ?? n).filter(n => championnatDuClub.has(n));
    const club = affiliations(c.club)[0];
    const rattaches = new Set(club ? [club] : []);
    // Double affiliation documentée : franchise Aupiki et province FPC, ou Celtic Challenge et club All-Ireland.
    // Une liste ancienne ne ramène pas une joueuse dans un club quitté : seules ces doubles inscriptions sont admises.
    for (const autre of affiliations(c.club_selection)) {
      const paire = [club && championnatDuClub.get(club).id, championnatDuClub.get(autre).id];
      const doubleInscription = paire.includes('f-aupiki') && paire.includes('f-fpc')
        || paire.includes('f-celtic') && paire.some(id => id === 'f-ail' || id === 'f-ail2');
      if (!club || doubleInscription) rattaches.add(autre);
    }
    if (!rattaches.size) { sansClub.set(c.club, (sansClub.get(c.club) ?? 0) + 1); continue; }
    for (const nom of rattaches) {
      if (!parClub.has(nom)) parClub.set(nom, []);
      if (!parClub.get(nom).some(j => cleNom(j.nom) === cleNom(c.nom))) parClub.get(nom).push(c);
    }
  }
  // Prénoms et noms par nation, pour nommer les joueuses générées.
  const prenoms = new Map(), noms = new Map();
  for (const c of cartes) {
    const morceaux = c.nom.split(' '), prenom = morceaux.filter(m => m !== m.toUpperCase() || m.length < 2).join(' '), nom = morceaux.filter(m => m === m.toUpperCase() && m.length > 1).join(' ');
    if (!prenom || !nom) continue;
    for (const [table, valeur] of [[prenoms, prenom], [noms, nom]]) { if (!table.has(c.nation)) table.set(c.nation, new Set()); table.get(c.nation).add(valeur); }
  }

  const lignes = [], competitions = [];
  let reelles = 0, generees = 0;
  for (const championnat of CHAMPIONNATS) {
    const clubs = [];
    for (const nomClub of championnat.clubs) {
      const rng = tirage(nomClub), nation = NATION_DU_CLUB[nomClub] ?? NATION_DU_PAYS[championnat.pays] ?? 'France';
      // Deux joueuses par poste au moins ; au plus quarante-deux, les mieux notées, sans vider un poste.
      // Une joueuse connue par deux sources (son club et sa sélection) n'entre qu'une fois : sa meilleure fiche.
      const vues = new Set();
      const toutes = (parClub.get(nomClub) ?? []).filter(c => POSTES.includes(c.poste)).sort((a, b) => b.note - a.note).filter(c => !vues.has(c.nom) && vues.add(c.nom));
      const gardees = [];
      for (const poste of POSTES) gardees.push(...toutes.filter(c => c.poste === poste).slice(0, 2));
      for (const c of toutes) if (gardees.length < 42 && !gardees.includes(c)) gardees.push(c);
      const notes = gardees.map(c => c.note).sort((a, b) => a - b);
      // Le niveau d'un club sans effectif connu : celui de son championnat, étalonné sur les clubs réels (PWR 95 → 85, Élite 1 89 → 80, Élite 2 69 → 64).
      const connu = extraParClub.get(nomClub);
      if (connu && !logos[nomClub]) { const logo = await logoExtra(connu); if (logo) logos[nomClub] = logo; }
      if (!logos[nomClub] && LOGOS_PARTAGES[nomClub]) {
        const logo = `/logos/${LOGOS_PARTAGES[nomClub]}.png`;
        if (fs.existsSync(path.join(racine, 'public', logo))) logos[nomClub] = logo;
      }
      // Un club dont on connaît le rang (Farah Palmer Cup) : la première d'une division vaut deux points de plus que la quatrième.
      const rang = connu?.rang ? (6.5 - connu.rang) * .7 : 0;
      const plancher = notes.length >= 8 ? notes[Math.floor(notes.length * .25)] : Math.round(championnat.niveau * .8 + 9 + rang);
      const effectif = gardees.map(c => ({ nom: c.nom, poste: c.poste, age: Math.min(42, Math.max(17, c.age ?? 20 + Math.floor(rng() * 10))), note: c.note, potentiel: Math.max(c.note, c.potentiel), nation: c.nation, photo: c.photo_jeu ?? '', generee: false }));
      const pris = new Set(effectif.map(j => j.nom));
      // Les joueuses RÉELLES que le site de la compétition nomme sans dire leur poste : elles entrent avec un poste ESTIMÉ
      // (le moins fourni de leur ligne, avants ou arrières ; de tous les postes quand la ligne n'est pas dite) et une note du niveau du club.
      const deja = new Set(effectif.map(j => cleNom(j.nom)));
      for (const j of connu?.joueuses ?? []) {
        if (effectif.length >= 38 || deja.has(cleNom(j.nom))) continue;
        deja.add(cleNom(j.nom)); pris.add(j.nom);
        const choix = j.ligne === 'avant' ? AVANTS : j.ligne === 'arriere' ? ARRIERES : [...AVANTS, ...ARRIERES];
        const poste = POSTES[[...choix].sort((a, b) => effectif.filter(x => x.poste === POSTES[a]).length - effectif.filter(x => x.poste === POSTES[b]).length || a - b)[0]];
        const age = Math.min(42, Math.max(17, j.age ?? 19 + Math.floor(rng() * 12))), note = Math.max(40, Math.min(88, Math.round(plancher + 1 - rng() * 6)));
        effectif.push({ nom: j.nom, poste, age, note, potentiel: Math.min(95, note + (age < 23 ? 4 + Math.floor(rng() * 5) : age < 27 ? 2 : 0)), nation, photo: '', generee: false, estimee: true });
      }
      for (const poste of POSTES) {
        while (effectif.filter(j => j.poste === poste).length < 2) {
          const P = [...(prenoms.get(nation) ?? prenoms.get('France'))], N = [...(noms.get(nation) ?? noms.get('France'))];
          let nom; do nom = `${P[Math.floor(rng() * P.length)]} ${N[Math.floor(rng() * N.length)]}`; while (pris.has(nom));
          pris.add(nom);
          const age = 19 + Math.floor(rng() * 12), note = Math.max(40, Math.min(88, Math.round(plancher - 2 - rng() * 6)));
          effectif.push({ nom, poste, age, note, potentiel: Math.min(95, note + (age < 23 ? 4 + Math.floor(rng() * 6) : age < 27 ? 2 : 0)), nation, photo: '', generee: true });
        }
      }
      // Quarante-quatre au plus : on retire les moins bien notées des postes les plus fournis, jamais sous deux par poste.
      while (effectif.length > 44) {
        const fournis = POSTES.map(p => effectif.filter(j => j.poste === p)).sort((a, b) => b.length - a.length)[0];
        effectif.splice(effectif.indexOf(fournis.sort((a, b) => a.note - b.note)[0]), 1);
      }
      reelles += effectif.filter(j => !j.generee).length; generees += effectif.filter(j => j.generee).length;
      // La note du club : la moyenne de ses vingt-trois meilleures.
      const xv = effectif.map(j => j.note).sort((a, b) => b - a).slice(0, 23), note = Math.round(xv.reduce((a, b) => a + b, 0) / xv.length);
      const [c1, c2] = await couleurs(nomClub);
      clubs.push({ nom: nomClub, note, ...(logos[nomClub] ? { logo: logos[nomClub] } : {}), c1, c2, reelles: effectif.filter(j => !j.generee).length });
      lignes.push(`  ${JSON.stringify(nomClub)}: [\n${effectif.sort((a, b) => POSTES.indexOf(a.poste) - POSTES.indexOf(b.poste) || b.note - a.note)
        .map(j => `    ${JSON.stringify([j.nom, POSTES.indexOf(j.poste), j.age, j.note, j.potentiel, j.nation, j.photo, j.generee ? 1 : j.estimee ? 2 : 0].join('|'))},`).join('\n')}\n  ],`);
    }
    const { clubs: _c, ...format } = championnat;
    competitions.push({ ...format, jouable: clubs.length >= 4, clubs: clubs.sort((a, b) => b.note - a.note) });
  }

  const sortie = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Régénérer avec : node scripts/genMondeFeminin.cjs  (table des championnats et de leurs formats : dans ce script)
//
// LE MONDE DU RUGBY FÉMININ : championnats, clubs, effectifs. Les joueuses réelles viennent des cartes notées
// (\`../Objectif Ffr\`) ; une joueuse \`generee\` comble un poste que l'effectif connu laissait vide.
// ⚠️ Un championnat \`jouable: false\` est déclaré avec son format mais sans clubs : ses données manquent encore.

import type { PosteId } from '../types.js';

export interface ClubFeminin { nom: string; note: number; logo?: string; c1: string; c2: string; /** Joueuses réelles de l'effectif (les autres sont générées). */ reelles: number }
export interface ChampionnatFeminin {
  id: string; nom: string; pays: string; drapeau: string;
  /** Niveau estimé du championnat, sur 100. */
  niveau: number;
  /** Division de la pyramide française (montées et descentes entre elles). */
  france?: boolean;
  allerRetour: boolean;
  /** Tours du calendrier de la saison régulière. */
  journees: number;
  /** Places en phase finale ; \`finaleDirecte\` : les deux premières jouent la finale, sans demi-finales. */
  qualifies: number; finaleDirecte?: boolean;
  montee?: number; descente?: number; barrage?: number; vers?: string;
  /** Faux : format connu, clubs et effectifs manquants. */
  jouable: boolean;
  clubs: ClubFeminin[];
}
export interface JoueuseMonde {
  nom: string; poste: PosteId; age: number; note: number; potentiel: number; nation: string; photo?: string;
  /** Joueuse inventée pour combler un poste. */
  generee: boolean;
  /** Joueuse réelle dont le site ne dit ni le poste ni le niveau : poste et note estimés. */
  posteEstime?: boolean;
}

export const CHAMPIONNATS_FEMININS: ChampionnatFeminin[] = ${JSON.stringify(competitions, null, 2)};

const POSTES: PosteId[] = ${JSON.stringify(POSTES)};
const BRUT: Record<string, string[]> = {
${lignes.join('\n')}
};

const cache = new Map<string, JoueuseMonde[]>();
/** L'effectif d'un club féminin (décodé une fois), ou \`undefined\` si le club n'est pas de ce monde. */
export function effectifFeminin(club: string): JoueuseMonde[] | undefined {
  const connu = cache.get(club);
  if (connu) return connu;
  const brut = BRUT[club];
  if (!brut) return undefined;
  const liste = brut.map((ligne): JoueuseMonde => {
    const [nom, poste, age, note, potentiel, nation, photo, generee] = ligne.split('|');
    return { nom, poste: POSTES[+poste], age: +age, note: +note, potentiel: +potentiel, nation, ...(photo ? { photo } : {}), generee: generee === '1', ...(generee === '2' ? { posteEstime: true } : {}) };
  });
  cache.set(club, liste);
  return liste;
}
export const CLUBS_FEMININS: string[] = Object.keys(BRUT);
`;
  fs.writeFileSync(path.join(racine, 'src/data/mondeFeminin.generated.ts'), sortie);
  const jouables = competitions.filter(c => c.jouable);
  console.log(`${competitions.length} championnats (${jouables.length} jouables), ${jouables.reduce((n, c) => n + c.clubs.length, 0)} clubs, ${reelles} joueuses réelles, ${generees} générées`);
  for (const c of competitions) console.log(`  ${c.nom.padEnd(28)} ${String(c.clubs.length).padStart(2)} clubs  ${c.clubs.map(k => `${k.nom} ${k.note} (${k.reelles})`).join(' · ')}`);
  const oubliees = [...sansClub].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  console.log(`cartes hors de ces clubs : ${[...sansClub.values()].reduce((a, b) => a + b, 0)} (${oubliees.slice(0, 8).map(([k, n]) => `${k} ${n}`).join(', ')}…)`);
})().catch(erreur => { console.error(erreur); process.exitCode = 1; });
