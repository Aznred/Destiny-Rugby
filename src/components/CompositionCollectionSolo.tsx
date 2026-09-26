import { useMemo, useState } from 'react';
import { Icone } from './Icone';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Selecteur } from './Selecteur';
import { CompositionTerrainManager } from './CompositionTerrainManager';
import { t } from '../lib/i18n';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import type { CompositionManager } from '../types';
import type { Coequipier } from '../lib/effectif';
import type { EtatDuJoueur } from '../lib/carteJoueur';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import {
  collectifCarriere,
  bonusCollectif,
  paliersCollectif,
  COLLECTIF_MAX,
  type Affinite,
  type AffiniteCarte,
} from '../lib/ligue/collectifCarriere';
import { meilleureComposition } from '../lib/meilleureComposition';
import './CompositionCollectionSolo.css';

const CLE_COMPO_SOLO = 'destiny-rugby:composition-collection-solo:v1';
const CLE_SAUVEGARDES_SOLO = 'destiny-rugby:equipes-collection-solo:v1';

const COMPOSITION_VIDE: CompositionManager = {
  titulaires: [],
  remplacants: [],
  capitaineId: '',
  buteurId: '',
};

interface EquipeSauvegardee {
  id: string;
  nom: string;
  composition: CompositionManager;
}

const nomAffinite = (aff: Affinite): string => t(`online.affinity.${aff === 'championnat' ? 'league' : aff}`);

function legendeAffinite(a: AffiniteCarte): string {
  const bonus = bonusCollectif(a.points);
  const entete = t('online.affinity.header', { points: String(a.points), max: String(COLLECTIF_MAX), sign: bonus >= 0 ? '+' : '', bonus: String(bonus) });
  const detail = t('online.affinity.detail', {
    club: String(a.club), clubAff: nomAffinite('club'),
    nation: String(a.nation), natAff: nomAffinite('nation'),
    league: String(a.championnat), leagueAff: nomAffinite('championnat'),
  });
  if (!a.meilleure) return `${entete}\n${t('online.affinity.none')}\n${detail}`;
  const tailles: Record<Affinite, number> = { club: a.club, nation: a.nation, championnat: a.championnat };
  const compte = t('online.affinity.startersCount', { count: String(tailles[a.meilleure]), affinity: nomAffinite(a.meilleure) });
  const manque = a.points < COLLECTIF_MAX && a.club > 0 && a.club < 4
    ? `\n${t('online.affinity.missingForMax', { count: String(4 - a.club) })}` : '';
  return `${entete}\n${compte}${manque}\n${detail}`;
}

const carteEnJoueur = (c: CarteCarriere): Coequipier => ({
  id: c.id,
  nom: c.nom,
  poste: c.poste,
  age: c.age,
  note: c.note,
  postesSecondaires: c.postesSecondaires ? [...c.postesSecondaires] : undefined,
  potentiel: c.potentiel,
  jeuAuPied: c.statistiques.JDP,
  nation: c.nation,
  regen: false,
  horsGeneration: true,
  clubReel: c.clubReel,
  championnat: c.championnat,
});

function Choix({
  label,
  valeur,
  options,
  onChange,
}: {
  label: string;
  valeur: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="cel-champ">
      <span>{label}</span>
      <Selecteur
        valeur={valeur}
        onChange={onChange}
        options={options.map(([v, l]) => ({ valeur: v, label: l }))}
      />
    </div>
  );
}

interface Props {
  cartes: CarteCarriere[];
  onFermer: () => void;
  onEnregistrer?: (composition: CompositionManager) => void;
}

