import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { NATIONS, NATIONS_PAR_ZONE } from '../data/rugby';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { LIMITES } from '../lib/classementMondial';
import {
  MARGE_AMBITION, PRESTIGE_DEBUT, clubsAccessibles, etageAccessible,
  noteMaximale, prestigeDepuisJoueur, salaireManager,
} from '../lib/manager';

// ⚠️ LES BORNES D'ÂGE VIENNENT DU CRIBLE DU CLASSEMENT, PAS D'ICI. C'est la
// leçon déjà payée côté joueur : `Creation` bornait à 30, `verifierFiche` à 24,
// et une carrière sur trois était refusée à vie sans que rien ne le dise. Un
// entraîneur a sa propre fenêtre (`ageDebutManagerMin/Max`), parce que personne
// ne prend un banc à seize ans et que personne n'arrête à quarante-quatre.
const AGE_MIN = LIMITES.ageDebutManagerMin;
const AGE_MAX = LIMITES.ageDebutManagerMax;
const AGE_DEFAUT = 34;
const bornerAge = (n: number) => Math.max(AGE_MIN, Math.min(AGE_MAX, n));

/** Combien de clubs on propose dans la liste. Au-delà, on cherche. */
const CLUBS_AFFICHES = 400;

export function CreationManager() {
  const creerManager = useGame((s) => s.creerManager);
  const setEcran = useGame((s) => s.setEcran);
  const depuis = useGame((s) => s.reconversionManager);

  const [nom, setNom] = useState(depuis?.nom ?? '');
  const [nation, setNation] = useState(depuis?.nation ?? NATIONS[0]);
  const [ageSaisi, setAgeSaisi] = useState(String(depuis?.age ?? AGE_DEFAUT));
  const [libre, setLibre] = useState(false);
  const age = bornerAge(Number(ageSaisi) || AGE_DEFAUT);

  // ⚠️ LE PRESTIGE DE DÉPART EST LE CŒUR DE L'ÉCRAN : c'est lui qui décide de
  // tout ce qui suit. Un inconnu part à 6, un ancien joueur part de ce que sa
  // carrière valait — jamais au-dessus de la Nationale (`prestigeDepuisJoueur`).
  const prestige = depuis ? prestigeDepuisJoueur(depuis) : PRESTIGE_DEBUT;

  // ⚠️ MESURÉ : 107 ms pour balayer les 855 clubs du jeu (`verifManager.ts`).
  // C'est mémoïsé côté `forceEffectif`, donc le second calcul est instantané —
  // mais le premier passe quand même par ici, d'où le `useMemo` : sans lui, on
  // le refait à chaque frappe dans le champ « nom ».
  const accessibles = useMemo(
    () => clubsAccessibles(prestige, 1, { triche: libre }),
    [prestige, libre],
  );

  const [club, setClub] = useState('');
  const choisi = accessibles.find((c) => c.club.nom === club) ?? accessibles[0];

  const optionsNations: OptionSelecteur[] = useMemo(
    () => NATIONS_PAR_ZONE.flatMap((g) => g.nations.map((n) => ({
      valeur: n,
      label: nomNationTraduit(n),
      groupe: g.zone,
      vignette: <Drapeau nation={n} taille={20} />,
    }))),
    [],
  );

  const optionsClubs: OptionSelecteur[] = useMemo(
    () => accessibles.slice(0, CLUBS_AFFICHES).map((c) => ({
      valeur: c.club.nom,
      label: c.club.nom,
      sous: `${c.competition.nom} · force ${c.force.toFixed(1)}`
        + (c.ambitieux ? ' · ambitieux' : ''),
      vignette: <Blason club={c.club} taille={22} />,
    })),
    [accessibles],
  );

  const etage = etageAccessible(prestige);

  function valider() {
    if (!choisi) return;
    creerManager({
      nom, nation, age, club: choisi.club.nom,
      ...(libre ? { libre: true } : {}),
      ...(depuis ? { depuis } : {}),
    });
  }

  return (
    <motion.div
      className="creation"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button className="btn fantome" onClick={() => setEcran('accueil')} style={{ marginBottom: '1rem' }}>
        ← Retour
      </button>

      <div className="eyebrow">Carrière d’entraîneur</div>
      <h1>{depuis ? 'Raccrocher les crampons, prendre le banc' : 'Prendre un premier banc'}</h1>

      {depuis && (
        <div className="carte reconversion" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
          <strong>{depuis.nom}</strong> raccroche après {depuis.saisons} saison(s),
          {' '}{depuis.titres.length} titre(s), une générale de {Math.round(depuis.note)}.
          <br />
          Son statut lui ouvre un prestige de départ de <strong>{prestige}/100</strong>{' '}
          au lieu de {PRESTIGE_DEBUT} — mais un grand joueur n’est pas un grand
          entraîneur : c’est sur le banc que tout se rejoue.
        </div>
      )}

      <div className="carte" style={{ padding: '1.6rem' }}>
        {/* ═══ LE MODE ═══════════════════════════════════════════════════════
            ⚠️ LE CHOIX SE FAIT ICI ET NULLE PART AILLEURS. Passer en mode libre
            en cours de carrière reviendrait à jouer classé jusqu'au moment où
            l'on décide de ne plus l'être : c'est pour ça que `signerBanc` refuse
            un club hors de portée. */}
        <div className="champ">
          <label>Mode de carrière</label>
          <div className="modes-manager">
            <button
              type="button"
              className={`mode-manager ${!libre ? 'actif' : ''}`}
              onClick={() => setLibre(false)}
            >
              <span className="mode-titre">🎖️ Carrière</span>
              <span className="mode-desc">
                On commence en bas et on se fait un nom. Chaque saison tenue
                ouvre de plus gros clubs. <strong>Compte au classement mondial.</strong>
              </span>
            </button>
            <button
              type="button"
              className={`mode-manager ${libre ? 'actif' : ''}`}
              onClick={() => setLibre(true)}
            >
              <span className="mode-titre">🔓 Mode libre</span>
              <span className="mode-desc">
                N’importe quel club du monde, tout de suite, Stade Toulousain
                compris. <strong>N’entre dans aucun classement</strong>, jamais.
              </span>
            </button>
          </div>
        </div>

        <div className="grille-2">
          <div className="champ">
            <label htmlFor="mnom">Nom</label>
            <input
              id="mnom"
              type="text"
              value={nom}
              maxLength={LIMITES.pseudoMax}
              placeholder="Ton nom d’entraîneur"
              onChange={(e) => setNom(e.target.value)}
            />
            <span className="champ-aide">Laissé vide, un nom de ta nation est tiré.</span>
          </div>
          <div className="champ">
            <label htmlFor="mage">Âge</label>
            {/* Même dispositif que la création de joueur : sur téléphone un
                champ numérique n'affiche aucune flèche, et borner à chaque
                frappe rend le champ impossible à remplir. */}
            <div className="pas-a-pas">
              <button
                type="button"
                onClick={() => setAgeSaisi(String(bornerAge(age - 1)))}
                disabled={age <= AGE_MIN}
                aria-label="Un an de moins"
              >
                −
              </button>
              <input
                id="mage"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={ageSaisi}
                aria-describedby="mage-bornes"
                onChange={(e) => setAgeSaisi(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => setAgeSaisi(String(age))}
              />
              <button
                type="button"
                onClick={() => setAgeSaisi(String(bornerAge(age + 1)))}
                disabled={age >= AGE_MAX}
                aria-label="Un an de plus"
              >
                +
              </button>
            </div>
            <span className="champ-aide" id="mage-bornes">
              De {AGE_MIN} à {AGE_MAX} ans.
            </span>
          </div>
        </div>

        <div className="champ">
          <label htmlFor="mnation">Nationalité</label>
          <Selecteur
            id="mnation"
            options={optionsNations}
            valeur={nation}
            onChange={setNation}
          />
        </div>

        <div className="champ">
          <label htmlFor="mclub">
            Club {libre ? '(tous les clubs du monde)' : `(${accessibles.length} à ta portée)`}
          </label>
          <Selecteur
            id="mclub"
            options={optionsClubs}
            valeur={choisi?.club.nom ?? ''}
            onChange={setClub}
            recherche
          />
          <span className="champ-aide">
            {libre
              ? 'Tout est ouvert — et rien ne sera classé.'
              : `Prestige ${prestige}/100 : tu peux entraîner jusqu’à un effectif noté `
                + `${(noteMaximale(prestige) + MARGE_AMBITION).toFixed(0)}, soit le niveau `
                + `${etage?.nom ?? 'amateur'}. Les clubs « ambitieux » sont ceux que tu `
                + 'n’étais pas censé décrocher.'}
            {optionsClubs.length < accessibles.length
              && ` Seuls les ${CLUBS_AFFICHES} plus forts sont listés : utilise la recherche pour les autres.`}
          </span>
        </div>

        {choisi && (
          <div className="carte contrat-manager">
            <div className="cm-tete">
              <Blason club={choisi.club} taille={40} />
              <div>
                <strong>{choisi.club.nom}</strong>
                <div className="cm-compet">
                  <LogoCompet id={choisi.competition.id} emoji={choisi.competition.emoji} taille={20} />
                  {choisi.competition.nom}
                </div>
              </div>
            </div>
            <div className="cm-chiffres">
              <div><span>{choisi.force.toFixed(1)}</span><em>force de l’effectif</em></div>
              <div><span>{choisi.objectif}ᵉ</span><em>demandé par le board</em></div>
              <div>
                <span>{salaireManager(choisi.force).toLocaleString('fr-FR')} €</span>
                <em>par saison</em>
              </div>
              <div><span>3 ans</span><em>de contrat</em></div>
            </div>
            {choisi.ambitieux && (
              <p className="cm-note">
                ⚠️ Ce club est au-dessus de ton prestige. Le board t’a fait
                confiance : il sera d’autant plus dur à convaincre.
              </p>
            )}
          </div>
        )}

        <div className="actions">
          <button className="btn primaire grand" onClick={valider} disabled={!choisi}>
            {libre ? '🔓 Prendre ce banc (hors classement)' : '🎖️ Signer'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
