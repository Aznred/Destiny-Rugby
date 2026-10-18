import { placesAccessionParTableau, rulesFor } from '../lib/competitionRules';
import { t } from '../lib/i18n';

/** La qualification au titre ne promet aucune montée au classement de poule. */
export function RegleAccession({ division }: { division: string }) {
  const regles = rulesFor(division);
  if (!placesAccessionParTableau(regles)) return null;
  return <p className="comp-aide regle-accession">{t(`accession.${regles.championshipBracket.tourAccession}`)}</p>;
}
