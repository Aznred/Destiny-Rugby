# Voix off — script à coller dans ElevenLabs

Modèle **Eleven v3 / v4**. Les balises entre crochets ne sont pas prononcées : tu peux les changer.
**Ne change pas les mots** : les sous-titres se calent mot à mot dessus.

Une seule prise par langue (les cinq paragraphes d'un coup), vitesse ≈ 1,05–1,10, **26 secondes au plus**.
Voix masculine, 25–40 ans, ton documentaire scientifique. Français : « Paul K ». Anglais : accent américain ou neutre.

Dépose ensuite les fichiers ici (MP3 ou WAV) :

- `trailer/catastrophe/voix/fr.mp3`
- `trailer/catastrophe/voix/en.mp3`

puis `node trailer/catastrophe/produire.cjs` : chaque mot est réaligné par transcription, le montage se recale.

## Français

```text
[serious documentary narrator, curious] Que se passerait-il si un objet de huit cents kilomètres de diamètre fonçait droit vers la Terre ?

[grave, dramatic] Son impact provoquerait des tsunamis gigantesques, des séismes, et peut-être même la fin de notre civilisation.

[lower voice, intrigued, slowing down] Mais les scientifiques découvriraient alors quelque chose d'absolument impossible...

[stunned] Attendez... [incredulous] C'est un ballon de rugby ?! [amused, holding back a laugh] Quelqu'un a frappé un peu trop fort !

[upbeat, confident] Destiny Rugby. Gratuit sur destiny-rugby.fr.
```

## English

```text
[serious documentary narrator, curious] What would happen if an eight-hundred-kilometer-wide object headed straight for Earth?

[grave, dramatic] Its impact could unleash gigantic tsunamis, violent earthquakes, and perhaps even the end of civilization.

[lower voice, intrigued, slowing down] But scientists would discover something that should be completely impossible...

[stunned] Wait... [incredulous] Is that a rugby ball?! [amused, holding back a laugh] Someone kicked it way too hard!

[upbeat, confident] Destiny Rugby. Play free at destiny-rugby.fr.
```
