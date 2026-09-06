"""Optimise uniquement les copies web de public/photos/maj ; ../maj reste intact."""
from pathlib import Path
from PIL import Image

racine = Path(__file__).resolve().parents[1]
dossier = (racine / "public" / "photos" / "maj").resolve()
attendu = (racine / "public" / "photos" / "maj").resolve()
if dossier != attendu or not dossier.is_dir():
    raise SystemExit(f"Dossier refusé : {dossier}")

remplacements: dict[str, str] = {}
fichiers = [p for p in dossier.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
for source in fichiers:
    destination = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.thumbnail((900, 1100), Image.Resampling.LANCZOS)
        if "A" in image.getbands():
            image.save(destination, "WEBP", quality=82, method=6, exact=True)
        else:
            image.convert("RGB").save(destination, "WEBP", quality=84, method=6)
    remplacements[f"/photos/maj/{source.name}"] = f"/photos/maj/{destination.name}"
    if source != destination:
        source.unlink()

index = racine / "src" / "data" / "photosMaj.ts"
texte = index.read_text(encoding="utf-8")
for ancien, nouveau in remplacements.items():
    texte = texte.replace(ancien, nouveau)
index.write_text(texte, encoding="utf-8")
total = sum(p.stat().st_size for p in dossier.iterdir() if p.is_file())
print(f"Photos optimisées : {len(fichiers)} ; poids final : {total / 1024 / 1024:.1f} Mo.")
