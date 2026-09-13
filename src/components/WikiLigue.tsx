import { Icone, type NomIcone } from './Icone';
import './WikiLigue.css';

const RUBRIQUES: { icone: NomIcone; titre: string; texte: string; points: string[] }[] = [
  {
    icone: 'equipe', titre: 'Créer ou rejoindre une ligue',
    texte: 'Une ligue est un championnat privé partagé avec tes amis. Le créateur choisit son rythme et le nombre de clubs.',
    points: ['Crée un compte en ligne.', 'Crée une ligue ou saisis un code d’invitation.', 'Choisis ton nom de club et ton écusson.'],
  },
  {
    icone: 'maillot', titre: 'Construire ton équipe',
    texte: 'Chaque club commence avec trente cartes Bronze. La feuille comporte quinze titulaires et huit remplaçants.',
    points: ['Respecte les postes principaux et secondaires.', 'Le hors-poste applique un malus clairement indiqué.', 'Choisis un capitaine, un buteur et ton plan de jeu.'],
  },
  {
    icone: 'cadeau', titre: 'Packs et collection',
    texte: 'Les packs ajoutent des cartes à ton club. Bronze, Argent et Or restent toujours disponibles ; seul l’administrateur peut activer une rotation spéciale.',
    points: ['Les probabilités sont affichées avant l’ouverture.', 'La rareté suit la note générale.', 'La collection recense aussi les cartes encore à découvrir.'],
  },
  {
    icone: 'poignee', titre: 'Marché entre clubs',
    texte: 'Une carte est unique dans sa ligue. Elle peut changer de club par vente directe, enchère ou échange.',
    points: ['Vérifie le poste, la fatigue et les statistiques.', 'Une carte vendue quitte réellement ton effectif.', 'Les Ovas appartiennent uniquement à cette ligue.'],
  },
  {
    icone: 'reglages', titre: 'Collectif et tactique',
    texte: 'Une addition de grosses notes ne suffit pas. Les affinités de postes, de clubs, de nations et l’équilibre du XV renforcent le collectif.',
    points: ['Une équipe cohérente peut battre un meilleur GEN.', 'Adapte largeur, rythme, occupation et pression.', 'La forme, le banc et le domicile comptent pendant le match.'],
  },
  {
    icone: 'trophee', titre: 'Matchs et compétitions',
    texte: 'Les rencontres se jouent en direct sur quatre-vingts minutes, avec des phases animées et des consignes modifiables.',
    points: ['Le calendrier indique l’ouverture de chaque match.', 'Le classement applique victoires, nuls et bonus.', 'Le créateur peut lancer des compétitions et des phases finales.'],
  },
];

export function WikiLigue() {
  return <section className="wiki-ligue">
    <header className="cel-panneau wiki-ligue-hero">
      <div><div className="eyebrow">Guide officiel</div><h2>Comprendre la ligue en ligne</h2><p>Tout ce qu’il faut savoir pour créer un club, composer ton XV, gérer tes cartes et jouer avec tes amis.</p></div>
      <a className="btn primaire" href="/wiki/ligue-en-ligne/" target="_blank" rel="noreferrer"><Icone nom="livre" taille={18} /> Lire le guide complet</a>
    </header>
    <div className="wiki-ligue-grille">
      {RUBRIQUES.map(rubrique => <article className="cel-panneau wiki-ligue-carte" key={rubrique.titre}>
        <span className="wiki-ligue-icone"><Icone nom={rubrique.icone} taille={23} /></span>
        <h3>{rubrique.titre}</h3>
        <p>{rubrique.texte}</p>
        <ul>{rubrique.points.map(point => <li key={point}>{point}</li>)}</ul>
      </article>)}
    </div>
    <aside className="cel-panneau wiki-ligue-note"><Icone nom="alerte" taille={21} /><div><b>En ligne et collection solo sont séparés</b><p>La ligue utilise ton compte et son état partagé. La collection solo gratuite reste uniquement sur ton appareil : elle ne donne ni cartes ni Ovas dans une ligue.</p></div></aside>
  </section>;
}
