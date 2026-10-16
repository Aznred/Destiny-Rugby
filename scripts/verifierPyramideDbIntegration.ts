// Préparation du déploiement : tables/index ajoutés, requêtes d'essai annulées par savepoint.
// Aucun compte, club, calendrier, résultat ou solde existant n'est modifié.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { pyramideSql } from '../serveur/pyramideStockage.js';
import type { LigueStockee } from '../serveur/carriereStockage.js';

async function verifier() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque.');
  const sql = neon(process.env.DATABASE_URL);
  const [dernier] = await sql`select max((resume->'publique'->>'cycle')::integer) as cycle
    from carriere_ligues where resume ? 'publique'`;
  const cycle = Number(dernier?.cycle ?? 0), depot = pyramideSql(sql);
  const bilan = await depot.bilan(cycle); // Installation idempotente, sans toucher aux états de ligue.
  const compteAbsent = randomUUID();
  await Promise.all([
    depot.ouverte(cycle), depot.prochainIndice(cycle), depot.aInitialiser(cycle, 1), depot.aClore(cycle, 1),
    depot.duCompte(cycle, compteAbsent), depot.classement(cycle, compteAbsent, 1), depot.plan(cycle + 1), depot.manquants(cycle + 1, 1),
  ]);

  const requetes: ReturnType<typeof sql>[] = [];
  const capturer = async (textes: TemplateStringsArray, ...valeurs: unknown[]) => {
    requetes.push(sql(textes, ...valeurs));
    return [];
  };
  const essai = pyramideSql(capturer), cycleEssai = -(Date.now() % 1_000_000_000) - 1;
  const id = randomUUID(), compte = randomUUID(), cle = 'verification-deploiement:' + randomUUID(), jeton = randomUUID();
  const ligne = { id, code: 'VERIFICATION-ANNULEE', version: 1, comptes: [compte], etat: {
    version: 1, saison: 1, publique: { cycle: cycleEssai, division: 10, poule: 1 },
    clubs: [{ id: 'verification:' + id, compteId: compte, nom: 'Validation SQL temporaire' }],
    cartes: [], rencontres: [], competitions: [],
  } } as unknown as LigueStockee;
  await essai.verrou(cle, jeton, Date.now(), 30_000);
  await essai.synchroniser(ligne);
  await essai.enregistrerPlan(cycleEssai, [{ division: 10, poule: 1, equipes: [] }]);
  await essai.manquants(cycleEssai, 1);
  await essai.terminer(cycleEssai);
  await essai.liberer(cle, jeton);
  const resultats = await sql.transaction([
    sql`savepoint verification_pyramide`, ...requetes,
    sql`select count(*)::integer as n from carriere_public_equipes where cycle=${cycleEssai}`,
    sql`rollback to savepoint verification_pyramide`,
  ]);
  assert.equal(Number(resultats.at(-2)?.[0]?.n), 1, 'La vraie requête de synchronisation a écrit la ligne temporaire.');
  const [controle] = await sql`select
    (select count(*) from carriere_public_equipes where cycle=${cycleEssai}) as equipes,
    (select count(*) from carriere_public_cycles where cycle=${cycleEssai}) as cycles,
    (select count(*) from carriere_public_plans where cycle=${cycleEssai}) as plans,
    (select count(*) from carriere_public_verrous where cle=${cle}) as verrous`;
  assert.ok(Object.values(controle).every(v => Number(v) === 0), 'Toutes les écritures de vérification sont annulées.');
  console.log(JSON.stringify({ ok: true, cycle, poulesExistantes: bilan.nombre, equipesExistantes: bilan.equipes,
    installation: 'Tables et index prêts', lectures: 'OK', ecrituresTransactionnelles: 'OK, annulées', etatsDeLigues: 'Aucune écriture' }));
}
void verifier().catch(e => {
  console.error(JSON.stringify({ ok: false, code: e?.code ?? e?.name ?? 'erreur', message: e?.message ?? 'Vérification impossible' }));
  process.exitCode = 1;
});
