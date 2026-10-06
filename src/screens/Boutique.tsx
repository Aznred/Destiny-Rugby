// LA BOUTIQUE (refonte du Correctif 21)
//
// Deux monnaies, jamais confondues, et toujours visibles ensemble :
//   OVAS    — la monnaie de GAMEPLAY (matchs, objectifs, saisons, événements) : elle ne s'achète plus avec de l'argent réel ;
//   CRÉDITS — la monnaie PREMIUM, la seule qui s'achète (Stripe).
//
// Quatre rayons : Packs (la roue d'origine, dans la collection) · Crédits · Maillots · Joueur.
// ⚠️ LA BOUTIQUE MONTRE CE QUI S'ACHÈTE ; LA PERSONNALISATION CE QUI SE POSSÈDE (`components/Personnalisation.tsx`). Un article possédé
// porte ici la mention « Possédé » et un renvoi vers la personnalisation — jamais un bouton « Équiper ».
// ⚠️ UN SOLDE INSUFFISANT N'ACHÈTE RIEN ET NE GRISE RIEN : un clic ouvre la fenêtre qui dit combien il manque (`lib/achatUi.ts`).

import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { etatPaiementsStripe } from '../lib/carriereEnLigneClient';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import {
  BUNDLES, EQUIPEMENTS, EQUIPEMENT_PAR_ID, RUBRIQUES, SKINS, SKIN_PAR_ID, estEnVente, prixArticle, prixSkin, rubriqueDe,
  type ArticleEquipement, type RubriqueBoutique,
} from '../data/boutique';
import { TRAITS_A_DEBLOQUER, descriptionTrait, nomTrait } from '../data/traits';
import { locale, nombre, t, tn, texteTraduit } from '../lib/i18n';
import { CartePubRecompensee, BoutonDeblocageParPub } from '../components/Pub';
import { ApercuJoueur3D } from '../components/ApercuJoueur3D';
import { MiniatureArticle, PastilleRarete, PrixBoutons } from '../components/CartesCosmetiques';
import { SoldesMonnaies } from '../components/SoldesMonnaies';
import { PieceCredits } from '../components/PieceCredits';
import { PieceOvas } from '../components/PieceOvas';
import { Icone } from '../components/Icone';
import { demanderPaiement, ouvrirRechargeCredits } from '../lib/achatUi';
import { useBoutiqueLabo } from '../lib/boutiqueLabo';
import { ouvrirPersonnalisation, prendreCibleBoutique, type OngletPerso } from '../lib/personnalisationUi';
import { apparencePourApercu, equipementPourScene } from '../lib/apparenceJoueur';
import { OFFRES_CREDITS, prixOvas, type Devise, type PrixArticle } from '../lib/monnaies';
import { POSTE_PAR_ID } from '../data/rugby';
import './Boutique.css';

// ⚠️ `ApercuBallon`, PAS `Hero3D` : le hero affiche le rugbyman dès qu'une carrière existe, et ce cadre montrerait le JOUEUR à la place
// du ballon survolé. Chaque `<Canvas>` ouvre un contexte WebGL et le navigateur n'en accorde qu'une poignée : un seul grand aperçu est
// monté à la fois, les vignettes d'articles sont des images rendues hors écran.
const Apercu3D = lazy(() => import('../components/Hero3D').then((m) => ({ default: m.ApercuBallon })));
const Vignette = lazy(() => import('../components/VignetteBallon').then((m) => ({ default: m.VignetteBallon })));
const Objet3D = lazy(() => import('../components/ModeleObjet').then((m) => ({ default: m.ApercuObjet })));

