import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { OvaleManager } from '../src/screens/Social';
import { useGame } from '../src/store/useGame';
import { effectifDuClub, setContratsEffectifManager } from '../src/lib/effectif';
import { pseudoStable } from '../src/lib/comptes';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
useGame.getState().creerManager({ nom: 'Essai contrats', nation: 'France', club: 'Stade Toulousain', age: 40, libre: true });
const initial = useGame.getState().manager!;
const groupe = effectifDuClub(initial.club, 1);
setContratsEffectifManager();
const ete = effectifDuClub(initial.club, 2);
const joueur = groupe.find(j => j.age < 31 && !ete.some(x => x.id === j.id || x.nom === j.nom))!;
const pseudo = pseudoStable(joueur.nom);
useGame.setState({ iaActivee: false, joueur: null, manager: {
  ...initial, budgetTransferts: 100_000_000, budgetSalarial: 100_000_000,
  avancee: { ...initial.avancee!, contratsJoueurs: {
    ...initial.avancee!.contratsJoueurs, [joueur.id]: { ...initial.avancee!.contratsJoueurs[joueur.id], fin: 2, demandeRevalorisation: true },
  } },
  demandes: [{ id: 'apercu-depart', pseudo, joueurId: joueur.id, nom: joueur.nom, poste: joueur.poste, note: joueur.note,
    type: 'depart', raison: 'contrat', etat: 'ouverte', saison: 1, semaine: 1 }],
}, conversations: { [pseudo]: [{ id: 'apercu-dm', pseudo, de: 'lui', texte: 'Je veux être mis en vente.',
  saison: 1, semaine: 1, creeLe: Date.now(), lu: false }] },
ouvrirSocialSur: 'messages', conversationSocialeCible: pseudo });

export function Apercu() {
  const manager = useGame(s => s.manager)!;
  const [mobile, setMobile] = useState(new URLSearchParams(location.search).has('mobile'));
  const contrat = manager.avancee!.contratsJoueurs[joueur.id];
  return <main style={{ maxWidth: mobile ? 390 : 1500, margin: 'auto', padding: 12 }}>
    <h1>Contrats manager · aperçu local</h1>
    <p>Cet aperçu n’enregistre aucune partie.</p>
    <div className="barre-poules">
      <button className="btn fantome" onClick={() => setMobile(!mobile)}>{mobile ? 'Vue ordinateur' : 'Vue mobile'}</button>
      <button className="btn fantome" onClick={() => {
        useGame.setState(s => ({ manager: { ...s.manager!, semaine: 53 } }));
        useGame.getState().saisonManager();
      }}>Clore la saison de test</button>
    </div>
    <p role="status">Saison {manager.saison} · {joueur.nom} · contrat jusqu’à S{contrat.fin}
      {' · '}{effectifDuClub(initial.club, manager.saison).some(j => j.id === joueur.id) ? 'Présent dans l’effectif' : 'Absent de l’effectif'}</p>
    <div style={mobile ? { width: 390, maxWidth: '100%' } : undefined}><OvaleManager /></div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
