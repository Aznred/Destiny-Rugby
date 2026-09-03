// Deux pistes : vendre un joueur (manager), prolonger à l'infini (joueur).
import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => { if (!ok) ko++; console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(54)} ${detail}`); };
const store = useGame.getState();

console.log('\n═══ A. VENDRE UN JOUEUR (mode entraîneur) ═══\n');
{
  store.reinitialiser();
  store.creerManager?.({
    nom: 'Vendeur', nation: 'France', age: 40, club: 'Pierrefeucain', division: 'reg3',
  } as never);
  let m = useGame.getState().manager;
  if (!m) { // certaines versions passent par signerBanc
    store.signerBanc?.('Pierrefeucain');
    m = useGame.getState().manager;
  }
  if (!m?.club) { console.log('  (impossible de créer un manager — API inconnue)'); }
  else {
    const groupe = effectifDuClub(m.club, m.saison);
    const cible = [...groupe].sort((a, b) => b.note - a.note)[5];
    console.log(`  club ${m.club} · ${groupe.length} joueurs · cible : ${cible.nom} (${cible.note})`);

    store.mettreEnVenteManager(cible.id);
    const apresListe = useGame.getState().manager!;
    const vente = apresListe.ventes.find((v) => v.joueurId === cible.id);
    dire(!!vente, 'le joueur part sur la liste des transferts', vente ? `valeur ${vente.valeur} €` : 'AUCUNE VENTE CRÉÉE');
    if (vente) {
      dire(vente.offres.length > 0, 'des clubs se positionnent', `${vente.offres.length} offre(s)`);
      if (vente.offres.length) {
        const budgetAvant = apresListe.budgetTransferts;
        store.accepterOffreVenteManager(cible.id, vente.offres[0].id);
        const apres = useGame.getState().manager!;
        const groupeApres = effectifDuClub(apres.club, apres.saison);
        const encoreLa = groupeApres.some((j) => j.nom === cible.nom);
        dire(!encoreLa, 'le joueur a VRAIMENT quitté le club',
          encoreLa ? 'IL EST TOUJOURS DANS L’EFFECTIF' : `effectif ${groupe.length} → ${groupeApres.length}`);
        dire(apres.budgetTransferts >= budgetAvant, 'le transfert est encaissé',
          `${budgetAvant} → ${apres.budgetTransferts} €`);
        dire(!apres.ventes.some((v) => v.joueurId === cible.id), 'la vente sort de la liste');
      }
    }
  }
}

console.log('\n═══ B. PROLONGER SON CONTRAT — y a-t-il une limite ? ═══\n');
{
  store.reinitialiser();
  store.creerJoueur({
    nom: 'Éternel', poste: 'demi_ouverture', nation: 'France',
    club: 'Provence Rugby', division: 'prod2', age: 20, traits: [],
  });
  let prolongations = 0;
  let saisonsVues = 0;
  const clubs = new Set<string>();
  for (let i = 0; i < 900; i++) {
    const e = useGame.getState();
    const j = e.joueur;
    if (!j) break;
    clubs.add(j.club);
    // dès qu'une prolongation traîne, on la signe
    const p = (e.approches ?? []).find((a) => (a as Record<string, unknown>).prolongation
      && (a as Record<string, unknown>).etat === 'ouverte');
    if (p) {
      store.accepterApproche?.((p as Record<string, unknown>).id as string);
      const apres = useGame.getState().joueur!;
      if (apres.contrat && apres.contrat.club === j.club) prolongations++;
    }
    const av = j.saison;
    store.semaineSuivante();
    const ap = useGame.getState().joueur;
    if (!ap) break;
    if (ap.saison !== av) saisonsVues++;
    if (ap.age >= 44) break;
  }
  const fin = useGame.getState().joueur!;
  console.log(`  ${prolongations} prolongation(s) signée(s) · ${saisonsVues} saison(s) · âge final ${fin.age}`);
  console.log(`  clubs traversés : ${[...clubs].join(', ')}`);
  dire(fin.age >= 30, 'la carrière a bien avancé', `âge ${fin.age}`);
  console.log(`\n  → contrat final : ${JSON.stringify(fin.contrat)}`);
  console.log('  (une prolongation sans limite d’âge ni de niveau = à confirmer côté règle)');
}

console.log('\n' + '  ' + '─'.repeat(74));
console.log(ko === 0 ? '  Rien d’anormal détecté sur ces deux fronts.\n' : `  ❌ ${ko} anomalie(s).\n`);
process.exit(0);
