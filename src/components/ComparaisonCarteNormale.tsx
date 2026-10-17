import { POSTE_PAR_ID } from '../data/rugby';
import { saisieDepuisSource } from '../lib/cartesNormales';
import type { SaisieCarteNormale } from '../lib/cartesNormales';
import { rareteCarriere, statistiquesCarte } from '../lib/ligue/catalogueCarriere';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';

const CHAMPS = [
  ['nom', 'Nom'], ['note', 'Général'], ['potentiel', 'Potentiel'], ['poste', 'Poste'],
  ['age', 'Âge'], ['clubReel', 'Club'], ['championnat', 'Championnat'],
  ['nation', 'Nation'], ['pays', 'Pays du championnat'], ['gender', 'Joueur ou joueuse'],
] as const;

function valeur(carte: SaisieCarteNormale, cle: typeof CHAMPS[number][0]): string {
  if (cle === 'poste') return POSTE_PAR_ID[carte.poste].nom;
  if (cle === 'gender') return carte.gender === 'female' ? 'Joueuse' : 'Joueur';
  if (cle === 'age') return `${carte.age} ans`;
  return String(carte[cle]).trim() || 'Non renseigné';
}

export function ComparaisonCarteNormale({ actuelle, proposition }: {
  actuelle: SourceCarte | null; proposition: SaisieCarteNormale;
}) {
  const avant = actuelle ? saisieDepuisSource(actuelle) : null;
  const changements = avant ? CHAMPS.filter(([cle]) =>
    String(avant[cle]).trim() !== String(proposition[cle]).trim()
  ).map(([cle, libelle]) => ({
    cle, libelle, avant: valeur(avant, cle), apres: valeur(proposition, cle),
    ecart: cle === 'note' || cle === 'potentiel' ? proposition[cle] - avant[cle] : undefined,
  })) : [];
  const photoModifiee = !!avant && (avant.photo ?? '') !== (proposition.photo ?? '');
  const nombre = changements.length + Number(photoModifiee);
  const famille = POSTE_PAR_ID[proposition.poste].famille;
  // La même source produit les statistiques qui seront réellement publiées.
  const sourceId = actuelle?.sourceId ?? 'apercu-correction';

  return <section className="cn-comparaison" aria-label="Comparaison de la correction">
    <div className="cn-comparaison-entete">
      <h3>Comparer la correction</h3>
      {avant && <span>{nombre === 0 ? 'Aucune modification' : `${nombre} modification${nombre > 1 ? 's' : ''}`}</span>}
    </div>
    <div className="cn-comparaison-contenu">
      <div className="cn-comparaison-cartes">
        <figure>
          <figcaption><b>Carte actuelle</b><small>Publiée dans le jeu</small></figcaption>
          {actuelle ? <CarteJoueurEnLigne carte={{ ...actuelle, id: 'comparaison-actuelle',
            proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [] }} />
            : <p className="cn-comparaison-absente">Carte actuelle introuvable dans le catalogue.</p>}
        </figure>
        <figure className="cn-comparaison-proposition">
          <figcaption><b>Après correction</b><small>Aperçu avec tes retouches</small></figcaption>
          <CarteJoueurEnLigne carte={{ ...proposition, id: 'comparaison-proposition', sourceId, famille,
            origine: 'professionnel', rarete: rareteCarriere(proposition.note),
            statistiques: statistiquesCarte(proposition.note, famille, sourceId),
            proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [] }} />
        </figure>
      </div>
      <div className="cn-comparaison-changements">
        {avant ? nombre ? <table>
          <caption>Changements à valider</caption>
          <thead><tr><th scope="col">Information</th><th scope="col">Actuelle</th><th scope="col">Proposition</th></tr></thead>
          <tbody>
            {changements.map(c => <tr key={c.cle}>
              <th scope="row">{c.libelle}</th><td>{c.avant}</td>
              <td><b>{c.apres}</b>{c.ecart !== undefined && <small className="cn-comparaison-ecart">{c.ecart > 0 ? '+' : ''}{c.ecart}</small>}</td>
            </tr>)}
            {photoModifiee && <tr><th scope="row">Photo</th><td>{avant.photo ? 'Photo actuelle' : 'Portrait automatique'}</td>
              <td><b>{proposition.photo ? 'Nouvelle photo' : 'Retour au portrait automatique'}</b></td></tr>}
          </tbody>
        </table> : <p>La proposition reprend les mêmes informations que la carte actuelle.</p>
          : <p>La comparaison sera disponible lorsque la carte actuelle pourra être retrouvée.</p>}
      </div>
    </div>
  </section>;
}
