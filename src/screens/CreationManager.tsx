import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { NATIONS, NATIONS_PAR_ZONE } from '../data/rugby';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { nombre, t } from '../lib/i18n';
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
      vignette: <Drapeau nation={n} taille={1.05} />,
    }))),
    [],
  );

  const optionsClubs: OptionSelecteur[] = useMemo(
    () => accessibles.slice(0, CLUBS_AFFICHES).map((c) => ({
      valeur: c.club.nom,
      label: c.club.nom,
      sous: t('mgr.creation.clubSous', {
        competition: c.competition.nom, force: c.force.toFixed(1),
        ambition: c.ambitieux ? ` · ${t('mgr.creation.ambitieux')}` : '',
      }),
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
        ← {t('mgr.creation.retour')}
      </button>

      <div className="eyebrow">{t('mgr.carriere')}</div>
      <h1>{depuis ? t('mgr.creation.reconversionTitre') : t('mgr.creation.premierBanc')}</h1>

      {depuis && (
        <div className="carte reconversion" style={{ padding: '1.1rem', marginBottom: '1rem' }}>
          {t('mgr.creation.reconversionTexte', {
            nom: depuis.nom, saisons: depuis.saisons, titres: depuis.titres.length,
            note: Math.round(depuis.note), prestige, debut: PRESTIGE_DEBUT,
          })}
        </div>
      )}

      <div className="carte" style={{ padding: '1.6rem' }}>
        {/* ═══ LE MODE ═══════════════════════════════════════════════════════
            ⚠️ LE CHOIX SE FAIT ICI ET NULLE PART AILLEURS. Passer en mode libre
            en cours de carrière reviendrait à jouer classé jusqu'au moment où
            l'on décide de ne plus l'être : c'est pour ça que `signerBanc` refuse
            un club hors de portée. */}
        <div className="champ">
          <label>{t('mgr.creation.mode')}</label>
          <div className="modes-manager">
            <button
              type="button"
              className={`mode-manager ${!libre ? 'actif' : ''}`}
              onClick={() => setLibre(false)}
            >
              <span className="mode-titre">🎖️ {t('mgr.creation.modeCarriere')}</span>
              <span className="mode-desc">{t('mgr.creation.modeCarriereTexte')}</span>
            </button>
            <button
              type="button"
              className={`mode-manager ${libre ? 'actif' : ''}`}
              onClick={() => setLibre(true)}
            >
              <span className="mode-titre">🔓 {t('mgr.creation.modeLibre')}</span>
              <span className="mode-desc">{t('mgr.creation.modeLibreTexte')}</span>
            </button>
          </div>
        </div>

        <div className="grille-2">
          <div className="champ">
            <label htmlFor="mnom">{t('mgr.creation.nom')}</label>
            <input
              id="mnom"
              type="text"
              value={nom}
              maxLength={LIMITES.pseudoMax}
              placeholder={t('mgr.creation.nomPlaceholder')}
              onChange={(e) => setNom(e.target.value)}
            />
            <span className="champ-aide">{t('mgr.creation.nomAide')}</span>
          </div>
          <div className="champ">
            <label htmlFor="mage">{t('mgr.creation.age')}</label>
            {/* Même dispositif que la création de joueur : sur téléphone un
                champ numérique n'affiche aucune flèche, et borner à chaque
                frappe rend le champ impossible à remplir. */}
            <div className="pas-a-pas">
              <button
                type="button"
                onClick={() => setAgeSaisi(String(bornerAge(age - 1)))}
                disabled={age <= AGE_MIN}
                aria-label={t('mgr.creation.moinsUn')}
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
                aria-label={t('mgr.creation.plusUn')}
              >
                +
              </button>
            </div>
            <span className="champ-aide" id="mage-bornes">
              {t('mgr.creation.ageBornes', { min: AGE_MIN, max: AGE_MAX })}
            </span>
          </div>
        </div>

        <div className="champ">
          <label htmlFor="mnation">{t('mgr.creation.nationalite')}</label>
          <Selecteur
            id="mnation"
            options={optionsNations}
            valeur={nation}
            onChange={setNation}
          />
        </div>

        <div className="champ">
          <label htmlFor="mclub">
            {t('mgr.creation.club')} {libre
              ? t('mgr.creation.tousClubs')
              : t('mgr.creation.clubsPortee', { n: accessibles.length })}
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
              ? t('mgr.creation.libreAide')
              : t('mgr.creation.clubAide', {
                prestige, note: (noteMaximale(prestige) + MARGE_AMBITION).toFixed(0),
                niveau: etage?.nom ?? t('mgr.amateur'),
              })}
            {optionsClubs.length < accessibles.length
              && ` ${t('mgr.creation.limiteClubs', { n: CLUBS_AFFICHES })}`}
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
              <div><span>{choisi.force.toFixed(1)}</span><em>{t('mgr.force')}</em></div>
              <div><span>{choisi.objectif}ᵉ</span><em>{t('mgr.objectif')}</em></div>
              <div>
                <span>{nombre(salaireManager(choisi.force))} €</span>
                <em>{t('mgr.creation.parSaison')}</em>
              </div>
              <div><span>{t('mgr.creation.troisAns')}</span><em>{t('mgr.contrat')}</em></div>
            </div>
            {choisi.ambitieux && (
              <p className="cm-note">
                ⚠️ {t('mgr.creation.clubAmbitieuxAide')}
              </p>
            )}
          </div>
        )}

        <div className="actions">
          <button className="btn primaire grand" onClick={valider} disabled={!choisi}>
            {libre ? `🔓 ${t('mgr.creation.prendreLibre')}` : `🎖️ ${t('mgr.signer')}`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
