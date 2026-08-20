import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { POSTES, NATIONS, NATIONS_PAR_ZONE, descriptionPoste, nomPoste } from '../data/rugby';
import { COMPETITIONS, CLUBS_FRANCE_PAR_DIVISION } from '../data/clubs';
import {
  TRAITS, MAX_TRAITS, descriptionTrait, nomTrait, traitDisponible,
} from '../data/traits';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import type { PosteId } from '../types';

// ⚠️ L’ÂGE DE DÉPART EST BORNÉ, MAIS PAS PENDANT LA FRAPPE. Voir le champ
// plus bas : c’est exactement ce qui le rendait impossible à changer.
const AGE_MIN = 16;
const AGE_MAX = 30;
const AGE_DEFAUT = 18;
const bornerAge = (n: number) => Math.max(AGE_MIN, Math.min(AGE_MAX, n));

export function Creation() {
  const creerJoueur = useGame((s) => s.creerJoueur);
  const setEcran = useGame((s) => s.setEcran);
  const traitsDebloques = useGame((s) => s.traitsDebloques);

  const [nom, setNom] = useState('');
  const [poste, setPoste] = useState<PosteId>('demi_ouverture');
  const [nation, setNation] = useState(NATIONS[0]);
  // Toutes les compétitions sont jouables : la pyramide française du bas vers
  // le haut (départ recommandé : Régionale 3, pour tout gravir), puis les
  // championnats du monde — on peut commencer sa carrière à l'étranger.
  const championnats = useMemo(
    () => [
      ...[...CLUBS_FRANCE_PAR_DIVISION].reverse(),
      ...COMPETITIONS.filter((c) => c.zone === 'Monde'),
    ],
    [],
  );
  const [divisionId, setDivisionId] = useState(championnats[0].id);
  const division = championnats.find((d) => d.id === divisionId)!;
  const [club, setClub] = useState(division.clubs[0].nom);
  // ⚠️ ON GARDE LA SAISIE BRUTE, PAS LE NOMBRE. Le champ clampait à chaque
  // frappe : taper « 25 » donnait « 2 » → borné à 16, puis « 165 » → borné à
  // 30. Sur téléphone, où il n’y a pas de flèches de réglage, l’âge était donc
  // tout simplement IMPOSSIBLE à changer — c’est le bug signalé. On ne borne
  // plus qu’à la sortie du champ (et aux boutons − / +).
  const [ageSaisi, setAgeSaisi] = useState(String(AGE_DEFAUT));
  const age = bornerAge(Number(ageSaisi) || AGE_DEFAUT);
  const [traits, setTraits] = useState<string[]>([]);

  const changerDivision = (id: string) => {
    setDivisionId(id);
    const d = championnats.find((x) => x.id === id)!;
    setClub(d.clubs[0].nom);
  };

  const valider = () => {
    creerJoueur({ nom, poste, nation, club, division: divisionId, age, traits });
  };

  // Options des listes déroulantes (drapeaux, emojis de division, blasons)
  const optionsNations: OptionSelecteur[] = useMemo(
    () =>
      NATIONS_PAR_ZONE.flatMap((g) =>
        g.nations.map((n) => ({
          valeur: n,
          label: nomNationTraduit(n),
          groupe: t(`cr.zone.${g.zone}`),
          vignette: <Drapeau nation={n} taille={1.05} />,
        })),
      ),
    [],
  );

  const optionsDivisions: OptionSelecteur[] = useMemo(
    () =>
      championnats.map((d) => ({
        valeur: d.id,
        label: d.nom,
        sous: `${d.clubs.length} ${t('gen.clubs')}`,
        vignette: <LogoCompet id={d.id} emoji={d.emoji} taille={24} />,
        groupe: d.zone === 'France' ? `🇫🇷 ${t('cr.pyramide')}` : `🌍 ${nomNationTraduit(d.pays)}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const optionsClubs: OptionSelecteur[] = useMemo(
    () =>
      division.clubs.map((c) => ({
        valeur: c.nom,
        label: c.nom,
        sous: c.ville,
        vignette: <Blason club={c} taille={26} />,
      })),
    [division],
  );

  return (
    <motion.section
      className="creation"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button className="btn fantome" onClick={() => setEcran('accueil')} style={{ marginBottom: '1rem' }}>
        {t('gen.retour')}
      </button>
      <div className="eyebrow">{t('cr.eyebrow')}</div>
      <h1>{t('cr.titre')}</h1>
      <p style={{ color: 'var(--craie-dim)', margin: '0.6rem 0 2rem', maxWidth: '60ch' }}>
        {t('cr.chapo')}
      </p>

      <div className="carte" style={{ padding: '1.6rem' }}>
        <div className="grille-2">
          <div className="champ">
            <label htmlFor="nom">{t('cr.nom')}</label>
            <input
              id="nom"
              type="text"
              placeholder={t('cr.nomExemple')}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={40}
            />
            {/* Un champ vide ne bloque plus rien, et on le DIT : sinon le nom
                tiré au sort à la validation passe pour un bug. */}
            <span className="champ-aide">{t('cr.nomVide')}</span>
          </div>
          <div className="champ">
            <label htmlFor="age">{t('cr.age')}</label>
            {/* ⚠️ DEUX BOUTONS AUTOUR DU CHAMP, ET CE N’EST PAS DÉCORATIF. Un
                `type="number"` seul n’affiche AUCUNE flèche de réglage sur
                téléphone : il ne restait que le clavier, et le clavier était
                cassé par le bornage à chaque frappe. Les deux touches font
                48 px — au-dessus du minimum de 44 px du projet. */}
            <div className="pas-a-pas">
              <button
                type="button"
                onClick={() => setAgeSaisi(String(bornerAge(age - 1)))}
                disabled={age <= AGE_MIN}
                aria-label={t('cr.ageMoins')}
              >
                −
              </button>
              <input
                id="age"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={ageSaisi}
                aria-describedby="age-bornes"
                onChange={(e) => setAgeSaisi(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => setAgeSaisi(String(age))}
              />
              <button
                type="button"
                onClick={() => setAgeSaisi(String(bornerAge(age + 1)))}
                disabled={age >= AGE_MAX}
                aria-label={t('cr.agePlus')}
              >
                +
              </button>
            </div>
            <span className="champ-aide" id="age-bornes">
              {t('cr.ageBornes', { min: AGE_MIN, max: AGE_MAX })}
            </span>
          </div>
        </div>

        <div className="grille-2">
          <div className="champ">
            <label htmlFor="nation">{t('cr.nation')}</label>
            <Selecteur
              id="nation"
              options={optionsNations}
              valeur={nation}
              onChange={setNation}
            />
          </div>
          <div className="champ">
            <label htmlFor="division">{t('cr.championnat')}</label>
            <Selecteur
              id="division"
              options={optionsDivisions}
              valeur={divisionId}
              onChange={changerDivision}
            />
          </div>
        </div>

        <div className="champ">
          <label htmlFor="club">{t('cr.club')} ({division.nom})</label>
          <Selecteur
            id="club"
            options={optionsClubs}
            valeur={club}
            onChange={setClub}
          />
        </div>

        <div className="champ">
          <label>{t('cr.poste')}</label>
          <div className="postes-grille">
            {POSTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`poste-carte ${poste === p.id ? 'actif' : ''}`}
                onClick={() => setPoste(p.id)}
              >
                <div className="num">{p.numero}</div>
                <div className="nom">{nomPoste(p.id)}</div>
                <div className="cat">{t(`poste.cat.${p.categorie}`)}</div>
                <div className="desc">{descriptionPoste(p.id)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Traits de caractère : deux au maximum, pour toute la carrière. */}
        <div className="champ">
          <label>
            {t('cr.traits')}{' '}
            <span style={{ fontWeight: 400, color: 'var(--brume)', fontSize: '0.85rem' }}>
              : {t('cr.traitsAide', { max: MAX_TRAITS, choisis: traits.length })}
            </span>
          </label>
          <div className="traits-grille">
            {TRAITS.map((tr) => {
              const choisi = traits.includes(tr.id);
              // ⚠️ UN ARCHÉTYPE PAYANT RESTE VISIBLE, GRISÉ, AVEC SON PRIX. Le
              // masquer reviendrait à cacher la moitié du système de caractères
              // à qui n'a rien acheté : on ne peut pas vouloir un trait dont on
              // ignore l'existence.
              const ouvert = traitDisponible(tr.id, traitsDebloques);
              const plein = (traits.length >= MAX_TRAITS && !choisi) || !ouvert;
              return (
                <button
                  key={tr.id}
                  type="button"
                  className={`trait-carte${choisi ? ' actif' : ''}${ouvert ? '' : ' verrouille'}`}
                  disabled={plein}
                  onClick={() =>
                    setTraits((liste) =>
                      liste.includes(tr.id) ? liste.filter((x) => x !== tr.id) : [...liste, tr.id],
                    )
                  }
                >
                  <div className="trait-tete">
                    <span className="trait-emoji">{tr.emoji}</span>
                    <b>{nomTrait(tr.id)}</b>
                    {choisi && <span className="trait-check">✓</span>}
                  </div>
                  <div className="trait-desc">{descriptionTrait(tr.id)}</div>
                  {!ouvert && (
                    <div className="trait-prix">
                      🔒 {t('cr.traitVerrouille', { prix: tr.prix ?? 0 })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="trait-note">{t('cr.traitsBoutique')}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn primaire grand" onClick={valider}>
            {t('cr.lancer')} 🏉
          </button>
        </div>
      </div>
    </motion.section>
  );
}
