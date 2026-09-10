# Atelier Kiri

Dans Carrière en ligne, ouvrir une ligue puis l’onglet Atelier Kiri. Cet onglet et les lectures/écritures de /api/carriere?atelier=1 sont réservés à la session dont l’identifiant serveur est exactement kiri. Le pseudo affiché ou un paramètre client ne donne aucun droit.

L’atelier permet de créer des packs, modifier leur nom, description, prix, volume, probabilités, garantie et filtres de poste, championnat et nation. Le sélecteur de nation permet de limiter un pack aux joueurs d’une seule sélection nationale. Les autres filtres existants sont conservés et peuvent être retirés. Les nouveaux packs kiri-* restent disponibles chaque jour. Les probabilités totalisent 100 % ; le serveur contrôle le vivier et la garantie.

La recherche donne accès au catalogue mondial de joueurs (40 résultats par page de recherche). GEN de 20 à 99, potentiel, nation et photo sont modifiables. La rareté et les statistiques sportives suivent le GEN. Changer la nation déplace également le joueur entre les viviers des packs filtrés par nation. Les photos PNG/JPEG/WebP importées sont réduites à 320 px et conservées dans la base ; une URL HTTPS est également acceptée. Limites : 90 Ko par portrait, 3 Mo de personnalisations, 2 000 joueurs et 100 packs.

Les personnalisations sont globales aux ligues de Carrière en ligne, présentes et futures. Les cartes déjà possédées se mettent à jour à la prochaine actualisation de leur ligue. Les historiques de propriété, résultats, fatigues et blessures sont conservés. Les effectifs figés des matchs déjà commencés restent inchangés. Les autres modes solo ne sont pas modifiés.

Sur Vercel, aucune variable supplémentaire : DATABASE_URL existante est utilisée. La table carriere_catalogue_admin est initialisée au premier enregistrement de Kiri et sa RLS est activée. Le rôle serveur doit être propriétaire de la table et pouvoir la créer. La migration équivalente est dans serveur/schema-atelier.sql. Une table absente laisse fonctionner le catalogue de base. Aucune base de production n’a été modifiée pendant les tests.

Chaque sauvegarde compare une révision : un ancien formulaire ne peut pas écraser silencieusement une modification plus récente. En cas de conflit, recharger puis sélectionner à nouveau le pack/joueur. Les requêtes utilisent un contexte isolé pour éviter de mélanger les versions du catalogue entre utilisateurs. Seule la révision est interrogée lorsque la configuration est déjà en cache.

Vérifications : npm run verify:atelier (droits, validations, concurrence, persistance, GEN/photos dans plusieurs ligues, collection, raretés, boutique, ouverture garantie), npm run verify:collection, npm run verify:direct-push et npm run build. L’aperçu navigateur a été contrôlé sur ordinateur et à 390 px, avec API fictive ; la persistance et les autorisations ont été testées séparément via l’API réelle et un stockage temporaire.
