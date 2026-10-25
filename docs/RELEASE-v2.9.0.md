# Chișinău 3D Native Metal v2.9.0

Această versiune repară clădirile care apăreau găurite și adaugă generarea vehiculelor din modul pieton.

## Instalare

1. Descarcă `Chisinau-3D-macOS-Native-Metal-v2.9.0.zip`.
2. Dezarhivează complet pachetul.
3. Deschide `Start.command`.

Jocul rulează offline pe macOS 12 sau mai nou și include un executabil universal pentru Apple Silicon și Intel.

## Modificări

- exportul nativ păstrează acum corpurile solide care închid pereții și acoperișurile sub fațadele detaliate;
- au fost restaurate 701.412 vârfuri structurale;
- cele 2.790 de clădiri OSM suprapuse rămân eliminate, pentru a evita pâlpâirea;
- `2` generează o mașină într-un loc liber lângă personaj;
- `3` generează un elicopter aterizat într-un loc liber;
- `E` permite în continuare intrarea și ieșirea din vehicule;
- buildul este compatibil cu executabilul nativ din versiunile curente de esbuild.

## Verificări

- auditul geometriei: trecut;
- generarea mașinii și elicopterului: trecut;
- intrarea și ieșirea din ambele vehicule: trecut;
- mersul, animațiile, harta offline și teleportarea: trecute;
- Șciusev, București și Columna: aproximativ 60 FPS, toate dalele apropiate pregătite și zero cadre peste 25 ms în rulările finale.

SHA-256:

`f21d1c45645c4741911cf667e58388de62c9e6ffb6a9b06344075ccf391d7f67`

Checksum-ul este disponibil și ca fișier separat în acest Release.
