// Banc d'intégration du Correctif 34 : aucun serveur ni profil réel n'est utilisé.
import assert from 'node:assert/strict';
import type { CibleRecrutementManager, Manager } from '../src/types';
import type { SourceJeuneFfr } from '../src/lib/jeunesFfr';
import { tableauDetectionManager, proposerProjetJeune } from '../src/lib/formationManager';
import { historiqueJeuneMonde, jeuneMondeParId, mondeJeunesDisponible, sourcesMondeJeunes } from '../src/lib/mondeJeunes';
import { chargerSnapshotJeunes, lireSnapshotJeunes } from '../src/lib/snapshotJeunesCarriere';
import { effectifDuClub } from '../src/lib/effectif';
import { ouvrirNegociationManager } from '../src/lib/recrutementManager';
import { VERSION_JEUNES_FFR } from '../src/data/versionJeunesFfr.generated';
import { definirLangue } from '../src/lib/i18n';

const origineFetch = globalThis.fetch;
const stockageOriginal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memoireLocale = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (cle: string) => memoireLocale.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => memoireLocale.set(cle, valeur),
  removeItem: (cle: string) => memoireLocale.delete(cle),
} });
const source = (numero: number, club: string, age: number, extra: Partial<SourceJeuneFfr> = {}): SourceJeuneFfr => ({
  id: `ffr_test34_${numero}`, sourcePlayerId: `ffr_test34_${numero}`, youthPlayerId: `ffr_test34_${numero}`,
  nom: `Jeune fictif de contrôle ${numero}`, clubSource: club, age, ageEstime: true,
  categorie: age < 18 ? 'U18' : 'Espoirs', poste: 'premier_centre', postesSecondaires: ['deuxieme_centre'],
  niveauCompetition: 43, competition: 'U18 de démonstration', saisonSource: '2025-2026', matchs: 15,
  titularisations: 9, apparitionsSenior: 0, surclassement: false, confiance: .8,
  sourceSeasonHistory: [{ saison: '2025-2026', club, competition: 'U18 de démonstration', matchs: 15, titularisations: 9 }], ...extra,
});
const donnees: SourceJeuneFfr[] = [
  source(1, 'Stade Toulousain', 17, { niveauCompetition: 68, apparitionsSenior: 12, groupePro: true }),
  source(2, 'Stade Toulousain', 18),
  source(3, 'Stade Toulousain', 23, { espoirs: true }),
  source(4, 'Stade Toulousain', 16),
  ...Array.from({ length: 42 }, (_, i) => source(100 + i, i % 2 ? 'Colomiers' : 'Montauban', 18 + i % 3)),
];
let ouvrirChargement!: () => void;
const attentePremierePage = new Promise<void>((resolve) => { ouvrirChargement = resolve; });
let premierePageBloquee = true;
let mauvaiseVersion = false;
const requetes: URL[] = [];
globalThis.fetch = (async (entree: RequestInfo | URL) => {
  const url = new URL(String(entree), 'http://controle.local');
  if (!url.searchParams.has('jeunesCarriere')) return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  requetes.push(url);
  if (premierePageBloquee) { premierePageBloquee = false; await attentePremierePage; }
  const apres = url.searchParams.get('after');
  const milieu = 19;
  return new Response(JSON.stringify({ version: mauvaiseVersion ? 'VERSION_MODIFIEE' : VERSION_JEUNES_FFR,
    referenceDate: '2026-10-08', total: donnees.length,
    joueurs: apres ? donnees.slice(milieu) : donnees.slice(0, milieu), next: apres ? null : donnees[milieu - 1].id,
  }), { headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
let controles = 0;
const echecs: string[] = [];
const verifier = (condition: unknown, message: string) => {
  controles++;
  if (!condition) { echecs.push(message); console.error(`ÉCHEC : ${message}`); }
};

try {
  definirLangue('fr');
  const { useGame } = await import('../src/store/useGame');
  // La persistance reste en mémoire dans ce processus, jamais dans les emplacements du joueur.
  const sauvegardes = new Map<string, unknown>();
  useGame.persist.setOptions({ name: 'banc-jeunes34', storage: {
    getItem: (cle) => (sauvegardes.get(cle) ?? null) as ReturnType<NonNullable<ReturnType<typeof useGame.persist.getOptions>['storage']>['getItem']>,
    setItem: (cle, valeur) => { sauvegardes.set(cle, structuredClone(valeur)); },
    removeItem: (cle) => { sauvegardes.delete(cle); },
  } });
  const etat = () => useGame.getState();
  const manager = () => etat().manager as Manager;
  etat().creerManager({ nom: 'Banc jeunes fictifs', nation: 'France', club: 'Stade Toulousain', age: 40, libre: true });
  verifier(manager().mondeJeunes?.sourceVersion === 'en_attente', 'la carrière commence en attente du vivier réel');
  verifier(manager().mondeJeunes?.sourceVersionDemandee === VERSION_JEUNES_FFR, 'la version de lancement est épinglée avant tout chargement');
  verifier(!tableauDetectionManager(manager()).vivier.length && !manager().academie.length, 'aucun jeune fictif ne remplace un snapshot non chargé');
  const chargement = etat().chargerJeunesCarriereManager();
  ouvrirChargement();
  await chargement;
  verifier(mondeJeunesDisponible(manager().mondeJeunes), 'le snapshot paginé devient disponible');
  verifier(manager().mondeJeunes?.sourceVersion === VERSION_JEUNES_FFR, 'la version chargée est figée dans la carrière');
  verifier(requetes.length === 2, 'les appels concurrents partagent un seul chargement de deux pages');
  verifier(requetes.every((r) => r.searchParams.get('version') === VERSION_JEUNES_FFR), 'chaque page demande explicitement la version de lancement');
  verifier(requetes[1].searchParams.get('after') === donnees[18].id, 'le curseur de la première page est utilisé pour la suivante');
  verifier(sourcesMondeJeunes(manager().mondeJeunes!.snapshotId)?.length === donnees.length, 'toutes les pages participent au monde');
  verifier(manager().academie.length === 4 && manager().academie.every((j) => donnees.some((s) => s.id === j.id && s.clubSource === manager().club)), 'le centre contient les jeunes effectivement associés au club');
  const snapshotId = manager().mondeJeunes!.snapshotId;
  const stocke = await lireSnapshotJeunes(snapshotId);
  verifier(stocke?.version === VERSION_JEUNES_FFR && stocke.sources.length === donnees.length, 'le snapshot conservé permet de relire tout le vivier');

  useGame.setState({ manager: { ...manager(), prestige: 100, budgetTransferts: 50_000_000, budgetSalarial: 50_000_000,
    installations: { ...manager().installations, [manager().club]: { formation: 4, recrutement: 4, entrainement: 4 } } } });
  const tableau = tableauDetectionManager(manager());
  const horsRapport = tableau.vivier.find((j) => !tableau.fiches.some((f) => f.jeune.id === j.id));
  assert.ok(horsRapport, 'le banc contient un vrai candidat hors de la sélection annuelle');
  etat().suivreJeuneManager(horsRapport.id, true);
  verifier(manager().jeunesSuivis?.[horsRapport.id], 'le suivi manuel conserve le même identifiant');
  etat().observerJeuneManager(horsRapport.id);
  verifier(manager().observationsJeunes[horsRapport.id]?.matchs === 1, 'un candidat hors du rapport peut être réellement supervisé');
  verifier(manager().missionsJeunes.utilises === 1, 'la supervision externe consomme un seul déplacement');
  verifier(tableauDetectionManager(manager()).fiches.some((f) => f.jeune.id === horsRapport.id), 'le dossier supervisé revient dans le rapport');
  const avant = tableauDetectionManager(manager()).fiches.find((f) => f.jeune.id === horsRapport.id)!;
  for (let i = 0; i < 2; i++) etat().observerJeuneManager(horsRapport.id);
  etat().observerJeuneManager(horsRapport.id, true);
  const apres = tableauDetectionManager(manager()).fiches.find((f) => f.jeune.id === horsRapport.id)!;
  verifier(apres.entretien && apres.confiance > avant.confiance, 'observations et entretien augmentent la connaissance du même joueur');
  verifier(apres.potentielHaut - apres.potentielBas < avant.potentielHaut - avant.potentielBas, 'l’estimation du potentiel se resserre');
  const candidat = tableau.vivier.find((j) => proposerProjetJeune(manager(), j.id).etat === 'accepte');
  assert.ok(candidat, 'un centre développé peut convaincre au moins un candidat proche de la fixture');
  const budgetAvant = manager().budgetTransferts;
  const verdict = proposerProjetJeune(manager(), candidat.id);
  etat().proposerProjetJeuneManager(candidat.id);
  verifier(manager().reponsesJeunes[candidat.id]?.etat === 'accepte', 'la proposition du store signe le candidat convaincu');
  verifier(manager().academie.some((j) => j.id === candidat.id), 'la même personne apparaît au centre');
  verifier(jeuneMondeParId(manager().mondeJeunes!, candidat.id)?.club === manager().club, 'le recrutement change aussi le club du monde simulé');
  verifier(manager().budgetTransferts === budgetAvant - verdict.indemnite, 'l’indemnité est débitée exactement une fois');

  etat().gererAcademicienManager(donnees[0].id, 'senior');
  verifier(!manager().academie.some((j) => j.id === donnees[0].id), 'la première équipe retire le jeune de la vue du centre');
  verifier(effectifDuClub(manager().club, manager().saison).filter((j) => j.id === donnees[0].id).length === 1, 'la promotion senior conserve un identifiant unique dans le vrai effectif');
  verifier(!manager().jeunesFormes.some((j) => j.nom === donnees[0].nom), 'la promotion réelle ne crée aucun doublon avec suffixe académie');
  const senior = effectifDuClub(manager().club, manager().saison).find((j) => j.id === donnees[0].id)!;
  verifier(senior.potentielEstime && senior.potentielEstime[0] < senior.potentielEstime[1] && !('potentielReel' in senior), 'la projection senior conserve une fourchette sans plafond interne');
  etat().gererAcademicienManager(donnees[1].id, 'entrainement_senior');
  verifier(manager().academie.find((j) => j.id === donnees[1].id)?.entrainementSenior, 'le programme senior se règle sans promotion');
  etat().gererAcademicienManager(donnees[1].id, 'pret');
  const prete = manager().academie.find((j) => j.id === donnees[1].id)!;
  verifier(prete.categorie === 'pret' && prete.clubPret && jeuneMondeParId(manager().mondeJeunes!, prete.id)?.club === prete.clubPret, 'le prêt apparaît dans le centre et dans le monde');
  verifier(jeuneMondeParId(manager().mondeJeunes!, prete.id)?.clubProprietaire === manager().club, 'le prêt conserve le club propriétaire');
  etat().gererAcademicienManager(donnees[3].id, 'liberer');
  verifier(!manager().academie.some((j) => j.id === donnees[3].id) && jeuneMondeParId(manager().mondeJeunes!, donnees[3].id), 'une libération laisse le joueur dans le monde en dehors du centre');

  etat().saisonManager();
  verifier(manager().saison === 2 && manager().mondeJeunes?.saison === 2, 'la clôture entraîneur fait avancer le monde une seule fois');
  verifier(jeuneMondeParId(manager().mondeJeunes!, donnees[1].id)?.age === 19, 'la saison de prêt ne fait vieillir le joueur qu’une fois');
  verifier(jeuneMondeParId(manager().mondeJeunes!, donnees[1].id)?.club === manager().club && !manager().academie.find((j) => j.id === donnees[1].id)?.clubPret, 'le prêt d’un an revient au centre dès la saison suivante');
  verifier(jeuneMondeParId(manager().mondeJeunes!, donnees[2].id)?.categorie === 'senior' && effectifDuClub(manager().club, 2).some((j) => j.id === donnees[2].id), 'la limite Espoirs intègre automatiquement la même identité senior');
  verifier(!manager().academie.some((j) => j.id === donnees[3].id), 'le jeune libéré ne réapparaît pas au centre à la saison suivante');
  const histoirePret = historiqueJeuneMonde(manager().mondeJeunes!, donnees[1].id)!;
  verifier(histoirePret.saisons.length === 1 && histoirePret.mouvements.some((m) => m.motif === 'pret') && histoirePret.mouvements.some((m) => m.motif === 'retour_pret'), 'le parcours conserve développement, prêt et retour');

  etat().mettreEnVenteManager(donnees[0].id);
  const vente = manager().ventes.find((v) => v.joueurId === donnees[0].id);
  assert.ok(vente, 'l’ancien jeune devenu senior peut être mis sur le marché');
  useGame.setState({ manager: { ...manager(), ventes: manager().ventes.map((v) => v.joueurId === vente.joueurId
    ? { ...v, offres: [{ id: 'offre-fixture-34', club: 'Colomiers', division: 'prod2', montant: 2_500 }] } : v) } });
  etat().accepterOffreVenteManager(vente.joueurId, 'offre-fixture-34');
  verifier(jeuneMondeParId(manager().mondeJeunes!, vente.joueurId)?.club === 'Colomiers', 'la vente senior modifie le club dans le même monde');
  verifier(!effectifDuClub(manager().club, manager().saison).some((j) => j.id === vente.joueurId), 'le senior vendu quitte réellement son groupe');
  const groupeAcheteur = effectifDuClub('Colomiers', manager().saison);
  verifier(groupeAcheteur.filter((j) => j.id === vente.joueurId).length === 1 && groupeAcheteur.filter((j) => j.nom === vente.nom).length === 1, 'le transfert social ne double pas la personne chez l’acheteur');
  const achete = groupeAcheteur.find((j) => j.id === vente.joueurId)!;
  const cible: CibleRecrutementManager = { id: achete.id, pseudo: 'joueur-fictif-34', nom: achete.nom, club: 'Colomiers', division: 'prod2', poste: achete.poste,
    age: achete.age, note: achete.note, potentiel: achete.potentiel, nation: 'France', indemnite: 0, valeur: 2_500, saisonsRestantes: 0,
    situation: 'fin_contrat', salaireDemande: 0, primeDemandee: 0, primeMatchDemandee: 0, dureeDemandee: 2, roleDemande: 'rotation' };
  const contrat = ouvrirNegociationManager(cible, manager().saison, manager().semaine);
  useGame.setState({ manager: { ...manager(), negociations: [...manager().negociations, { ...contrat, etat: 'accord', offre: { ...contrat.offre, salaire: 0, prime: 0 } }] } });
  etat().signerJoueurManager(contrat.id);
  verifier(jeuneMondeParId(manager().mondeJeunes!, vente.joueurId)?.club === manager().club, 'un contrat senior recruté réutilise l’identité et le monde existants');
  verifier(effectifDuClub(manager().club, manager().saison).filter((j) => j.id === vente.joueurId).length === 1, 'le retour senior n’ajoute aucun deuxième exemplaire');
  verifier(!effectifDuClub('Colomiers', manager().saison).some((j) => j.id === vente.joueurId), 'le joueur racheté ne reste pas dans son ancien club');

  const avantReload = structuredClone(manager());
  const sauvegarde = structuredClone(sauvegardes.get('banc-jeunes34'));
  assert.ok(sauvegarde, 'la sauvegarde de partie est présente');
  useGame.setState({ manager: null });
  sauvegardes.set('banc-jeunes34', sauvegarde);
  await useGame.persist.rehydrate();
  await etat().chargerJeunesCarriereManager();
  verifier(manager().mondeJeunes?.snapshotId === snapshotId && manager().mondeJeunes?.sourceVersion === VERSION_JEUNES_FFR, 'la sauvegarde restaurée conserve le snapshot épinglé');
  assert.deepEqual(historiqueJeuneMonde(manager().mondeJeunes!, donnees[0].id), historiqueJeuneMonde(avantReload.mondeJeunes!, donnees[0].id)); controles++;
  verifier(manager().observationsJeunes[horsRapport.id]?.entretien && manager().jeunesSuivis?.[horsRapport.id], 'suivi et observations survivent à la réhydratation');
  verifier(!('sources' in manager().mondeJeunes!) && JSON.stringify(manager().mondeJeunes).length < 15_000, 'le vivier complet reste hors du JSON de partie');
  const mondeAvantBanc = manager().mondeJeunes!;
  const enfantAncienClub = donnees[1].id;
  etat().demissionnerManager();
  verifier(!manager().club && manager().mondeJeunes?.snapshotId === snapshotId, 'la démission conserve le même monde en quittant le banc');
  verifier(manager().mondeJeunes?.actions.filter((a) => a.id === enfantAncienClub && a.controle !== undefined).at(-1)?.controle === false, 'le club quitté reprend le contrôle IA de ses jeunes');
  etat().signerBanc('Colomiers');
  verifier(manager().club === 'Colomiers' && manager().mondeJeunes?.snapshotId === mondeAvantBanc.snapshotId, 'changer de banc conserve la timeline du monde');
  const natif = manager().academie.find((j) => j.clubCentre === 'Colomiers');
  assert.ok(natif, 'la fixture possède encore un natif du nouveau centre');
  verifier(manager().mondeJeunes?.actions.filter((a) => a.id === natif.id && a.controle !== undefined).at(-1)?.controle === true, 'le nouveau centre prend en charge ses propres natifs');
  const requetesAvant = requetes.length;
  mauvaiseVersion = true;
  await etat().chargerJeunesCarriereManager();
  verifier(requetes.length === requetesAvant, 'un import source modifié ne remplace jamais le monde déjà chargé');
  await assert.rejects(() => chargerSnapshotJeunes('banc-version-modifiee-34', VERSION_JEUNES_FFR), /changé/, 'une mauvaise version serveur est rejetée'); controles++;
  await assert.rejects(() => chargerSnapshotJeunes(snapshotId, 'AUTRE_VERSION'), /correspond/, 'un snapshot local ne change pas de version'); controles++;
  assert.equal(echecs.length, 0, `${echecs.length} invariant(s) en échec : ${echecs.join(' ; ')}`);
  console.log(`✓ ${controles} contrôles : chargement paginé, observations, recrutement, prêt, âge senior, transferts et réhydratation vérifiés`);
} finally {
  globalThis.fetch = origineFetch;
  if (stockageOriginal) Object.defineProperty(globalThis, 'localStorage', stockageOriginal);
  else Reflect.deleteProperty(globalThis, 'localStorage');
}
