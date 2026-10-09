// LES PROMOS TIKTOK DU RUGBY FÉMININ — deux séquences jouées par le navigateur, filmées par
// `filmerFemininesTikTok.cjs` (1080 × 1920).
//
// Ouvrir : /scripts/promoFeminines.html?video=arrivee        (les joueuses arrivent dans la ligue en ligne)
//          /scripts/promoFeminines.html?video=octobre-rose   (les 23 cartes Octobre Rose)
//          &auto=1 lance la séquence tout de suite ; sinon `window.__promo.lancer()`.
//
// ⚠️ CE SONT LES VRAIES CARTES DU JEU (`CarteJoueurEnLigne`), avec les notes de `noter_feminines.py` et les
// portraits détourés de `public/photos/feminines`. Rien n'est dessiné à part : si la carte change, la promo suit.
// Une carte Octobre Rose emprunte ici le portrait de la joueuse ; dans le jeu elle attend son image du Labo.

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
// Les drapeaux des cartes : la feuille que `main.tsx` charge pour le jeu (sans elle, la nation n'apparaît pas).
import 'flag-icons/css/flag-icons.min.css';
import '../src/App.css';
import './promoFeminines.css';
import donnees from './_promoFeminines.json';
import { CarteJoueurEnLigne } from '../src/components/CarteJoueurEnLigne';
import { RubanRose } from '../src/components/EmblemesSpeciaux';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { POSTE_PAR_ID } from '../src/data/rugby';
import type { PosteId } from '../src/types';
import { carteDepuisSource, rareteCarriere, statistiquesCarte, type SourceCarte } from '../src/lib/ligue/catalogueCarriere';
import { assemblerCatalogueSpecial, definitionsDepart, EVENEMENTS_DEPART } from '../src/lib/ligue/catalogueSpecial';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';

chargerTextes(TEXTES); definirLangue('fr');
const parametres = new URLSearchParams(location.search);
const video = parametres.get('video') === 'octobre-rose' ? 'octobre-rose' : 'arrivee';

const cartes: CarteCarriere[] = donnees.cartes.map(c => {
  const famille = POSTE_PAR_ID[c.poste as PosteId].famille;
  const source: SourceCarte = {
    sourceId: c.id, nom: c.nom, poste: c.poste as PosteId, famille, note: c.note, potentiel: c.potentiel, age: c.age, nation: c.nation,
    clubReel: c.club, championnat: c.championnat, pays: c.nation, photo: c.photo, origine: 'ffr', rarete: rareteCarriere(c.note),
    statistiques: statistiquesCarte(c.note, famille, c.id), gender: 'female',
  };
  return carteDepuisSource(source, 'promo', 'promo', 0);
});
const parNom = new Map(cartes.map(c => [c.nom, c]));

// Les cartes Octobre Rose de la graine, avec le portrait de la carte ordinaire de la même joueuse.
const rose = (() => {
  const definitions = definitionsDepart().filter(d => d.cardType === 'octobre-rose')
    .map(d => ({ ...d, image: d.image ?? parNom.get(d.nom)?.photo }));
  const catalogue = assemblerCatalogueSpecial(definitions, EVENEMENTS_DEPART);
  // L'ordre de la feuille de match : la graine range le XV de 1 à 15 puis le banc.
  return definitionsDepart().filter(d => d.cardType === 'octobre-rose')
    .map(d => carteDepuisSource(catalogue.sources.get(d.id)!, 'promo', 'promo', 0));
})();

const Carte = ({ carte, className = '', style }: { carte: CarteCarriere; className?: string; style?: React.CSSProperties }) =>
  <div className={`pf-carte ${className}`} style={style}><CarteJoueurEnLigne carte={carte} /></div>;

