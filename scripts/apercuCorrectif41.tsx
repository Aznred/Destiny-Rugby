// APERÇU LOCAL — Correctif 41 : le rapport de l'adjoint et l'assistant des contrats, dans le vrai bureau de l'entraîneur.
//   /scripts/apercuCorrectif41.html            (Top 14)
//   /scripts/apercuCorrectif41.html?club=prod2 (une autre division : prod2, nationale, fed1…)
//   &fatigue=1  met trois titulaires à court de condition, pour voir une rotation
//   &langue=en
import { createRoot } from 'react-dom/client';
import { Manager } from '../src/screens/Manager';
import { Social } from '../src/screens/Social';
import { useGame } from '../src/store/useGame';
import { COMPETITIONS } from '../src/data/clubs';
import { effectifDuClub } from '../src/lib/effectif';
import { assurerEtatCarriereAvancee } from '../src/lib/carriereAvancee';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';

chargerTextes(TEXTES);
const parametres = new URLSearchParams(location.search);
if (parametres.get('langue')) definirLangue(parametres.get('langue') as never);
// Cet aperçu n'écrit aucune partie dans le navigateur.
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const division = parametres.get('club') ?? 'top14';
const club = COMPETITIONS.find((c) => c.id === division)?.clubs[0].nom ?? 'Stade Toulousain';
useGame.getState().creerManager({ nom: 'Essai 41', nation: 'France', club, age: 40, libre: true });
if (parametres.get('fatigue')) {
  useGame.setState((s) => {
    const m = s.manager!;
    const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
    const profilsMedicaux = { ...avancee.profilsMedicaux };
    for (const id of [m.composition.titulaires[9], m.composition.titulaires[7], m.composition.titulaires[14]]) {
      if (profilsMedicaux[id]) profilsMedicaux[id] = { ...profilsMedicaux[id], condition: 52 };
    }
    return { manager: { ...m, avancee: { ...avancee, profilsMedicaux } } };
  });
}
useGame.setState({ iaActivee: false });

function Apercu() {
  const ecran = useGame((s) => s.ecran);
  return <main style={{ maxWidth: 1500, margin: 'auto', padding: '.5rem' }}>{ecran === 'social' ? <Social /> : <Manager />}</main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
