/** Durée réelle, indépendante de la vitesse de simulation ou du nombre d'images. */
export function creerDureeNomPorteur() {
  let dernier = null, depuis = 0;
  return (id, maintenant) => {
    if (id !== dernier) { dernier = id; depuis = maintenant; }
    return id != null && maintenant - depuis < 2500;
  };
}
