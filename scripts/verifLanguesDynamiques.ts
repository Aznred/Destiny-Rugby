// Les textes calculés à l'exécution doivent changer de langue eux aussi.
import { TEXTES } from '../src/data/textes';
import { chargerTextes, definirLangue, type Langue } from '../src/lib/i18n';
import { ESSAI, PENALITE, phrase, texteMatch } from '../src/lib/moteur/commentaire';
import { resumerTermes } from '../src/lib/negociation';
import { AGENT_PAR_ID, descriptionAgent, nomAgent } from '../src/data/agents';

chargerTextes(TEXTES);
const langues: Langue[] = ['en', 'es', 'it', 'de', 'pt', 'ja'];
const francais = /\b(essai|plaquage|mêlée|pénalité|salaire|défense|transfert|ballon porté)\b/i;

for (const langue of langues) {
  definirLangue(langue);
  const echantillons = [
    phrase(() => 0, ESSAI, { nom: 'Dupont', precision: 'sous les poteaux' }),
    phrase(() => 0, PENALITE, { club: 'Toulouse', motif: 'plaquage haut' }),
    texteMatch('coupSiffletFinal'),
    texteMatch('cartonRouge', { nom: 'Martin', club: 'Toulouse', motif: 'plaquage haut' }),
    resumerTermes({ salaire: 125000, prime: 12000, saisons: 3, garantie: true }),
    nomAgent(AGENT_PAR_ID.requin),
    descriptionAgent(AGENT_PAR_ID.requin),
  ];
  const fuite = echantillons.find((texte) => francais.test(texte));
  if (fuite) throw new Error(`${langue} contient encore du français : ${fuite}`);
  if (echantillons.some((texte) => !texte.trim())) throw new Error(`${langue} contient un texte vide`);
  console.log(`✅ ${langue} — match, négociation et agent localisés`);
}

definirLangue('fr');
console.log('✅ Tous les textes dynamiques testés changent de langue.');
