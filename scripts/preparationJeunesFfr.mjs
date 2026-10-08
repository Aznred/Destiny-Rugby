import { sourceJeuneCarriere, exclusionJeuneCarriere, REFERENCE_JEUNES_FFR } from '../serveur/ffr/jeunesCarriere.ts';
import { normaliserFfr } from '../serveur/ffr/classification.ts';
import { CLUBS_AMATEURS, CLUBS_REGIONAUX } from '../src/data/amateurs.ts';
import { LOCALISATIONS_OFFICIELLES } from '../src/data/localisationsClubs.generated.ts';
import { COMPETITIONS } from '../src/data/clubs.ts';
import { cleClub } from '../src/lib/cleClub.ts';
import { writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

/** Métadonnées publiques non nominatives ; le contenu du snapshot reste dans .ffr. */
export function activerCarriereLocale(version, rapport) {
  const metadata = resolve('src/data/versionJeunesFfr.generated.ts');
  const fichierTemporaire = `${metadata}.tmp`;
  writeFileSync(fichierTemporaire, `// Généré : version du vivier privé, aucune identité ni licence.\nexport const VERSION_JEUNES_FFR = ${JSON.stringify(version)};\nexport const DATE_REFERENCE_JEUNES_FFR = ${JSON.stringify(rapport.referenceDate)};\nexport const TOTAL_JEUNES_FFR = ${rapport.usable};\n`);
  renameSync(fichierTemporaire, metadata);
  const pointeur = resolve('.ffr', 'active-career-dataset.json');
  writeFileSync(`${pointeur}.tmp`, JSON.stringify({version}), {mode:0o600});
  renameSync(`${pointeur}.tmp`, pointeur);
}

/** Ne recopie que les informations nécessaires au monde privé de carrière. */
export function preparerVivierJeunesFfr(db, referenceDate = REFERENCE_JEUNES_FFR) {
  const clubsCanoniques = new Map();
  for (const competition of COMPETITIONS) for (const club of competition.clubs) {
    const cle = cleClub(club.nom);
    const ancien = clubsCanoniques.get(cle);
    clubsCanoniques.set(cle, ancien && ancien.nom !== club.nom ? {ambigu:true} : ancien ?? {...club,niveauDivision:competition.niveau});
  }
  const geographie = new Map();
  for (const club of [...Object.values(CLUBS_AMATEURS).flat(), ...Object.values(CLUBS_REGIONAUX).flat()]) {
    geographie.set(normaliserFfr(club.nom), { region: club.ligue, latitude: club.latitude, longitude: club.longitude });
  }
  for (const [nom, lieu] of Object.entries(LOCALISATIONS_OFFICIELLES)) geographie.set(normaliserFfr(nom), {
    ...geographie.get(normaliserFfr(nom)), region: lieu.region, latitude: lieu.latitude, longitude: lieu.longitude,
  });
  db.exec(`CREATE TABLE IF NOT EXISTS career_youth_sources(id TEXT PRIMARY KEY,club TEXT NOT NULL,age INTEGER NOT NULL,position TEXT NOT NULL,data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS career_youth_club ON career_youth_sources(club,id);`);
  // Une nouvelle version seulement : pas de remplacement silencieux d'un snapshot déjà préparé.
  if (db.prepare('SELECT count(*) n FROM career_youth_sources').get().n) throw new Error('Le vivier de cette version existe déjà. Préparer une nouvelle version.');
  const inserer = db.prepare('INSERT INTO career_youth_sources VALUES(?,?,?,?,?)');
  const candidats = db.prepare("SELECT id,data FROM sources WHERE id>? AND (usage='YOUTH_REGEN_SOURCE' OR json_extract(data,'$.senior_status')='espoir') ORDER BY id LIMIT 1000");
  const rapport = { referenceDate, candidates: 0, usable: 0, estimatedAges: 0, excluded: {}, knownPositions: 0, knownAges: 0 };
  db.exec('BEGIN');
  try {
    let apres = '';
    for (;;) {
      const page = candidats.all(apres);
      if (!page.length) break;
      for (const row of page) {
        const profil = JSON.parse(row.data);
        rapport.candidates++;
        if (profil.primary_position) rapport.knownPositions++;
        if (profil.age !== null) rapport.knownAges++;
        const motif = exclusionJeuneCarriere(profil, referenceDate);
        if (motif) { rapport.excluded[motif] = (rapport.excluded[motif] ?? 0) + 1; continue; }
        const joueur = sourceJeuneCarriere(profil, referenceDate);
        const canonique = clubsCanoniques.get(cleClub(joueur.clubSource));
        if (canonique && !canonique.ambigu) {
          if (canonique.nom !== joueur.clubSource) joueur.clubLibelleSource = joueur.clubSource;
          joueur.clubSource = canonique.nom;
          joueur.niveauDivision = canonique.niveauDivision;
        }
        Object.assign(joueur, geographie.get(normaliserFfr(joueur.clubSource)) ?? {});
        inserer.run(joueur.id, joueur.clubSource, joueur.age, joueur.poste, JSON.stringify(joueur));
        rapport.usable++;
        if (joueur.ageEstime) rapport.estimatedAges++;
      }
      apres = page.at(-1).id;
    }
    db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('career_youth_report', JSON.stringify(rapport));
    db.exec('COMMIT');
  } catch (erreur) { db.exec('ROLLBACK'); throw erreur; }
  return rapport;
}
