// Recherche progressive : les guides restent tous lisibles sans JavaScript.
(() => {
  const menu = document.querySelector('.barre-guide details');
  if (menu) {
    const mobile = matchMedia('(max-width: 900px)');
    const adapter = () => { menu.open = !mobile.matches; };
    mobile.addEventListener('change', adapter);
    adapter();
  }
  const champ = document.getElementById('recherche-guide');
  if (!champ) return;
  const liens = [...document.querySelectorAll('[data-recherche]')];
  const normaliser = texte => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
  const index = liens.map(lien => ({ lien, texte: normaliser(lien.dataset.recherche || '') }));
  const afficher = () => {
    const mots = normaliser(champ.value).split(/\s+/).filter(Boolean);
    let nombre = 0;
    for (const { lien, texte } of index) { lien.hidden = !mots.every(mot => texte.includes(mot)); if (!lien.hidden) nombre++; }
    document.getElementById('nombre-guides').textContent = `${nombre} guide${nombre > 1 ? 's' : ''}${mots.length ? ' pour ta recherche' : ' à consulter'}`;
    document.getElementById('aucun-guide').hidden = nombre > 0;
  };
  champ.addEventListener('input', afficher);
  afficher();
})();
