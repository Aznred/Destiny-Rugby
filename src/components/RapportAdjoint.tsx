import { useMemo, useState } from 'react';
import { Icone, type NomIcone } from './Icone';
import { t } from '../lib/i18n';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import type { Coequipier } from '../lib/effectif';
import type { CompositionManager } from '../types';
import type {
  ChoixAdjoint, ConsigneAdjoint, ConsignesAdjoint, EcartAdjoint, RapportAdjoint as Rapport,
} from '../lib/adjointComposition';
import './RapportAdjoint.css';

/**
 * LE RAPPORT DE L'ADJOINT (Correctif 41) — la feuille qu'il alignerait, et pourquoi.
 *
 * ⚠️ L'ÉCRAN NE DÉCIDE DE RIEN : il affiche `rapportAdjointManager`, la même fonction que la composition déléguée.
 * Ce qu'on lit ici est donc exactement ce que l'adjoint fera si on lui laisse la feuille — et c'est aussi le moyen de
 * repérer une décision absurde.
 */
interface Props {
  rapport: Rapport;
  /** Tout le groupe sous contrat, indisponibles compris (pour les noms et les consignes). */
  effectif: Coequipier[];
  composition: CompositionManager;
  consignes?: ConsignesAdjoint;
  delegue: boolean;
  onAppliquer: () => void;
  onConsigne: (joueurId: string, consigne: ConsigneAdjoint | null) => void;
  onPrioriteJeunes: (actif: boolean) => void;
}

const ICONE_CONSIGNE: Record<'auto' | ConsigneAdjoint, NomIcone> = { auto: 'sifflet', titulaire: 'verrou', exclu: 'croix' };

function nomCourt(nom: string): string {
  const morceaux = nom.trim().split(/\s+/);
  return morceaux.length > 1 ? `${morceaux[0][0]}. ${morceaux.slice(1).join(' ')}` : nom;
}

