import { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import {
  SKINS, PACKS, EQUIPEMENTS, EQUIPEMENT_PAR_ID, CATEGORIES_EQUIPEMENT,
} from '../data/boutique';
import {
  TRAITS_A_DEBLOQUER, descriptionTrait, nomTrait,
} from '../data/traits';
import { t } from '../lib/i18n';
import { CartePubRecompensee, BoutonDeblocageParPub } from '../components/Pub';
import { IconeArticle } from '../components/ModeleObjet';

// ⚠️ `ApercuBallon`, PAS `Hero3D` : depuis que le hero affiche le rugbyman dès
// qu'une carrière existe, ce cadre montrait le JOUEUR à la place du ballon
// survolé — cinq articles, la même image. L'aperçu de la boutique ne monte donc
// que le ballon.
import { Icone } from '../components/Icone';
const Apercu3D = lazy(() =>
  import('../components/Hero3D').then((m) => ({ default: m.ApercuBallon })),
);
// ⚠️ Une vignette par article, chargée à la demande comme le grand aperçu : la
// boutique est déjà un écran paresseux, on ne veut pas que ses cinq petits
// canvas partent dans le chunk principal.
const Vignette = lazy(() =>
  import('../components/VignetteBallon').then((m) => ({ default: m.VignetteBallon })),
);
// Même principe pour le vestiaire : un modèle générique, chargé à la demande,
// qui retombe sur une pastille quand le `.glb` n'a pas encore été modélisé.
const Objet3D = lazy(() =>
  import('../components/ModeleObjet').then((m) => ({ default: m.ApercuObjet })),
);

export function Boutique() {
  const coins = useGame((s) => s.coins);
  const inventaire = useGame((s) => s.inventaire);
  const skinActif = useGame((s) => s.skinActif);
  const acheterSkin = useGame((s) => s.acheterSkin);
  const choisirSkin = useGame((s) => s.choisirSkin);
  const equipements = useGame((s) => s.equipements);
  const equipementActif = useGame((s) => s.equipementActif);
  const acheterEquipement = useGame((s) => s.acheterEquipement);
  const traitsDebloques = useGame((s) => s.traitsDebloques);
  const debloquerTrait = useGame((s) => s.debloquerTrait);
  const basculerEquipement = useGame((s) => s.basculerEquipement);
  const [apercu, setApercu] = useState(skinActif);
  // ⚠️ LE GRAND APERÇU EST PARTAGÉ : il montre soit un ballon, soit un article
  // du vestiaire — jamais les deux, parce qu'il n'y a qu'un contexte WebGL à
  // dépenser (voir le commentaire du cadre d'aperçu, plus bas).
  const [apercuType, setApercuType] = useState<'ballon' | 'equipement'>('ballon');
  const [apercuEquip, setApercuEquip] = useState(EQUIPEMENTS[0].id);
  const articleVu = EQUIPEMENT_PAR_ID[apercuEquip] ?? EQUIPEMENTS[0];
  const [flash, setFlash] = useState<string | null>(null);

  const message = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 2200);
  };

  return (
    <motion.section
      className="boutique"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="tete-boutique">
        <div>
          <div className="eyebrow">{t('bo.titre')}</div>
          <h1>{t('bo.chapo')}</h1>
        </div>
        <div className="solde"><Icone nom="ova" taille={17} /> <b>{coins}</b> Ovas</div>
      </div>

      {flash && <div className="flash-boutique">{flash}</div>}

      {/* ═══ UN SEUL GRAND APERÇU, POUR LES BALLONS **ET** LE VESTIAIRE ══════
          ⚠️ CE N'EST PAS UN CHOIX DE MISE EN PAGE, C'EST UNE CONTRAINTE DU
          NAVIGATEUR. Chaque `<Canvas>` ouvre un contexte WebGL et le navigateur
          n'en accorde qu'une poignée : la boutique en consomme déjà six (les
          cinq vignettes de ballons + cet aperçu). Mesuré en jeu, le septième
          est perdu à la seconde où il s'ouvre — « THREE.WebGLRenderer: Context
          Lost », cadre vide. Le vestiaire ne monte donc AUCUN canvas de son
          côté : ses articles sont des pastilles, et pointer l'un d'eux change
          ce qu'affiche ce cadre-ci. */}
      <div className="carte apercu-skin">
        <div className="apercu-canvas">
          <Suspense fallback={<div className="hero-canvas-skel" />}>
            {apercuType === 'ballon'
              ? <Apercu3D skinId={apercu} />
              : <Objet3D url={articleVu.glb} teinte={articleVu.teinte} emoji={articleVu.emoji} />}
          </Suspense>
        </div>
        <div className="apercu-info">
          <div className="eyebrow">{t('bo.apercu')}</div>
          {apercuType === 'ballon' ? (
            <>
              <h2>{SKINS.find((s) => s.id === apercu)?.nom}</h2>
              <p style={{ color: 'var(--craie-dim)' }}>{t('bo.apercuAide')}</p>
              {inventaire.includes(apercu) ? (
                skinActif === apercu ? (
                  <span className="badge-cle ok"><Icone nom="check" taille={13} /> {t('bo.equipe')}</span>
                ) : (
                  <button className="btn primaire" onClick={() => { choisirSkin(apercu); message(t('bo.equipeMsg')); }}>
                    {t('bo.equiper')}
                  </button>
                )
              ) : null}
            </>
          ) : (
            <>
              <h2>{articleVu.nom}</h2>
              <p style={{ color: 'var(--craie-dim)' }}>{articleVu.detail}</p>
              {equipements.includes(articleVu.id) ? (
                <button
                  className={equipementActif[articleVu.categorie] === articleVu.id ? 'btn fantome' : 'btn primaire'}
                  onClick={() => basculerEquipement(articleVu.id)}
                >
                  {equipementActif[articleVu.categorie] === articleVu.id
                    ? t('bo.porte')
                    : t('bo.equiper')}
                </button>
              ) : articleVu.parPub ? (
                /* ⚠️ Cet article-là ne s'achète PAS : il se regarde. Voir
                   `ArticleEquipement.parPub` et `debloquerParPub` (store). */
                <BoutonDeblocageParPub
                  id={articleVu.id}
                  onDebloque={() => message(t('bo.debloque', { article: articleVu.nom }))}
                />
              ) : (
                <button
                  className="btn primaire"
                  disabled={coins < articleVu.prix}
                  onClick={() => {
                    if (acheterEquipement(articleVu.id)) message(t('bo.debloque', { article: articleVu.nom }));
                    else message(t('bo.pasAssez'));
                  }}
                >
                  <Icone nom="ova" taille={15} /> {articleVu.prix}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="eyebrow section-titre">{t('bo.ballons')}</div>
      <div className="grille-boutique">
        {SKINS.map((s) => {
          const possede = inventaire.includes(s.id);
          const equipe = skinActif === s.id;
          return (
            <div
              key={s.id}
              className={`carte article ${apercuType === 'ballon' && apercu === s.id ? 'vu' : ''}`}
              onMouseEnter={() => { setApercu(s.id); setApercuType('ballon'); }}
              onClick={() => { setApercu(s.id); setApercuType('ballon'); }}
            >
              {/* Le VRAI ballon, en 3D, qui tourne — plus une pastille de couleur. */}
              <Suspense fallback={
                <div className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} />
              }>
                <Vignette skinId={s.id} />
              </Suspense>
              <div className="article-nom">{s.nom}</div>
              {equipe ? (
                <span className="badge-cle ok">{t('bo.equipe')}</span>
              ) : possede ? (
                <button className="btn fantome petit" onClick={(e) => { e.stopPropagation(); choisirSkin(s.id); message(t('bo.equipeMsg')); }}>
                  {t('bo.equiper')}
                </button>
              ) : (
                <button
                  className="btn primaire petit"
                  disabled={coins < s.prix}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (acheterSkin(s.id)) message(t('bo.debloque', { article: s.nom }));
                    else message(t('bo.pasAssez'));
                  }}
                >
                  <Icone nom="ova" taille={14} /> {s.prix}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ⚠️ LES BOOSTS ONT ÉTÉ RETIRÉS (demande explicite). Acheter +2 à tous
          les attributs contredisait frontalement la difficulté du jeu, calibrée
          au dixième de point dans `lib/progression.ts` : on ne monte pas sa
          générale à la caisse. La boutique ne vend plus que du cosmétique. */}

      {/* ═══ LE VESTIAIRE ═══════════════════════════════════════════════════
          Crampons, maillots et accessoires. Purement cosmétique, comme les
          ballons : ce qu'on porte se voit dans le panneau de carrière, jamais
          dans les statistiques. Chaque article pointe déjà son `.glb` — ceux
          qui restent à modéliser affichent leur pastille en attendant, et
          passeront en 3D le jour où le fichier arrive dans `public/m3d/`. */}
      <div className="eyebrow section-titre">{t('bo.vestiaire')}</div>
      <p style={{ color: 'var(--brume)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
        {t('bo.vestiaireAide')}
      </p>
      {CATEGORIES_EQUIPEMENT.map((cat) => (
        <div key={cat.id} className="bloc-vestiaire">
          <div className="vestiaire-titre">{cat.emoji} {t(cat.cle)}</div>
          <div className="grille-boutique">
            {EQUIPEMENTS.filter((e) => e.categorie === cat.id).map((e) => {
              const possede = equipements.includes(e.id);
              const porte = equipementActif[e.categorie] === e.id;
              return (
                <div
                  key={e.id}
                  className={`carte article ${apercuType === 'equipement' && apercuEquip === e.id ? 'vu' : ''}${porte ? ' porte' : ''}`}
                  /* Survoler une carte ne monte AUCUN canvas : ça change juste
                     ce qu'affiche le grand aperçu, en haut de l'écran. */
                  onMouseEnter={() => { setApercuEquip(e.id); setApercuType('equipement'); }}
                  onFocus={() => { setApercuEquip(e.id); setApercuType('equipement'); }}
                  onClick={() => { setApercuEquip(e.id); setApercuType('equipement'); }}
                >
                  {/* Le VRAI modèle 3D en icône — rendu une fois hors écran,
                      puis servi en image (voir `lib/vignettes3d.ts`). */}
                  <IconeArticle url={e.glb} teinte={e.teinte} emoji={e.emoji} />
                  <div className="article-nom">{e.nom}</div>
                  <div className="article-detail">{e.detail}</div>
                  {/* Un article « par pub » annonce la couleur AVANT le clic :
                      pas de prix barré, pas de fausse promo — juste ce qu'il
                      faut faire pour l'avoir. */}
                  {!possede && e.parPub && (
                    <div className="article-detail etiquette-pub"><Icone nom="video" taille={14} /> {t('pub.gratuitPub')}</div>
                  )}
                  {possede ? (
                    <button
                      className={porte ? 'btn fantome petit' : 'btn primaire petit'}
                      onClick={() => basculerEquipement(e.id)}
                    >
                      {porte ? t('bo.porte') : t('bo.equiper')}
                    </button>
                  ) : e.parPub ? (
                    <BoutonDeblocageParPub
                      id={e.id}
                      onDebloque={() => message(t('bo.debloque', { article: e.nom }))}
                    />
                  ) : (
                    <button
                      className="btn primaire petit"
                      disabled={coins < e.prix}
                      onClick={() => {
                        if (acheterEquipement(e.id)) message(t('bo.debloque', { article: e.nom }));
                        else message(t('bo.pasAssez'));
                      }}
                    >
                      <Icone nom="ova" taille={14} /> {e.prix}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ═══ LES CARACTÈRES ═══════════════════════════════════════════════
          ⚠️ LA SEULE CHOSE NON COSMÉTIQUE DE LA BOUTIQUE, ET C’EST ASSUMÉ —
          parce que ça ne vend PAS de la puissance. `MAX_TRAITS` reste à deux :
          un joueur qui a tout débloqué en porte autant qu’un joueur qui n’a
          rien acheté, et chaque archétype coûte quelque chose autant qu’il
          rapporte. `scripts/verifTraits.ts` échoue si un payant pèse plus lourd
          que le meilleur des gratuits, paires comprises. Ce qu’on achète, c’est
          une façon de jouer de plus. */}
      <div className="eyebrow section-titre">{t('bo.caracteres')}</div>
      <p style={{ color: 'var(--brume)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
        {t('bo.caracteresAide')}
      </p>
      <div className="grille-caracteres">
        {TRAITS_A_DEBLOQUER.map((tr) => {
          const possede = traitsDebloques.includes(tr.id);
          const prix = tr.prix ?? 0;
          return (
            <div key={tr.id} className={`carte caractere${possede ? ' possede' : ''}`}>
              <div className="caractere-tete">
                <span className="caractere-emoji">{tr.emoji}</span>
                <b>{nomTrait(tr.id)}</b>
              </div>
              <div className="caractere-desc">{descriptionTrait(tr.id)}</div>
              {possede ? (
                <div className="caractere-acquis">{t('bo.traitDebloque')}</div>
              ) : (
                <button
                  className="btn primaire petit"
                  disabled={coins < prix}
                  onClick={() => {
                    if (debloquerTrait(tr.id)) message(t('bo.traitAchete', { trait: nomTrait(tr.id) }));
                    else message(t('bo.pasAssez'));
                  }}
                >
                  <Icone nom="ova" taille={14} /> {prix}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* ═══ GAGNER DES OVAS SANS PAYER ══════════════════════════════════════
          ⚠️ FACULTATIF, ET ÇA DOIT LE RESTER. Aucun article n'est réservé à
          ceux qui regardent des pubs : c'est un raccourci vers la même
          boutique, plafonné, et qui ne rapporte que des Ovas — donc rien qui
          touche à la difficulté (voir `lib/pub.ts`). */}
      <div className="eyebrow section-titre">{t('bo.gagnerOvas')}</div>
      <div className="grille-boutique">
        <CartePubRecompensee />
      </div>

      <div className="eyebrow section-titre">{t('bo.recharges')}</div>
      <p style={{ color: 'var(--brume)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
        {t('bo.demoAide')}
      </p>
      <div className="grille-boutique">
        {PACKS.map((p) => (
          <div key={p.id} className="carte article pack">
            <div className="pack-ovas"><Icone nom="ova" taille={16} /> {p.ovas}</div>
            {p.bonus && <div className="pack-bonus">{p.bonus}</div>}
            <button className="btn fantome petit" disabled title={t('bout.paiementDemo')}>
              {p.prix}
            </button>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
