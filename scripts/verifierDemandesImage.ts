// BANC « MON IMAGE » — npx vite-node scripts/verifierDemandesImage.ts
//
// Ce qu'il tient : une demande mal formée est refusée ; rien ne s'applique avant une décision ; la liste publique ne
// contient que l'accepté, et la DERNIÈRE décision l'emporte pour un même joueur ; le portrait proposé ne sort jamais dans
// une liste ; un portrait refusé ou en attente n'est pas servi ; le plafond de demandes en attente tient.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stockageFichier } from '../serveur/carriereFichier';
import { DEMANDES_EN_ATTENTE_MAX, IMAGE_DEMANDE_MAX, cleJoueurImage, imagesDepuisDemandes, validerDemandeImage } from '../src/lib/demandesImage';
import { choixImage, definirChoixImages, photoReelle } from '../src/lib/avatars';

let controles = 0, echecs = 0;
const ok = (condition: unknown, quoi: string) => { controles++; if (!condition) { echecs++; console.error('ÉCHEC :', quoi); } };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// ── La saisie ──
ok('erreur' in validerDemandeImage({ type: 'autre', joueur: 'Zoe Stratford' }), 'type inconnu refusé');
ok('erreur' in validerDemandeImage({ type: 'retrait', joueur: 'Zoe' }), 'un seul mot : refusé');
ok('erreur' in validerDemandeImage({ type: 'ajout', joueur: 'Zoe Stratford' }), 'ajout sans image refusé');
ok('erreur' in validerDemandeImage({ type: 'ajout', joueur: 'Zoe Stratford', image: 'https://exemple.org/a.png' }), 'ajout : une adresse n’est pas une image');
ok('erreur' in validerDemandeImage({ type: 'ajout', joueur: 'Zoe Stratford', image: 'data:image/svg+xml;base64,AAAA' }), 'ajout : SVG refusé');
ok('erreur' in validerDemandeImage({ type: 'ajout', joueur: 'Zoe Stratford', image: 'data:image/png;base64,' + 'A'.repeat(IMAGE_DEMANDE_MAX) }), 'ajout : image trop lourde refusée');
const propre = validerDemandeImage({ type: 'retrait', joueur: '  Zoe   STRATFORD ', club: 'x'.repeat(200), message: 'a\n\nb', image: PNG });
ok(!('erreur' in propre) && propre.joueur === 'Zoe STRATFORD' && propre.club.length === 80 && propre.message === 'a b' && propre.image === undefined, 'saisie nettoyée, image ignorée pour un retrait');
ok(cleJoueurImage('Zoé STRATFORD') === cleJoueurImage('stratford zoe'), 'clé : accents, casse et ordre indifférents');

// ── Le stockage ──
const dossier = mkdtempSync(join(tmpdir(), 'demandes-image-'));
try {
  const stockage = stockageFichier(join(dossier, 'base.json'));
  const d = stockage.demandesImage!;
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const saisie = (type: 'retrait' | 'ajout', joueur: string) => ({ type, joueur, club: '', message: '', ...(type === 'ajout' ? { image: PNG } : {}) });
  ok(await d.creer(A, id(1), saisie('retrait', 'Antoine DUPONT'), cleJoueurImage('Antoine DUPONT')), 'demande de retrait créée');
  ok(await d.creer(A, id(2), saisie('ajout', 'Ellie KILDUNNE'), cleJoueurImage('Ellie KILDUNNE')), 'demande d’ajout créée');
  ok((await d.miennes(A)).length === 2 && (await d.miennes(B)).length === 0, 'chacun ne voit que ses demandes');
  ok((await d.miennes(A)).every(x => !('image' in x)) && (await d.toutes(50)).every(x => !('image' in x)), 'le portrait proposé ne sort dans aucune liste');
  ok((await d.acceptees()).length === 0, 'rien d’accepté : la liste publique est vide');
  ok(await d.image(id(2), true) === null, 'un portrait en attente n’est pas servi au public');
  ok(await d.image(id(2), false) === PNG, 'le Labo lit le portrait proposé');
  ok(await d.image(id(1), false) === null, 'un retrait n’a pas d’image');

  ok((await d.decider(id(2), 'refusee', 'kiri'))?.statut === 'refusee', 'refus enregistré');
  ok(await d.image(id(2), true) === null && (await d.acceptees()).length === 0, 'un portrait refusé n’est ni servi ni listé');
  ok(await d.decider(id(99), 'acceptee', 'kiri') === null, 'décision sur une demande inconnue : rien');
  await d.decider(id(1), 'acceptee', 'kiri');
  await d.decider(id(2), 'acceptee', 'kiri');
  const publique = imagesDepuisDemandes(await d.acceptees(), x => `/img/${x}`);
  ok(publique.retirees.length === 1 && publique.retirees[0] === cleJoueurImage('Dupont Antoine'), 'liste publique : le retrait accepté');
  ok(publique.ajoutees[cleJoueurImage('Ellie Kildunne')] === `/img/${id(2)}` && publique.revision !== '', 'liste publique : le portrait accepté, révision posée');
  ok(await d.image(id(2), true) === PNG, 'un portrait accepté est servi');

  // La dernière décision l'emporte : Dupont propose ensuite un portrait, accepté.
  await new Promise(r => setTimeout(r, 5));
  await d.creer(B, id(3), saisie('ajout', 'DUPONT Antoine'), cleJoueurImage('DUPONT Antoine'));
  await d.decider(id(3), 'acceptee', 'kiri');
  const apres = imagesDepuisDemandes(await d.acceptees(), x => `/img/${x}`);
  ok(apres.retirees.length === 0 && apres.ajoutees[cleJoueurImage('Antoine Dupont')] === `/img/${id(3)}`, 'un ajout accepté après un retrait remet un portrait');
  await d.decider(id(3), 'attente', 'kiri');
  ok(imagesDepuisDemandes(await d.acceptees(), x => x).retirees.length === 1, 'remettre en attente défait la décision');

  // Le plafond de demandes en attente.
  let creees = 0;
  for (let n = 10; n < 10 + DEMANDES_EN_ATTENTE_MAX + 3; n++) if (await d.creer(B, id(n), saisie('retrait', `Joueur Numero${n}`), '')) creees++;
  ok(creees === DEMANDES_EN_ATTENTE_MAX - 1, `plafond : ${DEMANDES_EN_ATTENTE_MAX} demandes en attente au plus par compte (${creees} créées en plus de celle en attente)`);
} finally { rmSync(dossier, { recursive: true, force: true }); }

// ── L'application aux portraits ──
const avant = photoReelle('Antoine DUPONT');
ok(choixImage('Antoine DUPONT') === undefined, 'sans demande : aucun choix');
definirChoixImages([cleJoueurImage('Antoine Dupont')], { [cleJoueurImage('Ellie Kildunne')]: '/img/kildunne' });
ok(choixImage('DUPONT Antoine') === null && photoReelle('Antoine DUPONT') === undefined, 'portrait retiré : plus de photo');
ok(choixImage('Ellie KILDUNNE') === '/img/kildunne' && photoReelle('Ellie KILDUNNE') === '/img/kildunne', 'portrait proposé : il passe devant');
definirChoixImages([], {});
ok(photoReelle('Antoine DUPONT') === avant, 'liste vidée : le portrait d’origine revient');

console.log(`${controles - echecs}/${controles} contrôles`);
if (echecs) process.exitCode = 1;
