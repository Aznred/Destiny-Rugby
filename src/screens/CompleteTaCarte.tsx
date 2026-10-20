import { useEffect, useState } from 'react';
import { t, texteTraduit, locale } from '../lib/i18n';
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
  validerClubPropose,
  effectifClubProposeComplet,
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
  const divisionFinale = divisionChoisie === 'Autre division' ? divisionAutre.trim() : divisionChoisie;

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
        clubPropose: validerClubPropose(clubPropose),
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
  const clubApercu = {
      nom: nomClub.trim() || t('contributionCarte.nouveauClub'),
      ville: villeClub.trim() || undefined,
      c1: couleur1,
      c2: couleur2,
      logo: logoClub,
  };

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
    if (!window.confirm(t('contributionCarte.annulerConfirmation'))) return;
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
            <Icone nom="maillot" taille={18} /> {t('contributionCarte.badge')} </span>
          <h1>{t('nav.contribuer')}</h1>
          <p>
            {t('contributionCarte.enteteAide')}
          </p>
        </div>

        {nonConnecte && (
          <aside className="complete-carte-alerte-compte" role="status">
            <Icone nom="alerte" taille={20} />
            <div>
              <b> {t('contributionCarte.connexion')} </b>
              <p> {t('contributionCarte.connexionAide')} </p>
            </div>
            <button type="button" className="btn primaire" onClick={() => setEcran('carriereEnLigne')}> {t('contributionCarte.connecter')} </button>
          </aside>
        )}

        <nav className="complete-carte-onglets" aria-label={t('contributionCarte.modes')}>
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
            <span>{t('contributionCarte.corriger')}</span>
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
            <span>{t('contributionCarte.creerJoueur')}</span>
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
            <span>{t('contributionCarte.proposerClub')}</span>
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
            <span>{t('contributionCarte.retirerCarte')}</span>
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
            <span>{t('contributionCarte.propositions')}</span>
            {demandes.length > 0 && <span className="complete-carte-bulle-compteur">{demandes.length}</span>}
          </button>
        </nav>
      </header>

      {erreur && (
        <div className="complete-carte-message erreur" role="alert">
          <Icone nom="stop" taille={18} />
          <span>{texteTraduit(erreur)}</span>
        </div>
      )}
      {succes && (
        <div className="complete-carte-message succes" role="status">
          <Icone nom="ok" taille={18} />
          <span>{texteTraduit(succes)}</span>
        </div>
      )}

      {/* ONGLET 1 : CORRIGER UNE CARTE */}
      {onglet === 'correction' && (
        <section className="complete-carte-section">
          <div className="complete-carte-bloc-recherche">
            <h2>{t('contributionCarte.rechercherCarte')}</h2>
            <p>{t('contributionCarte.rechercheAide')}</p>
            <div className="cn-recherche-barre">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void chercherCarte();
                }}
                placeholder={t('contributionCarte.rechercheExemple')}
              />
              <button type="button" className="btn primaire" disabled={occupe || !q.trim()} onClick={() => void chercherCarte()}>
                <Icone nom="loupe" taille={16} /> {t('contributionCarte.rechercher')}
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
                      {t('contributionCarte.resultat',{club:s.clubReel,note:s.note,age:s.age})}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sourceId ? (
            <form onSubmit={soumettreCorrection} className="complete-carte-formulaire-conteneur">
              <div className="complete-carte-sous-titre">
                <h3>{t('contributionCarte.correctionDe',{nom:carteCorrection.nom})}</h3>
                <small>{t('contributionCarte.correctionAide')}</small>
              </div>

              <FormulaireCarteNormale
                carte={carteCorrection}
                changer={setCarteCorrection}
                occupe={occupe}
                onPreparation={setOccupe}
              />

              <div className="complete-carte-champ">
                <label htmlFor="msg-correction">
                  <b>{t('contributionCarte.sources')}</b>
                  <small>{t('contributionCarte.sourcesAide')}</small>
                </label>
                <textarea
                  id="msg-correction"
                  rows={3}
                  maxLength={500}
                  placeholder={t('contributionCarte.sourcesExemple')}
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
                <span>{t('contributionCarte.droits')}</span>
              </label>

              <div className="complete-carte-actions-fin">
                <button
                  type="submit"
                  className="btn primaire grande"
                  disabled={occupe || !droitsCertifies}
                >
                  <Icone nom="check" taille={18} /> {t('contributionCarte.envoyerCorrection')}
                </button>
              </div>
            </form>
          ) : (
            <div className="complete-carte-vide">
              <Icone nom="loupe" taille={36} />
              <p>{t('contributionCarte.vide')}</p>
            </div>
          )}
        </section>
      )}

      {/* ONGLET 2 : CRÉER UN JOUEUR */}
      {onglet === 'creation' && (
        <section className="complete-carte-section">
          <form onSubmit={soumettreCreationJoueur} className="complete-carte-formulaire-conteneur">
            <div className="complete-carte-sous-titre">
              <h2> {t('contributionCarte.creationTitre')} </h2>
              <p> {t('contributionCarte.creationAide')} </p>
            </div>

            <FormulaireCarteNormale
              carte={carteCreation}
              changer={setCarteCreation}
              occupe={occupe}
              onPreparation={setOccupe}
            />

            <div className="complete-carte-champ">
              <label htmlFor="msg-creation">
                <b> {t('contributionCarte.sources')} </b>
                <small> {t('contributionCarte.creationSources')} </small>
              </label>
              <textarea
                id="msg-creation"
                rows={3}
                maxLength={500}
                placeholder={t('contributionCarte.creationExemple')}
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
              <span> {t('contributionCarte.droits')} </span>
            </label>

            <div className="complete-carte-actions-fin">
              <button
                type="submit"
                className="btn primaire grande"
                disabled={occupe || !carteCreation.nom.trim() || !droitsCertifies}
              >
                <Icone nom="check" taille={18} /> {t('contributionCarte.envoyerJoueur')} </button>
            </div>
          </form>
        </section>
      )}

      {/* ONGLET 3 : PROPOSER UN NOUVEAU CLUB */}
      {onglet === 'club' && (
        <section className="complete-carte-section">
          <form onSubmit={soumettrePropositionClub} className="complete-carte-formulaire-conteneur">
            <div className="complete-carte-sous-titre">
              <h2> {t('contributionCarte.clubTitre')} </h2>
              <p>
                {t('contributionCarte.clubAideComplet')}
              </p>
            </div>

            <div className="complete-carte-grille-club">
              <div className="complete-carte-colonne-formulaire">
                <fieldset className="cn-club-fieldset">
                  <legend> {t('contributionCarte.identiteClub')} </legend>

                  <label className="complete-carte-champ">
                    <b> {t('contributionCarte.nomClubRequis')} </b>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder={t('contributionCarte.clubExemple')}
                      value={nomClub}
                      onChange={(e) => setNomClub(e.target.value)}
                    />
                  </label>

                  <div className="cn-champs">
                    <label className="complete-carte-champ">
                      <b> {t('contributionCarte.divisionRequise')} </b>
                      <Selecteur
                        valeur={divisionChoisie}
                        options={DIVISIONS_POPULAIRES.map((div) => ({ valeur: div, label: div }))}
                        onChange={setDivisionChoisie}
                      />
                    </label>

                    {divisionChoisie === 'Autre division' && (
                      <label className="complete-carte-champ">
                        <b> {t('contributionCarte.divisionPreciser')} </b>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          placeholder={t('contributionCarte.divisionNom')}
                          value={divisionAutre}
                          onChange={(e) => setDivisionAutre(e.target.value)}
                        />
                      </label>
                    )}

                    <label className="complete-carte-champ">
                      <b> {t('contributionCarte.ville')} </b>
                      <input
                        type="text"
                        maxLength={80}
                        placeholder={t('contributionCarte.villeExemple')}
                        value={villeClub}
                        onChange={(e) => setVilleClub(e.target.value)}
                      />
                    </label>

                    <label className="complete-carte-champ">
                      <b> {t('contributionCarte.pays')} </b>
                      <input
                        type="text"
                        maxLength={80}
                        placeholder={t('contributionCarte.paysExemple')}
                        value={paysClub}
                        onChange={(e) => setPaysClub(e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="cn-club-fieldset">
                  <legend> {t('contributionCarte.visuelClub')} </legend>

                  <label className="complete-carte-champ">
                    <b> {t('contributionCarte.importerLogo')} </b>
                    <small> {t('contributionCarte.logoAide')} </small>
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
                    <b> {t('contributionCarte.logoAdresse')} </b>
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
                      <Icone nom="croix" taille={14} /> {t('contributionCarte.logoRetirer')} </button>
                  )}

                  <div className="complete-carte-couleurs">
                    <b> {t('contributionCarte.couleurs')} </b>
                    <div className="cn-palettes-rapides">
                      {PALETTES_COULEURS.map((p) => (
                        <button
                          key={p.nom}
                          type="button"
                          className="cn-palette-pastille"
                          title={texteTraduit(p.nom)}
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
                        <span> {t('contributionCarte.couleur1')} </span>
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
                        <span> {t('contributionCarte.couleur2')} </span>
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
                  <h4>{nomClub.trim() || t('contributionCarte.nomClub')}</h4>
                  <span className="cn-division-tag">{texteTraduit(divisionFinale)}</span>
                  {villeClub.trim() && <small>{villeClub} · {paysClub}</small>}
                </div>
              </aside>
            </div>

            <fieldset className="cn-club-fieldset cn-joueurs-section">
              <legend> {t('contributionCarte.effectifLegende')} </legend>
              <EffectifClubPropose club={{ nom: nomClub.trim() || t('contributionCarte.clubPropose'), division: divisionFinale, pays: paysClub,
                logo: logoClub, c1: couleur1, c2: couleur2, joueurs: joueursClub }} changer={setJoueursClub}
                occupe={occupe} onEdition={setFormulaireJoueurClubOuvert} />
            </fieldset>

            <div className="complete-carte-champ">
              <label htmlFor="msg-club">
                <b> {t('contributionCarte.clubSources')} </b>
                <small> {t('contributionCarte.clubSourcesAide')} </small>
              </label>
              <textarea
                id="msg-club"
                rows={3}
                maxLength={500}
                placeholder={t('contributionCarte.clubSourcesExemple')}
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
              <span> {t('contributionCarte.droits')} </span>
            </label>

            <div className="complete-carte-actions-fin">
              <button
                type="submit"
                className="btn primaire grande"
                disabled={occupe || formulaireJoueurClubOuvert || !nomClub.trim() || !divisionFinale || !droitsCertifies || !effectifClubProposeComplet(joueursClub)}
              >
                <Icone nom="check" taille={18} /> {t('contributionCarte.envoyerClub')}
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
              <h3> {t('contributionCarte.retraitTitre')} </h3>
              <p> {t('contributionCarte.retraitAide')} </p>
            </div>
          </div>

          <div className="complete-carte-bloc-recherche">
            <h2> {t('contributionCarte.retraitRecherche')} </h2>
            <p> {t('contributionCarte.retraitRechercheAide')} </p>
            <div className="cn-recherche-barre">
              <input
                type="search"
                value={qRetrait}
                onChange={(e) => setQRetrait(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void chercherCarteRetrait();
                }}
                placeholder={t('contributionCarte.retraitRechercheExemple')}
              />
              <button
                type="button"
                className="btn primaire"
                disabled={occupe || !qRetrait.trim()}
                onClick={() => void chercherCarteRetrait()}
              >
                <Icone nom="loupe" taille={16} /> {t('contributionCarte.rechercher')} </button>
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
                      {t('contributionCarte.resultat', {club: s.clubReel, note: s.note, age: s.age})}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {carteRetraitSelectionnee ? (
            <form onSubmit={soumettreRetrait} className="complete-carte-formulaire-conteneur">
              <div className="complete-carte-sous-titre">
                <h2> {t('contributionCarte.retraitConfirmer')} </h2>
                <p> {t('contributionCarte.retraitVerification')} </p>
              </div>

              <div className="cn-carte-retrait-apercu">
                <CarteJoueurEnLigne carte={carteDepuisSource(carteRetraitSelectionnee, 'retrait', 'retrait', 1)} />
                <div className="cn-carte-retrait-infos">
                  <h3>{carteRetraitSelectionnee.nom}</h3>
                  <p><b> {t('contributionCarte.clubActuel')} </b> {carteRetraitSelectionnee.clubReel} ({carteRetraitSelectionnee.championnat})</p>
                  <p><b> {t('contributionCarte.poste')} </b> {texteTraduit(POSTE_PAR_ID[carteRetraitSelectionnee.poste]?.nom ?? carteRetraitSelectionnee.poste)}</p>
                  <p><b> {t('contributionCarte.generalValeur')} </b> {carteRetraitSelectionnee.note} {t('contributionCarte.generalCourt')} · <b> {t('contributionCarte.ageValeur')} </b> {t('contributionCarte.ans', {n: carteRetraitSelectionnee.age})}</p>
                </div>
              </div>

              <div className="complete-carte-champ">
                <b> {t('contributionCarte.motif')} </b>
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
                  <b> {t('contributionCarte.precisions')} </b>
                  <small> {t('contributionCarte.precisionsAide')} </small>
                </label>
                <textarea
                  id="details-retrait"
                  rows={3}
                  maxLength={400}
                  placeholder={t('contributionCarte.precisionsExemple')}
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
                <span> {t('contributionCarte.certification')} </span>
              </label>

              <div className="complete-carte-actions-fin">
                <button
                  type="submit"
                  className="btn primaire grande"
                  style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                  disabled={occupe || !certificationRetrait}
                >
                  <Icone nom="corbeille" taille={18} /> {t('contributionCarte.envoyerRetrait')} </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>
              <p> {t('contributionCarte.retraitVide')} </p>
            </div>
          )}
        </section>
      )}

      {/* ONGLET 4 : MES PROPOSITIONS */}
      {onglet === 'mesDemandes' && (
        <section className="complete-carte-section">
          <div className="complete-carte-sous-titre">
            <h2> {t('contributionCarte.mesTitre')} </h2>
            <p> {t('contributionCarte.mesAide')} </p>
          </div>

          {demandes.length > 0 && (
            <div className="cn-demande-filtre-types" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={filtreMesDemandes === 'toutes' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('toutes')}
              >
                {t('contributionCarte.toutes')} ({demandes.length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'attente' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('attente')}
              >
                {t('contributionCarte.attente')} ({demandes.filter(d => d.statut === 'attente').length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'acceptee' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('acceptee')}
              >
                {t('contributionCarte.acceptees')} ({demandes.filter(d => d.statut === 'acceptee').length})
              </button>
              <button
                type="button"
                className={filtreMesDemandes === 'refusee' ? 'actif' : ''}
                onClick={() => setFiltreMesDemandes('refusee')}
              >
                {t('contributionCarte.refusees')} ({demandes.filter(d => d.statut === 'refusee').length})
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
                        {t(`contributionCarte.${d.type}`)}
                      </span>
                      <h3>{d.clubPropose ? d.clubPropose.nom : d.carte.nom}</h3>
                    </div>
                    <span className={`cn-demande-statut-badge statut-${d.statut}`}>
                      {t(`contributionCarte.${d.statut}`)}
                    </span>
                  </header>

                  <div className="cn-demande-contenu">
                    {d.type === 'club' && d.clubPropose ? (
                      <div className="cn-demande-details-club">
                        <p>
                          <b>{t('contributionCarte.division')} :</b> {texteTraduit(d.clubPropose.division)}
                          {d.clubPropose.ville && ` · ${d.clubPropose.ville}`}
                          {d.clubPropose.pays && ` (${d.clubPropose.pays})`}
                        </p>
                        {d.clubPropose.joueurs && d.clubPropose.joueurs.length > 0 && (
                          <p>
                            <b> {t('contributionCarte.effectifPropose')} </b> {t('contributionCarte.joueursNombre', {n: d.clubPropose.joueurs.length})}
                          </p>
                        )}
                      </div>
                    ) : d.type === 'retrait' ? (
                      <div className="cn-demande-details-joueur">
                        <p>
                          <b style={{ color: '#fca5a5' }}> {t('contributionCarte.retraitJeu')} </b> {d.carte.clubReel} · <b> {t('contributionCarte.poste')} </b> {texteTraduit(POSTE_PAR_ID[d.carte.poste]?.nom ?? d.carte.poste)} · <b>{t('contributionCarte.generalCourt')} :</b> {d.carte.note}
                        </p>
                      </div>
                    ) : (
                      <div className="cn-demande-details-joueur">
                        <p>
                          <b>{t('contributionCarte.club')} :</b> {d.carte.clubReel} · <b> {t('contributionCarte.poste')} </b> {texteTraduit(POSTE_PAR_ID[d.carte.poste].nom)} · <b>{t('contributionCarte.generalCourt')} :</b> {d.carte.note}
                        </p>
                      </div>
                    )}

                    {d.message && <p className="cn-demande-message">&laquo; {d.message} &raquo;</p>}

                    {d.reponse && (
                      <div className="cn-demande-reponse-labo">
                        <b> {t('contributionCarte.messageLabo')} </b>
                        <p>{d.reponse}</p>
                      </div>
                    )}

                    <footer className="cn-demande-pied">
                      <div>
                        <small>{t('contributionCarte.soumise', {date: new Date(d.creeLe).toLocaleDateString(locale())})}</small>
                        {d.decideLe && <small> · {t('contributionCarte.decidee', {date: new Date(d.decideLe).toLocaleDateString(locale())})}</small>}
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
                          <Icone nom="croix" taille={12} /> {t('contributionCarte.annulerDemande')} </button>
                      )}
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="complete-carte-vide">
              <Icone nom="dossier" taille={36} />
              <p> {t('contributionCarte.mesVide')} </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
