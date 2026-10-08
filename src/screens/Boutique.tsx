// LA BOUTIQUE (refonte du Correctif 21)
//
// ⚠️ RIEN NE SE VEND CONTRE DE L'ARGENT RÉEL. Tout s'achète en OVAS, la monnaie de gameplay (matchs, objectifs, saisons, événements).
// Les Crédits ne s'achètent plus ; un solde restant reste dépensable.
//
// Trois rayons : Packs (la roue d'origine, dans la collection) · Maillots · Joueur.
// ⚠️ LA BOUTIQUE MONTRE CE QUI S'ACHÈTE ; LA PERSONNALISATION CE QUI SE POSSÈDE (`components/Personnalisation.tsx`). Un article possédé
// porte ici la mention « Possédé » et un renvoi vers la personnalisation — jamais un bouton « Équiper ».
// ⚠️ UN SOLDE INSUFFISANT N'ACHÈTE RIEN ET NE GRISE RIEN : un clic ouvre la fenêtre qui dit combien il manque (`lib/achatUi.ts`).

import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import {
  EQUIPEMENTS, EQUIPEMENT_PAR_ID, RUBRIQUES, SKINS, SKIN_PAR_ID, estEnVente, prixArticle, prixSkin, rubriqueDe,
  type ArticleEquipement, type RubriqueBoutique,
} from '../data/boutique';
import { TRAITS_A_DEBLOQUER, descriptionTrait, nomTrait } from '../data/traits';
import { nombre, t, texteTraduit } from '../lib/i18n';
import { CartePubRecompensee, BoutonDeblocageParPub } from '../components/Pub';
import { ApercuJoueur3D } from '../components/ApercuJoueur3D';
import { MiniatureArticle, PastilleRarete, PrixBoutons } from '../components/CartesCosmetiques';
import { SoldesMonnaies } from '../components/SoldesMonnaies';
import { PieceOvas } from '../components/PieceOvas';
import { Icone } from '../components/Icone';
import { demanderPaiement } from '../lib/achatUi';
import { useBoutiqueLabo } from '../lib/boutiqueLabo';
import { ouvrirPersonnalisation, prendreCibleBoutique, type OngletPerso } from '../lib/personnalisationUi';
import { apparencePourApercu, equipementPourScene } from '../lib/apparenceJoueur';
import { prixOvas, type Devise, type PrixArticle } from '../lib/monnaies';
import { POSTE_PAR_ID } from '../data/rugby';
import './Boutique.css';

// ⚠️ `ApercuBallon`, PAS `Hero3D` : le hero affiche le rugbyman dès qu'une carrière existe, et ce cadre montrerait le JOUEUR à la place
// du ballon survolé. Chaque `<Canvas>` ouvre un contexte WebGL et le navigateur n'en accorde qu'une poignée : un seul grand aperçu est
// monté à la fois, les vignettes d'articles sont des images rendues hors écran.
const Apercu3D = lazy(() => import('../components/Hero3D').then((m) => ({ default: m.ApercuBallon })));
const Vignette = lazy(() => import('../components/VignetteBallon').then((m) => ({ default: m.VignetteBallon })));
const Objet3D = lazy(() => import('../components/ModeleObjet').then((m) => ({ default: m.ApercuObjet })));

type Rayon = RubriqueBoutique;
const RAYONS: { id: Rayon | 'packs'; cle: string }[] = [
  { id: 'packs', cle: 'bo.rub.packs' },
  ...RUBRIQUES.filter((r) => r.id !== 'ballons'),
];
/** Ce qu'on regarde dans le grand aperçu. */
type Vu = { type: 'ballon' | 'article'; id: string };