export function CompositionCollectionSolo({ cartes, onFermer, onEnregistrer }: Props) {
  const [vueEtendue, setVueEtendue] = useState(true);
  const [brouillon, setBrouillon] = useState<CompositionManager | null>(null);
  const [nomEquipe, setNomEquipe] = useState('');
  const [notification, setNotification] = useState('');
  const [filtreChampionnat, setFiltreChampionnat] = useState('');
  const [filtreClub, setFiltreClub] = useState('');
  const [filtrePays, setFiltrePays] = useState('');
  const [filtrePoste, setFiltrePoste] = useState('');

  const [sauvegardees, setSauvegardees] = useState<EquipeSauvegardee[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const brut = localStorage.getItem(CLE_SAUVEGARDES_SOLO);
      return brut ? JSON.parse(brut) : [];
    } catch {
      return [];
    }
  });

  const compositionInitiale = useMemo<CompositionManager>(() => {
    if (typeof window !== 'undefined') {
      try {
        const brut = localStorage.getItem(CLE_COMPO_SOLO);
        if (brut) {
          const compo = JSON.parse(brut) as CompositionManager;
          // Vérifie qu'au moins un joueur de la composition est encore possédé
          if (compo.titulaires.some(id => cartes.some(c => c.id === id))) {
            return compo;
          }
        }
      } catch {}
    }
    return meilleureComposition(cartes, Date.now()) ?? COMPOSITION_VIDE;
  }, [cartes]);

  const composition = useMemo(
    () => brouillon ?? compositionInitiale,
    [brouillon, compositionInitiale],
  );

  const modifie = brouillon !== null;
  const optimale = useMemo(() => meilleureComposition(cartes, Date.now()), [cartes]);

  const effectifComplet = useMemo(() => cartes.map(carteEnJoueur), [cartes]);
  const indisponibles = useMemo(() => new Set<string>(), []);
  const effectif = useMemo(() => effectifComplet, [effectifComplet]);

  const etats = useMemo(
    () =>
      new Map<string, EtatDuJoueur>(
        cartes.map((c) => [
          c.id,
          {
            fatigue: 0,
            condition: 100,
            blesse: false,
          },
        ]),
      ),
    [cartes],
  );

  const optionsFiltre = (cle: 'championnat' | 'clubReel' | 'pays') =>
    [...new Set(cartes.map((c) => c[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

  const reservesVisibles = useMemo(
    () =>
      new Set(
        cartes
          .filter(
            (c) =>
              (!filtreChampionnat || c.championnat === filtreChampionnat) &&
              (!filtreClub || c.clubReel === filtreClub) &&
              (!filtrePays || c.pays === filtrePays) &&
              (!filtrePoste || c.poste === filtrePoste),
          )
          .map((c) => c.id),
      ),
    [cartes, filtreChampionnat, filtreClub, filtrePays, filtrePoste],
  );

  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    const suivante: CompositionManager = {
      ...composition,
      titulaires: [...composition.titulaires],
      remplacants: [...composition.remplacants],
    };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0) suivante[autreZone][autreIndex] = ancien;
    }
    suivante[zone][index] = joueurId;
    if (suivante.capitaineId === ancien && zone === 'titulaires') suivante.capitaineId = joueurId;
    if (suivante.buteurId === ancien) suivante.buteurId = joueurId;
    setBrouillon(suivante);
  };

  const noteXV = composition.titulaires.length
    ? composition.titulaires.reduce((s, id) => s + (cartes.find((c) => c.id === id)?.note ?? 0), 0) /
      composition.titulaires.length
    : 0;

  const collectif = useMemo(() => collectifCarriere(cartes, composition), [cartes, composition]);

  const enregistrerFeuille = () => {
    try {
      localStorage.setItem(CLE_COMPO_SOLO, JSON.stringify(composition));
      setBrouillon(null);
      setNotification(t('compoSolo.toastSaved'));
      onEnregistrer?.(composition);
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification(t('compoSolo.toastError'));
    }
  };

  const sauvegarderNouvelleEquipe = () => {
    if (!nomEquipe.trim() || nomEquipe.trim().length < 2) return;
    const nouvelle: EquipeSauvegardee = {
      id: `eq-${Date.now()}`,
      nom: nomEquipe.trim(),
      composition: structuredClone(composition),
    };
    const liste = [nouvelle, ...sauvegardees].slice(0, 15);
    setSauvegardees(liste);
    try {
      localStorage.setItem(CLE_SAUVEGARDES_SOLO, JSON.stringify(liste));
      setNomEquipe('');
      setNotification(t('compoSolo.teamSavedNotice', { nom: nouvelle.nom }));
      setTimeout(() => setNotification(''), 3000);
    } catch {}
  };

  const supprimerEquipeSauvegardee = (id: string) => {
    const liste = sauvegardees.filter((e) => e.id !== id);
    setSauvegardees(liste);
    try {
      localStorage.setItem(CLE_SAUVEGARDES_SOLO, JSON.stringify(liste));
    } catch {}
  };

  if (cartes.length < 23) {
    return (
      <div className="cel-compo cel-compo-etendue collection-solo-compo" role="dialog" aria-modal="true">
        <header className="cel-panneau cel-tete-compo">
          <h2>{t('compoSolo.title')}</h2>
          <button type="button" className="btn fantome solo-compo-fermer" onClick={onFermer}>
            <Icone nom="croix" taille={18} /> {t('online.common.close')}
          </button>
        </header>
        <div className="cel-vide" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icone nom="equipe" taille={48} />
          <h3>{t('compoSolo.shortSquadTitle', { n: cartes.length })}</h3>
          <p>{t('compoSolo.shortSquadHelp')}</p>
          <button type="button" className="btn primaire" onClick={onFermer} style={{ marginTop: '1rem' }}>
            {t('compoSolo.backToShop')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`cel-compo${vueEtendue ? ' cel-compo-etendue' : ''} collection-solo-compo`} role="dialog" aria-modal="true">
      <section className="cel-panneau cel-tete-compo">
        <button
          type="button"
          className="btn"
          aria-pressed={vueEtendue}
          onClick={() => setVueEtendue(!vueEtendue)}
        >
          {vueEtendue ? t('compoSolo.reduceView') : t('compoSolo.expandView')}
        </button>

        <div className="cel-chiffres-compo">
          <div className="cel-note-compo">
            <b>{noteXV.toFixed(1)}</b>
            <span>{t('compoSolo.ratingXV')}</span>
          </div>
          <div
            className={`cel-collectif cel-collectif-${paliersCollectif(collectif.total)}`}
            title={t('online.lineup.chemistryTooltip', { points: String(collectif.total) })}
          >
            <span>{t('compoSolo.chemistry')}</span>
            <div className="cel-collectif-jauge">
              <i style={{ width: `${collectif.total}%` }} />
            </div>
            <b>{collectif.total}</b>
          </div>
        </div>

        <div>
          <div className="eyebrow">
            {t('compoSolo.cardsCount', { onField: composition.titulaires.length + composition.remplacants.length, total: cartes.length })}
          </div>
          <h2>{t('compoSolo.sheetTitle')}</h2>
          <p>{t('compoSolo.sheetSubtitle')}</p>
        </div>

        <button
          type="button"
          className="btn primaire"
          disabled={!modifie}
          onClick={enregistrerFeuille}
        >
          {modifie ? t('compoSolo.saveBtn') : t('compoSolo.savedBtn')}
        </button>

        <button type="button" className="btn fantome solo-compo-fermer" onClick={onFermer}>
          <Icone nom="croix" taille={18} /> {t('online.common.close')}
        </button>
      </section>

      {notification && (
        <div className="cel-alerte-toast" role="status">
          <Icone nom="ok" taille={18} /> {notification}
        </div>
      )}

      <div className="cel-outils-compo">
        <button
          type="button"
          className="btn primaire cel-btn-assembler"
          disabled={!optimale}
          onClick={() => {
            if (optimale) setBrouillon(optimale);
          }}
          title={t('compoSolo.buildBestHelp')}
        >
          <Icone nom="eclair" taille={16} />
          <span>{t('compoSolo.buildBest')}</span>
        </button>

        <details className="cel-details-outils">
          <summary className="btn cel-btn-outil">
            <Icone nom="disquette" taille={15} />
            <span>{t('compoSolo.savedTeams', { n: sauvegardees.length })}</span>
            <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
          </summary>
          <div className="cel-outils-contenu">
            <p className="cel-note">
              {t('compoSolo.savedTeamsHelp')}
            </p>
            <div className="cel-actions">
              <input
                aria-label={t('online.portal.leagueName')}
                maxLength={40}
                placeholder={t('compoSolo.teamPlaceholder')}
                value={nomEquipe}
                onChange={(e) => setNomEquipe(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={nomEquipe.trim().length < 2 || sauvegardees.length >= 15}
                onClick={sauvegarderNouvelleEquipe}
              >
                {t('compoSolo.saveTeamBtn')}
              </button>
            </div>
            {sauvegardees.map((eq) => (
              <div className="cel-equipe-sauvegardee" key={eq.id}>
                <span>{eq.nom}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setBrouillon(structuredClone(eq.composition))}
                >
                  {t('compoSolo.loadTeamBtn')}
                </button>
                <button
                  type="button"
                  className="btn fantome"
                  onClick={() => supprimerEquipeSauvegardee(eq.id)}
                  aria-label={`Supprimer ${eq.nom}`}
                >
                  {t('compoSolo.deleteTeamBtn')}
                </button>
              </div>
            ))}
          </div>
        </details>

        <details className="cel-details-outils">
          <summary className="btn cel-btn-outil">
            <Icone nom="loupe" taille={15} />
            <span>{t('compoSolo.filterReserves')}</span>
            <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
          </summary>
          <div className="cel-outils-contenu cel-filtres-reserves">
            <Choix
              label={t('compoSolo.competition')}
              valeur={filtreChampionnat}
              options={[['', t('compoSolo.allFeminine')], ...optionsFiltre('championnat').map((v) => [v, v] as [string, string])]}
              onChange={(v) => {
                setFiltreChampionnat(v);
                setFiltreClub('');
              }}
            />
            <Choix
              label={t('compoSolo.club')}
              valeur={filtreClub}
              options={[
                ['', t('compoSolo.allMasculine')],
                ...optionsFiltre('clubReel')
                  .filter((v) => !filtreChampionnat || cartes.some((c) => c.clubReel === v && c.championnat === filtreChampionnat))
                  .map((v) => [v, v] as [string, string]),
              ]}
              onChange={setFiltreClub}
            />
            <Choix
              label={t('compoSolo.nation')}
              valeur={filtrePays}
              options={[['', t('compoSolo.allMasculine')], ...optionsFiltre('pays').map((v) => [v, v] as [string, string])]}
              onChange={setFiltrePays}
            />
            <Choix
              label={t('compoSolo.position')}
              valeur={filtrePoste}
              options={[
                ['', t('compoSolo.allMasculine')],
                ...[...new Set(cartes.map((c) => c.poste))]
                  .sort((a, b) => (POSTE_PAR_ID[a]?.numero ?? 0) - (POSTE_PAR_ID[b]?.numero ?? 0))
                  .map((v) => [v, nomPoste(v)] as [string, string]),
              ]}
              onChange={setFiltrePoste}
            />
          </div>
        </details>
      </div>

      <CompositionTerrainManager
        rendreCarte={(joueur: Coequipier) => {
          const carte = cartes.find((c) => c.id === joueur.id);
          if (!carte) return null;
          return <CarteJoueurEnLigne carte={carte} compacte proprietaire={t('compoSolo.myCollection')} />;
        }}
        rendreSousCarte={(joueur: Coequipier) => {
          const affinite = collectif.parCarte[joueur.id];
          if (!affinite) return null;
          return (
            <span
              className={`cel-barre-collectif ${paliersCollectif(affinite.points * (100 / COLLECTIF_MAX))}`}
              title={legendeAffinite(affinite)}
            >
              <i style={{ width: `${affinite.points * (100 / COLLECTIF_MAX)}%` }} />
            </span>
          );
        }}
        effectif={effectif}
        effectifComplet={effectifComplet}
        reservesVisibles={reservesVisibles}
        composition={composition}
        onPlacer={changerJoueur}
        etats={etats}
        indisponibles={indisponibles}
        onCapitaine={(id: string) => setBrouillon({ ...composition, capitaineId: id })}
        onButeur={(id: string) => setBrouillon({ ...composition, buteurId: id })}
        onMeilleureEquipe={() => {
          if (optimale) setBrouillon(optimale);
        }}
      />
    </div>
  );
}
