"""Intègre les portraits détourés fournis sans modifier leurs sources."""
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[1]
MONDE = RACINE / "public" / "photos" / "monde"
MAJ = RACINE / "public" / "photos" / "maj"
NEW_MAJ = RACINE / "public" / "photos" / "new maj"
FIX = RACINE / "photos-a-detourer" / "fix"
FOURNIS = RACINE.parent / "faf"


def enregistrer(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image.thumbnail((900, 1100), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=82, method=4, exact=True)


for source in FIX.iterdir():
    if not source.is_file():
        continue
    nom = source.stem.replace("-removebg-preview", "")
    destinations: list[Path]
    if nom.startswith("maj-"):
        destinations = [MAJ / f"{nom.removeprefix('maj-')}.webp"]
    elif nom.startswith("newmaj-"):
        destinations = [NEW_MAJ / f"{nom.removeprefix('newmaj-')}.webp"]
    elif nom.startswith("urc_"):
        destinations = [MAJ / f"{nom}.webp", NEW_MAJ / f"{nom}.webp"]
    else:
        destinations = [MONDE / f"{nom}.webp"]
    for destination in destinations:
        enregistrer(source, destination)

for source, nom in [
    (FOURNIS / "Faf de Klerk.png", "jpn_faf_de_klerk.webp"),
    (FOURNIS / "pieter steph du toit.png", "jpn_pieter_steph_du_toit.webp"),
    (FOURNIS / "thomas-du-toit_m-removebg-preview.png", "jpn_thomas_du_toit.webp"),
]:
    enregistrer(source, MONDE / nom)

print("Portraits corrigés et portraits de Faf/Pieter-Steph/Thomas intégrés.")
