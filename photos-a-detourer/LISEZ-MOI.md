# Les portraits que le détourage automatique refuse

**65 fichiers**, extraits le 2026-09-08.

Ce sont les **originaux**, tels qu'ils sont entrés dans le dépôt : le script
les reprend au commit qui les a AJOUTÉS, pas sur le disque. La nuance compte —
**18 d'entre eux portent déjà les traces d'une passe ratée** sur le
disque (une couche alpha, un maillot mordu de blanc, un halo au contour),
écrite par une version antérieure de `detourerPhotos.cjs` avant que le
garde-fou du haut de cadre existe. Détourer par-dessus ces dégâts n'aurait
rien donné de bon.

## Pourquoi l'automatique les refuse

`detourerPhotos.cjs` sépare le joueur du mur par la COULEUR, en partant des
bords. Ça ne peut pas marcher quand les deux partagent la même couleur — un
lettrage blanc sur fond blanc, et la propagation traverse le maillot et le
vide. Ni quand le « fond » n'en est pas un : un drapeau tenu à bout de bras
fait partie de la photo. Le script refuse, et il a raison : un portrait refusé
garde son fond et se corrige plus tard, un portrait troué est écrit sur le
disque et se voit en jeu.

## Comment les rendre

Détoure-les sur place, **en gardant exactement le même nom de fichier**, puis :

```bash
node scripts/photosNonDetourees.cjs --retour
```

`index.json` dit à quel(s) chemin(s) chaque fichier retourne — certains
existent en deux exemplaires dans le jeu (`photos/maj/` et `photos/new maj/`
portent les mêmes joueurs), et un seul fichier retouché les sert tous les
deux. Le script ne reprend que ceux **réellement détourés** (coins du HAUT
transparents) : un fichier laissé tel quel est ignoré, pas recopié pour rien.

## Inventaire

