import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { POSTES, NATIONS, NATIONS_PAR_ZONE } from '../data/rugby';
import { COMPETITIONS, CLUBS_FRANCE_PAR_DIVISION } from '../data/clubs';
import { TRAITS, MAX_TRAITS } from '../data/traits';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { Drapeau } from '../components/Drapeau';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import type { PosteId } from '../types';

export function Creation() {
  const creerJoueur = useGame((s) => s.creerJoueur);
  const setEcran = useGame((s) => s.setEcran);

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
  const [age, setAge] = useState(18);
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
          label: n,
          groupe: g.zone,
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
        sous: `${d.clubs.length} clubs`,
        vignette: <LogoCompet id={d.id} emoji={d.emoji} taille={24} />,
        groupe: d.zone === 'France' ? '🇫🇷 Pyramide française' : `🌍 ${d.pays}`,
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
        ← Retour
      </button>
      <div className="eyebrow">{t('cr.eyebrow')}</div>
      <h1>{t('cr.titre')}</h1>
      <p style={{ color: 'var(--craie-dim)', margin: '0.6rem 0 2rem', maxWidth: '60ch' }}>
        Choisis ton identité et ton poste. Tes attributs de départ dépendent du
        poste choisi — le reste, tu le construiras sur le terrain.
      </p>

      <div className="carte" style={{ padding: '1.6rem' }}>
        <div className="grille-2">
          <div className="champ">
            <label htmlFor="nom">{t('cr.nom')}</label>
            <input
              id="nom"
              type="text"
              placeholder="Ex. Antoine Dupont"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="champ">
            <label htmlFor="age">{t('cr.age')}</label>
            <input
              id="age"
              type="number"
              min={16}
              max={30}
              value={age}
              onChange={(e) => setAge(Math.max(16, Math.min(30, Number(e.target.value) || 18)))}
            />
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
                <div className="nom">{p.nom}</div>
                <div className="cat">{p.categorie}</div>
                <div className="desc">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Traits de caractère : deux au maximum, pour toute la carrière. */}
        <div className="champ">
          <label>
            Traits de caractère{' '}
            <span style={{ fontWeight: 400, color: 'var(--brume)', fontSize: '0.85rem' }}>
              — choisis-en {MAX_TRAITS} ({traits.length}/{MAX_TRAITS}). Ils te suivront toute ta carrière.
            </span>
          </label>
          <div className="traits-grille">
            {TRAITS.map((t) => {
              const choisi = traits.includes(t.id);
              const plein = traits.length >= MAX_TRAITS && !choisi;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`trait-carte${choisi ? ' actif' : ''}`}
                  disabled={plein}
                  onClick={() =>
                    setTraits((liste) =>
                      liste.includes(t.id) ? liste.filter((x) => x !== t.id) : [...liste, t.id],
                    )
                  }
                >
                  <div className="trait-tete">
                    <span className="trait-emoji">{t.emoji}</span>
                    <b>{t.nom}</b>
                    {choisi && <span className="trait-check">✓</span>}
                  </div>
                  <div className="trait-desc">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn primaire grand" onClick={valider}>
            Lancer la carrière 🏉
          </button>
        </div>
      </div>
    </motion.section>
  );
}
