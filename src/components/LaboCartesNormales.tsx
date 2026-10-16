import { useEffect, useMemo, useState } from 'react';
import { appelCartes, carteNormaleVide, validerCarteNormale, saisieDepuisSource } from '../lib/cartesNormales';
import type { DemandeCarte, SaisieCarteNormale } from '../lib/cartesNormales';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { FormulaireCarteNormale } from './FormulaireCarteNormale';
import { Blason } from './Blason';

interface Vue { demandes: DemandeCarte[]; cartes: SourceCarte[]; revisionCatalogue: number }

type FiltreStatut = 'attente' | 'acceptee' | 'refusee' | 'toutes';
type FiltreType = 'tous' | 'joueur' | 'club';

export function LaboCartesNormales({ demandesSeulement = false }: { demandesSeulement?: boolean }) {
  const [vue, setVue] = useState<Vue>();
  const [selection, setSelection] = useState<DemandeCarte>();
  const [carte, setCarte] = useState<SaisieCarteNormale>(carteNormaleVide);
  const [sourceId, setSourceId] = useState<string>();
  const [q, setQ] = useState('');
  const [reponse, setReponse] = useState('');
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [pret, setPret] = useState(!demandesSeulement);

  // Filtres pour les demandes
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('attente');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [filtreRecherche, setFiltreRecherche] = useState('');

  const charger = async () => {
    const d = await appelCartes<Vue>(undefined, `&q=${encodeURIComponent(q)}`);
    setVue(d);
  };

  useEffect(() => {
    void appelCartes<Vue>().then(setVue).catch(e => setErreur(e.message));
  }, []);

  const choisirDemande = async (id: string) => {
    setOccupe(true);
    setErreur('');
    setMessage('');
    try {
      const { demande } = await appelCartes<{ demande: DemandeCarte }>(undefined, `&id=${encodeURIComponent(id)}`);
      setSelection(demande);
      setCarte(demande.carte);
      setReponse(demande.reponse ?? '');
      setPret(true);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  const agir = async (operation: 'modifier' | 'approuver' | 'refuser' | 'creer') => {
    if (!vue) return;
    setOccupe(true);
    setErreur('');
    setMessage('');
    try {
      if (operation === 'creer') {
        const r = await fetch('/api/carriere?atelier=1', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'atelier',
            operation: 'carteNormale',
            revision: vue.revisionCatalogue,
            sourceId: sourceId ?? `normale-${crypto.randomUUID()}`,
            carte: validerCarteNormale(carte),
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.erreur);
        setMessage(sourceId ? 'Carte modifiée dans le catalogue.' : 'Carte normale créée dans le catalogue.');
        setSourceId(undefined);
        setCarte(carteNormaleVide());
      } else {
        if (!selection) return;
        await appelCartes({
          action: 'demandesCartes',
          operation,
          id: selection.id,
          revision: selection.revision,
          revisionCatalogue: vue.revisionCatalogue,
          ...(operation === 'refuser' ? { reponse } : { carte: validerCarteNormale(carte) }),
        });
        setMessage(
          operation === 'approuver'
            ? 'Demande validée et publiée.'
            : operation === 'refuser'
            ? 'Demande refusée.'
            : 'Proposition modifiée.'
        );
        if (operation === 'modifier') {
          const { demande } = await appelCartes<{ demande: DemandeCarte }>(undefined, `&id=${selection.id}`);
          setSelection(demande);
          setCarte(demande.carte);
        } else {
          setSelection(undefined);
          setPret(false);
        }
      }
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  // Compteurs
  const demandes = vue?.demandes ?? [];
  const nbAttente = useMemo(() => demandes.filter(d => d.statut === 'attente').length, [demandes]);
  const nbAcceptees = useMemo(() => demandes.filter(d => d.statut === 'acceptee').length, [demandes]);
  const nbRefusees = useMemo(() => demandes.filter(d => d.statut === 'refusee').length, [demandes]);
  const totalDemandes = demandes.length;

  // Filtrage
  const demandesFiltrees = useMemo(() => {
    return demandes.filter(d => {
      if (filtreStatut !== 'toutes' && d.statut !== filtreStatut) return false;
      if (filtreType === 'club' && d.type !== 'club') return false;
      if (filtreType === 'joueur' && d.type === 'club') return false;
      if (filtreRecherche.trim()) {
        const terme = filtreRecherche.toLowerCase().trim();
        const nom = (d.clubPropose ? d.clubPropose.nom : d.carte.nom).toLowerCase();
        const pseudo = (d.pseudo ?? '').toLowerCase();
        const division = (d.clubPropose?.division ?? d.carte.championnat ?? '').toLowerCase();
        if (!nom.includes(terme) && !pseudo.includes(terme) && !division.includes(terme)) return false;
      }
      return true;
    });
  }, [demandes, filtreStatut, filtreType, filtreRecherche]);

  return (
    <section className="cn-labo">
      <h2>{demandesSeulement ? 'Demandes de cartes' : 'Cartes normales'}</h2>
      <p>
        {demandesSeulement
          ? 'Examine les propositions soumises par la communauté, filtre par statut, ajuste les fiches si nécessaire, puis valide ou refuse.'
          : 'Crée une carte ordinaire ou corrige une carte existante. La rareté et les statistiques suivent son général.'}
      </p>

      {!demandesSeulement && (
        <>
          <button
            className="btn primaire"
            type="button"
            disabled={occupe}
            onClick={() => {
              setCarte(carteNormaleVide());
              setSourceId(undefined);
              setSelection(undefined);
              setPret(true);
            }}
          >
            Nouvelle carte normale
          </button>
          <div className="cn-recherche">
            <label>
              Rechercher une carte
              <input value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <button type="button" disabled={occupe} onClick={() => void charger().catch(e => setErreur(e.message))}>
              Rechercher
            </button>
            <div className="cn-resultats">
              {vue?.cartes.map(s => (
                <button
                  type="button"
                  key={s.sourceId}
                  onClick={() => {
                    setCarte(saisieDepuisSource(s));
                    setSourceId(s.sourceId);
                    setSelection(undefined);
                    setPret(true);
                  }}
                >
                  <b>{s.nom}</b>
                  <small>{s.clubReel} · {s.note} GEN</small>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {demandesSeulement && (
        <>
          {/* Cases de tri par statut */}
          <div className="cn-cases-filtres" role="tablist" aria-label="Trier les demandes par statut">
            <button
              type="button"
              role="tab"
              aria-selected={filtreStatut === 'attente'}
              className={`cn-case-filtre case-attente ${filtreStatut === 'attente' ? 'actif' : ''}`}
              onClick={() => setFiltreStatut('attente')}
            >
              <div className="cn-case-entete">
                <span className="cn-case-titre">⏳ En cours</span>
                <span className="cn-case-badge">{nbAttente}</span>
              </div>
              <span className="cn-case-desc">En attente de validation</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtreStatut === 'acceptee'}
              className={`cn-case-filtre case-acceptee ${filtreStatut === 'acceptee' ? 'actif' : ''}`}
              onClick={() => setFiltreStatut('acceptee')}
            >
              <div className="cn-case-entete">
                <span className="cn-case-titre">✅ Acceptées</span>
                <span className="cn-case-badge">{nbAcceptees}</span>
              </div>
              <span className="cn-case-desc">Validées et publiées</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtreStatut === 'refusee'}
              className={`cn-case-filtre case-refusee ${filtreStatut === 'refusee' ? 'actif' : ''}`}
              onClick={() => setFiltreStatut('refusee')}
            >
              <div className="cn-case-entete">
                <span className="cn-case-titre">❌ Refusées</span>
                <span className="cn-case-badge">{nbRefusees}</span>
              </div>
              <span className="cn-case-desc">Rejetées avec motif</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtreStatut === 'toutes'}
              className={`cn-case-filtre ${filtreStatut === 'toutes' ? 'actif' : ''}`}
              onClick={() => setFiltreStatut('toutes')}
            >
              <div className="cn-case-entete">
                <span className="cn-case-titre">📋 Toutes</span>
                <span className="cn-case-badge">{totalDemandes}</span>
              </div>
              <span className="cn-case-desc">Toutes les soumissions</span>
            </button>
          </div>

          {/* Barre de recherche et filtre par type */}
          <div className="cn-demande-recherche-ligne">
            <input
              type="search"
              placeholder="Filtrer par nom, club ou pseudo..."
              value={filtreRecherche}
              onChange={e => setFiltreRecherche(e.target.value)}
            />
            <div className="cn-demande-filtre-types">
              <button
                type="button"
                className={filtreType === 'tous' ? 'actif' : ''}
                onClick={() => setFiltreType('tous')}
              >
                Tous
              </button>
              <button
                type="button"
                className={filtreType === 'joueur' ? 'actif' : ''}
                onClick={() => setFiltreType('joueur')}
              >
                Joueurs
              </button>
              <button
                type="button"
                className={filtreType === 'club' ? 'actif' : ''}
                onClick={() => setFiltreType('club')}
              >
                Clubs
              </button>
            </div>
          </div>

          {/* Grille / Liste des demandes filtrées */}
          <div className="cn-resultats" style={{ maxHeight: '380px' }}>
            {demandesFiltrees.map(d => {
              const estSelectionne = selection?.id === d.id;
              const dateTxt = new Date(d.creeLe).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              return (
                <button
                  type="button"
                  key={d.id}
                  className="cn-demande-item-btn"
                  aria-pressed={estSelectionne}
                  disabled={occupe}
                  onClick={() => void choisirDemande(d.id)}
                >
                  <div className="cn-demande-item-tete">
                    <span className="cn-demande-item-titre">
                      {d.clubPropose ? `[Club] ${d.clubPropose.nom}` : d.carte.nom}
                    </span>
                    <span className={`cn-demande-statut-badge statut-${d.statut}`}>
                      {d.statut === 'attente' ? '⏳ En cours' : d.statut === 'acceptee' ? '✅ Validée' : '❌ Refusée'}
                    </span>
                  </div>
                  <div className="cn-demande-item-meta">
                    <span>Par <b>{d.pseudo ?? 'Anonyme'}</b></span>
                    <span>· {d.type === 'club' ? 'Nouveau Club' : d.type === 'creation' ? 'Création joueur' : 'Correction'}</span>
                    <span>· {dateTxt}</span>
                    <div className="cn-demande-item-pastilles">
                      {d.photoProposee && <span className="cn-pastille-tag tag-image">📷 Photo</span>}
                      {d.droitsCertifies !== false && <span className="cn-pastille-tag tag-droits">⚖️ Droits</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {vue && !demandesFiltrees.length && (
              <p style={{ color: 'rgba(255,255,255,0.6)', padding: '1rem' }}>
                Aucune proposition dans cette catégorie.
              </p>
            )}
          </div>
        </>
      )}

      {/* Détail / Formulaire d'édition et décision */}
      {pret && (
        <form onSubmit={e => { e.preventDefault(); void agir(selection ? 'approuver' : 'creer'); }}>
          {selection && (
            <div className={`cn-decision-banner b-${selection.statut}`}>
              <div className="cn-decision-banner-titre">
                <h3>
                  {selection.statut === 'attente'
                    ? '⏳ Proposition en attente d’examen'
                    : selection.statut === 'acceptee'
                    ? '✅ Demande acceptée et intégrée au catalogue'
                    : '❌ Demande refusée'}
                </h3>
                <span className={`cn-demande-statut-badge statut-${selection.statut}`}>
                  {selection.statut === 'attente' ? 'À examiner' : selection.statut === 'acceptee' ? 'Publiée' : 'Refusée'}
                </span>
              </div>
              <div className="cn-decision-banner-corps">
                <p>
                  Proposée par <b>{selection.pseudo ?? 'Anonyme'}</b> le {new Date(selection.creeLe).toLocaleDateString('fr-FR')}
                  {selection.decideLe && ` · Décidée le ${new Date(selection.decideLe).toLocaleDateString('fr-FR')}`}
                </p>
                {selection.droitsCertifies !== false && (
                  <p style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>
                    ⚖️ L&apos;auteur a certifié avoir les droits d&apos;utilisation sur les images fournies.
                  </p>
                )}
                {selection.message && (
                  <p style={{ fontStyle: 'italic', margin: '0.2rem 0' }}>
                    Message de l&apos;auteur : &laquo; {selection.message} &raquo;
                  </p>
                )}
                {selection.statut === 'refusee' && selection.reponse && (
                  <div className="cn-decision-motif-boite">
                    <b style={{ color: '#f87171' }}>Motif du refus notifié :</b>
                    <p style={{ margin: '0.2rem 0' }}>{selection.reponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selection?.type === 'club' && selection.clubPropose && (
            <div className="cn-club-card-preview" style={{ margin: '1rem 0' }}>
              <div className="cn-club-blason-box">
                <Blason
                  club={{
                    nom: selection.clubPropose.nom,
                    logo: selection.clubPropose.logo,
                    c1: selection.clubPropose.c1 ?? '#1e3a8a',
                    c2: selection.clubPropose.c2 ?? '#ffd700',
                  }}
                  taille={50}
                />
              </div>
              <h4>{selection.clubPropose.nom}</h4>
              <span className="cn-division-tag">{selection.clubPropose.division}</span>
              <small>
                {selection.clubPropose.ville || 'Ville non précisée'} · {selection.clubPropose.pays || 'France'}
              </small>
              <p><b>{selection.clubPropose.joueurs?.length ?? 0} joueur(s) associé(s) à ce club</b></p>
            </div>
          )}

          <FormulaireCarteNormale
            carte={carte}
            changer={setCarte}
            occupe={occupe || (!!selection && selection.statut !== 'attente')}
            onPreparation={setOccupe}
          />

          {!selection ? (
            <button className="btn primaire" disabled={occupe}>
              Enregistrer la carte normale
            </button>
          ) : selection.statut === 'attente' ? (
            <>
              <label>
                Motif du refus (sera affiché au manager)
                <textarea
                  maxLength={500}
                  value={reponse}
                  onChange={e => setReponse(e.target.value)}
                  placeholder="Explication claire du refus (ex: statistiques trop élevées, doublon existant, photo non conforme...)"
                />
              </label>
              <div className="cn-actions">
                <button className="btn primaire" disabled={occupe}>
                  Valider et publier la carte
                </button>
                <button
                  type="button"
                  className="btn fantome"
                  disabled={occupe}
                  onClick={() => void agir('modifier')}
                >
                  Enregistrer les modifications
                </button>
                <button
                  type="button"
                  className="btn fantome"
                  style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                  disabled={occupe}
                  onClick={() => void agir('refuser')}
                >
                  Refuser la carte
                </button>
              </div>
            </>
          ) : (
            <div className="cn-actions">
              <button
                type="button"
                className="btn fantome"
                onClick={() => {
                  setSelection(undefined);
                  setPret(false);
                }}
              >
                Fermer l&apos;aperçu
              </button>
            </div>
          )}
        </form>
      )}

      {erreur && <p className="ak-erreur" role="alert">{erreur}</p>}
      {message && <p className="ak-succes" role="status">{message}</p>}
    </section>
  );
}
