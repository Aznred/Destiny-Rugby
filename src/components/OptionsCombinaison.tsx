import { Icone } from './Icone';
import { Selecteur } from './Selecteur';
import { t } from '../lib/i18n';
import {
  CONDITIONS_COMBINAISON, etapesCombinaison, MAX_OPTIONS, optionsValides, porteursParEtape,
  type ActionCombinaison, type Combinaison, type ConditionCombinaison, type OptionCombinaison, type PiedCombinaison, type ReponseCombinaison, type VarianteCombinaison,
} from '../lib/ligue/combinaisons';
import './OptionsCombinaison.css';

/**
 * LES OPTIONS D'UNE COMBINAISON (Correctif 41, points 8 et 9) — « SI la défense monte vite → petit jeu au pied ».
 * Chaque ligne se lit comme une phrase : à quelle étape, quelle condition, quelle réponse. L'écran ne juge de rien : il
 * écrit `variante.options`, que le moteur lit avec ses propres yeux au moment où le porteur joue.
 */
const PIEDS: PiedCombinaison[] = ['rasant', 'chandelle', 'occupation', 'transversale', 'degagement', 'cinquanteVingtDeux', 'drop'];

const geste = (a: ActionCombinaison | undefined, joueurs: Record<number, string>): string => {
  if (!a) return '';
  if (a.type === 'passe') return t('cb.rep.passe', { n: a.destinataire }) + (joueurs[a.destinataire] ? ` (${joueurs[a.destinataire]})` : '');
  if (a.type === 'pied') return `${t('cb.rep.pied')} · ${t(`cb.pied.${a.intention}`)}`;
  return t('cb.ordre.course');
};
const cleReponse = (r: ReponseCombinaison) => (r.type === 'passe' ? `passe:${r.destinataire}` : r.type === 'pied' ? `pied:${r.intention}` : 'garder');
const reponseDepuis = (cle: string): ReponseCombinaison => {
  const [type, valeur] = cle.split(':');
  return type === 'passe' ? { type: 'passe', destinataire: Number(valeur) } : type === 'pied' ? { type: 'pied', intention: valeur as PiedCombinaison } : { type: 'garder' };
};

export function OptionsCombinaison({ combinaison: c, variante: v, joueurs, bloque, modifier }: {
  combinaison: Combinaison; variante: VarianteCombinaison; joueurs: Record<number, string>; bloque: boolean;
  modifier: (variante: VarianteCombinaison) => void;
}) {
  const etapes = etapesCombinaison(v.actions);
  const porteurs = porteursParEtape(c.phase, v);
  // Une option se lit quand le porteur joue le ballon : les étapes d'appels seuls n'en ont pas.
  const lisibles = etapes.map((e, i) => ({ i, principal: e.actions.find((a) => a.action.type !== 'leurre')?.action })).filter((e) => e.principal);
  const options = optionsValides(v.options, c.phase, v);
  const ecrire = (suite: OptionCombinaison[]) => {
    const propres = optionsValides(suite, c.phase, v);
    const sans = { ...v };
    delete sans.options;
    modifier(propres.length ? { ...sans, options: propres } : sans);
  };
  const libre = (etape: number, sauf?: ConditionCombinaison) => CONDITIONS_COMBINAISON.filter((cond) => cond === sauf || !options.some((o) => o.etape === etape && o.condition === cond));
  const ajouter = () => {
    const cible = lisibles.find((e) => libre(e.i).length);
    if (!cible) return;
    ecrire([...options, { etape: cible.i, condition: libre(cible.i)[0], reponse: { type: 'garder' } }]);
  };
  const changer = (index: number, suite: Partial<OptionCombinaison>) => {
    const actuelle = options[index];
    let option = { ...actuelle, ...suite };
    // Changer d'étape peut rendre la condition déjà prise, ou la passe adressée au porteur : on retombe sur un choix valide.
    if (suite.etape !== undefined && suite.etape !== actuelle.etape) {
      const conditions = libre(option.etape);
      if (!conditions.includes(option.condition)) option = { ...option, condition: conditions[0] ?? option.condition };
      if (option.reponse.type === 'passe' && option.reponse.destinataire === porteurs[option.etape]) option = { ...option, reponse: { type: 'garder' } };
    }
    ecrire(options.map((o, i) => (i === index ? option : o)));
  };
  if (!lisibles.length) return null;
  return (
    <section className="opt" aria-label={t('cb.option.titre')}>
      <header>
        <b><Icone nom="oeil" taille={15} />{t('cb.option.titre')}</b>
        <small>{t('cb.option.aide')}</small>
      </header>
      {!options.length && <p className="opt-vide">{t('cb.option.aucune')}</p>}
      <ol className="opt-liste">
        {options.map((o, index) => {
          const etape = lisibles.find((e) => e.i === o.etape);
          const porteur = porteurs[o.etape];
          return (
            <li key={`${o.etape}:${o.condition}`} className="opt-ligne">
              <label><span>{t('cb.option.quand')}</span>
                <Selecteur valeur={String(o.etape)} onChange={(valeur) => changer(index, { etape: Number(valeur) })}
                  options={lisibles.map((e) => ({ valeur: String(e.i), label: t('cb.option.etape', { n: e.i + 1, p: porteurs[e.i] }), sous: geste(e.principal, joueurs) }))} /></label>
              <label><span className="opt-mot">{t('cb.option.si')}</span>
                <Selecteur valeur={o.condition} onChange={(valeur) => changer(index, { condition: valeur as ConditionCombinaison })}
                  options={libre(o.etape, o.condition).map((cond) => ({ valeur: cond, label: t(`cb.si.${cond}`) }))} /></label>
              <label><span className="opt-mot">{t('cb.option.alors')}</span>
                <Selecteur valeur={cleReponse(o.reponse)} onChange={(valeur) => changer(index, { reponse: reponseDepuis(valeur) })}
                  options={[
                    { valeur: 'garder', label: t('cb.rep.garderCourt'), sous: t('cb.rep.garder') },
                    ...PIEDS.map((p) => ({ valeur: `pied:${p}`, label: t(`cb.pied.${p}`), groupe: t('cb.rep.piedCourt') })),
                    ...Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => n !== porteur)
                      .map((n) => ({ valeur: `passe:${n}`, label: t('cb.rep.passe', { n }), sous: joueurs[n], groupe: t('cb.rep.passeCourt') })),
                  ]} /></label>
              <button type="button" className="btn fantome opt-retirer" disabled={bloque} aria-label={t('cb.option.retirer')} onClick={() => ecrire(options.filter((_, i) => i !== index))}><Icone nom="corbeille" taille={15} /></button>
              <p className="opt-principale"><span>{t('cb.option.principale')}</span>{geste(etape?.principal, joueurs)}</p>
            </li>
          );
        })}
      </ol>
      <footer>
        <button type="button" className="btn ec-creer" disabled={bloque || options.length >= MAX_OPTIONS || !lisibles.some((e) => libre(e.i).length)} onClick={ajouter}><Icone nom="ajouter" taille={15} />{t('cb.option.ajouter')}</button>
        <small>{options.length >= MAX_OPTIONS ? t('cb.option.plein') : t('cb.option.regles')}</small>
      </footer>
    </section>
  );
}
