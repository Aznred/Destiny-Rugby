import { useEffect, useMemo, useState } from 'react';
import { Icone } from './Icone';
import { useGame } from '../store/useGame';
import { catalogueBaseCarriere, carteDepuisSource } from '../lib/ligue/catalogueCarriere';
import { cleCarteSolo } from '../lib/collectionSolo';
import { CompositionCollectionSolo } from './CompositionCollectionSolo';
import {
  composerEquipeDepuisCollection,
  creerSalonAmicalApi,
  rejoindreSalonAmicalApi,
  synchroniserSalonAmicalApi,
  type EquipeAmical,
  type SalonAmicalVue,
} from '../lib/amicalCollection';
import { MatchAmicalManette } from './match/MatchAmicalManette';
import './SalonAmicalModal.css';

interface Props {
  onFermer: () => void;
  codeInitial?: string;
}

export function SalonAmicalModal({ onFermer, codeInitial }: Props) {
  const collection = useGame((s) => s.collectionSolo);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const pseudoCompte = joueur?.pseudo ?? joueur?.nom ?? manager?.nom ?? 'Kiri';

  const catalogue = useMemo(() => catalogueBaseCarriere(), []);

  const [nomEquipe, setNomEquipe] = useState(`XV de ${pseudoCompte}`);
  const [couleurEquipe, setCouleurEquipe] = useState('#1e40af');
  const [onglet, setOnglet] = useState<'compo' | 'enLigne'>('compo');

  // Composition interactive sur terrain
  const [compoOuverte, setCompoOuverte] = useState(false);
  const [versionCompo, setVersionCompo] = useState(0);

  const cartesPossedees = useMemo(() => {
    return catalogue
      .filter((c) => (collection.quantites[cleCarteSolo(c.sourceId)] ?? 0) > 0)
      .map((c) => carteDepuisSource(c, 'solo', 'collection', 1));
  }, [catalogue, collection.quantites]);

  // Salon en ligne
  const [codeSaisi, setCodeSaisi] = useState(codeInitial ?? '');
  const [codeSalonActif, setCodeSalonActif] = useState<string | null>(null);
  const [role, setRole] = useState<'hote' | 'invite'>('hote');
  const [salon, setSalon] = useState<SalonAmicalVue | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienCopie, setLienCopie] = useState(false);

  // Équipe locale composée depuis la collection (rechargée à chaque sauvegarde)
  const monEquipe = useMemo<EquipeAmical>(() => {
    return composerEquipeDepuisCollection(nomEquipe, couleurEquipe, collection, catalogue);
  }, [nomEquipe, couleurEquipe, collection, catalogue, versionCompo]);

  // Équipe adverse en mode local
  const equipeAdverseLocale = useMemo<EquipeAmical>(() => {
    const equipe = composerEquipeDepuisCollection('Régionale All-Stars', '#dc2626', collection, catalogue);
    return {
      ...equipe,
      nom: 'XV des Invités',
      couleur: '#dc2626',
    };
  }, [collection, catalogue]);

  // Démarrage du match
  const [matchEnCours, setMatchEnCours] = useState<boolean>(false);
  const [equipeA, setEquipeA] = useState<EquipeAmical>(monEquipe);
  const [equipeB, setEquipeB] = useState<EquipeAmical>(equipeAdverseLocale);
  const [monCamp, setMonCamp] = useState<'A' | 'B'>('A');
  const [modeMatch, setModeMatch] = useState<'local' | 'reseau'>('local');

  // Sondage du salon en ligne
  useEffect(() => {
    if (!codeSalonActif || matchEnCours) return;
    let actif = true;

    const interval = setInterval(async () => {
      try {
        const res = await synchroniserSalonAmicalApi(codeSalonActif, role);
        if (!actif) return;

        if (res.statut === 'en_cours' && role === 'invite' && res.equipeHote && res.equipeInvite) {
          setEquipeA(res.equipeHote);
          setEquipeB(res.equipeInvite);
          setMonCamp('B');
          setModeMatch('reseau');
          setMatchEnCours(true);
        } else if (res.invitePresent && res.equipeInvite) {
          setSalon((prev) => prev ? {
            ...prev,
            statut: 'pret',
            invite: { pseudo: 'Ami', equipe: res.equipeInvite!, enLigne: true },
          } : null);
        }
      } catch {
        // En cas d'erreur ponctuelle de sondage, on ignore
      }
    }, 1200);

    return () => {
      actif = false;
      clearInterval(interval);
    };
  }, [codeSalonActif, role, matchEnCours]);

  const creerSalon = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await creerSalonAmicalApi(monEquipe, pseudoCompte);
      setCodeSalonActif(res.code);
      setSalon(res.salon);
      setRole('hote');
    } catch (e: any) {
      setErreur(e.message ?? 'Impossible de créer le salon amical.');
    } finally {
      setChargement(false);
    }
  };

  const rejoindreSalon = async () => {
    if (!codeSaisi.trim()) return;
    setChargement(true);
    setErreur(null);
    try {
      const res = await rejoindreSalonAmicalApi(codeSaisi.trim(), monEquipe, pseudoCompte);
      setCodeSalonActif(res.code);
      setSalon(res.salon);
      setRole('invite');
    } catch (e: any) {
      setErreur(e.message ?? 'Impossible de rejoindre le salon.');
    } finally {
      setChargement(false);
    }
  };

  const lancerMatchReseauHote = async () => {
    if (!salon?.invite || !codeSalonActif) return;
    try {
      await synchroniserSalonAmicalApi(codeSalonActif, 'hote', undefined, undefined, 'en_cours');
      setEquipeA(monEquipe);
      setEquipeB(salon.invite.equipe);
      setMonCamp('A');
      setModeMatch('reseau');
      setMatchEnCours(true);
    } catch (e: any) {
      setErreur(e.message ?? 'Impossible de démarrer le match.');
    }
  };

  const lancerTestLocal = () => {
    setEquipeA(monEquipe);
    setEquipeB(equipeAdverseLocale);
    setMonCamp('A');
    setModeMatch('local');
    setMatchEnCours(true);
  };

  const copierLienInvitation = () => {
    if (!codeSalonActif) return;
    const url = `${window.location.origin}/?amical=${codeSalonActif}`;
    navigator.clipboard.writeText(url).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 3000);
    });
  };

  if (matchEnCours) {
    return (
      <MatchAmicalManette
        equipeA={equipeA}
        equipeB={equipeB}
        monCamp={monCamp}
        mode={modeMatch}
        salonCode={codeSalonActif ?? undefined}
        onQuitter={() => {
          setMatchEnCours(false);
          setCodeSalonActif(null);
        }}
      />
    );
  }

  return (
    <div className="amical-modale-overlay" role="dialog" aria-modal="true">
      <div className="amical-modale-cadre carte">
        <header className="amical-modale-entete">
          <div className="amical-titre-group">
            <span className="amical-badge-kiri">🧪 PROTOTYPE KIRI</span>
            <h2>Match Amical Collection (1v1)</h2>
            <p>Contrôle direct en temps réel à la manette ou au joystick tactile avec tes cartes de collection.</p>
          </div>
          <button type="button" className="btn fantome amical-fermer" onClick={onFermer}>
            <Icone nom="croix" taille={20} />
          </button>
        </header>

        {erreur && <p className="amical-erreur-alerte" role="alert">{erreur}</p>}

        <nav className="amical-onglets-nav">
          <button
            type="button"
            className={onglet === 'compo' ? 'actif' : ''}
            onClick={() => setOnglet('compo')}
          >
            🏉 Mon XV de Collection
          </button>
          <button
            type="button"
            className={onglet === 'enLigne' ? 'actif' : ''}
            onClick={() => setOnglet('enLigne')}
          >
            🌐 Salon Privé en Ligne {codeSalonActif && `(${codeSalonActif})`}
          </button>
        </nav>

        {onglet === 'compo' && (
          <section className="amical-section-compo">
            <div className="amical-ligne-parametres">
              <label>
                <span>Nom de ton équipe</span>
                <input value={nomEquipe} onChange={(e) => setNomEquipe(e.target.value)} maxLength={25} />
              </label>
              <label>
                <span>Couleur de maillot</span>
                <input type="color" value={couleurEquipe} onChange={(e) => setCouleurEquipe(e.target.value)} />
              </label>
              <div className="amical-note-globale">
                <span>Note globale</span>
                <strong>{monEquipe.noteMoyenne}</strong>
              </div>
            </div>

            <div className="amical-apercu-xv">
              <div className="amical-apercu-xv-entete">
                <div className="eyebrow">Titulaires 1 à 15 ({monEquipe.joueurs.length} joueurs)</div>
                <button
                  type="button"
                  className="btn petit amical-btn-terrain"
                  onClick={() => setCompoOuverte(true)}
                >
                  <Icone nom="equipe" taille={15} /> Modifier sur le grand terrain (comme en ligne)
                </button>
              </div>
              <div className="amical-grille-joueurs">
                {monEquipe.joueurs.map((j) => (
                  <div key={j.id} className="amical-carte-joueur-mini">
                    <span className="amical-joueur-numero">{j.numero}</span>
                    <div className="amical-joueur-info">
                      <b>{j.nom}</b>
                      <small>{j.clubReel || 'Sans club'}</small>
                    </div>
                    <span className="amical-joueur-note">{j.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="amical-actions-depart">
              <button type="button" className="btn primaire amical-btn-lancer-solo" onClick={lancerTestLocal}>
                <Icone nom="eclair" taille={18} /> Tester immédiatement en Local (Manette)
              </button>
              <button type="button" className="btn amical-btn-aller-online" onClick={() => setOnglet('enLigne')}>
                <Icone nom="profil" taille={18} /> Jouer avec un ami en ligne 👉
              </button>
            </div>
          </section>
        )}

        {onglet === 'enLigne' && (
          <section className="amical-section-enligne">
            {!codeSalonActif ? (
              <div className="amical-choix-salon">
                <div className="amical-box-creer">
                  <h3>Créer une partie privée</h3>
                  <p>Génère un code de salon unique pour inviter un ami à affronter ton XV de collection.</p>
                  <button type="button" className="btn primaire" disabled={chargement} onClick={creerSalon}>
                    {chargement ? 'Génération du salon…' : 'Créer un salon privé'}
                  </button>
                </div>

                <div className="amical-separateur"><span>OU</span></div>

                <div className="amical-box-rejoindre">
                  <h3>Rejoindre un ami</h3>
                  <p>Entre le code de salon que ton ami t’a partagé.</p>
                  <div className="amical-champ-rejoindre">
                    <input
                      placeholder="Ex: KIRI-9B"
                      value={codeSaisi}
                      onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                      maxLength={12}
                    />
                    <button type="button" className="btn" disabled={chargement || !codeSaisi.trim()} onClick={rejoindreSalon}>
                      Rejoindre
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="amical-salon-attente">
                <div className="amical-salon-code-box">
                  <span className="amical-label-code">Code du salon privé :</span>
                  <strong className="amical-valeur-code">{codeSalonActif}</strong>
                  <button type="button" className="btn petit" onClick={copierLienInvitation}>
                    <Icone nom="cadeau" taille={15} /> {lienCopie ? 'Lien copié !' : 'Copier le lien d’invitation'}
                  </button>
                </div>

                <div className="amical-statut-adversaire">
                  {salon?.invite ? (
                    <div className="amical-adversaire-pret">
                      <span className="amical-pastille-verte" />
                      <div>
                        <b>{salon.invite.pseudo} a rejoint le salon !</b>
                        <p>Son équipe : {salon.invite.equipe.nom} (Note {salon.invite.equipe.noteMoyenne})</p>
                      </div>
                    </div>
                  ) : (
                    <div className="amical-en-attente">
                      <span className="ballon-attente" />
                      <p>En attente que ton pote rejoigne le salon avec le code <b>{codeSalonActif}</b>…</p>
                    </div>
                  )}
                </div>

                <div className="amical-actions-salon">
                  {role === 'hote' && (
                    <button
                      type="button"
                      className="btn primaire"
                      disabled={!salon?.invite}
                      onClick={lancerMatchReseauHote}
                    >
                      🏉 Lancer le match contre {salon?.invite?.pseudo ?? 'ton ami'} !
                    </button>
                  )}
                  {role === 'invite' && (
                    <p className="amical-indication-invite">
                      ⏳ En attente que l'hôte ({salon?.hote.pseudo}) donne le coup d'envoi…
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn fantome"
                    onClick={() => {
                      setCodeSalonActif(null);
                      setSalon(null);
                    }}
                  >
                    Quitter le salon
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {compoOuverte && (
        <CompositionCollectionSolo
          cartes={cartesPossedees}
          onFermer={() => {
            setCompoOuverte(false);
            setVersionCompo((v) => v + 1);
          }}
          onEnregistrer={() => {
            setVersionCompo((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
