import { texteTraduit, t } from '../lib/i18n';
import { useState, useMemo, useCallback } from 'react';
import {
  CATEGORIES_SITUATIONS,
  SITUATIONS_LABORATOIRE,
} from '../lib/ligue/catalogueSituationsTest';
import { DirectCinema } from './match/DirectCinema';
import { Icone } from './Icone';
import './BancDessaiSituations.css';

interface Props {
  className?: string;
}

const LIBELLES_PHASE: Record<string, string> = {
  tmo: 'Arbitrage vidéo (TMO)',
  ruck: 'Ruck contesté',
  maul: 'Ballon porté (Maul)',
  melee: 'Mêlée fermée',
  touche: 'Alignement touche',
  penalite: 'Pénalité',
  aplatissage: 'Essai & Aplatissage',
  tirAuBut: 'Tentative au but',
  transformation: 'Transformation',
  bagarre: 'Échauffourée générale',
  jeuCourant: 'Jeu courant',
  ballonLibre: 'Ballon libre',
  coupEnvoi: 'Coup d’envoi',
  renvoi22: 'Renvoi aux 22',
};

const LIBELLES_GESTES_ARBITRE: Record<string, string> = {
  ref_red: 'Carton rouge direct',
  ref_yellow: 'Carton jaune (10 min)',
  ref_penalty: 'Pénalité sifflée',
  ref_try: 'Essai accordé',
  ref_knockon: 'En-avant signalé',
  ref_timeoff: 'Arrêt de jeu TMO',
  ref_scrum: 'Mêlée ordonnée',
  ref_whistle: 'Coup de sifflet',
  ref_tmo: 'Signal TMO officiel',
};

const LIBELLES_CADRAGE: Record<string, string> = {
  tmo: 'Replay vidéo broadcast',
  proche: 'Plan serré dynamique',
  suivi: 'Caméra travelling',
  large: 'Plan large tactique',
};

const LIBELLES_SCENARIO: Record<string, string> = {
  tmo: 'Vérification vidéo',
  ruck: 'Combat au sol & sortie',
  maul: 'Avancée collective',
  melee: 'Poussée du pack',
  touche: 'Prise de balle aérienne',
  aplatissage: 'Finition en coin',
  penalite: 'Sanction arbitrale',
  jeuCourant: 'Attaque en mouvement',
  ballonLibre: 'Bataille pour la possession',
  transformation: 'Transformation & Rituel',
};

