# Voix française locale : F5-TTS

Seule la couche **texte → voix** est remplacée. Le moteur du match,
`retransmission.ts`, `phrases.ts`, les clips anglais et leurs déclencheurs ne changent pas.

## Où passe le commentaire ?

1. `src/components/match/CommentateursMatch.tsx` reçoit les répliques existantes
   et appelle toujours `voix.current.dire(replique, horloge.current)`.
2. `src/lib/commentaires/voix.ts` conserve la file du match : trois phrases en
   attente, expiration des phrases peu prioritaires et interruption d’une anecdote
   par un événement important. L’anglais utilise toujours `speechSynthesis`.
3. Pour le français, `CommentatorVoice.ts` transmet seulement le texte au Worker,
   puis joue le PCM reçu avec `AudioBufferSourceNode.start()`.
4. `commentator.worker.ts` échange avec `http://127.0.0.1:8765` ;
   `../test voice/serveur_voix_f5.py` conserve le modèle français, le vocodeur,
   l’extrait et sa transcription en mémoire. Une seule inférence à la fois.

L’ancien lecteur vocal était `SpeechSynthesisUtterance` dans `voix.ts`.
L’autre mode, voix d’origine, garde `audio.current.play()` dans le composant.

## Lancer

Dans `test voice`, ouvrir **Lancer voix F5.cmd**, laisser la fenêtre ouverte,
puis activer les commentateurs français dans le jeu.
Le test local est accessible à `/apercu-voix.html` avec le serveur de développement.
Cette page de test n’est pas une entrée du build de production.

Le profil utilisé est `test voice/profil-f5/reference.wav` accompagné de
`reference.txt`, sa transcription exacte. `profil.json` indique la source, son
empreinte et les limites de l’extrait. Pour changer de référence :

```powershell
.\.venv-voix\Scripts\python.exe preparer_reference_f5.py "audio.wav" --debut 20 --duree 10
```

Whisper propose la transcription **localement** ; la vérifier à l’écoute, puis
redémarrer F5 après toute correction. Un extrait de 3 à 12 secondes sans musique,
autre intervenant ni saturation est préférable à une interview entière.

F5 utilise un modèle français existant conditionné par cette référence audio ;
ce n’est pas un entraînement complet d’un nouveau modèle. La ressemblance doit
être évaluée à l’écoute. Le prototype de profil Kokoro a été retiré du jeu.

## API et durée de vie

```ts
const voix = new CommentatorVoice();
await voix.initialize(); // depuis un clic pour autoriser la lecture
await voix.speak('Dupont accélère et trouve l’intervalle !');
voix.stop();
voix.isReady();
await voix.preload();
voix.dispose();
```

`initialize()` / `preload()` partagent une seule promesse par lecteur.
`speak()` se termine après la lecture. Il n’ajoute pas une deuxième file : le
match utilise sa file existante ; les appels directs doivent être séquentiels.
`stop()` coupe le son, annule la requête côté navigateur et ignore les résultats
tardifs. Une inférence Python déjà commencée termine son calcul ; son résultat
n’est plus joué. Le modèle reste chargé. `dispose()` libère le navigateur ;
fermer le service local libère le modèle Python.

Les poids français (~1,35 Go) et Vocos (~54 Mo) utilisent des révisions fixes et
le cache Hugging Face sur disque. Une première acquisition réseau peut être
nécessaire ; aucune réplique ni référence n’est envoyée à une API TTS. Après
installation et mise en cache, `HF_HUB_OFFLINE=1` permet un lancement hors ligne.

## Performances et limites

La préférence retenue est **F5 local pour la fidélité**. Il utilise CUDA si
disponible, sinon le CPU. WebGPU et un fonctionnement autonome dans le navigateur
ne sont donc pas proposés par cette version. Le Worker garde le transport PCM
hors du fil du match ; le service a deux threads CPU et une priorité réduite sous
Windows. Le GPU reste partagé avec le jeu : les FPS et délais doivent être mesurés
sur la machine cible. `--etapes 16` réduit le calcul avec un compromis de qualité ;
le défaut est 32. `--device cpu` force le CPU.

Le service écoute uniquement sur cet ordinateur. Il ne fonctionne pas tel quel
sur un téléphone sans Python local. Les origines autorisées par défaut sont
`http://127.0.0.1:5173` et `http://localhost:5173`. Pour un jeu déployé, ajouter son
origine exacte avec `--origine https://votre-site.example`. Les navigateurs peuvent
demander une permission d’accès au réseau local ou refuser l’accès depuis HTTPS :
la production nécessite sa propre validation. Aucune permission navigateur n’est
contournée. Si le service est absent, les textes restent disponibles et l’interface
explique comment relancer la voix.

## Vérification et licences

`npm run verify:voix` vérifie le chargement unique, l’ordre, les interruptions,
la pause, la réutilisation, les réponses tardives et les erreurs du Worker.
Le serveur dispose également d’un contrôle local du contrat HTTP/PCM.

[F5-TTS](https://github.com/SWivid/F5-TTS) : code MIT.
Le [checkpoint français RASPIAUDIO](https://huggingface.co/RASPIAUDIO/F5-French-MixedSpeakers-reduced)
est **CC BY-NC 4.0** : un déploiement commercial exige des droits adaptés sur les
poids, indépendamment de l’autorisation sur la voix. L’utilisateur a confirmé
l’autorisation de cloner et d’utiliser la voix de Matthieu Lartot dans ce projet.
Les enregistrements, poids et références restent dans l’atelier local hors du dépôt
du jeu ; ils ne sont pas publiés par ce changement.
