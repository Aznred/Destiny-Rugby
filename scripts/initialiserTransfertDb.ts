// Initialise les pages sans toucher aux parties. Une ligue modifiée entre la
// lecture et l'écriture est ignorée ; son prochain enregistrement l'initialise.
import { neon } from '@neondatabase/serverless';
import { encoderTransfert, assemblerTransfert, decoderBloc } from '../serveur/transfertCarriere';
import assert from 'node:assert/strict';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque');
const sql = neon(process.env.DATABASE_URL);
const ids = await sql`select id from carriere_ligues where transfert_version is distinct from version or transfert_manifest is null`;
for (const { id } of ids) {
  const [r] = await sql`select version,donnees from carriere_ligues where id=${id}`;
  if (!r) continue;
  const { manifest, blocs } = encoderTransfert(r.donnees);
  const decoded = new Map(blocs.map(b => [b.empreinte, decoderBloc(b)]));
  assert.deepEqual(assemblerTransfert(manifest, (_cle, hash) => decoded.get(hash)), r.donnees);
  const resultat = await sql`with cible as (
    update carriere_ligues set transfert_version=version,transfert_manifest=${JSON.stringify(manifest)}::jsonb
    where id=${id} and version=${r.version} returning id
  ), pages as (
    insert into carriere_transfert_blocs(ligue,cle,empreinte,contenu)
    select c.id,b.cle,b.empreinte,b.contenu from cible c
    cross join jsonb_to_recordset(${JSON.stringify(blocs)}::jsonb) b(cle text,empreinte text,contenu text)
    on conflict(ligue,cle) do update set empreinte=excluded.empreinte,contenu=excluded.contenu
    where carriere_transfert_blocs.empreinte is distinct from excluded.empreinte returning ligue
  ) select id from cible`;
  const brut = Buffer.byteLength(JSON.stringify(r.donnees));
  const compact = Buffer.byteLength(JSON.stringify({ manifest, blocs }));
  console.log(JSON.stringify({ ligue: id, initialisee: resultat.length === 1, brut, compact, reductionPourcent: +(100 * (1 - compact / brut)).toFixed(1), pages: blocs.length }));
}
