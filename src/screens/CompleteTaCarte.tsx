import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../components/Icone';
import { Blason } from '../components/Blason';
import { EffectifClubPropose } from '../components/EffectifClubPropose';
import { Selecteur } from '../components/Selecteur';
import { FormulaireCarteNormale } from '../components/FormulaireCarteNormale';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import {
  appelCartes,
  carteNormaleVide,
  saisieDepuisSource,
  validerCarteNormale,
  type DemandeCarte,
  type PropositionClub,
  type SaisieCarteNormale,
} from '../lib/cartesNormales';
import { carteDepuisSource, type SourceCarte } from '../lib/ligue/catalogueCarriere';
import { POSTE_PAR_ID } from '../data/rugby';
import { preparerPortrait } from '../lib/imagesJoueurs';
import { useGame } from '../store/useGame';
import '../components/CartesNormales.css';

const DIVISIONS_POPULAIRES = [
  'Top 14',
  'Pro D2',
  'Nationale',
  'Nationale 2',
  'Fédérale 1',
  'Fédérale 2',
  'Fédérale 3',
  'Régionale 1',
  'Régionale 2',
  'Régionale 3',
  'Élite 1 (Féminin)',
  'Élite 2 (Féminin)',
  'Premiership (Angleterre)',
  'United Rugby Championship',
  'Super Rugby Pacific',
  'Major League Rugby',
  'Autre division',
];

const PALETTES_COULEURS = [
  { nom: 'Bleu & Or', c1: '#1e3a8a', c2: '#ffd700' },
  { nom: 'Rouge & Noir', c1: '#dc2626', c2: '#111827' },
  { nom: 'Ciel & Blanc', c1: '#38bdf8', c2: '#ffffff' },
  { nom: 'Vert & Blanc', c1: '#15803d', c2: '#ffffff' },
  { nom: 'Jaune & Bleu', c1: '#eab308', c2: '#1e3a8a' },
  { nom: 'Grenat & Bleu', c1: '#831843', c2: '#1e3a8a' },
  { nom: 'Noir & Blanc', c1: '#0f172a', c2: '#ffffff' },
  { nom: 'Violet & Blanc', c1: '#6b21a8', c2: '#ffffff' },
];

