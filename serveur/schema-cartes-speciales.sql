-- Cartes spéciales (ICONS, Halloween, événements suivants).
--
-- Les DÉFINITIONS (GEN, COL, dates, poids, publication, événements, pack
-- Halloween) vivent dans `carriere_catalogue_admin.donnees -> 'speciales'`,
-- sous la même révision que le reste de l'Atelier : une modification du Labo
-- se propage à toutes les ligues à leur prochaine actualisation, sans
-- migration. Les IMAGES ont leur propre table : le catalogue ne garde qu'une
-- URL versionnée (`/api/carriere?imageSpeciale=<id>&v=<version>`).
--
-- Création automatique à la première image enregistrée par Kiri ; ce script
-- n'est utile que pour préparer la base à la main.
create table if not exists carriere_cartes_speciales_images (
  id text primary key,
  version integer not null,
  donnees text not null,
  maj timestamptz not null default now()
);
alter table carriere_cartes_speciales_images enable row level security;
