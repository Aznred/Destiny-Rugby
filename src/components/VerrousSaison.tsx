// CE QUI RETIENT LA SEMAINE OU LA SAISON (Correctif 39).
//
// Signalé en jeu : « le bouton permettant de conclure reste bloqué ». Un clic qui ne fait rien se lit comme un bouton
// cassé : ce panneau dit ce que le jeu attend, et ce qu'il réglera tout seul à la clôture.
//
// ⚠️ IL NE DÉCIDE DE RIEN. La liste vient de `diagnostiquerCloture` (`lib/clotureSaison.ts`), la même que lit le store.

import { Icone, type NomIcone } from './Icone';
import { t } from '../lib/i18n';
import { texteDiagnostic, type CodeVerrou, type VerrouCloture } from '../lib/clotureSaison';

const ICONES: Partial<Record<CodeVerrou, NomIcone>> = {
  contratEntraineur: 'institution', matchEnAttente: 'sifflet', matchEnRetard: 'sifflet', playoffsEnRetard: 'resultats',
  titreNonDecerne: 'resultats', contratsJoueurs: 'maillot', prolongationsAcceptees: 'check', negociations: 'monde',
  approches: 'monde', ventes: 'euro', demandes: 'maillot', decision: 'institution', mondeIncomplet: 'monde',
};

export function VerrousSaison({ verrous, cloture, erreur, onConseil, onMatch, onFermer }: {
  verrous: VerrouCloture[];
  /** Vrai à la dernière semaine du calendrier : c'est la saison qui est retenue, pas seulement la semaine. */
  cloture: boolean;
  /** Le message d'une clôture qui a levé, s'il y en a un. */
  erreur?: string;
  onConseil: () => void;
  onMatch: () => void;
  onFermer?: () => void;
}) {
  const bloquants = verrous.filter((v) => v.gravite === 'bloquant' && v.code !== 'erreur');
  const autos = verrous.filter((v) => v.gravite === 'auto');
  const erreurs = verrous.filter((v) => v.code === 'erreur');
  if (!bloquants.length && !erreur && !erreurs.length) return null;
  return (
    <section className="carte verrous-saison" role="status" aria-live="polite">
      <header>
        <b><Icone nom="chrono" taille={16} /> {t(cloture ? 'cloture.panneau.saison' : 'cloture.panneau.semaine')}</b>
        {onFermer && (
          <button type="button" className="btn fantome petit" onClick={onFermer} aria-label={t('cloture.action.fermer')}>
            <Icone nom="croix" taille={13} />
          </button>
        )}
      </header>
      {erreur && <p className="verrous-saison-erreur">{t('cloture.panneau.erreur')}</p>}
      {bloquants.length > 0 && (
        <>
          <small>{t('cloture.panneau.bloquant')}</small>
          <ul>
            {bloquants.map((v) => (
              <li key={v.code} data-gravite="bloquant">
                <Icone nom={ICONES[v.code] ?? 'chrono'} taille={15} />
                <span>{t(`cloture.verrou.${v.code}`, { n: v.nombre })}</span>
                {v.code === 'contratEntraineur' && <button type="button" className="btn primaire petit" onClick={onConseil}>{t('cloture.action.conseil')}</button>}
                {v.code === 'matchEnAttente' && <button type="button" className="btn primaire petit" onClick={onMatch}>{t('cloture.action.match')}</button>}
              </li>
            ))}
          </ul>
        </>
      )}
      {cloture && autos.length > 0 && (
        <>
          <small>{t('cloture.panneau.auto')}</small>
          <ul>
            {autos.map((v) => (
              <li key={v.code} data-gravite="auto">
                <Icone nom={ICONES[v.code] ?? 'check'} taille={15} />
                <span>{t(`cloture.verrou.${v.code}`, { n: v.nombre })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(erreur || erreurs.length > 0) && (
        // Le texte de diagnostic, tel qu'il se copie dans un rapport de bug : anglais, exprès (voir `texteDiagnostic`).
        <pre className="verrous-saison-diagnostic">{texteDiagnostic(verrous)}</pre>
      )}
    </section>
  );
}
