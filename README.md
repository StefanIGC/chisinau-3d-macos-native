# Chișinău 3D · Native Metal pentru macOS

Joc open-world 3D al centrului Chișinăului, cu motor nativ C++20 / Objective-C++ și Metal. Aplicația livrată nu folosește Electron, Chromium, JavaScript sau conexiune la internet în timpul jocului.

[Descarcă ultima versiune macOS](https://github.com/StefanIGC/chisinau-3d-macos-native/releases/latest)

![Șciusev în motorul Metal](docs/sciusev.png)

## Ce conține

- pieton, Toyota Prius și elicopter controlabile;
- generarea unei mașini cu `2` și a unui elicopter cu `3`, în spațiu liber lângă personaj;
- fizică deterministă la 120 Hz pentru vehicule;
- hartă offline, 49 de destinații și teleportare sigură;
- 16 module reconstruite pe strada Șciusev;
- 11 module BUC01–BUC11 pe strada București;
- Columna între Tighina și Ismail;
- arhitectura și suprafețele originale compilate din proiectul de autor;
- corpuri de clădire închise sub fațadele detaliate, fără golurile produse de eliminarea pereților și acoperișurilor;
- streaming predictiv și fog pentru deplasare continuă în zbor;
- executabil universal Apple Silicon `arm64` + Intel `x86_64`.

## Structură

- `chisinau-native/` — motorul C++/Metal, compilatoarele de dale și auditul;
- `chisinau-macos/` — sursa proiectului 3D de autor, datele și asset-urile necesare compilării;
- `docs/` — capturi, audit și notele verificărilor și lansărilor.

Fișierele generate (`.ctile`, `.dtile`, aplicația și arhivele) nu sunt ținute în Git. Buildul complet este publicat în secțiunea Releases.

## Build nativ

Cerințe: macOS 12+, Xcode Command Line Tools și Node.js 20+.

```sh
cd chisinau-macos
npm ci
cd ../chisinau-native
./build.sh ../chisinau-macos --rebuild-world
```

Rezultatul este:

```text
chisinau-native/build/Chișinău 3D Native/Chișinău 3D.app
```

Compilatorul folosește JavaScript numai pentru conversia datelor și modelelor. Aplicația rezultată este nativă.

## Teste

```sh
BIN="chisinau-native/build/Chișinău 3D Native/Chișinău 3D.app/Contents/MacOS/Chisinau3DNative"
"$BIN" --benchmark
"$BIN" --benchmark-car
"$BIN" --benchmark-columna
"$BIN" --benchmark-sciusev
"$BIN" --benchmark-bucuresti
"$BIN" --test-walker
"$BIN" --test-interaction
"$BIN" --test-map
"$BIN" --test-spawn
```

Pe sistemul de verificare Apple M1 Pro, traseele finale Șciusev, București și Columna au rulat la aproximativ 60 FPS, fără cadre peste 25 ms. Vezi [noutățile versiunii 2.9.0](docs/RELEASE-v2.9.0.md) și [auditul lumii](docs/WORLD-AUDIT.json).

## Date și licențe

Datele hărții: © OpenStreetMap contributors, ODbL 1.0. Proiectul include asset-uri cu licențe diferite; consultă [LICENSES.md](LICENSES.md) și `chisinau-macos/ASSETS.md` înainte de redistribuire sau reutilizare. Publicarea repository-ului nu relicențiază automat asset-urile terților.
