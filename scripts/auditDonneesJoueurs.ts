// AUDIT DES DONNÉES JOUEURS — script de comparaison AVANT migration (Correctif 24, points 16 à 19)
//
// Demande : « Certains joueurs étaient correctement renseignés avant mais se retrouvent maintenant à un autre poste. […]
// Ne pas automatiquement considérer la dernière importation comme correcte. Comparer les données historiques de la DB de
// Ligue, les JSON de joueurs et les données actuellement en DB. […] Créer un script de comparaison avant migration. »
//
// ⚠️ CE SCRIPT NE MODIFIE RIEN. Il lit, compare, et écrit un rapport.
//
// Trois sources de RÉFÉRENCE possibles, toutes comparées au catalogue que le jeu construit aujourd'hui :
//
//   --reference=<photo.json>   une photographie du catalogue prise à un commit plus ancien (voir --exporter) ;
//   --ligues=<carriere.json>   les cartes DISTRIBUÉES dans des ligues (fichier du stockage local, ou une copie d'avant) ;
//   --neon                     les cartes distribuées en production (DATABASE_URL, LECTURE SEULE). La requête ne rapatrie
//                              que sept champs par carte, regroupés par variante : quelques Mo au plus, une fois.
//
// Et sans référence, ce que le catalogue courant dit de lui-même : homonymes fusionnés sous un même identifiant, portraits
// dont le fichier n'existe pas, portraits partagés par deux identifiants.
//
//   npx vite-node scripts/auditDonneesJoueurs.ts -- --exporter=photo-aujourdhui.json
//   npx vite-node scripts/auditDonneesJoueurs.ts -- --reference=photo-avant.json --rapport=audit.md
//   npx vite-node scripts/auditDonneesJoueurs.ts -- --ligues=node_modules/.destiny/carriere.json
//   npx vite-node scripts/auditDonneesJoueurs.ts -- --neon --rapport=audit-production.md
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { EFFECTIFS_AMATEURS } from '../src/data/amateurs';
import { POSTE_PAR_ID } from '../src/data/rugby';
import type { PosteId } from '../src/types';

/** Ce qu'on compare d'un joueur : son identité, jamais sa note. */
interface Identite { sourceId: string; nom: string; poste: string; secondaires: string[]; club: string; ligue: string; photo?: string; origine?: string; n?: number; ou?: string }

const option = (nom: string) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const drapeau = (nom: string) => process.argv.includes(`--${nom}`);
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const famille = (poste: string) => POSTE_PAR_ID[poste as PosteId]?.famille ?? poste;

function catalogueCourant(): Identite[] {
  return catalogueBaseCarriere().map((s) => ({ sourceId: s.sourceId, nom: s.nom, poste: s.poste, secondaires: [...(s.postesSecondaires ?? [])],
    club: s.clubReel, ligue: s.championnat, photo: s.photo, origine: s.origine }));
}

// ── Photographie ────────────────────────────────────────────────────────────
const sortie = option('exporter');
if (sortie) {
  const photo = catalogueCourant();
  writeFileSync(sortie, JSON.stringify(photo));
  console.log(`${photo.length} joueurs photographiés dans ${sortie}`);
  process.exit(0);
}

