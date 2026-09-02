// L'ÉCRAN DE CARRIÈRE — le récit, semaine après semaine
//
// ⚠️ LA BOUCLE A CHANGÉ (demande explicite) : « au lieu d'avoir des boutons,
// chaque semaine l'IA locale sort un évènement ; le joueur répond en écrivant et elle
// juge la réponse — il doit être très sévère et prendre en compte les stats ;
// sinon, juste des scénarios et des réponses à choix multiples ».
//
// Trois états possibles, jamais deux à la fois :
//   · `evenementHebdo`  → une scène attend une RÉPONSE ÉCRITE (IA locale) ;
//   · `scenarioActif`   → une situation attend un CLIC (repli pré-écrit) ;
//   · rien              → le joueur écrit l'action libre de son choix.
//
// ⚠️ C'est l'ÉCRAN qui fabrique la scène, pas le store : l'appel local est
// asynchrone et le store est synchrone. `semaineSuivante()` lève donc un
// drapeau (`attenteEvenement`) que cet écran consomme.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame, BUDGET_IA_PAR_SAISON } from '../store/useGame';
import { PanneauJoueur } from '../components/PanneauJoueur';
import { ClassementLateral } from '../components/ClassementLateral';
import { demanderAuMJ, messageErreurIA } from '../lib/mj';
import { ecouterEtatIA, etatIA } from '../lib/groq';
import { genererEvenementHebdo, jugementLocal, jugerReaction } from '../lib/ia';
import { semaine, libelleDate } from '../data/calendrier';
import { labelAttribut, nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import type { EntreeJournal } from '../types';

import { Icone } from '../components/Icone';
interface Props {
  onReglages: () => void;
}

const IDEE_CLES = ['car.idee1', 'car.idee2', 'car.idee3', 'car.idee4'];

export function Carriere({ onReglages }: Props) {
  const joueur = useGame((s) => s.joueur);
  const journal = useGame((s) => s.journal);
  const iaActivee = useGame((s) => s.iaActivee);
  const modele = useGame((s) => s.modele);
  // ⚠️ ON S'ABONNE À L'ÉTAT DE L'IA, on ne le lit pas une fois. Quand le quota
  // se libère, cet écran doit repasser tout seul au récit écrit sur mesure —
  // sans rechargement, sans clic, et sans jamais avoir dit au joueur que
  // quelque chose n'allait pas.
  const etat = useSyncExternalStore(ecouterEtatIA, etatIA, etatIA);
  const avecIA = iaActivee && etat.disponible;
  const appliquerReponse = useGame((s) => s.appliquerReponse);
  const lancerScenario = useGame((s) => s.lancerScenario);
  const resoudreChoix = useGame((s) => s.resoudreChoix);
  const scenarioActif = useGame((s) => s.scenarioActif);
  const compteurs = useGame((s) => s.compteurs);
  // Le récit de la semaine
  const attenteEvenement = useGame((s) => s.attenteEvenement);
  const evenementHebdo = useGame((s) => s.evenementHebdo);
  const evenementsVus = useGame((s) => s.evenementsVus);
  const poserEvenementHebdo = useGame((s) => s.poserEvenementHebdo);
  const appliquerJugement = useGame((s) => s.appliquerJugement);
  const abandonnerEvenement = useGame((s) => s.abandonnerEvenement);

  const [texte, setTexte] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<string[]>([]);
  // Sur téléphone, les trois colonnes deviennent trois vues simples. Le récit
  // est la porte d'entrée : la fiche et le classement restent à un toucher,
  // sans imposer plusieurs écrans de défilement avant de pouvoir jouer.
  const [vueMobile, setVueMobile] = useState<'jeu' | 'joueur' | 'classement'>('jeu');
  const finRef = useRef<HTMLDivElement>(null);
  // ⚠️ Verrou de ré-entrée. Sans lui, le moindre re-rendu pendant la génération
  // relançait une génération : deux scènes pour la même semaine, et deux fois
  // le coût en tokens.
  const fabrique = useRef(false);

  const historique = useMemo(
    () =>
      journal
        .filter((e) => e.role === 'joueur' || e.role === 'mj')
        .map((e) => ({
          role: (e.role === 'joueur' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: e.texte,
        })),
    [journal],
  );

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [journal, enCours]);

  // ═══ LA SCÈNE DE LA SEMAINE ═════════════════════════════════════════════
  useEffect(() => {
    if (!joueur || !attenteEvenement || evenementHebdo || scenarioActif) return;
    if (fabrique.current) return;

    // Sans IA — désactivée, quota épuisé, ou réseau coupé — le jeu reste
    // ENTIER : on pose une situation à choix multiples du pool pré-écrit,
    // contextuelle (âge, forme, moral, division, contrat). Rien ne le dit au
    // joueur : c'est une autre façon de jouer la semaine, pas une panne.
    if (!avecIA) {
      abandonnerEvenement();
      lancerScenario(false);
      return;
    }

    fabrique.current = true;
    let annule = false;
    setEnCours(true);
    (async () => {
      try {
        const sem = semaine(joueur.semaine ?? 1);
        const derniere = [...journal].reverse().find((e) => e.role !== 'joueur');
        const evt = await genererEvenementHebdo({
          modele,
          joueur,
          semaine: `${libelleDate(sem)} - ${sem.libelle}`,
          contexte: derniere
            ? `${derniere.titre ?? ''} - ${derniere.texte}`.slice(0, 240)
            : undefined,
          dejaVus: evenementsVus,
        });
        if (!annule) poserEvenementHebdo(evt);
      } catch {
        // L'IA a flanché : le jeu ne s'arrête jamais pour autant, on retombe
        // sur le pool pré-écrit.
        if (!annule) {
          abandonnerEvenement();
          lancerScenario(false);
        }
      } finally {
        if (!annule) setEnCours(false);
        fabrique.current = false;
      }
    })();
    return () => { annule = true; };
    // `journal` et `evenementsVus` sont volontairement hors dépendances : ils
    // changent à chaque entrée écrite, et relanceraient la génération en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joueur, attenteEvenement, evenementHebdo, scenarioActif, avecIA, modele]);

  if (!joueur) return null;

  // ═══ ENVOYER : soit on répond à la scène, soit on agit librement ═════════
  const envoyer = async (action: string) => {
    const contenu = action.trim();
    if (!contenu || enCours) return;
    // Une scène en cours se juge TOUJOURS, même sans IA : le joueur a écrit,
    // il doit obtenir une issue. Sans elle, c'est le barème local qui tranche.
    if (!avecIA && !evenementHebdo) {
      if (!iaActivee) onReglages();
      return;
    }
    setErreur(null);
    setTexte('');
    setChoix([]);
    setEnCours(true);
    const budget = Math.max(0, BUDGET_IA_PAR_SAISON - compteurs.gainsIA);
    try {
      if (evenementHebdo) {
        // ⚠️ LE JUGEMENT PASSE PAR LE BUDGET DE SAISON, comme une action libre :
        // quarante-trois semaines de récit ne doivent pas déplacer l'étalonnage
        // de difficulté (voir CLAUDE.md).
        const jugement = avecIA
          ? await jugerReaction({
            modele,
            joueur,
            evenement: evenementHebdo,
            reponse: contenu,
            budgetAttributs: budget,
          })
          : jugementLocal(joueur, evenementHebdo, contenu, budget);
        appliquerJugement(jugement, contenu);
      } else {
        const reponse = await demanderAuMJ({
          modele,
          joueur,
          historique,
          action: contenu,
        });
        appliquerReponse(reponse, contenu);
        setChoix(reponse.choix ?? []);
      }
    } catch (e) {
      // ⚠️ QUOTA, CLÉ OU RÉSEAU : ON N'AFFICHE RIEN (demande explicite).
      // `messageErreurIA` renvoie `null` dans ces cas-là — le jeu bascule en
      // silence sur le contenu pré-écrit, et repassera sur Groq tout seul.
      const message = messageErreurIA(e);
      if (message) {
        setErreur(message);
        setTexte(contenu); // on garde l'action dans la barre pour réessayer
      } else if (evenementHebdo) {
        appliquerJugement(jugementLocal(joueur, evenementHebdo, contenu, budget), contenu);
      } else {
        // Une action libre sans MJ n'a pas d'issue possible : on rend la main
        // au pool de situations, qui, lui, ne dépend de personne.
        lancerScenario(false);
      }
    } finally {
      setEnCours(false);
    }
  };

  const gererClavier = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      envoyer(texte);
    }
  };

  const suggestions = choix.length ? choix : IDEE_CLES.map((cle) => t(cle));

  return (
    // ⚠️ Trois colonnes qui tiennent DANS l'écran : la page elle-même ne
    // défile jamais, chaque colonne défile de son côté (voir App.css).
    <section className="carriere" data-mobile-vue={vueMobile}>
      <div className="carriere-mobile-vues" role="group" aria-label={t('car.navigationMobile')}>
        <button
          type="button"
          onClick={() => setVueMobile('jeu')}
          aria-pressed={vueMobile === 'jeu'}
          aria-controls="carriere-jeu"
        >
          <Icone nom="livre" taille={17} />{t('car.vueJeu')}
        </button>
        <button
          type="button"
          onClick={() => setVueMobile('joueur')}
          aria-pressed={vueMobile === 'joueur'}
          aria-controls="carriere-joueur"
        >
          <Icone nom="profil" taille={17} />{t('nav.profil')}
        </button>
        <button
          type="button"
          onClick={() => setVueMobile('classement')}
          aria-pressed={vueMobile === 'classement'}
          aria-controls="carriere-classement"
        >
          <Icone nom="trophee" taille={17} />{t('nav.classement')}
        </button>
      </div>
      <PanneauJoueur joueur={joueur} />

      <div id="carriere-jeu" className="carte jeu">
        <div className="journal" role="log" aria-live="polite" aria-relevant="additions text" aria-label={t('car.vueJeu')}>
          <AnimatePresence initial={false}>
            {journal.map((e) => (
              <Message key={e.id} entree={e} />
            ))}
          </AnimatePresence>

          {enCours && (
            <div className="msg mj" role="status" aria-label={t('app.chargement')}>
              <div className="bulle">
                <div className="reflexion" aria-hidden="true">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {erreur && <div className="alerte" role="alert" style={{ margin: '0 1.2rem' }}>{erreur}</div>}

        {scenarioActif ? (
          <div className="scenario-choix">
            <div className="scenario-consigne">{t('car.faisTonChoix')}</div>
            {scenarioActif.choix.map((c, i) => (
              <button key={i} className="choix-scenario" onClick={() => resoudreChoix(i)}>
                {c.texte}
              </button>
            ))}
          </div>
        ) : (
          !enCours && !evenementHebdo && avecIA && (
            <div className="choix-rapides" style={{ padding: '0 1.2rem' }}>
              {/* ⚠️ PLUS DE BOUTON « La vie hors du terrain ». Le récit ne se
                  déclenche plus à la demande : il TOMBE, chaque semaine, comme
                  la vie. Il ne reste ici que des pistes d'action libre — et
                  seulement quand aucune scène n'attend de réponse. */}
              {suggestions.slice(0, 4).map((c, i) => (
                <button key={i} onClick={() => envoyer(c)}>{c}</button>
              ))}
            </div>
          )
        )}

        {/* La consigne quand une scène attend : sans elle, on ne comprend pas
            que le champ de saisie sert à RÉPONDRE, pas à agir librement. */}
        {evenementHebdo && !enCours && (
          <div className="scenario-consigne" style={{ padding: '0 1.2rem 0.4rem' }}>
            {t('car.aToi')}{' '}
            {evenementHebdo.risque && (
              <span style={{ color: 'var(--or)' }}>
                {t('car.risque')}
              </span>
            )}
          </div>
        )}

        {/* ⚠️ L'ACTION LIBRE A BESOIN DU MJ. Sans lui (IA coupée dans les
            réglages, ou quota épuisé), la semaine se joue aux situations à
            choix : on neutralise la barre au lieu de laisser le joueur écrire
            dans le vide. Aucun message d'alerte — juste une invite différente. */}
        <div className="saisie">
          <textarea
            aria-label={
              evenementHebdo
                ? t('car.placeholderEvenement')
                : avecIA ? t('car.placeholder') : t('car.placeholderSansMJ')
            }
            placeholder={
              scenarioActif
                ? t('car.placeholderChoix')
                : evenementHebdo
                  ? t('car.placeholderEvenement')
                  : avecIA
                    ? t('car.placeholder')
                    : t('car.placeholderSansMJ')
            }
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={gererClavier}
            enterKeyHint="send"
            rows={1}
            disabled={enCours || !!scenarioActif || (!avecIA && !evenementHebdo)}
          />
          <button
            className="btn primaire"
            onClick={() => envoyer(texte)}
            disabled={
              enCours || !!scenarioActif || !texte.trim() || (!avecIA && !evenementHebdo)
            }
          >
            {enCours ? '…' : evenementHebdo ? t('car.repondre') : t('car.jouer')}
          </button>
        </div>
      </div>

      {/* Le classement du championnat, en permanence sous les yeux. */}
      <ClassementLateral joueur={joueur} />
    </section>
  );
}

function Message({ entree }: { entree: EntreeJournal }) {
  const joueur = useGame((s) => s.joueur);
  const estDebut = entree.role === 'systeme'
    && (entree.titre === 'Début de carrière' || entree.titre === 'Career begins');
  const transfert = entree.role === 'systeme'
    ? /^(.*?) quitte (.*?) pour (.*?)\. Le transfert est acté : tu le verras dans les effectifs\.$/.exec(entree.texte)
    : null;
  const titre = estDebut
    ? t('car.debutTitre')
    : transfert ? t('car.mercatoOfficiel') : entree.titre;
  const texte = estDebut && joueur
    ? t('car.debutTexte', { joueur: joueur.nom, poste: nomPoste(joueur.poste).toLowerCase(), club: joueur.club })
    : transfert
      ? t('car.transfertOfficiel', { joueur: transfert[1], de: transfert[2], vers: transfert[3] })
      : entree.texte;
  return (
    <motion.div
      className={`msg ${entree.role}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bulle">
        {titre && entree.role === 'mj' && (
          <div className="titre-evt">◆ {entree.titre}</div>
        )}
        {titre && entree.role === 'systeme' && (
          <div className="titre-evt" style={{ color: 'var(--brume)' }}>{titre}</div>
        )}
        {texte}
        {entree.deltas && Object.keys(entree.deltas).length > 0 && (
          <div className="deltas">
            {Object.entries(entree.deltas).map(([k, v]) => (
              <span key={k} className={`delta ${v > 0 ? 'plus' : 'moins'}`}>
                {/* ⚠️ `labelAttribut` et pas `ATTRIBUTS_LABELS` : la table brute
                    est la source FRANÇAISE (elle sert aux prompts du MJ), pas
                    ce qu'on affiche. Un joueur japonais lisait « Plaquage ». */}
                {v > 0 ? '▲' : '▼'} {labelAttribut(k)} {v > 0 ? '+' : ''}
                {/* Les abonnés se comptent par milliers : sans séparateur,
                    « +12400 » ne se lit pas. */}
                {k === 'argent'
                  ? `${v.toLocaleString('fr-FR')} €`
                  : k === 'abonnes' ? v.toLocaleString('fr-FR') : v}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
