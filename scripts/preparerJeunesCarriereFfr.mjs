import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { preparerVivierJeunesFfr, activerCarriereLocale } from './preparationJeunesFfr.mjs';
import { versionFfrValide, REFERENCE_JEUNES_FFR } from '../serveur/ffr/jeunesCarriere.ts';

// Prépare une nouvelle version privée à partir d'un import déjà vérifié ; ne réécrit jamais l'ancien snapshot.
const sourceVersion = process.argv[2] ?? '2026_10_FFR_FULL';
const version = process.argv[3] ?? '2026_10_FFR_CAREER34';
if (!versionFfrValide(sourceVersion) || !versionFfrValide(version) || sourceVersion === version) throw new Error('Versions de vivier invalides.');
const sourceRoot = resolve('.ffr', sourceVersion), root = resolve('.ffr', version);
const source = resolve(sourceRoot, 'sources.sqlite'), cible = resolve(root, 'sources.sqlite');
const reprendre = process.argv.includes('--reprendre') && existsSync(cible) && !existsSync(resolve(root,'report.json'));
if (!existsSync(source) || (existsSync(cible) && !reprendre)) throw new Error('Source absente ou version déjà préparée. Choisir une nouvelle version.');
// Le fichier principal seul suffit uniquement après un checkpoint complet de l'import.
if (existsSync(`${source}-wal`) && statSync(`${source}-wal`).size > 0) throw new Error('Terminer le checkpoint du snapshot source avant de le copier.');
const rapportSource = JSON.parse(readFileSync(resolve(sourceRoot, 'report.json'), 'utf8'));
mkdirSync(root, {recursive:true});if (!reprendre) copyFileSync(source, cible);
const db = new DatabaseSync(cible);
try {
  db.exec('DROP TABLE IF EXISTS career_youth_sources');
  db.prepare("DELETE FROM meta WHERE key='career_youth_report'").run();
  const career_youth = preparerVivierJeunesFfr(db, rapportSource.career_youth?.referenceDate ?? REFERENCE_JEUNES_FFR);
  const report = {...rapportSource,version,derived_from:sourceVersion,career_youth,created_at:new Date().toISOString()};
  db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('report',JSON.stringify(report));
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  writeFileSync(resolve(root,'report.json'),JSON.stringify(report,null,2),{mode:0o600});
  writeFileSync(resolve(root,'career-youth-report.json'),JSON.stringify(career_youth,null,2),{mode:0o600});
  for (const fichier of ['academies.json','catalogue-before.json','withdrawn-sources.json']) {
    if (existsSync(resolve(sourceRoot,fichier))) copyFileSync(resolve(sourceRoot,fichier),resolve(root,fichier));
  }
  if (process.argv.includes('--activer-carriere-locale')) activerCarriereLocale(version, career_youth);
  process.stdout.write(JSON.stringify({version,...career_youth},null,2)+'\n');
} finally { db.close(); }