export function BancDessaiSituations({ className }: Props) {
  const [categorieActive, setCategorieActive] = useState<string>('toutes');
  const [situationId, setSituationId] = useState<string>(SITUATIONS_LABORATOIRE[0]?.id ?? 'tmo_essai_valide');
  const [cleRejouer, setCleRejouer] = useState<number>(0);
  const [enLecture, setEnLecture] = useState<boolean>(true);
  const [vitesse, setVitesse] = useState<number>(1);

  // Filtrage des situations selon la catégorie choisie
  const situationsFiltrees = useMemo(() => {
    if (categorieActive === 'toutes') return SITUATIONS_LABORATOIRE;
    return SITUATIONS_LABORATOIRE.filter(s => s.categorie === categorieActive);
  }, [categorieActive]);

  // Situation actuellement active
  const situationActive = useMemo(() => {
    return SITUATIONS_LABORATOIRE.find(s => s.id === situationId) ?? SITUATIONS_LABORATOIRE[0]!;
  }, [situationId]);

  // Index de la situation dans la liste filtrée
  const indexDansFiltre = situationsFiltrees.findIndex(s => s.id === situationActive.id);
  const indexGlobal = SITUATIONS_LABORATOIRE.findIndex(s => s.id === situationActive.id);

  // Génération du match synthétique pour le direct
  const matchDirect = useMemo(() => {
    return situationActive.fabriquer(cleRejouer);
  }, [situationActive, cleRejouer]);

  // Navigation Précédent / Suivant
  const allerPrecedent = useCallback(() => {
    const total = situationsFiltrees.length;
    if (total <= 1) return;
    const nouvelIndex = (indexDansFiltre - 1 + total) % total;
    const cible = situationsFiltrees[nouvelIndex];
    if (cible) setSituationId(cible.id);
  }, [situationsFiltrees, indexDansFiltre]);

  const allerSuivant = useCallback(() => {
    const total = situationsFiltrees.length;
    if (total <= 1) return;
    const nouvelIndex = (indexDansFiltre + 1) % total;
    const cible = situationsFiltrees[nouvelIndex];
    if (cible) setSituationId(cible.id);
  }, [situationsFiltrees, indexDansFiltre]);

  // Sélection aléatoire
  const allerAleatoire = useCallback(() => {
    const pool = situationsFiltrees.length > 1 ? situationsFiltrees : SITUATIONS_LABORATOIRE;
    const autres = pool.filter(s => s.id !== situationActive.id);
    const choix = autres[Math.floor(Math.random() * autres.length)] ?? pool[0];
    if (choix) setSituationId(choix.id);
  }, [situationsFiltrees, situationActive.id]);

  // Rejouer l'animation courante
  const rejouer = useCallback(() => {
    setCleRejouer(prev => prev + 1);
  }, []);

  const tmo = matchDirect.terrain?.tmo;

  return (
    <section className={`banc-situations cel-panneau ${className ?? ''}`}>
      {/* ── EN-TÊTE DU BANC D'ESSAI ── */}
      <header className="banc-situations-entete">
        <div className="banc-situations-titres">
          <div className="eyebrow">{t("ui.54f066a1ea70")}</div>
          <h2>{t("ui.9b4f7eefc9b0")}</h2>
          <p>{t("ui.c86fb5b41d83")}</p>
        </div>
        <div className="banc-situations-actions-rapides">
          <button
            type="button"
            className="btn fantome"
            onClick={allerAleatoire}
            title={t("ui.0a3983a778f4")}
          >
            <Icone nom="eclair" taille={16} />{t("ui.e647b9c81fad")}</button>
          <button
            type="button"
            className={`btn ${enLecture ? 'fantome' : 'primaire'}`}
            onClick={() => setEnLecture((l) => !l)}
            title={enLecture ? t("ui.4ae791b14933") : t("ui.f0be9ff887d9")}
          >
            <Icone nom={enLecture ? 'stop' : 'chrono'} taille={16} />
            {enLecture ? t("ml.pause") : t("ui.a757c6b4039f")}
          </button>
          <button
            type="button"
            className={`btn ${vitesse === 0.5 ? 'secondaire' : 'fantome'}`}
            onClick={() => setVitesse((v) => (v === 1 ? 0.5 : 1))}
            title={vitesse === 0.5 ? t("ui.4482ecf95dfb") : t("ui.edd05f57c1fa")}
          >
            <Icone nom="chrono" taille={16} />
            {vitesse === 0.5 ? t("ui.e315ed404122") : t("ui.34d66e741b67")}
          </button>
          <button
            type="button"
            className="btn primaire"
            onClick={rejouer}
            title={t("ui.fbe0214db2df")}
          >
            <Icone nom="bouclier" taille={16} />{t("ui.5bb58abde10c")}</button>
        </div>
      </header>

      {/* ── ONGLET DES CATÉGORIES ── */}
      <nav className="banc-situations-categories" aria-label={t("ui.56cfaf71b1e1")}>
        <button
          type="button"
          className={`banc-cat-btn ${categorieActive === 'toutes' ? 'actif' : ''}`}
          onClick={() => setCategorieActive('toutes')}
        >
          <Icone nom="stade" taille={15} />
          <span>{t("compoSolo.allFeminine")}</span>
          <span className="banc-cat-badge">{SITUATIONS_LABORATOIRE.length}</span>
        </button>
        {CATEGORIES_SITUATIONS.map(cat => {
          const compte = SITUATIONS_LABORATOIRE.filter(s => s.categorie === cat.id).length;
          const actif = categorieActive === cat.id;
          return (
            <button
              type="button"
              key={cat.id}
              className={`banc-cat-btn ${actif ? 'actif' : ''}`}
              onClick={() => setCategorieActive(cat.id)}
              title={texteTraduit(cat.description)}
            >
              <Icone nom={cat.icone} taille={15} />
              <span>{cat.nom}</span>
              <span className="banc-cat-badge">{compte}</span>
            </button>
          );
        })}
      </nav>

      {/* ── SÉLECTEUR DE SITUATION EN VIGNETTES ── */}
      <div className="banc-situations-grille" role="tablist">
        {situationsFiltrees.map((s, idx) => {
          const estActive = s.id === situationActive.id;
          const cat = CATEGORIES_SITUATIONS.find(c => c.id === s.categorie);
          return (
            <button
              type="button"
              key={s.id}
              role="tab"
              aria-selected={estActive}
              className={`banc-sit-vignette ${estActive ? 'actif' : ''}`}
              onClick={() => setSituationId(s.id)}
            >
              <div className="banc-sit-vignette-haut">
                <span className="banc-sit-numero">#{idx + 1}</span>
                {s.badge && <span className="banc-sit-badge">{s.badge}</span>}
              </div>
              <strong className="banc-sit-titre">{texteTraduit(s.titre)}</strong>
              <small className="banc-sit-soustitre">{s.sousTitre}</small>
              <div className="banc-sit-meta">
                {cat && (
                  <span className="banc-sit-cat-tag">
                    <Icone nom={cat.icone} taille={12} />
                    {cat.nom.split(' ')[0]}
                  </span>
                )}
                <span className="banc-sit-phase-tag">{LIBELLES_PHASE[s.phase] ?? s.phase}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── BANDEAU DE NAVIGATION INTER-SITUATIONS ── */}
      <div className="banc-situations-barre-nav">
        <button
          type="button"
          className="btn fantome btn-nav"
          onClick={allerPrecedent}
          disabled={situationsFiltrees.length <= 1}
        >
          <Icone nom="chevron" taille={14} />{t("ui.9aff6c5679b2")}</button>

        <div className="banc-nav-info">
          <span className="banc-nav-compteur">{t("ui.00e3bd2e750b")}<b>{indexGlobal + 1}</b> / {SITUATIONS_LABORATOIRE.length}
          </span>
          <span className="banc-nav-titre-actif">{texteTraduit(situationActive.titre)}</span>
        </div>

        <button
          type="button"
          className="btn fantome btn-nav"
          onClick={allerSuivant}
          disabled={situationsFiltrees.length <= 1}
        >{t("ui.faf9a798db90")}<Icone nom="chevron" taille={14} />
        </button>
      </div>

      {/* ── ÉCRAN DE VISUALISATION CINÉMA DU MATCH EN DIRECT ── */}
      <div className="banc-situations-cinema">
        <DirectCinema
          key={`${situationActive.id}_${cleRejouer}`}
          match={matchDirect}
          domicile="Stade Toulousain"
          exterieur="Stade Rochelais"
          couleurs={{
            domicile: '#c1121f',
            exterieur: '#eab308',
          }}
          modeDemo={true}
          pause={!enLecture}
          vitesseDemo={vitesse}
        />
      </div>

      {/* ── INSPECTEUR TECHNIQUE & RÈGLES OFFICIELLES ── */}
      <aside className="banc-situations-inspecteur">
        <div className="banc-inspecteur-bloc">
          <div className="eyebrow">{t("ui.6599614153ea")}</div>
          <h3>{texteTraduit(situationActive.titre)}</h3>
          <p className="banc-desc">{texteTraduit(situationActive.description)}</p>
        </div>

        <div className="banc-inspecteur-bloc banc-bloc-regle">
          <div className="eyebrow">{t("ui.b661db057602")}</div>
          <div className="banc-regle-texte">
            <Icone nom="sifflet" taille={18} />
            <p>{situationActive.regle}</p>
          </div>
        </div>

        <div className="banc-inspecteur-grille-details">
          <div className="banc-detail-card">
            <span className="banc-detail-label">{t("ui.aa1b5f572cb0")}</span>
            <strong className="banc-detail-valeur">{LIBELLES_PHASE[situationActive.phase] ?? situationActive.phase}</strong>
          </div>
          <div className="banc-detail-card">
            <span className="banc-detail-label">{t("ui.11caf21b10b8")}</span>
            <strong className="banc-detail-valeur">{LIBELLES_CADRAGE[situationActive.cadrage] ?? situationActive.cadrage}</strong>
          </div>
          <div className="banc-detail-card">
            <span className="banc-detail-label">{t("ui.e2aeb22581d8")}</span>
            <strong className="banc-detail-valeur">
              {situationActive.gesteArbitre ? (LIBELLES_GESTES_ARBITRE[situationActive.gesteArbitre] ?? situationActive.gesteArbitre) : t("ui.4679b3b12de0")}
            </strong>
          </div>
          <div className="banc-detail-card">
            <span className="banc-detail-label">{t("ui.25bdfebb5ee3")}</span>
            <strong className="banc-detail-valeur">{LIBELLES_SCENARIO[situationActive.scenarioType] ?? situationActive.scenarioType}</strong>
          </div>
        </div>

        {/* Détails spécifiques Arbitrage Vidéo TMO */}
        {tmo && (
          <div className="banc-tmo-inspecteur-panel">
            <div className="banc-tmo-inspecteur-entete">
              <Icone nom="video" taille={18} />
              <b>{t("ui.b58622ea9e65", { v0: tmo.action })}</b>
            </div>
            <div className="banc-tmo-inspecteur-corps">
              <div className="banc-tmo-ligne">
                <span>{t("ui.918a0f543f69")}</span>
                <strong>{tmo.decision}</strong>
              </div>
              <div className="banc-tmo-ligne">
                <span>{t("ui.2867bada2db2")}</span>
                <code>{tmo.cadreCamera}</code>
              </div>
              {tmo.explication && (
                <div className="banc-tmo-ligne explication">
                  <span>{t("ui.10bfb1d0c332")}</span>
                  <p>{tmo.explication}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

export default BancDessaiSituations;