export function CompleteTaCarte() {
  const setEcran = useGame((s) => s.setEcran);
  const [onglet, setOnglet] = useState<'correction' | 'creation' | 'club' | 'retrait' | 'mesDemandes'>('correction');
  const [filtreMesDemandes, setFiltreMesDemandes] = useState<'toutes' | 'attente' | 'acceptee' | 'refusee'>('toutes');

  // État commun
  const [demandes, setDemandes] = useState<DemandeCarte[]>([]);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [nonConnecte, setNonConnecte] = useState(false);

  // Case certification des droits d'image
  const [droitsCertifies, setDroitsCertifies] = useState(false);

  // Onglet Correction
  const [q, setQ] = useState('');
  const [sources, setSources] = useState<SourceCarte[]>([]);
  const [sourceId, setSourceId] = useState<string>();
  const [carteCorrection, setCarteCorrection] = useState<SaisieCarteNormale>(carteNormaleVide);
  const [messageCorrection, setMessageCorrection] = useState('');

  // Onglet Création de joueur
  const [carteCreation, setCarteCreation] = useState<SaisieCarteNormale>(carteNormaleVide);
  const [messageCreation, setMessageCreation] = useState('');

  // Onglet Retrait de carte
  const [qRetrait, setQRetrait] = useState('');
  const [sourcesRetrait, setSourcesRetrait] = useState<SourceCarte[]>([]);
  const [carteRetraitSelectionnee, setCarteRetraitSelectionnee] = useState<SourceCarte | null>(null);
  const [motifRetrait, setMotifRetrait] = useState("Droit à l'image / Vie privée");
  const [detailsRetrait, setDetailsRetrait] = useState('');
  const [certificationRetrait, setCertificationRetrait] = useState(false);

  // Onglet Proposer un club
  const [nomClub, setNomClub] = useState('');
  const [divisionChoisie, setDivisionChoisie] = useState(DIVISIONS_POPULAIRES[0]);
  const [divisionAutre, setDivisionAutre] = useState('');
  const [villeClub, setVilleClub] = useState('');
  const [paysClub, setPaysClub] = useState('France');
  const [logoClub, setLogoClub] = useState<string>();
  const [couleur1, setCouleur1] = useState('#1e3a8a');
  const [couleur2, setCouleur2] = useState('#ffd700');
  const [joueursClub, setJoueursClub] = useState<SaisieCarteNormale[]>([]);
  const [messageClub, setMessageClub] = useState('');
  const [formulaireJoueurClubOuvert, setFormulaireJoueurClubOuvert] = useState(false);
  const divisionFinale = divisionChoisie === 'Autre division' ? divisionAutre.trim() || 'Division personnalisée' : divisionChoisie;

  // Charger les demandes existantes
  const chargerDemandes = async () => {
    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>();
      setDemandes(d.demandes);
      setNonConnecte(false);
    } catch (e) {
      const err = e as Error;
      if (err.message.includes('Connecte ton compte')) {
        setNonConnecte(true);
      } else {
        setErreur(err.message);
      }
    }
  };

  useEffect(() => {
    void chargerDemandes();
  }, []);

  // Recherche de carte à corriger
  const chercherCarte = async () => {
    if (!q.trim()) return;
    setOccupe(true);
    setErreur('');
    try {
      const rep = await appelCartes<{ cartes: SourceCarte[] }>(undefined, `&q=${encodeURIComponent(q)}`);
      setSources(rep.cartes);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Soumission d'une correction
  const soumettreCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) {
      setErreur('Sélectionne une carte à corriger.');
      return;
    }
    if (!droitsCertifies) {
      setErreur("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
      return;
    }
    setOccupe(true);
    setErreur('');
    setSucces('');
    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>({
        action: 'demandesCartes',
        operation: 'soumettre',
        type: 'correction',
        sourceId,
        carte: validerCarteNormale(carteCorrection),
        message: messageCorrection,
        droitsCertifies: true,
      });
      setDemandes(d.demandes);
      setSucces('Demande de correction envoyée avec succès ! Elle sera examinée par le Labo.');
      setDroitsCertifies(false);
      setMessageCorrection('');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Soumission d'une création de joueur
  const soumettreCreationJoueur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carteCreation.nom.trim()) {
      setErreur('Renseigne le prénom et le nom du joueur.');
      return;
    }
    if (!droitsCertifies) {
      setErreur("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
      return;
    }
    setOccupe(true);
    setErreur('');
    setSucces('');
    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>({
        action: 'demandesCartes',
        operation: 'soumettre',
        type: 'creation',
        carte: validerCarteNormale(carteCreation),
        message: messageCreation,
        droitsCertifies: true,
      });
      setDemandes(d.demandes);
      setSucces('Proposition de joueur envoyée avec succès ! Elle sera examinée par le Labo.');
      setCarteCreation(carteNormaleVide());
      setDroitsCertifies(false);
      setMessageCreation('');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Soumission d'une proposition de club
  const soumettrePropositionClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomClub.trim()) {
      setErreur('Renseigne le nom du club.');
      return;
    }
    if (formulaireJoueurClubOuvert) {
      setErreur('Ajoute le joueur en cours à l’effectif ou annule sa saisie avant d’envoyer le club.');
      return;
    }
    if (!divisionFinale.trim()) {
      setErreur('Précise la division du club.');
      return;
    }
    if (!droitsCertifies) {
      setErreur("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
      return;
    }
    setOccupe(true);
    setErreur('');
    setSucces('');

    const clubPropose: PropositionClub = {
      nom: nomClub.trim(),
      division: divisionFinale,
      ville: villeClub.trim() || undefined,
      pays: paysClub.trim() || 'France',
      logo: logoClub,
      c1: couleur1,
      c2: couleur2,
      joueurs: joueursClub,
    };

    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>({
        action: 'demandesCartes',
        operation: 'soumettre',
        type: 'club',
        clubPropose,
        message: messageClub,
        droitsCertifies: true,
      });
      setDemandes(d.demandes);
      setSucces('Proposition de club envoyée avec succès ! Elle sera examinée par le Labo.');
      setNomClub('');
      setVilleClub('');
      setLogoClub(undefined);
      setJoueursClub([]);
      setMessageClub('');
      setDroitsCertifies(false);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Aperçu du blason pour le club proposé
  const clubApercu = useMemo(
    () => ({
      nom: nomClub.trim() || 'Nouveau Club',
      ville: villeClub.trim() || undefined,
      c1: couleur1,
      c2: couleur2,
      logo: logoClub,
    }),
    [nomClub, villeClub, couleur1, couleur2, logoClub],
  );

  // Recherche de carte à retirer
  const chercherCarteRetrait = async () => {
    if (!qRetrait.trim()) return;
    setOccupe(true);
    setErreur('');
    try {
      const rep = await appelCartes<{ cartes: SourceCarte[] }>(undefined, `&q=${encodeURIComponent(qRetrait)}`);
      setSourcesRetrait(rep.cartes);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Soumission d'une demande de retrait
  const soumettreRetrait = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carteRetraitSelectionnee) {
      setErreur('Sélectionne la carte que tu souhaites retirer.');
      return;
    }
    if (!certificationRetrait) {
      setErreur("Tu dois certifier sur l'honneur ta demande de retrait.");
      return;
    }
    setOccupe(true);
    setErreur('');
    setSucces('');
    const messageFinal = detailsRetrait.trim()
      ? `${motifRetrait} : ${detailsRetrait.trim()}`
      : motifRetrait;
    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>({
        action: 'demandesCartes',
        operation: 'soumettre',
        type: 'retrait',
        sourceId: carteRetraitSelectionnee.sourceId,
        carte: saisieDepuisSource(carteRetraitSelectionnee),
        message: messageFinal,
        droitsCertifies: true,
      });
      setDemandes(d.demandes);
      setSucces('Ta demande de retrait a été envoyée avec succès au Labo pour validation.');
      setCarteRetraitSelectionnee(null);
      setDetailsRetrait('');
      setCertificationRetrait(false);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Annulation d'une demande par son auteur
  const annulerDemande = async (id: string) => {
    if (!window.confirm('Es-tu sûr de vouloir retirer / annuler cette proposition ?')) return;
    setOccupe(true);
    setErreur('');
    setSucces('');
    try {
      const d = await appelCartes<{ demandes: DemandeCarte[] }>({
        action: 'demandesCartes',
        operation: 'annuler',
        id,
      });
      setDemandes(d.demandes);
      setSucces('Demande annulée avec succès.');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="complete-carte-page">
      <header className="complete-carte-entete">
        <div className="complete-carte-titre-zone">
          <span className="complete-carte-badge">
            <Icone nom="maillot" taille={18} /> Contribution
          </span>
          <h1>Complète ta carte</h1>
          <p>
            Participe à l&apos;évolution de Destiny Rugby ! Propose un nouveau club avec sa division et son effectif,
            ajoute un joueur manquant, corrige une carte existante ou demande le retrait d&apos;une carte.
          </p>
        </div>

        {nonConnecte && (
          <aside className="complete-carte-alerte-compte" role="status">
            <Icone nom="alerte" taille={20} />
            <div>
              <b>Connecte ton compte en ligne</b>
              <p>Pour envoyer des propositions de clubs ou de cartes et suivre leur validation par Kiri, rejoins le mode en ligne.</p>
            </div>
            <button type="button" className="btn primaire" onClick={() => setEcran('carriereEnLigne')}>
              Se connecter
            </button>
          </aside>
        )}

        <nav className="complete-carte-onglets" aria-label="Modes de contribution">
          <button
            type="button"
            className={onglet === 'correction' ? 'actif' : ''}
            onClick={() => {
              setOnglet('correction');
              setErreur('');
              setSucces('');
            }}
          >
            <Icone nom="loupe" taille={17} />
            <span>Corriger une carte</span>
          </button>
          <button
            type="button"
            className={onglet === 'creation' ? 'actif' : ''}
            onClick={() => {
              setOnglet('creation');
              setErreur('');
              setSucces('');
            }}
          >
            <Icone nom="joueur" taille={17} />
            <span>Créer un joueur</span>
          </button>
          <button
            type="button"
            className={onglet === 'club' ? 'actif' : ''}
            onClick={() => {
              setOnglet('club');
              setErreur('');
              setSucces('');
            }}
          >
            <Icone nom="clubs" taille={17} />
            <span>Proposer un club</span>
          </button>
          <button
            type="button"
            className={onglet === 'retrait' ? 'actif' : ''}
            onClick={() => {
              setOnglet('retrait');
              setErreur('');
              setSucces('');
            }}
          >
            <Icone nom="corbeille" taille={17} />
            <span>Retirer sa carte</span>
          </button>
          <button
            type="button"
            className={onglet === 'mesDemandes' ? 'actif' : ''}
            onClick={() => {
              setOnglet('mesDemandes');
              setErreur('');
              setSucces('');
              void chargerDemandes();
            }}
          >
            <Icone nom="dossier" taille={17} />
            <span>Mes propositions</span>
            {demandes.length > 0 && <span className="complete-carte-bulle-compteur">{demandes.length}</span>}
          </button>
        </nav>
      </header>

      {erreur && (
        <div className="complete-carte-message erreur" role="alert">
          <Icone nom="stop" taille={18} />
          <span>{erreur}</span>
        </div>
      )}
      {succes && (
        <div className="complete-carte-message succes" role="status">
          <Icone nom="ok" taille={18} />
          <span>{succes}</span>
        </div>
      )}

      {/* ONGLET 1 : CORRIGER UNE CARTE */}
      {onglet === 'correction' && (
        <section className="complete-carte-section">
          <div className="complete-carte-bloc-recherche">
            <h2>Rechercher la carte à corriger</h2>
            <p>Saisis le prénom, le nom ou le club du joueur que tu souhaites corriger dans la base de données.</p>
            <div className="cn-recherche-barre">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void chercherCarte();
                }}
                placeholder="Ex : Dupont, Ntamack, Alldritt..."
              />
              <button type="button" className="btn primaire" disabled={occupe || !q.trim()} onClick={() => void chercherCarte()}>
                <Icone nom="loupe" taille={16} /> Rechercher
              </button>
            </div>

            {sources.length > 0 && (
              <div className="cn-resultats-grille">
                {sources.map((s) => (
                  <button
                    type="button"
                    key={s.sourceId}
                    className={`cn-carte-choix ${sourceId === s.sourceId ? 'choisie' : ''}`}
                    onClick={() => {
                      setSourceId(s.sourceId);
                      setCarteCorrection(saisieDepuisSource(s));
                      setSucces('');
                      setErreur('');
                    }}
                  >
                    <b>{s.nom}</b>
                    <small>
                      {s.clubReel} · {s.note} GEN · {s.age} ans
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sourceId ? (
            <form onSubmit={soumettreCorrection} className="complete-carte-formulaire-conteneur">
              <div className="complete-carte-sous-titre">
                <h3>Correction de : {carteCorrection.nom}</h3>
                <small>Modifie les attributs erronés, le club ou propose un nouveau portrait.</small>
              </div>

              <FormulaireCarteNormale
                carte={carteCorrection}
                changer={setCarteCorrection}
                occupe={occupe}
                onPreparation={setOccupe}
              />

              <div className="complete-carte-champ">
                <label htmlFor="msg-correction">
                  <b>Informations complémentaires ou sources</b>
                  <small>Lien officiel, article, justification des changements...</small>
                </label>
                <textarea
                  id="msg-correction"
                  rows={3}
                  maxLength={500}
                  placeholder="Ex : Changement officiel de club au mercato d'été, poste régulier en championnat..."
                  value={messageCorrection}
                  onChange={(e) => setMessageCorrection(e.target.value)}
                />
              </div>

              {/* CASE OBLIGATOIRE DROITS D'IMAGE */}
              <label className="cn-droits">
                <input
                  type="checkbox"
                  required
                  checked={droitsCertifies}
                  onChange={(e) => setDroitsCertifies(e.target.checked)}
                />
                <span>Je certifie avoir les droits d'utilisation de l'image postée ou des images postées.</span>
              </label>

              <div className="complete-carte-actions-fin">
                <button
                  type="submit"
                  className="btn primaire grande"
                  disabled={occupe || !droitsCertifies}
                >
                  <Icone nom="check" taille={18} /> Envoyer la demande de correction
                </button>
              </div>
            </form>
          ) : (
            <div className="complete-carte-vide">
              <Icone nom="loupe" taille={36} />
              <p>Recherche et sélectionne une carte ci-dessus pour la modifier.</p>
            </div>
          )}
        </section>
      )}

      {/* ONGLET 2 : CRÉER UN JOUEUR */}
      {onglet === 'creation' && (
        <section className="complete-carte-section">
          <form onSubmit={soumettreCreationJoueur} className="complete-carte-formulaire-conteneur">
            <div className="complete-carte-sous-titre">
              <h2>Créer un joueur manquant</h2>
              <p>Renseigne l&apos;identité, les statistiques et le club du joueur à ajouter au catalogue.</p>
            </div>

            <FormulaireCarteNormale
              carte={carteCreation}
              changer={setCarteCreation}
              occupe={occupe}
              onPreparation={setOccupe}
            />

            <div className="complete-carte-champ">
              <label htmlFor="msg-creation">
                <b>Informations complémentaires ou sources</b>
                <small>Sources officielles, fiche club, palmarès ou parcours...</small>
              </label>
              <textarea
                id="msg-creation"
                rows={3}
                maxLength={500}
                placeholder="Ex : Joueur intégrant l'équipe première cette saison, source : site du club..."
                value={messageCreation}
                onChange={(e) => setMessageCreation(e.target.value)}
              />
            </div>

            {/* CASE OBLIGATOIRE DROITS D'IMAGE */}
            <label className="cn-droits">
              <input
                type="checkbox"
                required
                checked={droitsCertifies}
                onChange={(e) => setDroitsCertifies(e.target.checked)}
              />
              <span>Je certifie avoir les droits d'utilisation de l'image postée ou des images postées.</span>
            </label>

            <div className="complete-carte-actions-fin">
              <button
                type="submit"
                className="btn primaire grande"
                disabled={occupe || !carteCreation.nom.trim() || !droitsCertifies}
              >
                <Icone nom="check" taille={18} /> Envoyer la proposition de joueur
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ONGLET 3 : PROPOSER UN NOUVEAU CLUB */}
      {onglet === 'club' && (
        <section className="complete-carte-section">
          <form onSubmit={soumettrePropositionClub} className="complete-carte-formulaire-conteneur">
            <div className="complete-carte-sous-titre">
              <h2>Proposer un nouveau club</h2>
              <p>
                Renseigne les coordonnées du club, sa division, son blason/logo et les joueurs qui composent son effectif.
              </p>
            </div>

            <div className="complete-carte-grille-club">
              <div className="complete-carte-colonne-formulaire">
                <fieldset className="cn-club-fieldset">
                  <legend>1. Identité du club</legend>

                  <label className="complete-carte-champ">
                    <b>Nom du club *</b>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="Ex : US Carcassonne, RC Vannes, Servette Genève..."
                      value={nomClub}
                      onChange={(e) => setNomClub(e.target.value)}
                    />
                  </label>

                  <div className="cn-champs">
                    <label className="complete-carte-champ">
                      <b>Division / Championnat *</b>
                      <Selecteur
                        valeur={divisionChoisie}
                        options={DIVISIONS_POPULAIRES.map((div) => ({ valeur: div, label: div }))}
                        onChange={setDivisionChoisie}
                      />
                    </label>

                    {divisionChoisie === 'Autre division' && (
                      <label className="complete-carte-champ">
                        <b>Précise la division *</b>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          placeholder="Nom de la division ou ligue"
                          value={divisionAutre}
                          onChange={(e) => setDivisionAutre(e.target.value)}
                        />
                      </label>
                    )}

                    <label className="complete-carte-champ">
                      <b>Ville</b>
                      <input
                        type="text"
                        maxLength={80}
                        placeholder="Ex : Carcassonne, Vannes..."
                        value={villeClub}
                        onChange={(e) => setVilleClub(e.target.value)}
                      />
                    </label>

                    <label className="complete-carte-champ">
                      <b>Pays</b>
                      <input
                        type="text"
                        maxLength={80}
                        placeholder="Ex : France, Suisse, Italie..."
                        value={paysClub}
                        onChange={(e) => setPaysClub(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="cn-club-fieldset">
                  <legend>Visuel : Logo et Couleurs du blason</legend>

                  <label className="complete-carte-champ">
                    <b>Importer le logo du club</b>
                    <small>Fichier PNG avec fond transparent recommandé (90 Ko max).</small>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const fichier = e.target.files?.[0];
                        e.target.value = '';
                        if (!fichier) return;
                        setOccupe(true);
                        setErreur('');
                        void (async () => {
                          for (const cote of [256, 180, 128]) {
                            const logo = await preparerPortrait(fichier, cote);
                            if (logo.length <= 90_000) {
                              setLogoClub(logo);
                              return;
                            }
                          }
                          throw new Error('Image trop volumineuse. Choisis un logo plus léger.');
                        })()
                          .catch((err) => setErreur((err as Error).message))
                          .finally(() => setOccupe(false));
                      }}
                    />
                  </label>

                  <label className="complete-carte-champ">
                    <b>Ou adresse web du logo (HTTPS)</b>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={logoClub?.startsWith('https:') ? logoClub : ''}
                      onChange={(e) => setLogoClub(e.target.value || undefined)}
                    />
                  </label>

                  {logoClub && (
                    <button
                      type="button"
                      className="btn fantome petit"
                      onClick={() => setLogoClub(undefined)}
                    >
                      <Icone nom="croix" taille={14} /> Retirer le logo
                    </button>
                  )}

                  <div className="complete-carte-couleurs">
                    <b>Couleurs du blason (repli & maillot)</b>
                    <div className="cn-palettes-rapides">
                      {PALETTES_COULEURS.map((p) => (
                        <button
                          key={p.nom}
                          type="button"
                          className="cn-palette-pastille"
                          title={p.nom}
                          onClick={() => {
                            setCouleur1(p.c1);
                            setCouleur2(p.c2);
                          }}
                        >
                          <span style={{ backgroundColor: p.c1 }} />
                          <span style={{ backgroundColor: p.c2 }} />
                        </button>
                      ))}
                    </div>

                    <div className="cn-champs">
                      <label className="complete-carte-champ-couleur">
                        <span>Couleur principale</span>
                        <div className="cn-input-couleur-wrap">
                          <input
                            type="color"
                            value={couleur1}
                            onChange={(e) => setCouleur1(e.target.value)}
                          />
                          <code>{couleur1}</code>
                        </div>
                      </label>
                      <label className="complete-carte-champ-couleur">
                        <span>Couleur secondaire</span>
                        <div className="cn-input-couleur-wrap">
                          <input
                            type="color"
                            value={couleur2}
                            onChange={(e) => setCouleur2(e.target.value)}
                          />
                          <code>{couleur2}</code>
                        </div>
                      </label>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Aperçu Blason */}
              <aside className="complete-carte-apercu-club">
                <div className="cn-club-card-preview">
                  <div className="cn-club-blason-box">
                    <Blason club={clubApercu} taille={70} />
                  </div>
                  <h4>{nomClub.trim() || 'Nom du club'}</h4>
                  <span className="cn-division-tag">{divisionFinale}</span>
                  {villeClub.trim() && <small>{villeClub} · {paysClub}</small>}
                </div>
              </aside>
            </div>

            <fieldset className="cn-club-fieldset cn-joueurs-section">
              <legend>2. Composition et effectif</legend>
              <EffectifClubPropose club={{ nom: nomClub.trim() || "Club proposé", division: divisionFinale, pays: paysClub,
                logo: logoClub, c1: couleur1, c2: couleur2, joueurs: joueursClub }} changer={setJoueursClub}
                occupe={occupe} onEdition={setFormulaireJoueurClubOuvert} />
            </fieldset>

            <div className="complete-carte-champ">
              <label htmlFor="msg-club">
                <b>Sources et informations complémentaires</b>
                <small>Site officiel du club, liens vers les réseaux sociaux, page Wikipedia ou FFR...</small>
              </label>
              <textarea
                id="msg-club"
                rows={3}
                maxLength={500}
                placeholder="Ex : Club officiel évoluant en Fédérale 1, logo issu de la charte officielle..."
                value={messageClub}
                onChange={(e) => setMessageClub(e.target.value)}
              />
            </div>

            {/* CASE OBLIGATOIRE DROITS D'IMAGE */}
            <label className="cn-droits">
              <input
                type="checkbox"
                required
                checked={droitsCertifies}
                onChange={(e) => setDroitsCertifies(e.target.checked)}
              />
              <span>Je certifie avoir les droits d'utilisation de l'image postée ou des images postées.</span>
            </label>

            <div className="complete-carte-actions-fin">
              <button
                type="submit"
                className="btn primaire grande"
                disabled={occupe || formulaireJoueurClubOuvert || !nomClub.trim() || !droitsCertifies}
              >
                <Icone nom="check" taille={18} /> Envoyer le club et {joueursClub.length === 1 ? 'son joueur' : `ses ${joueursClub.length} joueurs`}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ONGLET 3 BIS : RETIRER SA CARTE */}
      {onglet === 'retrait' && (
        <section className="complete-carte-section">
          <div className="cn-retrait-avertissement">
            <Icone nom="bouclier" taille={28} />
            <div>
              <h3>Droit à l&apos;image & retrait d&apos;une carte joueur</h3>
              <p>
                Tu es joueur licencié, joueuse licenciée ou représentant d&apos;un club et tu souhaites que ta carte soit retirée du jeu ?
                Conformément à la protection des données personnelles et au droit à l&apos;image, tu peux demander son retrait officiel du catalogue,
                des packs et du marché des transferts.
              </p>
            </div>
          </div>

          <div className="complete-carte-bloc-recherche">
            <h2>1. Rechercher la carte à retirer</h2>
            <p>Saisis ton prénom, ton nom ou ton club pour retrouver la carte concernée dans la base.</p>
            <div className="cn-recherche-barre">
              <input
                type="search"
                value={qRetrait}
                onChange={(e) => setQRetrait(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void chercherCarteRetrait();
                }}
                placeholder="Ex : Dupont, Penaud, Ntamack..."
              />
              <button
                type="button"
                className="btn primaire"
                disabled={occupe || !qRetrait.trim()}
                onClick={() => void chercherCarteRetrait()}
              >
                <Icone nom="loupe" taille={16} /> Rechercher
              </button>
            </div>

            {sourcesRetrait.length > 0 && (
              <div className="cn-resultats-grille">
                {sourcesRetrait.map((s) => (
                  <button
                    type="button"
                    key={s.sourceId}
                    className={`cn-carte-choix ${carteRetraitSelectionnee?.sourceId === s.sourceId ? 'choisie' : ''}`}
                    onClick={() => {
                      setCarteRetraitSelectionnee(s);
                      setSucces('');
                      setErreur('');
                    }}
                  >
                    <b>{s.nom}</b>
                    <small>
                      {s.clubReel} · {s.note} GEN · {s.age} ans
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {carteRetraitSelectionnee ? (
            <form onSubmit={soumettreRetrait} className="complete-carte-formulaire-conteneur">
              <div className="complete-carte-sous-titre">
                <h2>2. Confirmer le retrait de la carte</h2>
                <p>Vérifie les informations ci-dessous et indique le motif de ta demande.</p>
              </div>

              <div className="cn-carte-retrait-apercu">
                <CarteJoueurEnLigne carte={carteDepuisSource(carteRetraitSelectionnee, 'retrait', 'retrait', 1)} />
                <div className="cn-carte-retrait-infos">
                  <h3>{carteRetraitSelectionnee.nom}</h3>
                  <p><b>Club actuel :</b> {carteRetraitSelectionnee.clubReel} ({carteRetraitSelectionnee.championnat})</p>
                  <p><b>Poste :</b> {POSTE_PAR_ID[carteRetraitSelectionnee.poste]?.nom ?? carteRetraitSelectionnee.poste}</p>
                  <p><b>Général :</b> {carteRetraitSelectionnee.note} GEN · <b>Âge :</b> {carteRetraitSelectionnee.age} ans</p>
                </div>
              </div>

              <div className="complete-carte-champ">
                <b>Motif principal de la demande *</b>
                <Selecteur
                  valeur={motifRetrait}
                  options={[
                    { valeur: "Droit à l'image / Vie privée", label: "Droit à l'image / Respect de la vie privée" },
                    { valeur: "Arrêt de la pratique sportive", label: "Arrêt de la pratique sportive / Fin de carrière" },
                    { valeur: "Demande personnelle du licencié", label: "Demande personnelle du licencié" },
                    { valeur: "Erreur d'identité ou doublon", label: "Erreur d'identité ou doublon" },
                    { valeur: "Autre motif", label: "Autre motif" },
                  ]}
                  onChange={(v) => setMotifRetrait(v)}
                />
              </div>

              <div className="complete-carte-champ">
                <label htmlFor="details-retrait">
                  <b>Précisions complémentaires (facultatif)</b>
                  <small>Ajoute toute information utile pour faciliter le traitement de la demande par le Labo.</small>
                </label>
                <textarea
                  id="details-retrait"
                  rows={3}
                  maxLength={400}
                  placeholder="Ex : Je suis le joueur représenté sur cette carte et je demande le retrait définitif..."
                  value={detailsRetrait}
                  onChange={(e) => setDetailsRetrait(e.target.value)}
                />
              </div>

              {/* Case obligatoire de certification d'identité */}
              <label className="cn-droits">
                <input
                  type="checkbox"
                  required
                  checked={certificationRetrait}
                  onChange={(e) => setCertificationRetrait(e.target.checked)}
                />
                <span>
                  Je certifie sur l&apos;honneur être le joueur concerné par cette carte (ou son représentant légal / club) et demander son retrait officiel du jeu Destiny Rugby.
                </span>
              </label>

              <div className="complete-carte-actions-fin">
                <button
                  type="submit"
                  className="btn primaire grande"
                  style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                  disabled={occupe || !certificationRetrait}
                >
                  <Icone nom="corbeille" taille={18} /> Confirmer et demander le retrait
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>
              <p>Recherche et sélectionne une carte ci-dessus pour préparer sa demande de retrait.</p>
            </div>
          )}
        </section>
      )}

      {/* ONGLET 4 : MES PROPOSITIONS */}
      {onglet === 'mesDemandes' && (
        <section className="complete-carte-section">
          <div className="complete-carte-sous-titre">
            <h2>Mes propositions soumises</h2>
            <p>Retrouve ici l&apos;état d&apos;examen de tes demandes de création, de correction, de retrait ou de club.</p>
          </div>

          {demandes.length > 0 && (
            <div className="cn-demande-filtre-types" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={filtreMesDemandes === 'toutes' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('toutes')}
              >
                Toutes ({demandes.length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'attente' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('attente')}
              >
                ⏳ En attente ({demandes.filter(d => d.statut === 'attente').length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'acceptee' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('acceptee')}
              >
                ✅ Validées ({demandes.filter(d => d.statut === 'acceptee').length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'refusee' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('refusee')}
              >
                ❌ Refusées ({demandes.filter(d => d.statut === 'refusee').length})
              </button>
            </div>
          )}

          {demandes.length > 0 ? (
            <div className="cn-mes-propositions-liste">
              {demandes.filter(d => filtreMesDemandes === 'toutes' || d.statut === filtreMesDemandes).map((d) => (
                <article key={d.id} className={`cn-demande-carte statut-${d.statut}`}>
                  <header className="cn-demande-tete">
                    <div className="cn-demande-titre-group">
                      <span className={`cn-demande-type type-${d.type}`}>
                        {d.type === 'club' ? 'Club' : d.type === 'creation' ? 'Création' : d.type === 'retrait' ? 'Retrait' : 'Correction'}
                      </span>
                      <h3>{d.clubPropose ? d.clubPropose.nom : d.carte.nom}</h3>
                    </div>
                    <span className={`cn-demande-statut-badge statut-${d.statut}`}>
                      {d.statut === 'attente' ? '⏳ En attente' : d.statut === 'acceptee' ? '✅ Validée' : '❌ Refusée'}
                    </span>
                  </header>

                  <div className="cn-demande-contenu">
                    {d.type === 'club' && d.clubPropose ? (
                      <div className="cn-demande-details-club">
                        <p>
                          <b>Division :</b> {d.clubPropose.division}
                          {d.clubPropose.ville && ` · ${d.clubPropose.ville}`}
                          {d.clubPropose.pays && ` (${d.clubPropose.pays})`}
                        </p>
                        {d.clubPropose.joueurs && d.clubPropose.joueurs.length > 0 && (
                          <p>
                            <b>Effectif proposé :</b> {d.clubPropose.joueurs.length} joueur(s)
                          </p>
                        )}
                      </div>
                    ) : d.type === 'retrait' ? (
                      <div className="cn-demande-details-joueur">
                        <p>
                          <b style={{ color: '#fca5a5' }}>Demande de retrait du jeu :</b> {d.carte.clubReel} · <b>Poste :</b> {POSTE_PAR_ID[d.carte.poste]?.nom ?? d.carte.poste} · <b>GEN :</b> {d.carte.note}
                        </p>
                      </div>
                    ) : (
                      <div className="cn-demande-details-joueur">
                        <p>
                          <b>Club :</b> {d.carte.clubReel} · <b>Poste :</b> {POSTE_PAR_ID[d.carte.poste].nom} · <b>GEN :</b> {d.carte.note}
                        </p>
                      </div>
                    )}

                    {d.message && <p className="cn-demande-message">&laquo; {d.message} &raquo;</p>}

                    {d.reponse && (
                      <div className="cn-demande-reponse-labo">
                        <b>Message du Labo :</b>
                        <p>{d.reponse}</p>
                      </div>
                    )}

                    <footer className="cn-demande-pied">
                      <div>
                        <small>Soumise le {new Date(d.creeLe).toLocaleDateString('fr-FR')}</small>
                        {d.decideLe && <small> · Décidée le {new Date(d.decideLe).toLocaleDateString('fr-FR')}</small>}
                      </div>
                      {d.statut === 'attente' && (
                        <button
                          type="button"
                          className="btn fantome"
                          style={{
                            fontSize: '0.8rem',
                            color: '#f87171',
                            borderColor: 'rgba(239,68,68,0.3)',
                            padding: '0.25rem 0.65rem',
                            cursor: 'pointer',
                          }}
                          disabled={occupe}
                          onClick={() => void annulerDemande(d.id)}
                        >
                          <Icone nom="croix" taille={12} /> Annuler ma demande
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="complete-carte-vide">
              <Icone nom="dossier" taille={36} />
              <p>Tu n&apos;as soumis aucune proposition pour le moment.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