- `boris_goutard.webp` → `public/photos/boris_goutard.webp`
- `charles_henri_berguet.webp` → `public/photos/charles_henri_berguet.webp`
- `gabriel_ngandebe.webp` → `public/photos/gabriel_ngandebe.webp`
- `jpn_david_van_zeeland.webp` → `public/photos/monde/jpn_david_van_zeeland.webp`
- `jpn_keijiro_tamefusa.webp` → `public/photos/monde/jpn_keijiro_tamefusa.webp`
- `jpn_mifiposeti_paea.webp` → `public/photos/monde/jpn_mifiposeti_paea.webp`
- `jpn_riku_tomita.webp` → `public/photos/monde/jpn_riku_tomita.webp`
- `leo_chauvin.webp` → `public/photos/leo_chauvin.webp`
- `maj-urc_dan_sheehan.webp` → `public/photos/maj/urc_dan_sheehan.webp`
- `maj-urc_jamison_gibson_park.webp` → `public/photos/maj/urc_jamison_gibson_park.webp`
- `maj-urc_joe_mccarthy.webp` → `public/photos/maj/urc_joe_mccarthy.webp`
- `newmaj-urc_dan_sheehan.webp` → `public/photos/new maj/urc_dan_sheehan.webp`
- `newmaj-urc_jamison_gibson_park.webp` → `public/photos/new maj/urc_jamison_gibson_park.webp`
- `newmaj-urc_joe_mccarthy.webp` → `public/photos/new maj/urc_joe_mccarthy.webp`
- `srp_angus_scott_young.webp` → `public/photos/monde/srp_angus_scott_young.webp`
- `srp_antonio_shalfoon.webp` → `public/photos/monde/srp_antonio_shalfoon.webp`
- `srp_apolosi_ranawai.webp` → `public/photos/monde/srp_apolosi_ranawai.webp`
- `srp_archie_saunders.webp` → `public/photos/monde/srp_archie_saunders.webp`
- `srp_austin_durbidge.webp` → `public/photos/monde/srp_austin_durbidge.webp`
- `srp_codie_taylor.webp` → `public/photos/monde/srp_codie_taylor.webp`
- `srp_cooper_grant.webp` → `public/photos/monde/srp_cooper_grant.webp`
- `srp_cooper_roberts.webp` → `public/photos/monde/srp_cooper_roberts.webp`
- `srp_corey_kellow.webp` → `public/photos/monde/srp_corey_kellow.webp`
- `srp_dallas_mc_leod.webp` → `public/photos/monde/srp_dallas_mc_leod.webp`
- `srp_daniel_botha.webp` → `public/photos/monde/srp_daniel_botha.webp`
- `srp_david_havili.webp` → `public/photos/monde/srp_david_havili.webp`
- `srp_eamon_doyle.webp` → `public/photos/monde/srp_eamon_doyle.webp`
- `srp_ethan_dobbins.webp` → `public/photos/monde/srp_ethan_dobbins.webp`
- `srp_fletcher_newell.webp` → `public/photos/monde/srp_fletcher_newell.webp`
- `srp_folau_fainga_a.webp` → `public/photos/monde/srp_folau_fainga_a.webp`
- `srp_george_poolman.webp` → `public/photos/monde/srp_george_poolman.webp`
- `srp_harry_potter.webp` → `public/photos/monde/srp_harry_potter.webp`
- `srp_jack_sexton.webp` → `public/photos/monde/srp_jack_sexton.webp`
- `srp_jae_broomfield.webp` → `public/photos/monde/srp_jae_broomfield.webp`
- `srp_james_white.webp` → `public/photos/monde/srp_james_white.webp`
- `srp_johnny_lee.webp` → `public/photos/monde/srp_johnny_lee.webp`
- `srp_johnny_mc_nicholl.webp` → `public/photos/monde/srp_johnny_mc_nicholl.webp`
- `srp_kershawl_sykes_martin.webp` → `public/photos/monde/srp_kershawl_sykes_martin.webp`
- `srp_kurtis_mac_donald.webp` → `public/photos/monde/srp_kurtis_mac_donald.webp`
- `srp_kyle_preston.webp` → `public/photos/monde/srp_kyle_preston.webp`
- `srp_lachlan_hooper.webp` → `public/photos/monde/srp_lachlan_hooper.webp`
- `srp_liam_jack.webp` → `public/photos/monde/srp_liam_jack.webp`
- `srp_luke_aiken.webp` → `public/photos/monde/srp_luke_aiken.webp`
- `srp_macca_springer.webp` → `public/photos/monde/srp_macca_springer.webp`
- `srp_matt_philip.webp` → `public/photos/monde/srp_matt_philip.webp`
- `srp_miles_amatosero.webp` → `public/photos/monde/srp_miles_amatosero.webp`
- `srp_mitchell_drummond.webp` → `public/photos/monde/srp_mitchell_drummond.webp`
- `srp_nathan_hastie.webp` → `public/photos/monde/srp_nathan_hastie.webp`
- `srp_nic_dolly.webp` → `public/photos/monde/srp_nic_dolly.webp`
- `srp_nick_champion_de_crespigny.webp` → `public/photos/monde/srp_nick_champion_de_crespigny.webp`
- `srp_noah_hotham.webp` → `public/photos/monde/srp_noah_hotham.webp`
- `srp_rivez_reihana.webp` → `public/photos/monde/srp_rivez_reihana.webp`
- `srp_ronan_leahy.webp` → `public/photos/monde/srp_ronan_leahy.webp`
- `srp_seb_calder.webp` → `public/photos/monde/srp_seb_calder.webp`
- `srp_sef_fa_agase.webp` → `public/photos/monde/srp_sef_fa_agase.webp`
- `srp_taha_kemara.webp` → `public/photos/monde/srp_taha_kemara.webp`
- `srp_teddy_wilson.webp` → `public/photos/monde/srp_teddy_wilson.webp`
- `srp_toby_bell.webp` → `public/photos/monde/srp_toby_bell.webp`
- `srp_tom_robertson.webp` → `public/photos/monde/srp_tom_robertson.webp`
- `srp_tomasi_maka.webp` → `public/photos/monde/srp_tomasi_maka.webp`
- `srp_will_harris.webp` → `public/photos/monde/srp_will_harris.webp`
- `srp_will_jordan.webp` → `public/photos/monde/srp_will_jordan.webp`
- `urc_eddie_swart.webp` → `public/photos/maj/urc_eddie_swart.webp`, `public/photos/new maj/urc_eddie_swart.webp`
- `urc_rieko_ioane.webp` → `public/photos/maj/urc_rieko_ioane.webp`, `public/photos/new maj/urc_rieko_ioane.webp`
- `urc_thomas_clarkson.webp` → `public/photos/maj/urc_thomas_clarkson.webp`, `public/photos/new maj/urc_thomas_clarkson.webp`