function Arrivee() {
  const colonnes = [0, 1, 2].map(i => cartes.filter((_, k) => k % 3 === i).slice(0, 14));
  const vedettes = ['Ellie KILDUNNE', 'Gabrielle VERNIER', 'Pauline BOURDON SANSUS'].map(n => parNom.get(n)).filter((c): c is CarteCarriere => !!c);
  return <>
    <section className="pf-plan pf-a1">
      <p className="pf-surtitre">Ligue en ligne</p>
      <h1><span>Elles</span><span>arrivent.</span></h1>
      <p className="pf-sous">Le rugby féminin entre dans Destiny Rugby</p>
    </section>
    <section className="pf-plan pf-a2">
      <div className="pf-mur">
        {colonnes.map((colonne, i) => <div key={i} className={`pf-colonne pf-colonne-${i}`}>
          {[...colonne, ...colonne].map((c, k) => <Carte key={k} carte={c} />)}
        </div>)}
      </div>
      <div className="pf-voile" />
      <div className="pf-compte"><b>{donnees.total}</b><span>joueuses</span></div>
      <ul className="pf-ligues"><li>Premiership Women’s Rugby</li><li>Élite 1</li><li>Élite 2</li><li>Super Rugby Women’s</li><li>Sélections</li></ul>
    </section>
    <section className="pf-plan pf-a3">
      {vedettes.map((c, i) => <div key={c.id} className={`pf-vedette pf-vedette-${i}`}>
        <Carte carte={c} />
        <p><b>{c.note}</b>{c.nom}<i>{c.clubReel}</i></p>
      </div>)}
    </section>
    <section className="pf-plan pf-a4">
      <p className="pf-surtitre">Compose ton XV</p>
      <h2>Destiny<br />Rugby</h2>
      <p className="pf-adresse">destiny-rugby.fr</p>
    </section>
  </>;
}

function OctobreRose() {
  const xv = rose.slice(0, 15), banc = rose.slice(15);
  const vedettes = ['Ellie KILDUNNE', 'Gabrielle VERNIER', 'Zoe STRATFORD'].map(n => rose.find(c => c.nom === n)).filter((c): c is CarteCarriere => !!c);
  return <>
    <section className="pf-plan pf-r1">
      <div className="pf-ruban"><RubanRose taille={260} /></div>
      <h1><span>Octobre</span><span>Rose</span></h1>
      <p className="pf-sous">{rose.length} cartes spéciales</p>
    </section>
    <section className="pf-plan pf-r2">
      <p className="pf-surtitre">Le XV Octobre Rose</p>
      <div className="pf-grille">
        {xv.map((c, i) => <Carte key={c.id} carte={c} className="pf-retourne" style={{ animationDelay: `calc(var(--depart) + ${i * .22}s)` }} />)}
      </div>
    </section>
    <section className="pf-plan pf-r3">
      <p className="pf-surtitre">Et son banc</p>
      <div className="pf-grille pf-grille-banc">
        {banc.map((c, i) => <Carte key={c.id} carte={c} className="pf-retourne" style={{ animationDelay: `calc(var(--depart) + ${i * .2}s)` }} />)}
      </div>
    </section>
    <section className="pf-plan pf-r4">
      <div className="pf-eventail">{vedettes.map((c, i) => <Carte key={c.id} carte={c} className={`pf-eventail-${i}`} />)}</div>
      <p className="pf-sous">Jusqu’à 96 de note générale</p>
    </section>
    <section className="pf-plan pf-r5">
      <RubanRose taille={120} />
      <h2>Jusqu’au<br />31 octobre</h2>
      <p className="pf-sous">Dans tous les packs</p>
      <p className="pf-adresse">destiny-rugby.fr</p>
    </section>
  </>;
}

const DUREE = { arrivee: 17.2, 'octobre-rose': 19.6 }[video];

function Promo() {
  const [joue, setJoue] = useState(parametres.get('auto') === '1');
  useEffect(() => {
    (window as unknown as { __promo: unknown }).__promo = { duree: DUREE, pret: true, lancer: () => setJoue(true) };
  }, []);
  // ⚠️ PAS DE REMONTAGE AU LANCEMENT : remonter quatre-vingts cartes prend plus d'une seconde, pendant laquelle
  // les animations courent déjà — le premier plan passait sans être vu. Tout est rendu d'avance, à l'arrêt ;
  // lancer ne pose qu'une classe. Pour rejouer : recharger la page.
  return <main className={`pf pf-${video}${joue ? ' pf-joue' : ''}`}>
    {video === 'arrivee' ? <Arrivee /> : <OctobreRose />}
  </main>;
}

document.fonts.ready.then(() => createRoot(document.getElementById('root')!).render(<Promo />));