type Rayon = 'credits' | RubriqueBoutique;
const RAYONS: { id: Rayon | 'packs'; cle: string }[] = [
  { id: 'packs', cle: 'bo.rub.packs' }, { id: 'credits', cle: 'bo.rub.credits' },
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
  const [paiement, setPaiement] = useState('');
  const [verification, setVerification] = useState(0);
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

  // Le retour du paiement Stripe : seul le webhook signé crédite le compte, le retour navigateur ne crédite rien.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('paiement') === 'annule') { setPaiement(t('bo.paiementAnnule')); return; }
    const session = params.get('session_id');
    if (params.get('paiement') !== 'retour' || !session) return;
    let actif = true; let timer: ReturnType<typeof setTimeout>; let essais = 0;
    setRayon('credits');
    setPaiement(t('bo.paiementConfirmation'));
    const verifier = async () => {
      try {
        const resultat = await etatPaiementsStripe(session);
        if (!actif) return;
        if (resultat.credite) {
          window.dispatchEvent(new Event('destiny-compte-connecte'));
          setPaiement(t('bo.paiementOk'));
          history.replaceState(null, '', location.pathname + location.hash);
          return;
        }
        if (++essais < 40) timer = setTimeout(() => void verifier(), 3000);
        else setPaiement(t('bo.paiementLong'));
      } catch (e) { if (actif) setPaiement(e instanceof Error ? e.message : t('mo.paiementIndispo')); }
    };
    void verifier();
    return () => { actif = false; clearTimeout(timer); };
  }, [verification]);

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
  const a = rayon !== 'credits' ? apercu() : null;

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
      {paiement && <p role="status" className="bo-paiement">{paiement} {new URLSearchParams(location.search).has('session_id') && <button className="btn fantome petit" onClick={() => setVerification((v) => v + 1)}>{t('bo.reverifier')}</button>}</p>}

      <div className="bo-rayons" role="tablist" aria-label={t('bo.rayons')}>
        {RAYONS.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={rayon === r.id} className={rayon === r.id ? 'actif' : undefined}
            // « Packs » ouvre la roue d'origine (collection) : la boutique de packs garde son affichage, avec ses deux monnaies.
            onClick={() => (r.id === 'packs' ? setEcran('collectionSolo') : setRayon(r.id))} data-tuto={`bo-rayon-${r.id}`}>
            {r.id === 'credits' && <PieceCredits taille={16} />}{t(r.cle)}
          </button>
        ))}
        <button type="button" className="bo-perso" onClick={() => ouvrirPersonnalisation('joueur')}><Icone nom="reglages" taille={16} /> {t('bo.mesCosmetiques')}</button>
      </div>

      {/* ═══ CRÉDITS ═══════════════════════════════════════════════════════════════════════════════ */}
      {rayon === 'credits' && (
        <section>
          <p className="bo-intro">{t('bo.creditsIntro')}</p>
          <div className="grille-boutique grille-recharges">
            {OFFRES_CREDITS.map((p) => (
              <button key={p.id} type="button" className={`carte article pack recharge-credits${p.populaire ? ' populaire' : ''}`} onClick={() => ouvrirRechargeCredits(p.id)}>
                {p.populaire && <div className="pack-populaire">{t('bo.populaire')}</div>}
                <PieceCredits taille={58} variante="boutique" />
                <div className="pack-nom">{texteTraduit(p.nom)}</div>
                <div className="pack-ovas">{p.credits.toLocaleString(locale())} {t('mo.credits')}</div>
                {p.bonus && <div className="pack-bonus">{t('bo.bonus', { v0: p.bonus })}</div>}
                <span className="btn fantome petit">{p.prix}</span>
              </button>
            ))}
          </div>
          <h2 className="bo-sous-titre">{t('bo.bundles')}</h2>
          <p className="bo-intro">{t('bo.bundlesAide')}</p>
          <div className="grille-boutique grille-bundles">
            {BUNDLES.map((p) => {
              const cosmetiques = [...(p.ballons ?? []).map((id) => texteTraduit(SKIN_PAR_ID[id]?.nom ?? id)), ...(p.equipements ?? []).map((id) => texteTraduit(EQUIPEMENT_PAR_ID[id]?.nom ?? id))];
              const traits = (p.traits ?? []).map((id) => nomTrait(id));
              const detail = [...cosmetiques, ...traits].join(' · ');
              return (
                <button key={p.id} type="button" className={`carte article pack bundle${p.populaire ? ' populaire' : ''}`} onClick={() => ouvrirRechargeCredits(p.id)}>
                  {p.populaire && <div className="pack-populaire">{t('bo.populaire')}</div>}
                  <PieceCredits taille={52} variante="boutique" />
                  <div className="pack-nom">{texteTraduit(p.nom)}</div>
                  <div className="pack-ovas">{t('bo.pluscredits', { n: p.credits.toLocaleString(locale()) })}</div>
                  {(cosmetiques.length > 0 || traits.length > 0) && (
                    <div className="pack-contenu" title={detail}>
                      {cosmetiques.length > 0 && <span><Icone nom="cadeau" taille={14} /> {tn('bo.nbCosmetiques', cosmetiques.length, { n: cosmetiques.length })}</span>}
                      {traits.length > 0 && <span><Icone nom="joueur" taille={14} /> {tn('bo.nbArchetypes', traits.length, { n: traits.length })}</span>}
                      <small>{detail}</small>
                    </div>
                  )}
                  <span className="btn fantome petit">{p.prix}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ MAILLOTS · JOUEUR · STADES · ÉVÉNEMENT : une colonne d'aperçu et la grille ═══════════ */}
      {rayon !== 'credits' && (
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
      )}
      <span hidden>{coins}</span>
    </motion.section>
  );
}

const ongletDe = (a: ArticleEquipement): OngletPerso => (a.categorie === 'maillot' || a.categorie === 'maillotExt' ? 'maillots' : a.categorie === 'sac' || a.categorie === 'bouclier' ? 'divers' : 'joueur');