// ── La référence ────────────────────────────────────────────────────────────
async function lireReference(): Promise<{ nom: string; identites: Identite[] } | null> {
  const fichier = option('reference');
  if (fichier) return { nom: `photographie ${fichier}`, identites: JSON.parse(readFileSync(fichier, 'utf8')) as Identite[] };
  const ligues = option('ligues');
  if (ligues) {
    const base = JSON.parse(readFileSync(ligues, 'utf8')) as { ligues: { etat: { nom: string; cartes: Record<string, unknown>[] } }[] };
    const variantes = new Map<string, Identite>();
    for (const l of base.ligues) for (const c of l.etat.cartes) {
      if (c.speciale) continue;
      const i: Identite = { sourceId: String(c.sourceId), nom: String(c.nom), poste: String(c.poste), secondaires: (c.postesSecondaires as string[] | undefined) ?? [],
        club: String(c.clubReel), ligue: String(c.championnat), photo: c.photo as string | undefined, n: 1, ou: l.etat.nom };
      const cle = JSON.stringify([i.sourceId, i.nom, i.poste, i.secondaires, i.club, i.ligue, i.photo]);
      const deja = variantes.get(cle);
      if (deja) deja.n = (deja.n ?? 1) + 1; else variantes.set(cle, i);
    }
    return { nom: `cartes distribuées de ${ligues} (${base.ligues.length} ligues)`, identites: [...variantes.values()] };
  }
  if (drapeau('neon')) {
    const url = process.env.DATABASE_URL;
    if (!url) { console.error('DATABASE_URL manquant : `--neon` lit la base de production, en lecture seule.'); process.exit(1); }
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    // ⚠️ SEPT CHAMPS PAR CARTE, REGROUPÉS DANS POSTGRES : l'état des ligues (400 Ko pièce) ne traverse jamais le réseau.
    const lignes = await sql`
      select c->>'sourceId' as source, c->>'nom' as nom, c->>'poste' as poste, coalesce(c->'postesSecondaires', '[]'::jsonb) as secondaires,
             c->>'clubReel' as club, c->>'championnat' as ligue, c->>'photo' as photo, count(*)::int as n
      from carriere_ligues l, jsonb_array_elements(l.donnees->'cartes') c
      where c->'speciale' is null
      group by 1, 2, 3, 4, 5, 6, 7`;
    return { nom: 'cartes distribuées en production', identites: lignes.map((r) => ({ sourceId: String(r.source), nom: String(r.nom), poste: String(r.poste),
      secondaires: r.secondaires as string[], club: String(r.club), ligue: String(r.ligue), photo: r.photo == null ? undefined : String(r.photo), n: Number(r.n) })) };
  }
  return null;
}

const courant = catalogueCourant();
const parId = new Map(courant.map((i) => [i.sourceId, i]));
const lignes: string[] = [];
const dire = (s = '') => { lignes.push(s); console.log(s); };
const exemples = <T>(liste: T[], n: number, f: (x: T) => string) => { for (const x of liste.slice(0, n)) dire(`  · ${f(x)}`); if (liste.length > n) dire(`  … et ${liste.length - n} autres (détail dans le fichier JSON)`); };
const detail: Record<string, unknown> = {};

dire(`# Audit des données joueurs — ${new Date().toISOString().slice(0, 10)}`);
dire();
dire(`Catalogue courant : ${courant.length} joueurs.`);

// ── 1. Ce que le catalogue dit de lui-même ──────────────────────────────────
{
  dire();
  dire('## 1. Le catalogue courant, sans référence');
  // Homonymes : un identifiant = un nom normalisé. Deux personnes du même nom dans deux clubs n'en font qu'une, et c'est
  // la mieux notée qui donne son poste, son club et sa photo.
  const porteurs = new Map<string, { club: string; famille: string; pro: boolean }[]>();
  const noter = (nom: string, club: string, fam: string, pro: boolean) => {
    const id = `reel:${normaliser(nom)}`;
    const liste = porteurs.get(id) ?? [];
    if (!liste.some((p) => p.club === club)) liste.push({ club, famille: fam, pro });
    porteurs.set(id, liste);
  };
  for (const [club, effectif] of Object.entries(EFFECTIFS_REELS)) for (const j of effectif) noter(j.nom, club, String(j.poste), true);
  for (const [club, texte] of Object.entries(EFFECTIFS_AMATEURS)) for (const entree of String(texte).split('~').filter(Boolean)) noter(entree.split('|')[0], club, '', false);
  const fusions = [...porteurs.entries()].filter(([, p]) => p.length > 1).map(([id, p]) => ({ id, retenu: parId.get(id), porteurs: p }));
  const melanges = fusions.filter((f) => f.porteurs.some((p) => p.pro) && f.porteurs.some((p) => !p.pro));
  dire(`- ${fusions.length} identifiants portés par des joueurs de plusieurs clubs (transfert… ou homonymes fusionnés), dont ${melanges.length} mêlent un professionnel et un licencié amateur.`);
  exemples(melanges, 8, (f) => `${f.id} → retenu : ${f.retenu?.nom} (${f.retenu?.poste}, ${f.retenu?.club}) ; présents : ${f.porteurs.map((p) => p.club).join(', ')}`);
  detail.homonymes = fusions;

  // Portraits : un chemin local doit exister ; un portrait ne devrait servir qu'à un joueur.
  const racine = existsSync('public') ? 'public' : '';
  const locaux = courant.filter((i) => i.photo?.startsWith('/'));
  const casses = racine ? locaux.filter((i) => !existsSync(racine + decodeURI(i.photo!.split('?')[0]))) : [];
  const sansPhoto = courant.filter((i) => !i.photo);
  dire(`- Portraits : ${courant.length - sansPhoto.length} joueurs en ont un (${locaux.length} fichiers locaux, ${courant.length - sansPhoto.length - locaux.length} adresses distantes), ${sansPhoto.length} n'en ont pas.`);
  dire(`- ${casses.length} chemins locaux ne mènent à aucun fichier.`);
  exemples(casses, 8, (i) => `${i.nom} (${i.club}) → ${i.photo}`);
  const parPhoto = new Map<string, Identite[]>();
  for (const i of courant) if (i.photo) parPhoto.set(i.photo, [...(parPhoto.get(i.photo) ?? []), i]);
  const partages = [...parPhoto.entries()].filter(([, l]) => l.length > 1);
  dire(`- ${partages.length} portraits servent à plusieurs identifiants (doublon de joueur, ou portrait mal attribué).`);
  exemples(partages, 8, ([photo, l]) => `${photo} → ${l.map((i) => `${i.nom} (${i.club})`).join(' ; ')}`);
  detail.portraitsCasses = casses; detail.portraitsPartages = partages.map(([photo, l]) => ({ photo, joueurs: l }));
}

