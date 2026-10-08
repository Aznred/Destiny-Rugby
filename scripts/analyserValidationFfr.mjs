// QUI PEUT ÊTRE VALIDÉ DANS LA BASE JOUEURS — une SIMULATION, en lecture seule (Correctif 33).
//
// Demande : « validation des profils fiables encore en attente, mais exclusion des données anonymes et aucune donnée
// inventée ». Ce script ne valide RIEN : il lit la base privée locale (`.ffr/<version>/sources.sqlite`), range les
// profils seniors encore en attente selon ce qui les retient, et écrit un plan chiffré à côté. Il ne touche ni la base
// de production, ni les cartes, ni le catalogue — la validation elle-même reste une décision à prendre sur ces chiffres.
//
// Ce qu'il compte :
//   A. validables tels quels   — seniors complets (club, compétition, poste, trois matchs récents, identité de licence),
//                                sans homonyme : seule la décision manque ;
//   B. même personne, 2 sources — retenus UNIQUEMENT parce que leur nom apparaît aussi dans l'autre source
//                                (licence + relevé de feuilles de match), au MÊME club : ce n'est pas un homonyme ;
//   C. poste connu ailleurs     — complets sauf le poste, que l'autre source donne pour le même nom au même club ;
//   D. homonymes à trancher     — plusieurs licences sous le même nom : jamais fusionnés automatiquement ;
//   E. identités à exclure      — sans prénom, réduites à une initiale, ou sans numéro de licence (un nom lu sur une
//                                feuille de match ne suffit pas à désigner une personne) ;
//   F. données insuffisantes    — pas de club, de compétition reconnue ou de matchs récents : rien n'est inventé pour eux.
//
// Lancer : node --loader ./scripts/chargeurTypeScript.mjs scripts/analyserValidationFfr.mjs [version]
//          (ou : node scripts/analyserValidationFfr.mjs — il n'importe aucun module du jeu)
import { DatabaseSync } from 'node:sqlite';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2] ?? '2026_10_FFR_FULL';
if (!/^[A-Za-z0-9_]{3,60}$/.test(version)) throw new Error('Version invalide.');
const racine = resolve('.ffr', version), chemin = resolve(racine, 'sources.sqlite');
if (!existsSync(chemin)) throw new Error(`Base privée introuvable : ${chemin}`);
const db = new DatabaseSync(chemin, { readOnly: true });

const normaliser = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const GENERIQUES = new Set(['rugby', 'rc', 'us', 'as', 'cs', 'club', 'fc', 'stade', 'union', 'sporting', 'olympique', 'athletic', 'xv', 'de', 'du', 'la', 'le', 'les', 'l', 'd', 'et', 'a', 's', 'c', 'u', 'o', 'r', 'sc', 'ca', 'so', 'ac', 'uso', 'usa']);
const motsClub = (club) => normaliser(club).split(' ').filter((m) => m.length > 2 && !GENERIQUES.has(m));
/** Deux écritures du même club : l'une contient l'autre, ou elles partagent leur mot le plus long. */
function memeClub(a, b) {
  const na = normaliser(a), nb = normaliser(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ma = motsClub(a), mb = motsClub(b);
  if (!ma.length || !mb.length) return false;
  const long = [...ma].sort((x, y) => y.length - x.length)[0];
  return long.length >= 5 && mb.includes(long);
}

const compte = { total: 0, enAttente: 0, A: { male: 0, female: 0 }, B: { male: 0, female: 0 }, C: { male: 0, female: 0 }, D: 0, E: { sansPrenom: 0, initiale: 0, sansLicence: 0 }, F: 0, jeunesse: 0 };
const postesA = {}, postesB = {};
const parNom = db.prepare('SELECT id, usage, card_status, club, position, duplicate, data FROM sources WHERE identity_key = ?');

// Par pages : une lecture en flux ne supporte pas qu'une autre requête tourne pendant qu'elle avance.
const page = db.prepare("SELECT id, identity_key, gender, usage, card_status, club, position, duplicate, review, data FROM sources WHERE id > ? ORDER BY id LIMIT 5000");
function* toutes() { let apres = ''; for (;;) { const lignes = page.all(apres); if (!lignes.length) return; yield* lignes; apres = lignes[lignes.length - 1].id; } }
for (const ligne of toutes()) {
  compte.total++;
  if (ligne.review !== 'PENDING') continue;
  compte.enAttente++;
  if (ligne.usage === 'YOUTH_REGEN_SOURCE') { compte.jeunesse++; continue; }
  const p = JSON.parse(ligne.data);
  const prenom = String(p.raw?.first_name ?? '').trim();
  // E — l'identité ne désigne pas une personne.
  if (!prenom) { compte.E.sansPrenom++; continue; }
  if (prenom.replace(/\./g, '').length <= 1) { compte.E.initiale++; continue; }
  if (!p.raw?.ffr_id) { compte.E.sansLicence++; continue; }
  if (ligne.usage !== 'MALE_SENIOR_CARD' && ligne.usage !== 'FEMALE_SENIOR_CARD') { compte.F++; continue; }
  const raisons = (p.reasons ?? []).filter((r) => r !== 'MISSING_POSITION');
  // F — il manque une preuve sportive : on n'invente ni club, ni niveau, ni matchs.
  if (raisons.length || p.overall === null || !p.club || !p.competition) { compte.F++; continue; }
  const sansPoste = !p.primary_position;
  if (!ligne.duplicate && !sansPoste) { compte.A[ligne.gender]++; postesA[p.primary_position] = (postesA[p.primary_position] ?? 0) + 1; continue; }
  // Les autres lignes qui portent ce nom.
  const autres = parNom.all(ligne.identity_key).filter((a) => a.id !== ligne.id);
  const licences = autres.filter((a) => a.id.startsWith('ffr_'));
  if (licences.length) { compte.D++; continue; } // plusieurs licences sous ce nom : à trancher à la main
  const memes = autres.filter((a) => memeClub(a.club, ligne.club));
  if (autres.length && memes.length !== autres.length) { compte.D++; continue; } // même nom dans un autre club : homonyme possible
  if (!sansPoste) { compte.B[ligne.gender]++; postesB[p.primary_position] = (postesB[p.primary_position] ?? 0) + 1; continue; }
  const postes = new Set(memes.map((a) => a.position).filter(Boolean));
  if (postes.size === 1) compte.C[ligne.gender]++; else compte.F++;
}
db.close();

const plan = {
  version, calcule_le: new Date().toISOString(), lecture_seule: true,
  profils: compte.total, en_attente: compte.enAttente, jeunesse_jamais_validee: compte.jeunesse,
  A_validables_tels_quels: compte.A, B_meme_personne_deux_sources: compte.B, C_poste_connu_par_l_autre_source: compte.C,
  D_homonymes_a_trancher: compte.D, E_identites_a_exclure: compte.E, F_donnees_insuffisantes: compte.F,
  postes_A: postesA, postes_B: postesB,
};
writeFileSync(resolve(racine, 'validation-plan.json'), JSON.stringify(plan, null, 2), { mode: 0o600 });
console.log(JSON.stringify(plan, null, 2));
console.log(`\nPlan écrit dans ${resolve(racine, 'validation-plan.json')} (dossier privé, hors du dépôt). Rien n'a été validé.`);