export function Boutique() {
  useBoutiqueLabo();
  const [rayon, setRayon] = useState<Rayon>('maillots');
  // Le kit essayé : sur le maillot seul (le modèle 3D du jeu) ou porté par le joueur.
  const [surJoueur, setSurJoueur] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [vu, setVu] = useState<Vu | null>(null);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const coins = useGame((s) => s.coins);
  const inventaire = useGame((s) => s.inventaire);
  const skinActif = useGame((s) => s.skinActif);
  const equipements = useGame((s) => s.equipements);
  const equipementActif = useGame((s) => s.equipementActif);
  const traitsDebloques = useGame((s) => s.traitsDebloques);
  const acheterCosmetique = useGame((s) => s.acheterCosmetique);
  const debloquerTrait = useGame((s) => s.debloquerTrait);
  const setEcran = useGame((s) => s.setEcran);
  const maintenant = Date.now();

  const message = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 2600); };

  // « Voir dans la boutique » depuis la personnalisation : on ouvre le bon rayon, sur le bon article.
  useEffect(() => {
    const cible = prendreCibleBoutique();
    if (!cible) return;
    setRayon(cible.rubrique as Rayon);
    if (cible.id) setVu(SKIN_PAR_ID[cible.id] ? { type: 'ballon', id: cible.id } : { type: 'article', id: cible.id });
  }, []);

  const possede = (a: ArticleEquipement) => equipements.includes(a.id);

  /** Un achat de cosmétique : monnaie choisie, solde vérifié, confirmation pour les Crédits, puis la transaction du store. */
  const acheter = async (id: string, titre: string, prix: PrixArticle, devise: Devise) => {
    const choisie = await demanderPaiement({ titre, prix, devise });
    if (!choisie) return;
    const r = acheterCosmetique(id, choisie);
    message(r.ok ? t('bo.debloque', { article: texteTraduit(titre) }) : t('bo.pasAssez'));
  };
  const acheterTrait = async (id: string, prix: number) => {
    const choisie = await demanderPaiement({ titre: nomTrait(id), prix: prixOvas(prix) });
    if (!choisie) return;
    message(debloquerTrait(id) ? t('bo.traitAchete', { trait: nomTrait(id) }) : t('bo.pasAssez'));
  };

  // Les articles du rayon : en vente ou possédés (un article retiré de la vente reste visible chez qui l'a).
  const articlesDuRayon = (r: RubriqueBoutique) => EQUIPEMENTS.filter((a) => rubriqueDe(a) === r && (possede(a) || estEnVente(a, maintenant) || a.recompense || a.parPub));

  /** Le rendu d'une carte d'article, quel que soit le rayon. */
  const carte = (a: ArticleEquipement) => {
    const prix = prixArticle(a);
    const mien = possede(a);
    return (
      <div key={a.id} className={`carte article article-boutique${vu?.type === 'article' && vu.id === a.id ? ' vu' : ''}${mien ? ' possede' : ''}`}
        onMouseEnter={() => setVu({ type: 'article', id: a.id })} onFocus={() => setVu({ type: 'article', id: a.id })} onClick={() => setVu({ type: 'article', id: a.id })} tabIndex={0}>
        <MiniatureArticle a={a} />
        <div className="article-nom">{texteTraduit(a.nom)}</div>
        <PastilleRarete rarete={a.rarete} />
        <div className="article-detail">{texteTraduit(a.detail)}</div>
        {mien ? (
          <>
            <span className="badge-cle ok"><Icone nom="check" taille={13} /> {t('bo.possede')}</span>
            <button type="button" className="btn fantome petit" onClick={(e) => { e.stopPropagation(); ouvrirPersonnalisation(ongletDe(a)); }}>{t('bo.equiperDansPerso')}</button>
          </>
        ) : a.recompense ? (
          <div className="article-detail etiquette-pub"><Icone nom="verrou" taille={14} /> {texteTraduit(a.recompense)}</div>
        ) : a.parPub ? (
          <>
            <div className="article-detail etiquette-pub"><Icone nom="video" taille={14} /> {t('pub.gratuitPub')}</div>
            <BoutonDeblocageParPub id={a.id} onDebloque={() => message(t('bo.debloque', { article: texteTraduit(a.nom) }))} />
          </>
        ) : (
          <PrixBoutons prix={prix} onAcheter={(d) => void acheter(a.id, a.nom, prix, d)} />
        )}
      </div>
    );
  };

  const apparenceBase = useMemo(
    () => (joueur ? apparencePourApercu(joueur.nom, joueur.poste, joueur.apparence, equipementActif) : apparencePourApercu('Joueur', 'demi_ouverture', undefined, equipementActif)),
    [joueur, equipementActif],
  );
  const articleVu = vu?.type === 'article' ? EQUIPEMENT_PAR_ID[vu.id] : undefined;
  const avant = (POSTE_PAR_ID[joueur?.poste ?? 'demi_ouverture']?.numero ?? 15) <= 8;

  /** Le grand aperçu : le joueur 3D qui ESSAIE l'article (kit, casque, crampons), le stade, le ballon ou l'objet posé au sol. */
  const apercu = () => {
    if (vu?.type === 'ballon') {
      const s = SKIN_PAR_ID[vu.id];
      return { vue: <Suspense fallback={<div className="hero-canvas-skel" />}><Apercu3D skinId={vu.id} /></Suspense>, titre: texteTraduit(s?.nom ?? ''), detail: t('bo.apercuAide'), fiche: null as null | ArticleEquipement };
    }
    if (!articleVu) return null;
    const essai = { ...apparenceBase, equipement: equipementPourScene({ ...equipementActif, [articleVu.categorie === 'maillotExt' ? 'maillot' : articleVu.categorie]: articleVu.id }) };
    let vue;
    // Maillots, casques et crampons se voient d'abord sur LEUR modèle 3D (exactement celui de la boutique d'avant), puis, au choix, portés par le joueur.
    if (articleVu.categorie === 'maillot' && surJoueur) vue = <ApercuJoueur3D apparence={apparenceBase} club={joueur?.club ?? manager?.club} kit={articleVu.kit} avant={avant} />;
    else if ((articleVu.categorie === 'crampons' || articleVu.categorie === 'casque') && surJoueur) vue = <ApercuJoueur3D apparence={essai} club={joueur?.club ?? manager?.club} avant={avant} cadrage={articleVu.categorie === 'casque' ? 'visage' : 'corps'} />;
    else vue = <Suspense fallback={<div className="hero-canvas-skel" />}><Objet3D url={articleVu.glb} teinte={articleVu.teinte} emoji={articleVu.emoji} /></Suspense>;
    return { vue, titre: texteTraduit(articleVu.nom), detail: texteTraduit(articleVu.detail), fiche: null as null | ArticleEquipement };
  };
  const a = apercu();

  return (
    <motion.section className="boutique" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="tete-boutique">
        <div>
          <div className="eyebrow">{t('bo.titre')}</div>
          <h1>{t('bo.chapo')}</h1>
        </div>
        <SoldesMonnaies />
      </div>

      {flash && <div className="flash-boutique" role="status">{flash}</div>}

      <div className="bo-rayons" role="tablist" aria-label={t('bo.rayons')}>
        {RAYONS.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={rayon === r.id} className={rayon === r.id ? 'actif' : undefined}
            // « Packs » ouvre la roue d'origine (collection) : la boutique de packs garde son affichage, avec ses deux monnaies.
            onClick={() => (r.id === 'packs' ? setEcran('collectionSolo') : setRayon(r.id))} data-tuto={`bo-rayon-${r.id}`}>
            {t(r.cle)}
          </button>
        ))}
        <button type="button" className="bo-perso" onClick={() => ouvrirPersonnalisation('joueur')}><Icone nom="reglages" taille={16} /> {t('bo.mesCosmetiques')}</button>
      </div>

      {/* ═══ MAILLOTS · JOUEUR · STADES · ÉVÉNEMENT : une colonne d'aperçu et la grille ═══════════ */}
      <div className="bo-deux">
          <aside className="bo-apercu carte" aria-label={t('bo.apercu')}>
            <div className="bo-apercu-cadre">
              {a ? a.vue : <div className="bo-apercu-vide">{t('bo.apercuVide')}</div>}
            </div>
            {a && (
              <div className="bo-apercu-info">
                <h2>{a.titre}</h2>
                <p>{a.detail}</p>
              </div>
            )}
          </aside>
          <div className="bo-grille-zone">
            {rayon === 'maillots' && <p className="bo-intro">{t('bo.maillotsAide')}</p>}
            {(articleVu?.categorie === 'maillot' || articleVu?.categorie === 'casque' || articleVu?.categorie === 'crampons') && (rayon === 'maillots' || rayon === 'joueur') && (
              <div className="bo-bascule-kit" role="group" aria-label={t('bo.essai')}>
                <button type="button" aria-pressed={!surJoueur} onClick={() => setSurJoueur(false)}>{t('bo.essaiModele')}</button>
                <button type="button" aria-pressed={surJoueur} onClick={() => setSurJoueur(true)}>{t('bo.essaiJoueur')}</button>
              </div>
            )}

            {rayon === 'joueur' ? (
              <>
                {(['crampons', 'casque', 'sac', 'bouclier'] as const).map((cat) => {
                  const liste = articlesDuRayon('joueur').filter((x) => x.categorie === cat);
                  return liste.length === 0 ? null : (
                    <div key={cat} className="bloc-vestiaire">
                      <div className="vestiaire-titre">{t(`bo.cat.${cat}`)}</div>
                      <div className="grille-boutique">{liste.map(carte)}</div>
                    </div>
                  );
                })}
                <div className="bloc-vestiaire">
                  <div className="vestiaire-titre">{t('bo.ballons')}</div>
                  <div className="grille-boutique">
                    {SKINS.map((s) => {
                      const mien = inventaire.includes(s.id);
                      const prix = prixSkin(s);
                      return (
                        <div key={s.id} className={`carte article article-boutique${vu?.type === 'ballon' && vu.id === s.id ? ' vu' : ''}${mien ? ' possede' : ''}`}
                          onMouseEnter={() => setVu({ type: 'ballon', id: s.id })} onClick={() => setVu({ type: 'ballon', id: s.id })}>
                          <Suspense fallback={<div className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} />}><Vignette skinId={s.id} /></Suspense>
                          <div className="article-nom">{texteTraduit(s.nom)}</div>
                          {mien ? (
                            <>
                              <span className="badge-cle ok"><Icone nom="check" taille={13} /> {skinActif === s.id ? t('bo.equipe') : t('bo.possede')}</span>
                              <button type="button" className="btn fantome petit" onClick={(e) => { e.stopPropagation(); ouvrirPersonnalisation('divers'); }}>{t('bo.equiperDansPerso')}</button>
                            </>
                          ) : <PrixBoutons prix={prix} onAcheter={(d) => void acheter(s.id, s.nom, prix, d)} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* ═══ LES CARACTÈRES — la seule chose non cosmétique, et ça ne vend pas de la puissance : MAX_TRAITS reste à deux. ═══ */}
                <div className="bloc-vestiaire">
                  <div className="vestiaire-titre">{t('bo.caracteres')}</div>
                  <p className="bo-intro">{t('bo.caracteresAide')}</p>
                  <div className="grille-caracteres">
                    {TRAITS_A_DEBLOQUER.map((tr) => {
                      const mien = traitsDebloques.includes(tr.id);
                      const prix = tr.prix ?? 0;
                      return (
                        <div key={tr.id} className={`carte caractere${mien ? ' possede' : ''}`}>
                          <div className="caractere-tete"><span className="caractere-emoji">{tr.emoji}</span><b>{nomTrait(tr.id)}</b></div>
                          <div className="caractere-desc">{descriptionTrait(tr.id)}</div>
                          {mien ? <div className="caractere-acquis">{t('bo.traitDebloque')}</div>
                            : <button className="btn prix-ovas petit" onClick={() => void acheterTrait(tr.id, prix)}><PieceOvas taille={16} /> {nombre(prix)}</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* ═══ GAGNER DES OVAS SANS PAYER — facultatif, plafonné, et ça ne rapporte que des Ovas (voir `lib/pub.ts`). ═══ */}
                <div className="bloc-vestiaire">
                  <div className="vestiaire-titre">{t('bo.gagnerOvas')}</div>
                  <div className="grille-boutique"><CartePubRecompensee /></div>
                </div>
              </>
            ) : (
              <div className="grille-boutique">
                {articlesDuRayon(rayon as RubriqueBoutique).map(carte)}
                {articlesDuRayon(rayon as RubriqueBoutique).length === 0 && <p className="bo-intro">{t('bo.rienIci')}</p>}
              </div>
            )}
          </div>
      </div>
      <span hidden>{coins}</span>
    </motion.section>
  );
}

const ongletDe = (a: ArticleEquipement): OngletPerso => (a.categorie === 'maillot' || a.categorie === 'maillotExt' ? 'maillots' : a.categorie === 'sac' || a.categorie === 'bouclier' ? 'divers' : 'joueur');