// ── 2. Contre la référence ──────────────────────────────────────────────────
const reference = await lireReference();
if (reference) {
  dire();
  dire(`## 2. Référence : ${reference.nom}`);
  const joueurs = new Set(reference.identites.map((i) => i.sourceId));
  dire(`${reference.identites.length} variantes pour ${joueurs.size} joueurs.`);

  // Une même carte écrite de deux façons dans deux ligues : la preuve qu'un import a réécrit les unes et pas les autres.
  const parJoueur = new Map<string, Identite[]>();
  for (const i of reference.identites) parJoueur.set(i.sourceId, [...(parJoueur.get(i.sourceId) ?? []), i]);
  const derives = [...parJoueur.entries()].filter(([, v]) => new Set(v.map((i) => i.poste)).size > 1 || new Set(v.map((i) => i.photo ?? '')).size > 1);
  if (derives.length) {
    dire(`- ${derives.length} joueurs existent sous plusieurs formes DANS la référence (poste ou portrait différent d'une ligue à l'autre).`);
    exemples(derives, 8, ([id, v]) => `${id} : ${v.map((i) => `${i.poste}${i.photo ? '' : ' sans portrait'} ×${i.n ?? 1}`).join(' | ')}`);
    detail.derives = derives.map(([id, v]) => ({ id, variantes: v }));
  }

  const disparus: Identite[] = [], famillesChangees: { avant: Identite; apres: Identite }[] = [], postesChanges: typeof famillesChangees = [];
  const secondaires: typeof famillesChangees = [], clubs: typeof famillesChangees = [], liguesChangees: typeof famillesChangees = [], noms: typeof famillesChangees = [];
  const photosPerdues: typeof famillesChangees = [], photosChangees: typeof famillesChangees = [];
  const vus = new Set<string>();
  for (const avant of reference.identites) {
    const apres = parId.get(avant.sourceId);
    if (!apres) { if (!vus.has(avant.sourceId)) disparus.push(avant); vus.add(avant.sourceId); continue; }
    const cle = `${avant.sourceId}|${avant.poste}|${avant.photo ?? ''}|${avant.club}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    if (famille(avant.poste) !== famille(apres.poste)) famillesChangees.push({ avant, apres });
    else if (avant.poste !== apres.poste) postesChanges.push({ avant, apres });
    if ([...avant.secondaires].sort().join() !== [...apres.secondaires].sort().join()) secondaires.push({ avant, apres });
    if (avant.club !== apres.club) clubs.push({ avant, apres });
    if (avant.ligue !== apres.ligue) liguesChangees.push({ avant, apres });
    if (avant.nom !== apres.nom) noms.push({ avant, apres });
    if (avant.photo && !apres.photo) photosPerdues.push({ avant, apres });
    else if (avant.photo && apres.photo && avant.photo !== apres.photo) photosChangees.push({ avant, apres });
  }
  const ligne = (x: { avant: Identite; apres: Identite }, f: (i: Identite) => string) => `${x.avant.nom} (${x.apres.club}) : ${f(x.avant)} → ${f(x.apres)}`;

  dire();
  dire(`### Identifiants`);
  // Un identifiant disparu a peut-être seulement changé d'écriture : même club et nom voisin, ou même portrait.
  const parClub = new Map<string, Identite[]>();
  for (const i of courant) parClub.set(i.club, [...(parClub.get(i.club) ?? []), i]);
  const parPhotoCourante = new Map(courant.filter((i) => i.photo).map((i) => [i.photo!, i]));
  const mots = (s: string) => new Set(normaliser(s).split(' ').filter((m) => m.length > 2));
  const renommes = disparus.map((d) => {
    const memePhoto = d.photo ? parPhotoCourante.get(d.photo) : undefined;
    const m = mots(d.nom);
    const voisin = (parClub.get(d.club) ?? []).find((c) => { const n = mots(c.nom); const communs = [...m].filter((x) => n.has(x)).length; return communs >= Math.max(1, Math.min(m.size, n.size) - 0) && communs >= 1 && famille(c.poste) === famille(d.poste); });
    return { avant: d, apres: memePhoto ?? voisin, par: memePhoto ? 'portrait' : voisin ? 'club et nom' : undefined };
  });
  const retrouves = renommes.filter((r) => r.apres);
  dire(`- ${disparus.length} identifiants de la référence n'existent plus dans le catalogue (les cartes déjà distribuées gardent leurs données, mais ne suivent plus rien).`);
  dire(`  dont ${retrouves.length} semblent seulement RENOMMÉS (même portrait, ou même club et nom voisin) : leur identité a changé, donc image, poste et cartes ne suivent plus.`);
  exemples(retrouves, 10, (r) => `${r.avant.sourceId} → ${r.apres!.sourceId} (par ${r.par})`);
  dire(`- ${noms.length} joueurs ont changé d'écriture de nom sans changer d'identifiant.`);

  dire();
  dire('### Postes');
  const pros = (l: { apres: Identite }[]) => l.filter((x) => x.apres.origine === 'professionnel');
  dire(`- ${famillesChangees.length} joueurs ont changé de FAMILLE de poste (pilier → ailier…), dont ${pros(famillesChangees).length} professionnels : à vérifier un par un.`);
  exemples([...pros(famillesChangees), ...famillesChangees.filter((x) => x.apres.origine !== 'professionnel')], 30, (x) => `[${x.apres.origine === 'professionnel' ? 'pro' : 'FFR'}] ${ligne(x, (i) => i.poste)}`);
  dire(`- ${postesChanges.length} ont changé de poste dans la même famille (ailier gauche → ailier droit…), dont ${pros(postesChanges).length} professionnels.`);
  dire(`- ${secondaires.length} ont des postes secondaires différents.`);

  dire();
  dire('### Portraits');
  dire(`- ${photosPerdues.length} joueurs AVAIENT un portrait et n'en ont plus, dont ${pros(photosPerdues).length} professionnels.`);
  exemples(photosPerdues, 25, (x) => `${x.avant.nom} (${x.apres.club}) : ${x.avant.photo}`);
  dire(`- ${photosChangees.length} ont un autre portrait qu'avant.`);

  dire();
  dire('### Clubs et championnats (un transfert est normal : pour information)');
  dire(`- ${clubs.length} joueurs ont changé de club, ${liguesChangees.length} de championnat.`);

  Object.assign(detail, { disparus, renommes: retrouves, famillesChangees, postesChanges, secondaires, photosPerdues, photosChangees, clubs, noms });
}

const rapport = option('rapport');
if (rapport) {
  writeFileSync(rapport, lignes.join('\n') + '\n');
  writeFileSync(rapport.replace(/\.md$/, '') + '.json', JSON.stringify(detail));
  console.log(`\nRapport : ${rapport} (détail : ${rapport.replace(/\.md$/, '')}.json)`);
}