export function RapportAdjoint({
  rapport, effectif, composition, consignes, delegue, onAppliquer, onConsigne, onPrioriteJeunes,
}: Props) {
  const [recherche, setRecherche] = useState('');
  // Sur un téléphone, quinze lignes dépliées repoussent tout le reste : le XV s'ouvre à la demande.
  const [large] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches);
  const parId = useMemo(() => new Map(effectif.map((j) => [j.id, j])), [effectif]);
  const nom = (id?: string) => (id ? nomCourt(parId.get(id)?.nom ?? '') : '');
  const differences = rapport.composition.titulaires.filter((id, i) => composition.titulaires[i] !== id).length
    + rapport.composition.remplacants.filter((id) => !composition.remplacants.includes(id)).length;
  const posees = Object.keys(consignes?.joueurs ?? {}).filter((id) => parId.has(id)).length;

  const raison = (c: ChoixAdjoint) => {
    if (c.raison === 'rotation' || c.raison === 'jeune') return t(`adj.raison.${c.raison}`, { nom: nom(c.aLaPlaceDe) });
    if (c.raison === 'couverture') return t('adj.raison.couverture', { poste: nomPoste(c.poste) });
    if (c.raison === 'meilleur' && c.fraicheur >= 90) return t('adj.raison.meilleurForme');
    return t(`adj.raison.${c.raison}`);
  };
  const motif = (e: EcartAdjoint) => {
    if (e.raison === 'repos') return t('adj.ecart.repos', { n: e.fraicheur });
    if (e.raison === 'concurrence') return e.devance ? t('adj.ecart.concurrence', { nom: nom(e.devance) }) : t('adj.ecart.concurrenceSimple');
    return t(`adj.ecart.${e.raison}`);
  };

  const ligne = (c: ChoixAdjoint) => {
    const j = parId.get(c.joueurId);
    if (!j) return null;
    return (
      <li key={c.joueurId} className={`ra-ligne ra-${c.raison}`}>
        <span className="ra-numero">{c.place + 1}</span>
        <span className="ra-qui">
          <b>{j.nom}</b>
          <small>{nomPoste(c.poste)}{c.rendement < 1 ? ` · ${Math.round(c.rendement * 100)} %` : ''}</small>
        </span>
        <span className="ra-notes" title={t('adj.noteEffective')}>
          <b>{c.note}</b>
          {Math.abs(c.noteEffective - c.note) >= .5 && <i>{c.noteEffective.toFixed(1)}</i>}
        </span>
        <span className={`ra-condition${c.fraicheur < 80 ? ' basse' : ''}`}><Icone nom="coeur" taille={11} />{c.fraicheur} %</span>
        <span className="ra-raison">{raison(c)}</span>
      </li>
    );
  };

  const filtre = recherche.trim().toLowerCase();
  const listeConsignes = useMemo(() => [...effectif]
    .sort((a, b) => Number(!!consignes?.joueurs?.[b.id]) - Number(!!consignes?.joueurs?.[a.id]) || b.note - a.note)
    .filter((j) => !filtre || j.nom.toLowerCase().includes(filtre)), [effectif, consignes, filtre]);

  return (
    <section className="carte rapport-adjoint" data-tuto="mgr-adjoint">
      <header className="ra-tete">
        <div>
          <b><Icone nom="sifflet" taille={16} />{t('adj.titre')}</b>
          <small>{t('adj.sousTitre')}</small>
        </div>
        <span className={`ra-enjeu ra-enjeu-${rapport.importance}`}>{t(`adj.importance.${rapport.importance}`)}</span>
      </header>

      <div className="ra-actions">
        <button type="button" className="btn primaire" onClick={onAppliquer} disabled={!differences} title={t('adj.composerAide')}>
          <Icone nom="eclair" taille={15} /> {t('adj.composer')}
        </button>
        <p>{differences ? t('adj.differences', { n: differences }) : t('adj.identique')}{delegue ? ` ${t('adj.delegue')}` : ''}</p>
        <label className="ra-bascule" title={t('adj.prioriteJeunesAide')}>
          <input type="checkbox" checked={!!consignes?.prioriteJeunes} onChange={(e) => onPrioriteJeunes(e.target.checked)} />
          <span><Icone nom="pousse" taille={14} />{t('adj.prioriteJeunes')}</span>
        </label>
      </div>

      <details className="ra-bloc" open={large}>
        <summary>{t('adj.titulaires')}<Icone nom="chevron" taille={14} /></summary>
        <ol className="ra-liste">{rapport.choix.filter((c) => c.place < 15).map(ligne)}</ol>
      </details>
      <details className="ra-bloc">
        <summary>{t('adj.banc')}<Icone nom="chevron" taille={14} /></summary>
        <ol className="ra-liste">{rapport.choix.filter((c) => c.place >= 15).map(ligne)}</ol>
      </details>
      {!!rapport.ecartes.length && (
        <details className="ra-bloc" open>
          <summary>{t('adj.ecartes')}<Icone nom="chevron" taille={14} /></summary>
          <ul className="ra-liste ra-ecartes">
            {rapport.ecartes.map((e) => {
              const j = parId.get(e.joueurId);
              if (!j) return null;
              return (
                <li key={e.joueurId} className={`ra-ligne ra-ecart-${e.raison}`}>
                  <span className="ra-numero"><Icone nom={e.raison === 'repos' ? 'batterie' : e.raison === 'indisponible' ? 'soin' : e.raison === 'consigne' ? 'croix' : 'banc'} taille={13} /></span>
                  <span className="ra-qui"><b>{j.nom}</b><small>{nomPoste(j.poste)}</small></span>
                  <span className="ra-notes"><b>{e.note}</b></span>
                  <span className={`ra-condition${e.fraicheur < 80 ? ' basse' : ''}`}><Icone nom="coeur" taille={11} />{e.fraicheur} %</span>
                  <span className="ra-raison">{motif(e)}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <details className="ra-bloc ra-consignes">
        <summary>
          {t('adj.consignes')}
          {!!posees && <em>{t('adj.consignesActives', { n: posees })}</em>}
          <Icone nom="chevron" taille={14} />
        </summary>
        <p className="ra-aide">{t('adj.consignesAide')}</p>
        <label className="ra-recherche">
          <Icone nom="loupe" taille={14} />
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('adj.chercher')} aria-label={t('adj.chercher')} />
        </label>
        <ul className="ra-liste ra-liste-consignes">
          {listeConsignes.map((j) => {
            const actuelle = consignes?.joueurs?.[j.id] ?? 'auto';
            return (
              <li key={j.id} className={`ra-ligne${actuelle !== 'auto' ? ' posee' : ''}`}>
                <span className="ra-numero">{POSTE_PAR_ID[j.poste]?.numero ?? ''}</span>
                <span className="ra-qui"><b>{j.nom}</b><small>{nomPoste(j.poste)} · {j.age}</small></span>
                <span className="ra-notes"><b>{j.note}</b></span>
                <span className="ra-choix" role="group" aria-label={j.nom}>
                  {(['auto', 'titulaire', 'exclu'] as const).map((choix) => (
                    <button
                      key={choix} type="button" className={actuelle === choix ? 'actif' : ''} aria-pressed={actuelle === choix}
                      title={t(`adj.consigne.${choix}`)} aria-label={t(`adj.consigne.${choix}`)}
                      onClick={() => onConsigne(j.id, choix === 'auto' ? null : choix)}
                    >
                      <Icone nom={ICONE_CONSIGNE[choix]} taille={13} />
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="ra-legende">
          {(['auto', 'titulaire', 'exclu'] as const).map((choix) => (
            <span key={choix}><Icone nom={ICONE_CONSIGNE[choix]} taille={12} />{t(`adj.consigne.${choix}`)}</span>
          ))}
        </p>
      </details>
    </section>
  );
}
