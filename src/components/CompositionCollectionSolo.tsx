import { useMemo, useState } from 'react';
import { Icone } from './Icone';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Selecteur } from './Selecteur';
import { CompositionTerrainManager } from './CompositionTerrainManager';
import { nomPoste } from '../data/rugby';
import { POSTES_XV_MANAGER } from '../lib/compositionManager';
import { t } from '../lib/i18n';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import type { CompositionManager } from '../types';
import type { Coequipier } from '../lib/effectif';
import type { EtatDuJoueur } from '../lib/carteJoueur';
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
  const manque = a.points < COLLECTIF_MAX && a.club > 0 && a.club < 3
    ? `\n${t('online.affinity.missingForMax', { count: String(3 - a.club) })}` : '';
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
  const [rechercheReserve, setRechercheReserve] = useState('');
  const [filtreChampionnat, setFiltreChampionnat] = useState('');
  const [filtreClub, setFiltreClub] = useState('');
  const [emplacementMobile, setEmplacementMobile] = useState<{ zone: 'titulaires' | 'remplacants'; index: number } | null>(null);
  const [rechercheMobile, setRechercheMobile] = useState('');
  const [reserveMobile, setReserveMobile] = useState<string | null>(null);
  const [groupeMobile, setGroupeMobile] = useState<'titulaires' | 'remplacants' | 'reserves'>('titulaires');

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

  const optionsFiltre = (cle: 'championnat' | 'clubReel') =>
    [...new Set(cartes.map((c) => c[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

  const rechercheNormalisee = rechercheReserve
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('fr');

  const reservesVisibles = useMemo(
    () =>
      new Set(
        cartes
          .filter(
            (c) =>
              (!rechercheNormalisee || c.nom
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase('fr')
                .includes(rechercheNormalisee)) &&
              (!filtreChampionnat || c.championnat === filtreChampionnat) &&
              (!filtreClub || c.clubReel === filtreClub),
          )
          .map((c) => c.id),
      ),
    [cartes, rechercheNormalisee, filtreChampionnat, filtreClub],
  );

  const idsSurFeuille = useMemo(
    () => new Set([...composition.titulaires, ...composition.remplacants]),
    [composition.titulaires, composition.remplacants],
  );
  const nbReservesTotal = cartes.filter((carte) => !idsSurFeuille.has(carte.id)).length;
  const nbReservesVisibles = cartes.filter(
    (carte) => !idsSurFeuille.has(carte.id) && reservesVisibles.has(carte.id),
  ).length;
  const filtresReserveActifs = Boolean(rechercheReserve || filtreChampionnat || filtreClub);

  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    if (!cartes.some(c => c.id === joueurId)) return;
    const suivante: CompositionManager = {
      ...composition,
      titulaires: [...composition.titulaires],
      remplacants: [...composition.remplacants],
    };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0 && (autreZone !== zone || autreIndex !== index)) suivante[autreZone][autreIndex] = ancien;
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
  const cartesParId = useMemo(() => new Map(cartes.map(c => [c.id, c])), [cartes]);
  const candidatesMobile = useMemo(() => {
    const q = rechercheMobile.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return cartes.filter(c => !q || `${c.nom} ${c.clubReel} ${nomPoste(c.poste)}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q))
      .sort((a, b) => b.note - a.note).slice(0, q ? 80 : 32);
  }, [cartes, rechercheMobile]);

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
      <div className="cel-fullscreen-compo collection-solo-compo" role="dialog" aria-modal="true">
      <div className="cel-compo cel-compo-etendue">
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
      </div>
    );
  }

  return (
    <div className="cel-fullscreen-compo collection-solo-compo" role="dialog" aria-modal="true">
    <div className={`cel-compo${vueEtendue ? ' cel-compo-etendue' : ''}`}>
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
                  aria-label={t("ui.30283dd7e597", { v0: eq.nom })}
                >
                  {t('compoSolo.deleteTeamBtn')}
                </button>
              </div>
            ))}
          </div>
        </details>

        <section className="solo-filtres-reserves" aria-label={t('compoSolo.filterReserves')}>
          <label className="solo-recherche-reserve">
            <span>{t('compoSolo.searchPlayer')}</span>
            <span className="solo-recherche-champ">
              <Icone nom="loupe" taille={15} />
              <input
                type="search"
                value={rechercheReserve}
                placeholder={t('compoSolo.searchPlaceholder')}
                onChange={(event) => setRechercheReserve(event.target.value)}
              />
            </span>
          </label>
          <div className="solo-filtre-selecteur">
            <Choix
              label={t('compoSolo.league')}
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
          </div>
          <span className="solo-resultats-reserve" aria-live="polite">
            {t('compoSolo.reserveResults', { visible: nbReservesVisibles, total: nbReservesTotal })}
          </span>
          {filtresReserveActifs && (
            <button
              type="button"
              className="btn fantome solo-reinitialiser-filtres"
              onClick={() => {
                setRechercheReserve('');
                setFiltreChampionnat('');
                setFiltreClub('');
              }}
            >
              <Icone nom="croix" taille={13} /> {t('compoSolo.resetFilters')}
            </button>
          )}
        </section>
      </div>

      <section className="solo-compo-mobile" aria-label={t("ui.11a3e348a258")}>
        <nav className="solo-compo-mobile-onglets" aria-label={t("ui.fc1636e12fdc")}>
          {(['titulaires', 'remplacants', 'reserves'] as const).map(groupe => <button type="button" key={groupe} aria-pressed={groupeMobile === groupe} onClick={() => { setGroupeMobile(groupe); setEmplacementMobile(null); }}>
            {groupe === 'titulaires' ? t("ui.b47cc001b0ae", { v0: composition.titulaires.filter(Boolean).length }) : groupe === 'remplacants' ? t("ui.1d390cc07268", { v0: composition.remplacants.filter(Boolean).length }) : t("ui.5f0808cb028b", { v0: nbReservesTotal })}
          </button>)}
        </nav>
        {groupeMobile !== 'reserves' ? <div className="solo-compo-mobile-emplacements">
          {Array.from({ length: groupeMobile === 'titulaires' ? 15 : 8 }, (_, index) => {
            const zone = groupeMobile;
            const carte = cartesParId.get(composition[zone][index]);
            return <button type="button" key={`${zone}-${index}`} className="solo-compo-mobile-emplacement" onClick={() => { setEmplacementMobile({ zone, index }); setRechercheMobile(''); }}>
              <span className="solo-compo-mobile-numero">{index + (zone === 'titulaires' ? 1 : 16)}</span>
              {carte ? <><span className="solo-compo-mobile-carte"><CarteJoueurEnLigne carte={carte} compacte /></span><span className="solo-compo-mobile-identite"><b>{carte.nom}</b><small>{nomPoste(carte.poste)} · {carte.clubReel}</small></span></> : <span className="solo-compo-mobile-identite"><b>{t("sv.libre")}</b><small>{zone === 'titulaires' ? nomPoste(POSTES_XV_MANAGER[index]) : t("compo.banc")}</small></span>}
              <span className="solo-compo-mobile-modifier">{t("ui.7a35caf2252f")}</span>
            </button>;
          })}
        </div> : <div className="solo-compo-mobile-reserves">
          <p>{t("ui.cd67f78290a5")}</p>
          <input type="search" value={rechercheMobile} onChange={e => setRechercheMobile(e.target.value)} placeholder={t("ui.b0af29565c68")} aria-label={t("ui.b0af29565c68")} />
          <div className="solo-compo-mobile-grille">{candidatesMobile.filter(c => !idsSurFeuille.has(c.id) && reservesVisibles.has(c.id)).map(c => <button type="button" key={c.id} onClick={() => setReserveMobile(c.id)}><CarteJoueurEnLigne carte={c} compacte /><span>{c.nom}</span></button>)}</div>
          {nbReservesTotal > 32 && <p>{t("ui.b8fc581781c2")}</p>}
        </div>}
        {reserveMobile && <div className="solo-compo-mobile-choix" role="dialog" aria-modal="true" aria-label={t("ui.3c5a7b8b8c5c")}><div className="solo-compo-mobile-choix-tete"><h3>{t("ui.d7aefc080ec8", { v0: cartesParId.get(reserveMobile)?.nom })}</h3><button type="button" className="btn fantome" onClick={() => setReserveMobile(null)}>{t("ov.fermer")}</button></div><div className="solo-compo-mobile-destinations">{(['titulaires', 'remplacants'] as const).map(zone => <section key={zone}><h4>{zone === 'titulaires' ? t("ui.81b5ec2f631c") : t("ml.tv.remplacants")}</h4>{Array.from({ length: zone === 'titulaires' ? 15 : 8 }, (_, index) => <button type="button" key={index} onClick={() => { changerJoueur(zone, index, reserveMobile); setReserveMobile(null); setGroupeMobile(zone); }}>{index + (zone === 'titulaires' ? 1 : 16)} · {cartesParId.get(composition[zone][index])?.nom ?? t("sv.libre")}</button>)}</section>)}</div></div>}
        {emplacementMobile && <div className="solo-compo-mobile-choix" role="dialog" aria-modal="true" aria-label={t("ui.971104a2bfaa")}>
          <div className="solo-compo-mobile-choix-tete"><div><small>{t("ui.b99f9e177b8b", { v0: emplacementMobile.index + (emplacementMobile.zone === 'titulaires' ? 1 : 16) })}</small><h3>{t("ui.971104a2bfaa")}</h3></div><button type="button" className="btn fantome" onClick={() => setEmplacementMobile(null)}>{t("ov.fermer")}</button></div>
          <input type="search" autoFocus value={rechercheMobile} onChange={e => setRechercheMobile(e.target.value)} placeholder={t("ui.30c2aeaf26f2")} aria-label={t("compoSolo.searchPlayer")} />
          <div className="solo-compo-mobile-grille">{candidatesMobile.map(c => <button type="button" key={c.id} onClick={() => { changerJoueur(emplacementMobile.zone, emplacementMobile.index, c.id); setEmplacementMobile(null); }}><CarteJoueurEnLigne carte={c} compacte /><span>{c.nom}</span><small>{c.clubReel}</small></button>)}</div>
          {cartes.length > candidatesMobile.length && <p>{t("ui.a9415a01b013")}</p>}
        </div>}
      </section>

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
    </div>
  );
}
