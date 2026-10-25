# Chișinău 3D · motor nativ Metal

Aplicație macOS nativă, fără Electron, Chromium, JavaScript sau conexiune la internet în timpul jocului.

## Arhitectură

- C++20 și Objective-C++ numai pentru integrarea AppKit/MetalKit.
- Un singur renderer Metal, cu o singură trecere de culoare și depth buffer.
- 240 de sectoare de bază și 222 de pagini locale pentru arhitectura detaliată.
- 185 de straturi arhitecturale prioritare sunt exportate direct din modulele originale construite după fotografii și Street View: fațade, ferestre, uși, balcoane, cornișe, acoperișuri, scări, porți, mobilier și suprafețele complete Șciusev, București și Columna–Ismail. Cele cinci straturi temporare „reprezentare” nu intră în aplicație.
- Exportul arhitecturii rulează numai la build; aplicația livrată rămâne integral nativă.
- Geometrie gata pentru GPU; nu se triangulează clădiri în timpul jocului.
- Streaming asincron pe două niveluri: orașul de bază se încarcă până la limita hărții și rămâne vizibil la orizont, iar cele 35,5 milioane de vârfuri de detaliu sunt anticipate în direcția deplasării și încărcate numai în apropiere.
- Fără fog de distanță; camera și orașul de bază au vizibilitate de 7 km.
- Trei moduri: pieton, mașină și elicopter.
- Din modul pieton, `2` generează mașina, iar `3` generează elicopterul într-un loc liber din apropiere; `E` permite intrarea și ieșirea.
- Corpurile solide, pereții și acoperișurile clădirilor sunt păstrate sub fațadele detaliate; fallback-urile OSM suprapuse rămân eliminate.
- Fizică deterministă la 120 Hz pentru vehicule, independentă de rata cadrelor.
- Mașina folosește un model bicycle: accelerație, frânare, marșarier automat, limitarea direcției la viteză și frână de mână.
- Elicopterul are rotor cu pornire progresivă, decolare/aterizare, inerție, atitudine și coliziuni sub-pas.
- Modelele skinned sunt convertite în bind pose, iar textura originală alb-albastră a elicopterului este coaptă în culorile vârfurilor.
- Axele fizicii, modelului, camerei și minimapei folosesc aceeași convenție; vehiculele se deplasează exact în direcția în care sunt orientate.

## Build

```sh
./build.sh ../chisinau-macos --rebuild-world
```

Rezultatul este `build/Chișinău 3D Native/Chișinău 3D.app`, universal arm64 și x86_64.

## Benchmark

```sh
"build/Chișinău 3D Native/Chișinău 3D.app/Contents/MacOS/Chisinau3DNative" --benchmark
```

Testul zboară automat 22 de secunde, traversează mai multe sectoare și scrie rezultatul în `/tmp/chisinau-native-benchmark.json`.

Fizica mașinii și randarea ei pot fi testate separat cu `--benchmark-car`; rezultatul se scrie în `/tmp/chisinau-native-benchmark-car.json`.

Traseul nou Columna, de la Tighina spre Ismail, se verifică separat cu `--benchmark-columna`; rezultatul se scrie în `/tmp/chisinau-native-benchmark-columna.json`.

Șciusev și București se verifică separat cu `--benchmark-sciusev` și `--benchmark-bucuresti`. Harta, pietonul și interacțiunile se verifică prin `--test-map`, `--test-walker` și `--test-interaction`.

Generarea sigură a vehiculelor se verifică prin `--test-spawn`.
