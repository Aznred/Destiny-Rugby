import { useMemo, useState } from 'react';
import { Icone } from './Icone';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Selecteur } from './Selecteur';
import { CompositionTerrainManager } from './CompositionTerrainManager';
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

const NOM_AFFINITE: Record<Affinite, string> = {
  club: 'du même club réel',
  nation: 'de la même nation',
  championnat: 'du même championnat',
};

function legendeAffinite(a: AffiniteCarte): string {
  const bonus = bonusCollectif(a.points);
  const entete = `Collectif ${a.points}/${COLLECTIF_MAX} · ${bonus >= 0 ? '+' : ''}${bonus} de note`;
  const detail = `${a.club} du même club · ${a.nation} de la même nation · ${a.championnat} du même championnat`;
  if (!a.meilleure) return `${entete}\naucune affinité sur cette feuille\n${detail}`;
  const tailles: Record<Affinite, number> = { club: a.club, nation: a.nation, championnat: a.championnat };
  const compte = `${tailles[a.meilleure]} titulaires ${NOM_AFFINITE[a.meilleure]}`;
  const manque = a.points < COLLECTIF_MAX && a.club > 0 && a.club < 4
    ? `\nIl manque ${4 - a.club} joueur${4 - a.club > 1 ? 's' : ''} de son club pour le maximum.` : '';
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
      setNotification('Feuille de match enregistrée avec succès !');
      onEnregistrer?.(composition);
      setTimeout(() => setNotification(''), 3000);
    } catch {
      setNotification('Erreur lors de la sauvegarde locale.');
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
      setNotification(`Équipe « ${nouvelle.nom} » sauvegardée !`);
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
          <h2>Feuille de match de la Collection Solo</h2>
          <button type="button" className="btn fantome solo-compo-fermer" onClick={onFermer}>
            <Icone nom="croix" taille={18} /> Fermer
          </button>
        </header>
        <div className="cel-vide" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icone nom="equipe" taille={48} />
          <h3>Effectif insuffisant ({cartes.length} / 23 cartes)</h3>
          <p>
            Il te faut au moins 23 cartes dans ta collection solo pour aligner un XV titulaire et 8 remplaçants.
            Ouvre des packs gratuits (Bronze, Argent, Or) dans la boutique pour compléter ton effectif !
          </p>
          <button type="button" className="btn primaire" onClick={onFermer} style={{ marginTop: '1rem' }}>
            Retour à la boutique et aux packs
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
          {vueEtendue ? 'Réduire la vue' : 'Vue équipe entière'}
        </button>

        <div className="cel-chiffres-compo">
          <div className="cel-note-compo">
            <b>{noteXV.toFixed(1)}</b>
            <span>note du XV</span>
          </div>
          <div
            className={`cel-collectif cel-collectif-${paliersCollectif(collectif.total)}`}
            title={`Collectif ${collectif.total}/100 — Quatre joueurs d’un même club réel les mettent tous au maximum ; à défaut la nation ou le championnat. Le banc ne compte pas.`}
          >
            <span>collectif</span>
            <div className="cel-collectif-jauge">
              <i style={{ width: `${collectif.total}%` }} />
            </div>
            <b>{collectif.total}</b>
          </div>
        </div>

        <div>
          <div className="eyebrow">
            {composition.titulaires.length + composition.remplacants.length} / {cartes.length} cartes
          </div>
          <h2>Feuille de Match Collection Solo</h2>
          <p>Le capitaine tient la discipline, le buteur tire les pénalités.</p>
        </div>

        <button
          type="button"
          className="btn primaire"
          disabled={!modifie}
          onClick={enregistrerFeuille}
        >
          {modifie ? 'Enregistrer la feuille' : 'Feuille enregistrée'}
        </button>

        <button type="button" className="btn fantome solo-compo-fermer" onClick={onFermer}>
          <Icone nom="croix" taille={18} /> Fermer
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
          title="Assemble automatiquement la meilleure équipe combinant note et collectif sans aucun malus de poste"
        >
          <Icone nom="eclair" taille={16} />
          <span>Assembler la meilleure équipe</span>
        </button>

        <details className="cel-details-outils">
          <summary className="btn cel-btn-outil">
            <Icone nom="disquette" taille={15} />
            <span>Équipes sauvegardées ({sauvegardees.length}/15)</span>
            <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
          </summary>
          <div className="cel-outils-contenu">
            <p className="cel-note">
              Sauvegarde tes compositions favorites créées avec ta collection personnelle.
            </p>
            <div className="cel-actions">
              <input
                aria-label="Nom de l’équipe"
                maxLength={40}
                placeholder="Nom de l’équipe (ex: Mon XV Top 14)"
                value={nomEquipe}
                onChange={(e) => setNomEquipe(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={nomEquipe.trim().length < 2 || sauvegardees.length >= 15}
                onClick={sauvegarderNouvelleEquipe}
              >
                Sauvegarder
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
                  Charger
                </button>
                <button
                  type="button"
                  className="btn fantome"
                  onClick={() => supprimerEquipeSauvegardee(eq.id)}
                  aria-label={`Supprimer ${eq.nom}`}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </details>

        <details className="cel-details-outils">
          <summary className="btn cel-btn-outil">
            <Icone nom="loupe" taille={15} />
            <span>Filtrer les réserves</span>
            <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
          </summary>
          <div className="cel-outils-contenu cel-filtres-reserves">
            <Choix
              label="Compétition"
              valeur={filtreChampionnat}
              options={[['', 'Toutes'], ...optionsFiltre('championnat').map((v) => [v, v] as [string, string])]}
              onChange={(v) => {
                setFiltreChampionnat(v);
                setFiltreClub('');
              }}
            />
            <Choix
              label="Club"
              valeur={filtreClub}
              options={[
                ['', 'Tous'],
                ...optionsFiltre('clubReel')
                  .filter((v) => !filtreChampionnat || cartes.some((c) => c.clubReel === v && c.championnat === filtreChampionnat))
                  .map((v) => [v, v] as [string, string]),
              ]}
              onChange={setFiltreClub}
            />
            <Choix
              label="Pays"
              valeur={filtrePays}
              options={[['', 'Tous'], ...optionsFiltre('pays').map((v) => [v, v] as [string, string])]}
              onChange={setFiltrePays}
            />
            <Choix
              label="Poste"
              valeur={filtrePoste}
              options={[
                ['', 'Tous'],
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
          return <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />;
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
