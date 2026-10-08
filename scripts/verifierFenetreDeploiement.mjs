// Lecture seule : aucun nom de club, compte ou secret n'est affiché.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manque : fenêtre de déploiement non vérifiée.');
const sql = neon(process.env.DATABASE_URL);
const [fenetre] = await sql`
  with rencontres as (
    select r from carriere_ligues l
    cross join lateral jsonb_array_elements(coalesce(l.donnees->'rencontres', '[]'::jsonb)) r
    where l.donnees->>'phase' not in ('salon', 'terminee')
  )
  select now() as verifie_le,
    count(*) filter (where r->'match' is not null
      and coalesce((r->'match'->>'termine')::boolean, false) = false
      and r->'resultat' is null) as matchs_en_cours,
    min(to_timestamp((r->'match'->>'debut')::double precision / 1000)) filter (where r->'match' is not null
      and coalesce((r->'match'->>'termine')::boolean, false) = false and r->'resultat' is null) as premier_debut,
    max(to_timestamp((r->'match'->>'debut')::double precision / 1000)) filter (where r->'match' is not null
      and coalesce((r->'match'->>'termine')::boolean, false) = false and r->'resultat' is null) as dernier_debut,
    min((r->>'ferme')::timestamptz) filter (where r->'match' is null
      and r->'resultat' is null and (r->>'ferme')::timestamptz > now()) as prochain_coup_envoi
  from rencontres`;
const enCours = Number(fenetre.matchs_en_cours);
const prochain = fenetre.prochain_coup_envoi ? Date.parse(fenetre.prochain_coup_envoi) : Infinity;
const libre = enCours === 0 && prochain - Date.parse(fenetre.verifie_le) >= 15 * 60_000;
console.log(JSON.stringify({ verifieLe: fenetre.verifie_le, matchsEnCours: enCours,
  premierDebut: fenetre.premier_debut, dernierDebut: fenetre.dernier_debut,
  prochainCoupEnvoi: fenetre.prochain_coup_envoi, fenetreLibre: libre }, null, 2));
if (!libre) process.exitCode = 2;
